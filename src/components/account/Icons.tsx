/** Small line icons (24px grid, currentColor), decorative unless labelled by the caller. */
type P = { className?: string };
const base = (className = "h-5 w-5") => ({
  className,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
});

export const CoinsIcon = ({ className }: P) => (
  <svg {...base(className)}>
    <ellipse cx="9" cy="7" rx="6" ry="3" />
    <path d="M3 7v4c0 1.7 2.7 3 6 3s6-1.3 6-3V7" />
    <path d="M9 14v3c0 1.7 2.7 3 6 3s6-1.3 6-3v-4c0-1.6-2.4-2.9-5.5-3" />
  </svg>
);
export const ChatIcon = ({ className }: P) => (
  <svg {...base(className)}>
    <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12Z" />
    <path d="M9 10.5a3 3 0 1 1 4 2.8c-.6.3-1 .8-1 1.4v.3M12 17.5h.01" />
  </svg>
);
export const SparkIcon = ({ className }: P) => (
  <svg {...base(className)}>
    <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" />
    <circle cx="12" cy="12" r="2.5" />
  </svg>
);
export const BulbIcon = ({ className }: P) => (
  <svg {...base(className)}>
    <path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.4 1 1.1 1 1.9V16h5v-.2c0-.8.4-1.5 1-1.9A6 6 0 0 0 12 3Z" />
  </svg>
);
export const TargetIcon = ({ className }: P) => (
  <svg {...base(className)}>
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="5" />
    <circle cx="12" cy="12" r="1.2" />
  </svg>
);
export const CalendarIcon = ({ className }: P) => (
  <svg {...base(className)}>
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M3 10h18M8 3v4M16 3v4" />
  </svg>
);
export const RefreshIcon = ({ className }: P) => (
  <svg {...base(className)}>
    <path d="M20 11a8 8 0 0 0-14.6-4.5L4 8M4 4v4h4M4 13a8 8 0 0 0 14.6 4.5L20 16M20 20v-4h-4" />
  </svg>
);
export const ChartIcon = ({ className }: P) => (
  <svg {...base(className)}>
    <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
  </svg>
);
export const BoltIcon = ({ className }: P) => (
  <svg {...base(className)}>
    <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" />
  </svg>
);
export const GlobeIcon = ({ className }: P) => (
  <svg {...base(className)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
  </svg>
);

/** Icon per credit-spending action. */
export const KIND_ICON = {
  geo: ChatIcon,
  prompts: SparkIcon,
  topics: BulbIcon,
  competitors: TargetIcon,
} as const;
