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

export default function Home() {
  const [escalations, setEscalations] = useState<Escalation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [correctedAnswer, setCorrectedAnswer] = useState("");
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ragStatus, setRagStatus] = useState<"unknown" | "ok" | "down">("unknown");

  const selected = useMemo(
    () => escalations.find((e) => e.id === selectedId) ?? escalations[0],
    [escalations, selectedId]
  );

  useEffect(() => {
    fetchEscalations();
    checkRagHealth();
    const id = setInterval(fetchEscalations, 5000);
    const healthId = setInterval(checkRagHealth, 10000);
    return () => {
      clearInterval(id);
      clearInterval(healthId);
    };
  }, []);

  useEffect(() => {
    if (selected) {
      setSelectedId(selected.id);
      setCorrectedAnswer(selected.correctedAnswer ?? "");
      setNotes(selected.notes ?? "");
    }
  }, [selected]);

  async function fetchEscalations() {
    try {
      const res = await fetch("/api/escalations", { cache: "no-store" });
      const data = await res.json();
      setEscalations(data.escalations || []);
    } catch (err) {
      console.error("Failed to fetch escalations", err);
    }
  }

  async function checkRagHealth() {
    const base = process.env.NEXT_PUBLIC_RAG_BASE_URL || "http://127.0.0.1:8000";
    const url = `${base.replace(/\/$/, "")}/health`;
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error("health failed");
      setRagStatus("ok");
    } catch (err) {
      console.warn("RAG health check failed", err);
      setRagStatus("down");
    }
  }

  async function submitCorrection(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setIsSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/escalations/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          correctedAnswer,
          notes,
          status: "answered",
        }),
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Failed to save");
      }

      await fetchEscalations();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save";
      setError(message);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <header className="border-b border-zinc-200 bg-white px-6 py-4 shadow-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-zinc-500">Human Agent Console</p>
            <h1 className="text-xl font-semibold">Escalations</h1>
          </div>
          <div className="flex items-center gap-3">
            <RagStatusBadge status={ragStatus} />
            <button
              onClick={fetchEscalations}
              className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-800 shadow-sm hover:bg-zinc-100"
            >
              Refresh
            </button>
        </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-6 md:flex-row">
        <section className="w-full md:w-1/2">
          <div className="flex items-center justify-between pb-2">
            <h2 className="text-sm font-semibold text-zinc-700">Incoming</h2>
            <span className="text-xs text-zinc-500">{escalations.length} items</span>
          </div>
          <div className="space-y-3">
            {escalations.map((item) => {
              const isActive = item.id === selected?.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setSelectedId(item.id)}
                  className={`w-full rounded-lg border p-4 text-left shadow-sm transition hover:border-indigo-300 hover:shadow ${
                    isActive ? "border-indigo-400 ring-2 ring-indigo-100" : "border-zinc-200"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-sm font-semibold text-zinc-800 line-clamp-2">
                      {item.userQuery}
                    </div>
                    <StatusPill status={item.status} />
                  </div>
                  <div className="mt-2 text-xs text-zinc-500">
                    sim: {item.similarity?.toFixed(2) ?? "-"} / thr: {item.threshold ?? "-"}
                  </div>
                  <div className="mt-1 text-xs text-zinc-500">{new Date(item.createdAt).toLocaleString()}</div>
                </button>
              );
            })}
            {escalations.length === 0 && (
              <div className="rounded-lg border border-dashed border-zinc-200 p-6 text-center text-sm text-zinc-500">
                Waiting for escalations...
              </div>
            )}
          </div>
        </section>

        <section className="w-full md:w-1/2">
          {selected ? (
            <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-base font-semibold text-zinc-800">Details</h3>
                <StatusPill status={selected.status} />
              </div>

              <DetailItem label="User query" value={selected.userQuery} />
              <DetailItem label="AI answer" value={selected.aiAnswer} />

              {selected.references && selected.references.length > 0 && (
                <div className="mb-3">
                  <div className="mb-1 text-xs font-semibold uppercase text-zinc-500">References</div>
                  <ul className="list-disc space-y-1 pl-5 text-sm text-zinc-700">
                    {selected.references.map((ref, idx) => (
                      <li key={idx}>{ref}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="mb-4 grid grid-cols-2 gap-3 text-xs text-zinc-600">
                <div>
                  <div className="font-semibold text-zinc-500">Similarity</div>
                  <div>{selected.similarity?.toFixed(3) ?? "-"}</div>
                </div>
                <div>
                  <div className="font-semibold text-zinc-500">Threshold</div>
                  <div>{selected.threshold ?? "-"}</div>
                </div>
              </div>

              <form onSubmit={submitCorrection} className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase text-zinc-500">
                    Corrected answer
                  </label>
                  <textarea
                    className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                    rows={5}
                    placeholder="Provide the corrected response"
                    value={correctedAnswer}
                    onChange={(e) => setCorrectedAnswer(e.target.value)}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase text-zinc-500">Notes (optional)</label>
                  <textarea
                    className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                    rows={2}
                    placeholder="Add any guidance for the model or support agent"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
                {error && <div className="text-sm text-red-600">{error}</div>}
                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSaving ? "Saving..." : "Send correction"}
                  </button>
                  <span className="text-xs text-zinc-500">PATCH /api/escalations/[id]</span>
                </div>
              </form>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-zinc-200 p-6 text-center text-sm text-zinc-500">
              Select an escalation to view details.
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function StatusPill({ status }: { status: EscalationStatus }) {
  const styles =
    status === "answered"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : "bg-amber-50 text-amber-700 border-amber-200";

  return (
    <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${styles}`}>
      {status}
    </span>
  );
}

function DetailItem({ label, value }: { label: string; value?: string }) {
  return (
    <div className="mb-3">
      <div className="mb-1 text-xs font-semibold uppercase text-zinc-500">{label}</div>
      <div className="rounded-md border border-zinc-200 bg-zinc-50 p-2 text-sm text-zinc-800 whitespace-pre-wrap">
        {value || "-"}
      </div>
    </div>
  );
}

function RagStatusBadge({ status }: { status: "unknown" | "ok" | "down" }) {
  const label = status === "ok" ? "RAG connected" : status === "down" ? "RAG unreachable" : "Checking...";
  const color =
    status === "ok"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : status === "down"
        ? "bg-rose-50 text-rose-700 border-rose-200"
        : "bg-zinc-50 text-zinc-600 border-zinc-200";

  return (
    <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${color}`}>
      <span className="h-2 w-2 rounded-full bg-current" aria-hidden />
      {label}
    </span>
  );
}
