"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isNavigating, setIsNavigating] = useState(false);
  const [progress, setProgress] = useState(0);

  // When pathname or search params change, complete the bar
  useEffect(() => {
    setIsNavigating(false);
    setProgress(100);
    const timeout = setTimeout(() => {
      setProgress(0);
    }, 200);
    return () => clearTimeout(timeout);
  }, [pathname, searchParams]);

  // Animate progress smoothly while navigating
  useEffect(() => {
    if (!isNavigating) return;

    setProgress(20);
    const timer1 = setTimeout(() => setProgress(45), 80);
    const timer2 = setTimeout(() => setProgress(75), 250);
    const timer3 = setTimeout(() => setProgress(90), 600);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [isNavigating]);

  // Intercept click on links to give immediate feedback
  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest("a");
      if (!target) return;

      const href = target.getAttribute("href");
      const targetAttr = target.getAttribute("target");

      if (
        !href ||
        targetAttr === "_blank" ||
        target.hasAttribute("download") ||
        href.startsWith("#") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:") ||
        e.metaKey ||
        e.ctrlKey ||
        e.shiftKey ||
        e.altKey
      ) {
        return;
      }

      // Check if it's an internal route that differs from current path
      try {
        const url = new URL(target.href, window.location.href);
        if (
          url.origin === window.location.origin &&
          (url.pathname !== window.location.pathname || url.search !== window.location.search)
        ) {
          setIsNavigating(true);
        }
      } catch {}
    };

    document.addEventListener("click", handleDocumentClick, { capture: true });
    return () => {
      document.removeEventListener("click", handleDocumentClick, { capture: true });
    };
  }, []);

  if (progress === 0 && !isNavigating) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[9999] pointer-events-none h-[2.5px] transition-all duration-200 ease-out"
      style={{
        width: `${progress}%`,
        opacity: progress === 100 ? 0 : 1,
        transition: progress === 100 ? "width 150ms ease-out, opacity 200ms 150ms" : "width 300ms ease-out",
      }}
    >
      <div className="w-full h-full bg-[#E50914] shadow-[0_0_12px_#E50914,0_0_6px_#FF1E2D]" />
    </div>
  );
}
