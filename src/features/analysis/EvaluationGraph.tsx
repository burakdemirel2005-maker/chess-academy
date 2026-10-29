import React from 'react';
import { MoveCoachingEvaluation } from '@/features/coach/coachEngine';
import { evaluationToExpectedPoints } from '@/engine/chessEngineAdapter';

export interface EvaluationGraphProps {
  evaluations: MoveCoachingEvaluation[];
  activePlyIndex: number;
  onSelectPly: (plyIndex: number) => void;
}

export const EvaluationGraph: React.FC<EvaluationGraphProps> = ({
  evaluations,
  activePlyIndex,
  onSelectPly,
}) => {
  if (evaluations.length === 0) {
    return (
      <div className="h-28 rounded-xl bg-navy-900/70 border border-slate-800 flex items-center justify-center text-xs text-slate-400 px-4 text-center">
        Hamle yapıldıkça pozisyon değerlendirme grafiği gerçek zamanlı olarak burada oluşturulur.
      </div>
    );
  }

  const width = 600;
  const height = 110;
  const midY = height / 2;

  const points = evaluations.map((ev, index) => {
    // Convert player-relative after score back to White perspective for consistent graph orientation
    const whiteCp =
      ev.cpAfterPlayer !== null
        ? ev.playerColor === 'w'
          ? ev.cpAfterPlayer
          : -ev.cpAfterPlayer
        : null;
    const whiteMate =
      ev.mateAfterPlayer !== null
        ? ev.playerColor === 'w'
          ? ev.mateAfterPlayer
          : -ev.mateAfterPlayer
        : null;

    const whiteWinProb = evaluationToExpectedPoints(whiteCp, whiteMate); // 0..100
    const x =
      evaluations.length === 1
        ? width / 2
        : (index / (evaluations.length - 1)) * (width - 24) + 12;
    const y = height - (whiteWinProb / 100) * (height - 16) - 8;

    return {
      x,
      y,
      ev,
      index,
      whiteCp,
      whiteMate,
    };
  });

  const polylinePoints = points.map((p) => `${p.x},${p.y}`).join(' ');
  const areaPoints = `${points[0].x},${midY} ${polylinePoints} ${
    points[points.length - 1].x
  },${midY}`;

  return (
    <figure className="rounded-xl bg-navy-900/90 border border-slate-800 p-3">
      <div className="flex items-center justify-between mb-1.5">
        <figcaption className="text-xs font-semibold text-slate-300">
          Oyun Değerlendirme Grafiği (Noktaya tıklayarak o hamleye gidebilirsin)
        </figcaption>
        <span className="text-[11px] text-slate-400">
          Üst: Beyaz Üstün • Alt: Siyah Üstün
        </span>
      </div>

      <svg
        role="img"
        aria-label="Hamlelere göre pozisyon değerlendirme grafiği"
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-24 bg-navy-950 rounded-lg border border-slate-800/80 overflow-visible"
      >
        <title>Pozisyon Değerlendirme Grafiği</title>
        {/* Center equality line */}
        <line
          x1={0}
          y1={midY}
          x2={width}
          y2={midY}
          stroke="#334155"
          strokeDasharray="4 4"
          strokeWidth={1}
        />

        {/* Shaded advantage polygon */}
        <polygon points={areaPoints} fill="rgba(16, 185, 129, 0.16)" />

        {/* Evaluation curve */}
        <polyline
          fill="none"
          stroke="#10b981"
          strokeWidth={2.2}
          points={polylinePoints}
        />

        {/* Interactive move nodes */}
        {points.map((pt) => {
          const isSelected = pt.index === activePlyIndex;
          const isBlunder = pt.ev.classification === 'blunder';
          const isMistake = pt.ev.classification === 'mistake';
          const dotColor = isBlunder
            ? '#ef4444'
            : isMistake
            ? '#f97316'
            : '#34d399';

          return (
            <g
              key={pt.index}
              onClick={() => onSelectPly(pt.index)}
              className="cursor-pointer"
            >
              <circle
                cx={pt.x}
                cy={pt.y}
                r={isSelected ? 6 : isBlunder || isMistake ? 4.5 : 3.5}
                fill={dotColor}
                stroke="#070b14"
                strokeWidth={1.5}
              />
            </g>
          );
        })}
      </svg>
    </figure>
  );
};
