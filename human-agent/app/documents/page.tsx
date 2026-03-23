"use client";

import { useState } from "react";

function getBaseUrl() {
  return (process.env.NEXT_PUBLIC_RAG_BASE_URL || "http://127.0.0.1:8000").replace(/\/$/, "");
}

type LoadResponse = {
  status: string;
  total_chunks: number;
  vectors: number;
  sample: Array<{ text: string; metadata: Record<string, unknown> }>;
};

type VerifyResponse = {
  status: string;
  total_docs: number;
  sample_docs: string[];
  sample_vectors: number[][];
  sample_metadata: Record<string, unknown>[];
};

export default function DocumentsPage() {
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [loadResult, setLoadResult] = useState<LoadResponse | null>(null);
  const [verifyResult, setVerifyResult] = useState<VerifyResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function callEndpoint<T>(path: string): Promise<T> {
    const url = `${getBaseUrl()}${path}`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(body || `Request failed: ${res.status}`);
    }
    return res.json();
  }

  async function handleLoad() {
    try {
      setLoading(true);
      setError(null);
      const data = await callEndpoint<LoadResponse>("/documents/load");
      setLoadResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load documents");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify() {
    try {
      setVerifying(true);
      setError(null);
      const data = await callEndpoint<VerifyResponse>("/documents/verify");
      setVerifyResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to verify documents");
    } finally {
      setVerifying(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <header className="border-b border-zinc-200 bg-white px-6 py-4 shadow-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-zinc-500">RAG Maintenance</p>
            <h1 className="text-xl font-semibold">Documents: Load & Verify</h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleLoad}
              disabled={loading}
              className="rounded-md border border-indigo-200 bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Loading..." : "Load documents"}
            </button>
            <button
              onClick={handleVerify}
              disabled={verifying}
              className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-800 shadow-sm hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {verifying ? "Verifying..." : "Verify"}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-6">
        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        <section className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-zinc-700">Load result</h2>
            {loadResult ? (
              <div className="mt-2 space-y-2 text-sm text-zinc-700">
                <div className="flex gap-2 text-zinc-600">
                  <span className="font-medium text-zinc-800">Status:</span>
                  <span>{loadResult.status}</span>
                </div>
                <div className="flex gap-2 text-zinc-600">
                  <span className="font-medium text-zinc-800">Chunks:</span>
                  <span>{loadResult.total_chunks}</span>
                </div>
                <div className="flex gap-2 text-zinc-600">
                  <span className="font-medium text-zinc-800">Vectors:</span>
                  <span>{loadResult.vectors}</span>
                </div>
                <div>
                  <p className="font-medium text-zinc-800">Sample (first 2):</p>
                  <ul className="mt-1 space-y-2 text-xs">
                    {loadResult.sample?.map((item, idx) => (
                      <li key={idx} className="rounded-md bg-zinc-50 p-2">
                        <div className="font-semibold text-zinc-800">Chunk {idx + 1}</div>
                        <p className="mt-1 whitespace-pre-wrap text-zinc-700">{item.text}</p>
                        {item.metadata && (
                          <pre className="mt-2 overflow-x-auto rounded bg-zinc-100 p-2 text-[11px] text-zinc-700">
                            {JSON.stringify(item.metadata, null, 2)}
                          </pre>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <p className="mt-2 text-sm text-zinc-500">No load result yet. Click &quot;Load documents&quot; to ingest.</p>
            )}
          </div>

          <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-zinc-700">Verify result</h2>
            {verifyResult ? (
              <div className="mt-2 space-y-2 text-sm text-zinc-700">
                <div className="flex gap-2 text-zinc-600">
                  <span className="font-medium text-zinc-800">Status:</span>
                  <span>{verifyResult.status}</span>
                </div>
                <div className="flex gap-2 text-zinc-600">
                  <span className="font-medium text-zinc-800">Total docs:</span>
                  <span>{verifyResult.total_docs}</span>
                </div>
                <div>
                  <p className="font-medium text-zinc-800">Sample docs:</p>
                  <ul className="mt-1 space-y-2 text-xs text-zinc-700">
                    {verifyResult.sample_docs?.map((doc, idx) => (
                      <li key={idx} className="rounded-md bg-zinc-50 p-2">
                        <div className="font-semibold text-zinc-800">Doc {idx + 1}</div>
                        <p className="mt-1 whitespace-pre-wrap">{doc}</p>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="font-medium text-zinc-800">Sample metadata:</p>
                  <pre className="mt-1 overflow-x-auto rounded bg-zinc-100 p-2 text-[11px] text-zinc-700">
                    {JSON.stringify(verifyResult.sample_metadata || [], null, 2)}
                  </pre>
                </div>
              </div>
            ) : (
              <p className="mt-2 text-sm text-zinc-500">No verification yet. Click &quot;Verify&quot; to inspect the store.</p>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
