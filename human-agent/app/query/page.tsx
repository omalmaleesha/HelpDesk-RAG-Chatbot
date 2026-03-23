"use client";

import { useState } from "react";

function getBaseUrl() {
  return (process.env.NEXT_PUBLIC_RAG_BASE_URL || "http://127.0.0.1:8000").replace(/\/$/, "");
}

type QueryResponse = {
  query: string;
  retrieved_docs: number;
  top_documents_before_rerank: string[];
  top_documents_after_rerank: string[];
  top_metadatas: Record<string, unknown>[];
  llm_answer: string;
  final_answer: string;
  human_answer: string | null;
  verified_correct: boolean;
  source?: string;
};

export default function QueryPage() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<QueryResponse | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const url = `${getBaseUrl()}/query?user_query=${encodeURIComponent(query.trim())}`;
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) {
        const body = await res.text();
        throw new Error(body || `Request failed: ${res.status}`);
      }
      const data = (await res.json()) as QueryResponse;
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to run query");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <header className="border-b border-zinc-200 bg-white px-6 py-4 shadow-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-zinc-500">RAG Search</p>
            <h1 className="text-xl font-semibold">Hybrid Query</h1>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-6">
        <form onSubmit={handleSubmit} className="space-y-3">
          <label className="block text-sm font-medium text-zinc-700">
            Query
            <textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              rows={3}
              className="mt-2 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-800 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              placeholder="Ask anything..."
            />
          </label>
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={loading}
              className="rounded-md border border-indigo-200 bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Searching..." : "Search"}
            </button>
            {error && <span className="text-sm text-red-600">{error}</span>}
          </div>
        </form>

        {result && (
          <section className="grid gap-4 md:grid-cols-2">
            <div className="space-y-4">
              <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
                <h2 className="text-sm font-semibold text-zinc-700">LLM answer</h2>
                <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-800">{result.llm_answer}</p>
                {result.human_answer && (
                  <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3">
                    <div className="text-xs font-semibold uppercase text-amber-700">Human review</div>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-amber-900">{result.human_answer}</p>
                  </div>
                )}
                <div className="mt-3 flex items-center gap-2 text-xs text-zinc-600">
                  <span className="rounded-full bg-zinc-100 px-2 py-1 font-semibold text-zinc-800">Verified: {result.verified_correct ? "Yes" : "No"}</span>
                  {result.source === "semantic_cache" && (
                    <span className="rounded-full bg-emerald-100 px-2 py-1 font-semibold text-emerald-800">Cache hit</span>
                  )}
                </div>
              </div>

              <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
                <h2 className="text-sm font-semibold text-zinc-700">Top documents after rerank</h2>
                <ol className="mt-2 space-y-2 text-sm text-zinc-800">
                  {result.top_documents_after_rerank?.map((doc, idx) => (
                    <li key={idx} className="rounded-md bg-zinc-50 p-2">
                      <div className="text-xs font-semibold text-zinc-500">#{idx + 1}</div>
                      <p className="mt-1 whitespace-pre-wrap">{doc}</p>
                      {result.top_metadatas?.[idx] && (
                        <pre className="mt-2 overflow-x-auto rounded bg-zinc-100 p-2 text-[11px] text-zinc-700">
                          {JSON.stringify(result.top_metadatas[idx], null, 2)}
                        </pre>
                      )}
                    </li>
                  ))}
                </ol>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
                <h2 className="text-sm font-semibold text-zinc-700">Top documents before rerank</h2>
                <ol className="mt-2 space-y-2 text-sm text-zinc-800">
                  {result.top_documents_before_rerank?.map((doc, idx) => (
                    <li key={idx} className="rounded-md bg-zinc-50 p-2">
                      <div className="text-xs font-semibold text-zinc-500">#{idx + 1}</div>
                      <p className="mt-1 whitespace-pre-wrap">{doc}</p>
                    </li>
                  ))}
                </ol>
              </div>

              <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
                <h2 className="text-sm font-semibold text-zinc-700">Raw response</h2>
                <pre className="mt-2 max-h-90 overflow-auto rounded bg-zinc-100 p-3 text-[11px] text-zinc-700">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
