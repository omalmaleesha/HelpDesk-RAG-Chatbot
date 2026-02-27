"use client";

import { useState } from "react";
import { Sidebar } from "./sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex min-h-screen bg-linear-to-br from-white via-zinc-50 to-zinc-100 text-zinc-900">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
      <main
        className="flex-1 transition-[margin] duration-150"
        style={{ marginLeft: collapsed ? "72px" : "224px" }}
      >
        {children}
      </main>
    </div>
  );
}
