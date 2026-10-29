import React, { useMemo, useState } from 'react';
import { Chess, Move, PieceSymbol, Square } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import {
  Eye,
  FlipHorizontal2,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  Target,
  Undo2,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { BOARD_THEMES, BoardThemeId, useAcademyStore } from '@/stores/useAcademyStore';
import { analyzePositionTactics } from '@/features/coach/tacticalDetectors';
import { soundService } from '@/services/soundService';
import { CENTER_SQUARES } from '@/utils/chessUtils';

export interface InteractiveChessboardProps {
  fen: string;
  onMove: (move: Move, beforeFen: string, afterFen: string) => void;
  orientation?: 'white' | 'black';
  onFlipOrientation?: () => void;
  canUndo?: boolean;
  onUndo?: () => void;
  onRestart?: () => void;
  customArrows?: [Square, Square, string?][];
  customHighlightSquares?: Square[];
  interactive?: boolean;
  lastMove?: { from: Square; to: Square } | null;
  statusBannerTr?: string | null;
}

export const InteractiveChessboard: React.FC<InteractiveChessboardProps> = ({
  fen,
  onMove,
  orientation = 'white',
  onFlipOrientation,
  canUndo = false,
  onUndo,
  onRestart,
  customArrows = [],
  customHighlightSquares = [],
  interactive = true,
  lastMove = null,
  statusBannerTr = null,
}) => {
  const {
    boardTheme,
    setBoardTheme,
    soundEnabled,
    setSoundEnabled,
    showCoordinates,
    setShowCoordinates,
    teachingOverlays,
    toggleOverlay,
  } = useAcademyStore();

  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [pendingPromotion, setPendingPromotion] = useState<{
    from: Square;
    to: Square;
  } | null>(null);
  const [illegalMoveNotice, setIllegalMoveNotice] = useState<string | null>(null);

  const chess = useMemo(() => {
    try {
      return new Chess(fen);
    } catch {
      return new Chess();
    }
  }, [fen]);

  const tacticalReport = useMemo(() => analyzePositionTactics(chess.fen()), [chess]);

  const legalMovesFromSelected = useMemo(() => {
    if (!selectedSquare || !interactive) return [];
    try {
      return chess.moves({ square: selectedSquare, verbose: true });
    } catch {
      return [];
    }
  }, [chess, selectedSquare, interactive]);

  const executeValidatedMove = (
    from: Square,
    to: Square,
    promotion: PieceSymbol = 'q'
  ): boolean => {
    if (!interactive) return false;
    const beforeFen = chess.fen();
    const copy = new Chess(beforeFen);

    // Check if this is a pawn promotion move
    const pieceOnFrom = copy.get(from);
    const isPromotion =
      pieceOnFrom?.type === 'p' &&
      ((pieceOnFrom.color === 'w' && to[1] === '8') ||
        (pieceOnFrom.color === 'b' && to[1] === '1'));

    try {
      const moveResult = copy.move({
        from,
        to,
        promotion: isPromotion ? promotion : undefined,
      });

      if (!moveResult) {
        soundService.play('error');
        setIllegalMoveNotice('Bu hamle kurallara uygun değil.');
        return false;
      }

      setIllegalMoveNotice(null);
      setSelectedSquare(null);
      setPendingPromotion(null);

      soundService.setEnabled(soundEnabled);
      if (copy.isCheckmate() || copy.isDraw()) {
        soundService.play('gameEnd');
      } else if (copy.inCheck()) {
        soundService.play('check');
      } else if (moveResult.flags.includes('k') || moveResult.flags.includes('q')) {
        soundService.play('castle');
      } else if (moveResult.promotion) {
        soundService.play('promote');
      } else if (moveResult.captured) {
        soundService.play('capture');
      } else {
        soundService.play('move');
      }

      onMove(moveResult, beforeFen, copy.fen());
      return true;
    } catch {
      soundService.play('error');
      const inCheckMsg = copy.inCheck()
        ? 'Şahın tehdit altında! Önce şah tehdidini ortadan kaldırmalısın.'
        : `${from} → ${to} hamlesi bu taş için yasal değil.`;
      setIllegalMoveNotice(inCheckMsg);
      return false;
    }
  };

  const handleSquareClick = (square: Square) => {
    if (!interactive) return;

    // If a piece is already selected and user clicked a legal destination square
    if (selectedSquare) {
      const matchingMoves = legalMovesFromSelected.filter((m) => m.to === square);
      if (matchingMoves.length > 0) {
        const isPromo = matchingMoves.some((m) => Boolean(m.promotion));
        if (isPromo) {
          setPendingPromotion({ from: selectedSquare, to: square });
          return;
        }
        executeValidatedMove(selectedSquare, square);
        return;
      }
    }

    const piece = chess.get(square);
    if (piece && piece.color === chess.turn()) {
      setSelectedSquare(square === selectedSquare ? null : square);
      setIllegalMoveNotice(null);
    } else if (selectedSquare) {
      executeValidatedMove(selectedSquare, square);
    }
  };

  const handlePieceDrop = (sourceSquare: Square, targetSquare: Square, pieceString: string): boolean => {
    if (!interactive) return false;
    const isPawn = pieceString.toLowerCase().endsWith('p');
    const isPromoRank =
      (pieceString.startsWith('w') && targetSquare[1] === '8') ||
      (pieceString.startsWith('b') && targetSquare[1] === '1');

    if (isPawn && isPromoRank) {
      // Check if move is legal before opening promotion picker
      const legal = chess
        .moves({ square: sourceSquare, verbose: true })
        .some((m) => m.to === targetSquare);
      if (legal) {
        setPendingPromotion({ from: sourceSquare, to: targetSquare });
        return false;
      }
    }
    return executeValidatedMove(sourceSquare, targetSquare, 'q');
  };

  // Compute custom square styles for legal moves, check, last move, and teaching overlays
  const customSquareStyles = useMemo(() => {
    const styles: Record<string, React.CSSProperties> = {};

    // 1. Last move highlight
    if (lastMove) {
      styles[lastMove.from] = {
        backgroundColor: 'rgba(245, 158, 11, 0.28)',
      };
      styles[lastMove.to] = {
        backgroundColor: 'rgba(245, 158, 11, 0.38)',
      };
    }

    // 2. Teaching overlay: Controlled center squares
    if (teachingOverlays.showControlled) {
      for (const sq of CENTER_SQUARES) {
        const wCtrl = tacticalReport.centerControl.whiteControlled.includes(sq);
        const bCtrl = tacticalReport.centerControl.blackControlled.includes(sq);
        if (wCtrl && !bCtrl) {
          styles[sq] = {
            ...styles[sq],
            boxShadow: 'inset 0 0 0 3px rgba(16, 185, 129, 0.65)',
          };
        } else if (bCtrl && !wCtrl) {
          styles[sq] = {
            ...styles[sq],
            boxShadow: 'inset 0 0 0 3px rgba(59, 130, 246, 0.65)',
          };
        } else if (wCtrl && bCtrl) {
          styles[sq] = {
            ...styles[sq],
            boxShadow: 'inset 0 0 0 3px rgba(251, 191, 36, 0.65)',
          };
        }
      }
    }

    // 3. Teaching overlay: Attacked pieces
    if (teachingOverlays.showAttacked) {
      for (const p of [
        ...tacticalReport.attackedPieces.w,
        ...tacticalReport.attackedPieces.b,
      ]) {
        styles[p.square] = {
          ...styles[p.square],
          backgroundColor: 'rgba(251, 191, 36, 0.35)',
        };
      }
    }

    // 4. Teaching overlay: Hanging / undefended attacked pieces
    if (teachingOverlays.showHanging) {
      for (const h of [
        ...tacticalReport.hangingPieces.w,
        ...tacticalReport.hangingPieces.b,
      ]) {
        styles[h.piece.square] = {
          ...styles[h.piece.square],
          backgroundColor: 'rgba(239, 68, 68, 0.42)',
          boxShadow: 'inset 0 0 0 3px rgba(239, 68, 68, 0.9)',
        };
      }
    }

    // 5. External highlight squares (from Coach / Hints / Lessons)
    for (const sq of customHighlightSquares) {
      styles[sq] = {
        ...styles[sq],
        backgroundColor: 'rgba(16, 185, 129, 0.36)',
        boxShadow: 'inset 0 0 0 3px rgba(16, 185, 129, 0.85)',
      };
    }

    // 6. Selected square
    if (selectedSquare) {
      styles[selectedSquare] = {
        ...styles[selectedSquare],
        backgroundColor: 'rgba(16, 185, 129, 0.45)',
      };
    }

    // 7. Legal move indicators from selected square
    for (const m of legalMovesFromSelected) {
      const hasPiece = Boolean(chess.get(m.to));
      styles[m.to] = {
        ...styles[m.to],
        background: hasPiece
          ? 'radial-gradient(circle, transparent 58%, rgba(16, 185, 129, 0.78) 62%)'
          : 'radial-gradient(circle, rgba(16, 185, 129, 0.75) 22%, transparent 25%)',
      };
    }

    // 8. King in check highlight
    if (tacticalReport.inCheck) {
      const kingInCheck = tacticalReport.pieces.find(
        (p) => p.type === 'k' && p.color === tacticalReport.turn
      );
      if (kingInCheck) {
        styles[kingInCheck.square] = {
          backgroundColor: 'rgba(220, 38, 38, 0.7)',
          boxShadow: 'inset 0 0 14px 4px rgba(254, 202, 202, 0.9)',
        };
      }
    }

    return styles;
  }, [
    lastMove,
    teachingOverlays,
    tacticalReport,
    customHighlightSquares,
    selectedSquare,
    legalMovesFromSelected,
    chess,
  ]);

  const activeTheme = BOARD_THEMES[boardTheme] ?? BOARD_THEMES.emerald;

  return (
    <div className="flex flex-col items-center w-full max-w-[600px] mx-auto select-none">
      {/* Top Status & Turn Bar */}
      <div className="w-full flex flex-wrap items-center justify-between gap-2 mb-2.5 px-3 py-2 rounded-xl bg-navy-900/90 border border-slate-800/80 shadow-sm">
        <div className="flex items-center gap-2.5">
          <span
            className={`inline-block w-3.5 h-3.5 rounded-full border ${
              chess.turn() === 'w'
                ? 'bg-white border-slate-300 shadow-[0_0_8px_rgba(255,255,255,0.6)]'
                : 'bg-slate-900 border-slate-500'
            }`}
            aria-hidden="true"
          />
          <span className="text-xs font-semibold tracking-wide text-slate-200">
            {chess.isCheckmate()
              ? `Şah Mat! (${chess.turn() === 'w' ? 'Siyah' : 'Beyaz'} Kazandı)`
              : chess.isStalemate()
              ? 'Pat — Oyun Berabere'
              : chess.isDraw()
              ? 'Oyun Berabere'
              : chess.turn() === 'w'
              ? 'Hamle Sırası: Beyaz'
              : 'Hamle Sırası: Siyah'}
          </span>
          {chess.inCheck() && !chess.isCheckmate() && (
            <span className="px-2 py-0.5 text-[11px] font-bold uppercase rounded-md bg-red-500/20 text-red-300 border border-red-500/40 animate-pulse">
              Şah!
            </span>
          )}
        </div>

        {/* Theme & Coordinate Quick Controls */}
        <div className="flex items-center gap-1.5">
          <label htmlFor="board-theme-select" className="sr-only">
            Tahta Teması
          </label>
          <select
            id="board-theme-select"
            value={boardTheme}
            onChange={(e) => setBoardTheme(e.target.value as BoardThemeId)}
            className="text-xs bg-navy-800 text-slate-200 border border-slate-700 rounded-lg px-2 py-1 focus:border-emerald-500"
          >
            {Object.entries(BOARD_THEMES).map(([id, t]) => (
              <option key={id} value={id}>
                {t.nameTr}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => setShowCoordinates(!showCoordinates)}
            title="Koordinatları Göster/Gizle"
            className={`px-2 py-1 text-xs rounded-lg border transition ${
              showCoordinates
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                : 'bg-navy-800 border-slate-700 text-slate-400'
            }`}
          >
            a-h / 1-8
          </button>

          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            title={soundEnabled ? 'Sesi Kapat' : 'Sesi Aç'}
            aria-label={soundEnabled ? 'Sesi Kapat' : 'Sesi Aç'}
            className="p-1.5 rounded-lg bg-navy-800 border border-slate-700 text-slate-300 hover:text-white"
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Optional Status / Illegal Move Feedback Banner */}
      {(illegalMoveNotice || statusBannerTr) && (
        <div
          role="status"
          aria-live="polite"
          className={`w-full mb-2.5 px-3 py-2 rounded-xl text-xs font-medium flex items-center justify-between border ${
            illegalMoveNotice
              ? 'bg-red-500/15 border-red-500/40 text-red-200'
              : 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200'
          }`}
        >
          <span>{illegalMoveNotice || statusBannerTr}</span>
          {illegalMoveNotice && (
            <button
              type="button"
              onClick={() => setIllegalMoveNotice(null)}
              className="text-[11px] underline ml-2"
            >
              Kapat
            </button>
          )}
        </div>
      )}

      {/* Promotion Selection Bar */}
      {pendingPromotion && (
        <div
          role="dialog"
          aria-label="Piyon Terfi Seçimi"
          className="w-full mb-3 p-3 rounded-xl bg-navy-800 border-2 border-emerald-500 shadow-lg flex items-center justify-between"
        >
          <span className="text-xs font-semibold text-emerald-300">
            Piyon Terfisi — Dönüşecek taşı seçin:
          </span>
          <div className="flex items-center gap-2">
            {(
              [
                { code: 'q', label: 'Vezir (9)' },
                { code: 'r', label: 'Kale (5)' },
                { code: 'b', label: 'Fil (3)' },
                { code: 'n', label: 'At (3)' },
              ] as const
            ).map((item) => (
              <button
                key={item.code}
                type="button"
                onClick={() =>
                  executeValidatedMove(pendingPromotion.from, pendingPromotion.to, item.code)
                }
                className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-emerald-500 text-navy-950 hover:bg-emerald-400 transition"
              >
                {item.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setPendingPromotion(null)}
              className="px-2 py-1 text-xs text-slate-400 hover:text-white"
            >
              İptal
            </button>
          </div>
        </div>
      )}

      {/* Main Chessboard Container */}
      <div
        data-testid="chessboard-container"
        className="w-full aspect-square rounded-2xl overflow-hidden border-2 border-slate-700/80 shadow-[0_20px_50px_rgba(0,0,0,0.65)] bg-navy-900"
      >
        <Chessboard
          id="SatrancAkademisiBoard"
          position={chess.fen()}
          boardOrientation={orientation}
          showBoardNotation={showCoordinates}
          arePiecesDraggable={interactive}
          onSquareClick={handleSquareClick}
          onPieceDrop={handlePieceDrop}
          customDarkSquareStyle={{ backgroundColor: activeTheme.darkSquare }}
          customLightSquareStyle={{ backgroundColor: activeTheme.lightSquare }}
          customSquareStyles={customSquareStyles}
          customArrows={
            teachingOverlays.showSuggested ? customArrows : []
          }
          animationDuration={180}
        />
      </div>

      {/* Bottom Board Controls & Teaching Overlays */}
      <div className="w-full mt-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          {onFlipOrientation && (
            <button
              type="button"
              onClick={onFlipOrientation}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-navy-800 hover:bg-navy-700 text-slate-200 text-xs font-medium border border-slate-700 transition"
            >
              <FlipHorizontal2 className="w-3.5 h-3.5 text-emerald-400" />
              Tahtayı Çevir
            </button>
          )}
          {onUndo && (
            <button
              type="button"
              disabled={!canUndo}
              onClick={onUndo}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-navy-800 hover:bg-navy-700 disabled:opacity-40 text-slate-200 text-xs font-medium border border-slate-700 transition"
            >
              <Undo2 className="w-3.5 h-3.5 text-amber-400" />
              Geri Al
            </button>
          )}
          {onRestart && (
            <button
              type="button"
              onClick={onRestart}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-navy-800 hover:bg-navy-700 text-slate-200 text-xs font-medium border border-slate-700 transition"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-300" />
              Sıfırla
            </button>
          )}
        </div>

        {/* Teaching Overlay Toggles */}
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Eğitim Katmanları">
          <button
            type="button"
            onClick={() => toggleOverlay('showHanging')}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium border transition ${
              teachingOverlays.showHanging
                ? 'bg-red-500/20 border-red-500/50 text-red-200'
                : 'bg-navy-900 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
            title="Savunmasız (askıdaki) taşları kırmızı çerçeve ile vurgula"
          >
            <ShieldAlert className="w-3 h-3" />
            Askıdaki Taşlar
          </button>

          <button
            type="button"
            onClick={() => toggleOverlay('showControlled')}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium border transition ${
              teachingOverlays.showControlled
                ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-200'
                : 'bg-navy-900 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
            title="Merkez karelerindeki (d4, e4, d5, e5) kontrolü göster"
          >
            <Target className="w-3 h-3" />
            Merkez Kontrolü
          </button>

          <button
            type="button"
            onClick={() => toggleOverlay('showAttacked')}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium border transition ${
              teachingOverlays.showAttacked
                ? 'bg-amber-500/20 border-amber-500/50 text-amber-200'
                : 'bg-navy-900 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
            title="Tehdit altındaki tüm taşları vurgula"
          >
            <Eye className="w-3 h-3" />
            Tehditler
          </button>

          <button
            type="button"
            onClick={() => toggleOverlay('showSuggested')}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium border transition ${
              teachingOverlays.showSuggested
                ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-200'
                : 'bg-navy-900 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
            title="Koçun önerdiği hamle oklarını göster"
          >
            <Sparkles className="w-3 h-3" />
            Öneri Okları
          </button>
        </div>
      </div>
    </div>
  );
};
