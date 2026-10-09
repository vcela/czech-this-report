"use client";

import { useEffect, useState } from "react";

/** Counts up to `to` on mount; shows the final number at once when motion is reduced. */
export function CountUp({ to, locale, ms = 900 }: { to: number; locale: string; ms?: number }) {
  const [n, setN] = useState(to);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || to === 0) return;
    let raf = 0;
    const start = performance.now();
    const step = (t: number) => {
      const p = Math.min(1, (t - start) / ms);
      setN(Math.round(to * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [to, ms]);
  return <>{new Intl.NumberFormat(locale).format(n)}</>;
}
