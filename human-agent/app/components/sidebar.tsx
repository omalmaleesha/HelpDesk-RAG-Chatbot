"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";

type SidebarProps = {
  collapsed?: boolean;
  onToggle?: () => void;
};

const navItems = [
  { href: "/", label: "Escalations" },
  { href: "/history", label: "History" },
  { href: "/documents", label: "Documents" },
  { href: "/query", label: "Query" },
  { href: "/chat", label: "Chat" },
];

export function Sidebar({ collapsed = false, onToggle }: SidebarProps) {
  const pathname = usePathname();

  const activeMap = useMemo(() => {
    const map: Record<string, boolean> = {};
    navItems.forEach((item) => {
      map[item.href] = pathname === item.href || pathname.startsWith(item.href + "/");
    });
    return map;
  }, [pathname]);

  return (
    <aside
      className={`fixed left-0 top-0 z-20 h-full border-r border-zinc-200 bg-white/95 backdrop-blur transition-all duration-150 ${
        collapsed ? "w-16" : "w-56"
      }`}
    >
      <div className={`flex items-center ${collapsed ? "justify-center" : "justify-between"} px-4 py-4`}> 
        {!collapsed && (
          <div>
            <div className="text-xs uppercase tracking-wide text-zinc-500">Human Agent</div>
            <div className="text-lg font-semibold text-zinc-800">Console</div>
          </div>
        )}
        <button
          onClick={onToggle}
          aria-label="Toggle sidebar"
          className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs font-semibold text-zinc-700 shadow-sm hover:bg-zinc-50"
        >
          {collapsed ? ">" : "<"}
        </button>
      </div>
      <nav className="space-y-1 px-2 pb-4">
        {navItems.map((item) => {
          const active = activeMap[item.href];
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition hover:bg-indigo-50 hover:text-indigo-700 ${
                active ? "bg-indigo-50 text-indigo-700 border border-indigo-100" : "text-zinc-700"
              }`}
            >
              <span className={`${collapsed ? "sr-only" : "block"}`}>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
