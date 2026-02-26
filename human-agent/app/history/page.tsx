"use client";

import { useEffect, useMemo, useState } from "react";

type EscalationStatus = "pending" | "answered";

type Escalation = {
  id: string;
  userQuery: string;
  aiAnswer: string;
  references?: string[];
  similarity?: number;
  threshold?: number;
  status: EscalationStatus;
  createdAt: string;
  updatedAt: string;
  correctedAnswer?: string;
  notes?: string;
};

export default function HistoryPage() {
  const [escalations, setEscalations] = useState<Escalation[]>([]);
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchHistory();
    const id = setInterval(fetchHistory, 15000);
    return () => clearInterval(id);
  }, []);

  async function fetchHistory() {
    try {
      setLoading(true);
      const res = await fetch("/api/escalations", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load history");
      const data = await res.json();
      setEscalations(data.escalations || []);
      setError(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load history";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;

    return escalations
      .filter((e) => e.status === "answered")
      .filter((e) => {
        if (!term) return true;
        return (
          e.userQuery.toLowerCase().includes(term) ||
          (e.correctedAnswer ?? e.aiAnswer).toLowerCase().includes(term)
        );
      })
      .filter((e) => {
        const created = new Date(e.createdAt);
        if (start && created < start) return false;
        if (end) {
          const endOfDay = new Date(end);
          endOfDay.setHours(23, 59, 59, 999);
          if (created > endOfDay) return false;
        }
        return true;
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [escalations, search, startDate, endDate]);

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-zinc-500">History</p>
          <h1 className="text-2xl font-semibold text-zinc-900">Answered escalations</h1>
          <p className="text-sm text-zinc-500">Search by query or date range.</p>
        </div>
        <div className="flex flex-wrap gap-3 text-sm text-zinc-700">
          <div className="flex flex-col">
            <label className="text-xs font-semibold text-zinc-500">Search</label>
            <input
              type="text"
              placeholder="Find by query or answer"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-60 rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
          </div>
          <div className="flex flex-col">
            <label className="text-xs font-semibold text-zinc-500">Start date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
          </div>
          <div className="flex flex-col">
            <label className="text-xs font-semibold text-zinc-500">End date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
          </div>
          <button
            onClick={fetchHistory}
            className="self-end rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-800 shadow-sm hover:bg-zinc-100"
          >
            Refresh
          </button>
        </div>
      </div>

      {error && <div className="mb-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>}
      {loading && <div className="mb-3 text-sm text-zinc-500">Loading...</div>}

      <div className="space-y-3">
        {filtered.map((item) => (
          <article key={item.id} className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="text-sm font-semibold text-zinc-800">{item.userQuery}</div>
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                answered
              </span>
            </div>
            <div className="mt-2 text-xs text-zinc-500">{new Date(item.createdAt).toLocaleString()}</div>
            <div className="mt-3 text-xs font-semibold uppercase text-zinc-500">Human-corrected answer</div>
            <div className="rounded-md border border-zinc-200 bg-zinc-50 p-2 text-sm text-zinc-800 whitespace-pre-wrap">
              {item.correctedAnswer || "-"}
            </div>
            <div className="mt-3 text-xs font-semibold uppercase text-zinc-500">Original AI answer</div>
            <div className="rounded-md border border-zinc-200 bg-white p-2 text-sm text-zinc-700 whitespace-pre-wrap">
              {item.aiAnswer}
            </div>
            {item.notes && (
              <div className="mt-3 text-xs text-zinc-600">
                <span className="font-semibold">Notes: </span>
                {item.notes}
              </div>
            )}
          </article>
        ))}

        {filtered.length === 0 && !loading && (
          <div className="rounded-lg border border-dashed border-zinc-200 p-8 text-center text-sm text-zinc-500">
            No answered escalations match your filters.
          </div>
        )}
      </div>
    </div>
  );
}
