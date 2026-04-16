"use client";

import { RefreshCw, Bell } from "lucide-react";

interface TopbarProps {
  title: string;
  subtitle?: string;
  health: "HEALTHY" | "HALTED" | "DEGRADED" | "PENDING_WALLET";
  onResync: () => void;
}

export function Topbar({ title, subtitle, health, onResync }: TopbarProps) {
  return (
    <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b border-synod-border bg-synod-bg/80 px-8 backdrop-blur-md">
      <div className="flex-1">
        <h1 className="inline-block text-sm font-bold text-white">{title}</h1>
        {subtitle ? (
          <span className="ml-2 font-mono text-[10px] uppercase tracking-widest text-synod-muted-dark">
            {subtitle}
          </span>
        ) : null}
      </div>

      <div className="flex items-center gap-4">
        <div
          className={`status-pill ${
            health === "HEALTHY"
              ? "status-pill-healthy"
              : health === "HALTED"
                ? "status-pill-error"
                : "status-pill-warning"
          }`}
        >
          <div className="dot" />
          {health}
        </div>

        <div className="mx-2 h-4 w-[1px] bg-synod-border" />

        <button
          onClick={onResync}
          className="flex items-center gap-2 p-2 text-[11px] font-bold uppercase tracking-wider text-synod-muted transition-colors hover:text-white"
        >
          <RefreshCw size={14} />
          <span className="hidden sm:inline">Resync</span>
        </button>

        <div className="mx-2 h-4 w-[1px] bg-synod-border" />

        <button className="p-2 text-synod-muted transition-colors hover:text-white">
          <Bell size={18} />
        </button>
      </div>
    </header>
  );
}
