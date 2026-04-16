"use client";

import Image from "next/image";
import {
  LayoutDashboard,
  Wallet,
  Cpu,
  ShieldCheck,
  FileText,
  History,
  Settings,
} from "lucide-react";

export type DashboardTab =
  | "overview"
  | "wallets"
  | "agents"
  | "policy"
  | "permits"
  | "activity"
  | "settings";

interface SidebarItem {
  id: DashboardTab;
  label: string;
  icon: React.ReactNode;
  badge?: number;
  badgeColor?: string;
}

interface SidebarProps {
  activeTab: DashboardTab;
  onTabChange: (tab: DashboardTab) => void;
  user: {
    name: string;
    email?: string;
    avatar?: string;
  };
  badges: {
    wallets: number;
    agents: number;
    permits: number;
  };
}

export function Sidebar({ activeTab, onTabChange, user, badges }: SidebarProps) {
  const navSections: Array<{ label: string; items: SidebarItem[] }> = [
    {
      label: "Core",
      items: [
        { id: "overview", label: "Overview", icon: <LayoutDashboard size={18} /> },
        { id: "wallets", label: "Wallets", icon: <Wallet size={18} />, badge: badges.wallets },
        { id: "agents", label: "Agents", icon: <Cpu size={18} />, badge: badges.agents },
      ],
    },
    {
      label: "Governance",
      items: [
        { id: "policy", label: "Policy & Rules", icon: <ShieldCheck size={18} /> },
        {
          id: "permits",
          label: "Permits",
          icon: <FileText size={18} />,
          badge: badges.permits,
          badgeColor: "amber",
        },
      ],
    },
    {
      label: "System",
      items: [
        { id: "activity", label: "Activity Log", icon: <History size={18} /> },
        { id: "settings", label: "Settings", icon: <Settings size={18} /> },
      ],
    },
  ];

  return (
    <aside className="sticky top-0 flex h-screen w-64 min-w-[256px] flex-col border-r border-synod-border bg-synod-card">
      <div className="flex flex-col items-start gap-1 border-b border-synod-border p-6">
        <Image
          src="/synod_logo.png"
          alt="Synod"
          width={104}
          height={20}
          className="-ml-0.5 h-5 w-auto object-contain"
        />
        <div className="mt-1 font-mono text-[8px] uppercase tracking-[0.2em] text-synod-muted">
          Capital Governance
        </div>
      </div>

      <nav className="flex-1 space-y-8 overflow-y-auto px-4 py-6">
        {navSections.map((section) => (
          <div key={section.label} className="space-y-1">
            <h3 className="mb-3 px-3 font-mono text-[9px] uppercase tracking-widest text-synod-muted-dark">
              {section.label}
            </h3>
            <div className="space-y-0.5">
              {section.items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  className={`group relative flex w-full items-center gap-3 rounded-sm px-3 py-2.5 transition-all duration-200 ${
                    activeTab === item.id
                      ? "bg-white/5 text-white shadow-sm"
                      : "text-synod-muted hover:bg-white/[0.03] hover:text-white"
                  }`}
                >
                  {activeTab === item.id ? (
                    <div className="absolute left-0 top-1/2 h-4 w-[2px] -translate-y-1/2 rounded-r-full bg-white" />
                  ) : null}
                  <span
                    className={
                      activeTab === item.id
                        ? "text-white"
                        : "text-synod-muted-dark group-hover:text-synod-muted"
                    }
                  >
                    {item.icon}
                  </span>
                  <span className="text-[13px] font-medium tracking-tight">{item.label}</span>
                  {item.badge ? (
                    <span
                      className={`ml-auto rounded-full px-1.5 py-0.5 font-mono text-[9px] font-bold ${
                        item.badgeColor === "amber"
                          ? "bg-[#F5A623] text-black"
                          : "bg-white/10 text-white"
                      }`}
                    >
                      {item.badge}
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-synod-border p-4">
        <div className="group flex cursor-pointer items-center gap-3 rounded-lg p-2 transition-colors hover:bg-white/5">
          <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-zinc-700 bg-zinc-800 text-[10px] font-bold uppercase text-white">
            {user.avatar || user.name.substring(0, 2)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-xs font-bold text-white">{user.name}</div>
            <div className="truncate font-mono text-[9px] uppercase tracking-wider text-synod-muted-dark">
              Mainnet / Treasury-1
            </div>
          </div>
          <Settings
            size={14}
            className="text-synod-muted-dark transition-colors group-hover:text-white"
          />
        </div>
      </div>
    </aside>
  );
}
