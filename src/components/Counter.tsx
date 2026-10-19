"use client";

import { useEffect, useRef, useState } from "react";

const PATTERN = /^([^0-9]*)([0-9]+(?:\.[0-9]+)?)(.*)$/;

export function Counter({
  value,
  duration = 1700,
  className,
}: {
  value: string;
  duration?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const match = value.match(PATTERN);
  const animates = match !== null && /^[<>=~]?\s*\d/.test(value);
  const prefix = match?.[1] ?? "";
  const numStr = match?.[2] ?? "";
  const suffix = match?.[3] ?? "";
  const decimals = numStr.includes(".") ? numStr.split(".")[1].length : 0;

  const [display, setDisplay] = useState(value);

  useEffect(() => {
    if (!animates) return;
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDisplay(value);
      return;
    }

    const target = parseFloat(numStr);
    let raf = 0;

    const run = () => {
      const t0 = performance.now();
      const tick = (now: number) => {
        const p = Math.min(1, (now - t0) / duration);
        const eased = 1 - Math.pow(1 - p, 3);
        setDisplay(`${prefix}${(target * eased).toFixed(decimals)}${suffix}`);
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    };

    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          run();
          io.disconnect();
        }
      },
      { threshold: 0.4 },
    );
    io.observe(el);

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration]);

  return (
    <span ref={ref} className={className}>
      {display}
    </span>
  );
}
