"use client";

import { useEffect, useMemo, useRef, useState } from "react";

function getBaseUrl() {
  return (process.env.NEXT_PUBLIC_RAG_BASE_URL || "http://127.0.0.1:8000").replace(/\/$/, "");
}

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  meta?: string;
};

type QueryResponse = {
  final_answer: string;
  llm_answer: string;
  human_answer: string | null;
  source?: string;
};

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      text: "Hi there! Ask me anything and I will retrieve docs with hybrid search and answer for you.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement | null>(null);

  const canSend = useMemo(() => input.trim().length > 0 && !loading, [input, loading]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  async function handleSend(e?: React.FormEvent) {
    if (e) e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      text,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);
    setError(null);

    try {
      const url = `${getBaseUrl()}/query?user_query=${encodeURIComponent(text)}`;
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) {
        const body = await res.text();
        throw new Error(body || `Request failed: ${res.status}`);
      }
      const data: QueryResponse = await res.json();
      const reply = data.human_answer || data.final_answer || data.llm_answer || "No answer returned.";
      const meta = data.source === "semantic_cache" ? "(from cache)" : undefined;

      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        text: reply,
        meta,
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 text-zinc-900">
      <header className="border-b border-zinc-200 bg-white px-6 py-4 shadow-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-zinc-500">Chat</p>
            <h1 className="text-xl font-semibold">WhatsApp-style Assistant</h1>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-6 md:px-6">
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto rounded-2xl border border-zinc-200 bg-white/90 p-4 shadow-sm backdrop-blur"
          style={{ minHeight: "400px", maxHeight: "70vh" }}
        >
          <div className="space-y-3">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                    msg.role === "user"
                      ? "bg-indigo-600 text-white rounded-br-sm"
                      : "bg-zinc-100 text-zinc-900 rounded-bl-sm"
                  }`}
                >
                  <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                  {msg.meta && <p className="mt-1 text-[11px] opacity-80">{msg.meta}</p>}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-2xl rounded-bl-sm bg-zinc-100 px-3 py-2 text-xs text-zinc-600 shadow-sm">
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-zinc-400 border-t-transparent" />
                  Thinking...
                </div>
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        <form onSubmit={handleSend} className="mt-4 flex items-end gap-3">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={2}
            className="w-full rounded-2xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-800 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            placeholder="Type a message..."
          />
          <button
            type="submit"
            disabled={!canSend}
            className="flex items-center gap-2 rounded-2xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/80 border-t-transparent" />
                Sending...
              </>
            ) : (
              "Send"
            )}
          </button>
        </form>
      </main>
    </div>
  );
}
