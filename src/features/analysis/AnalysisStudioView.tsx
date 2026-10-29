import React, { useState } from 'react';
import { Chess, Move, Square } from 'chess.js';
import {
  Cpu,
  Download,
  FileCode2,
  Sliders,
  Upload,
} from 'lucide-react';
import { InteractiveChessboard } from '@/features/chess/InteractiveChessboard';
import { CoachAssistantPanel } from '@/features/coach/CoachAssistantPanel';
import { evaluatePlayedMove, MoveCoachingEvaluation } from '@/features/coach/coachEngine';
import { EvaluationGraph } from './EvaluationGraph';
import {
  EngineAnalysisResult,
  sharedChessEngine,
} from '@/engine/chessEngineAdapter';
import { isValidFen } from '@/utils/chessUtils';

const PRESET_POSITIONS: { nameTr: string; fen: string }[] = [
  {
    nameTr: 'Başlangıç Pozisyonu',
    fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  },
  {
    nameTr: 'İtalyan Açılışı (Merkez Mücadelesi)',
    fen: 'r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/2P2N2/PP1P1PPP/RNBQK2R w KQkq - 1 4',
  },
  {
    nameTr: 'Lucena Kale Oyunsonu (Köprü Kurma)',
    fen: '1K1k4/1P6/8/8/8/8/r7/2R5 w - - 0 1',
  },
  {
    nameTr: 'Philidor Savunma Pozisyonu',
    fen: '3k4/8/3PK3/8/8/8/r7/5R2 b - - 0 1',
  },
];

