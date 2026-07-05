const BAND_COLOR = {
  red: "var(--red)",
  orange: "var(--orange)",
  green: "var(--green)",
} as const;

export function bandOf(score: number): keyof typeof BAND_COLOR {
  if (score < 40) return "red";
  if (score < 70) return "orange";
  return "green";
}

export function ScoreGauge({
  score,
  label,
  bandLabel,
  size = 132,
}: {
  score: number;
  label: string;
  bandLabel: string;
  size?: number;
}) {
  const band = bandOf(score);
  const color = BAND_COLOR[band];
  const r = 54;
  const c = 2 * Math.PI * r;
  const filled = (score / 100) * c;

  return (
    <div className="flex flex-col items-center gap-2">
      <svg
        width={size}
        height={size}
        viewBox="0 0 132 132"
        role="img"
        aria-label={`${label}: ${score} / 100 — ${bandLabel}`}
      >
        <circle cx="66" cy="66" r={r} fill="none" stroke="var(--border)" strokeWidth="11" />
        <circle
          cx="66"
          cy="66"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="11"
          strokeLinecap="round"
          strokeDasharray={`${filled} ${c - filled}`}
          transform="rotate(-90 66 66)"
        />
        <text
          x="66"
          y="62"
          textAnchor="middle"
          fontSize="30"
          fontWeight="700"
          fill="var(--foreground)"
        >
          {score}
        </text>
        <text x="66" y="84" textAnchor="middle" fontSize="12" fill="var(--muted)">
          / 100
        </text>
      </svg>
      <div className="text-center">
        <div className="font-semibold text-sm">{label}</div>
        <div className="text-xs" style={{ color }}>
          {bandLabel}
        </div>
      </div>
    </div>
  );
}
