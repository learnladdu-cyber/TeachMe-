"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const SELECTOR = [
  ".reveal",
  ".section-head",
  ".showcase-copy",
  ".showcase-art",
  ".cta-panel",
  ".stats-band",
  ".quote-card",
  ".plan-card",
].join(",");

// Scroll-triggered reveals.
//
// Content is hidden by CSS the moment the inline script adds `reveal-ready`, so
// this component must guarantee it will reveal everything again. It re-scans on
// every route change and on DOM mutations (client navigations, late mounts) and
// keeps a safety timer as a final fallback so text can never stay invisible.
export function ScrollReveal() {
  const pathname = usePathname();

  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("reveal-ready");

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const supportsIO = "IntersectionObserver" in window;

    let observer: IntersectionObserver | null = null;
    if (!reduce && supportsIO) {
      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              entry.target.classList.add("is-visible");
              observer?.unobserve(entry.target);
            }
          }
        },
        { threshold: 0, rootMargin: "0px 0px -10% 0px" },
      );
    }

    function reveal(el: HTMLElement) {
      if (el.classList.contains("is-visible")) return;
      if (!observer) {
        el.classList.add("is-visible");
        return;
      }
      observer.observe(el);
    }

    function scan() {
      document.querySelectorAll<HTMLElement>(SELECTOR).forEach(reveal);
    }

    scan();
    const raf = requestAnimationFrame(scan);

    // Client navigations and late-mounted content appear after the initial scan.
    let scheduled = false;
    const observerMutations = new MutationObserver(() => {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(() => {
        scheduled = false;
        scan();
      });
    });
    observerMutations.observe(document.body, { childList: true, subtree: true });

    // Final safety net: if anything is on screen but still hidden, show it.
    const safety = window.setInterval(() => {
      document.querySelectorAll<HTMLElement>(SELECTOR).forEach((el) => {
        if (el.classList.contains("is-visible")) return;
        const rect = el.getBoundingClientRect();
        if (rect.top < window.innerHeight && rect.bottom > 0) {
          el.classList.add("is-visible");
          observer?.unobserve(el);
        }
      });
    }, 1200);

    return () => {
      cancelAnimationFrame(raf);
      observerMutations.disconnect();
      observer?.disconnect();
      window.clearInterval(safety);
    };
  }, [pathname]);

  return null;
}