export const AnalysisStudioView: React.FC = () => {
  const [fen, setFen] = useState<string>(PRESET_POSITIONS[0].fen);
  const [fenInput, setFenInput] = useState<string>(PRESET_POSITIONS[0].fen);
  const [pgnInput, setPgnInput] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [evaluations, setEvaluations] = useState<MoveCoachingEvaluation[]>([]);
  const [engineAnalysis, setEngineAnalysis] = useState<EngineAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [boardHighlights, setBoardHighlights] = useState<Square[]>([]);
  const [boardArrows, setBoardArrows] = useState<[Square, Square, string?][]>([]);

  const runDeepEngineAnalysis = async (targetFen: string) => {
    setIsAnalyzing(true);
    try {
      const res = await sharedChessEngine.analyzePosition(targetFen, {
        depth: 12,
        movetimeMs: 700,
        multiPv: 3,
      });
      setEngineAnalysis(res);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleBoardMove = (move: Move, beforeFen: string, afterFen: string) => {
    const evalItem = evaluatePlayedMove({
      beforeFen,
      afterFen,
      move,
      moveNumber: evaluations.length + 1,
    });
    setFen(afterFen);
    setFenInput(afterFen);
    setEvaluations((prev) => [...prev, evalItem]);
    setBoardHighlights(evalItem.highlightSquares);
    setBoardArrows(evalItem.suggestedArrows);
    runDeepEngineAnalysis(afterFen);
  };

  const handleLoadFen = (e: React.FormEvent) => {
    e.preventDefault();
    const check = isValidFen(fenInput.trim());
    if (!check.valid) {
      setStatusMessage(`Geçersiz FEN: ${check.error}`);
      return;
    }
    setFen(fenInput.trim());
    setEvaluations([]);
    setStatusMessage('FEN pozisyonu başarıyla yüklendi.');
    runDeepEngineAnalysis(fenInput.trim());
  };

  const handleLoadPgn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pgnInput.trim()) return;
    try {
      const chess = new Chess();
      chess.loadPgn(pgnInput.trim());
      const historyVerbose = chess.history({ verbose: true });
      const replay = new Chess();
      const evalList: MoveCoachingEvaluation[] = [];

      historyVerbose.forEach((m, idx) => {
        const bFen = replay.fen();
        replay.move(m);
        const aFen = replay.fen();
        evalList.push(
          evaluatePlayedMove({
            beforeFen: bFen,
            afterFen: aFen,
            move: m,
            moveNumber: Math.floor(idx / 2) + 1,
          })
        );
      });

      setFen(chess.fen());
      setFenInput(chess.fen());
      setEvaluations(evalList);
      setStatusMessage(`PGN yüklendi ve ${evalList.length} hamle analiz edildi.`);
      runDeepEngineAnalysis(chess.fen());
    } catch {
      setStatusMessage('PGN ayrıştırılamadı. Lütfen geçerli bir PGN metni girin.');
    }
  };

  const lastMoveEval =
    evaluations.length > 0 ? evaluations[evaluations.length - 1] : null;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-navy-900/90 border border-slate-800 rounded-2xl p-4">
        <div>
          <h1 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Sliders className="w-5 h-5 text-emerald-400" />
            Analiz Stüdyosu, Pozisyon Editörü ve FEN/PGN Aracı
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            İstediğiniz FEN veya PGN oyununu içe aktarın, Stockfish MultiPV ile derin analiz yapın ve koçtan açıklama alın.
          </p>
        </div>

        <button
          type="button"
          onClick={() => runDeepEngineAnalysis(fen)}
          disabled={isAnalyzing}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-navy-950 font-semibold text-xs transition"
        >
          <Cpu className="w-4 h-4" />
          {isAnalyzing ? 'Stockfish Analiz Ediyor...' : 'Derin Motor Analizi Çalıştır'}
        </button>
      </div>

      {statusMessage && (
        <div className="px-4 py-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-200 text-xs">
          {statusMessage}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <div className="lg:col-span-7 space-y-4">
          {/* Preset Positions */}
          <div className="flex flex-wrap gap-1.5">
            {PRESET_POSITIONS.map((preset, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setFen(preset.fen);
                  setFenInput(preset.fen);
                  setEvaluations([]);
                  runDeepEngineAnalysis(preset.fen);
                }}
                className="px-2.5 py-1 rounded-lg bg-navy-900 hover:bg-navy-800 border border-slate-800 text-xs text-slate-300"
              >
                {preset.nameTr}
              </button>
            ))}
          </div>

          <InteractiveChessboard
            fen={fen}
            onMove={handleBoardMove}
            onRestart={() => {
              setFen(PRESET_POSITIONS[0].fen);
              setFenInput(PRESET_POSITIONS[0].fen);
              setEvaluations([]);
            }}
            customHighlightSquares={boardHighlights}
            customArrows={boardArrows}
          />

          <EvaluationGraph
            evaluations={evaluations}
            activePlyIndex={Math.max(0, evaluations.length - 1)}
            onSelectPly={(idx) => {
              const target = evaluations[idx];
              if (target) {
                setFen(target.afterFen);
                setFenInput(target.afterFen);
              }
            }}
          />

          {/* FEN & PGN Import / Export */}
          <div className="rounded-2xl bg-navy-900/95 border border-slate-800 p-4 space-y-4">
            <form onSubmit={handleLoadFen} className="space-y-2">
              <label
                htmlFor="fen-input-field"
                className="text-xs font-bold text-slate-300 flex items-center gap-1.5"
              >
                <FileCode2 className="w-4 h-4 text-emerald-400" />
                FEN Dizisi (İçe / Dışa Aktar)
              </label>
              <div className="flex gap-2">
                <input
                  id="fen-input-field"
                  type="text"
                  value={fenInput}
                  onChange={(e) => setFenInput(e.target.value)}
                  className="flex-1 px-3 py-1.5 rounded-xl bg-navy-950 border border-slate-700 text-xs font-mono text-slate-200"
                />
                <button
                  type="submit"
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-500 text-navy-950 font-semibold text-xs"
                >
                  <Upload className="w-3.5 h-3.5" />
                  FEN Yükle
                </button>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText(fen);
                    setStatusMessage('Güncel FEN panoya kopyalandı.');
                  }}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-navy-800 border border-slate-700 text-slate-200 text-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  Kopyala
                </button>
              </div>
            </form>

            <form onSubmit={handleLoadPgn} className="space-y-2">
              <label
                htmlFor="pgn-input-field"
                className="text-xs font-bold text-slate-300 block"
              >
                PGN Oyun Metni İçe Aktar ve Analiz Et
              </label>
              <div className="flex gap-2">
                <input
                  id="pgn-input-field"
                  type="text"
                  value={pgnInput}
                  onChange={(e) => setPgnInput(e.target.value)}
                  placeholder="Örn: 1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5"
                  className="flex-1 px-3 py-1.5 rounded-xl bg-navy-950 border border-slate-700 text-xs font-mono text-slate-200"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-xl bg-amber-500 text-navy-950 font-semibold text-xs"
                >
                  PGN Analiz Et
                </button>
              </div>
            </form>
          </div>
        </div>

        <div className="lg:col-span-5 h-[760px]">
          <CoachAssistantPanel
            fen={fen}
            lastMoveEval={lastMoveEval}
            engineResult={engineAnalysis}
            onHighlightBoard={(sqs, arrs) => {
              setBoardHighlights(sqs);
              setBoardArrows(arrs);
            }}
          />
        </div>
      </div>
    </div>
  );
};
