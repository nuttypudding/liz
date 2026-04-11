"use client";

interface ConfidenceIndicatorProps {
  score: number; // 0-1
  size?: number;
}

export function ConfidenceIndicator({
  score,
  size = 48,
}: ConfidenceIndicatorProps) {
  const pct = Math.round(score * 100);
  const strokeWidth = 4;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - score);

  const color =
    score >= 0.85
      ? "text-green-500"
      : score >= 0.7
        ? "text-amber-500"
        : "text-red-500";

  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className="stroke-muted"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={`${color} transition-all duration-500`}
          style={{ stroke: "currentColor" }}
        />
      </svg>
      <span className="absolute text-xs font-semibold">{pct}%</span>
    </div>
  );
}
