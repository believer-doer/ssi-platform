"use client";

import { ReactNode, useEffect } from "react";

export function PollingCard({ active, intervalMs = 4000, onTick, children }: { active: boolean; intervalMs?: number; onTick: () => void; children: ReactNode }) {
  useEffect(() => {
    if (!active) return;
    onTick();
    const timer = setInterval(onTick, intervalMs);
    return () => clearInterval(timer);
  }, [active, intervalMs, onTick]);

  return <div>{children}</div>;
}
