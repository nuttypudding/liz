"use client";

import { useState } from "react";

type RunResult =
  | { ok: true; status: number; data: unknown }
  | { ok: false; status: number; error: string };

export default function Page() {
  const [input, setInput] = useState(
    "leaky faucet under the kitchen sink, dripping all night",
  );
  const [result, setResult] = useState<RunResult | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setResult(null);
    try {
      const res = await fetch("/api/run", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: input }],
        }),
      });
      const text = await res.text();
      let data: unknown = text;
      try {
        data = JSON.parse(text);
      } catch {
        // keep as text
      }
      if (res.ok) {
        setResult({ ok: true, status: res.status, data });
      } else {
        setResult({
          ok: false,
          status: res.status,
          error: typeof data === "string" ? data : JSON.stringify(data),
        });
      }
    } catch (err) {
      setResult({
        ok: false,
        status: 0,
        error: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <main
      style={{
        maxWidth: 720,
        margin: "0 auto",
        padding: "48px 24px",
      }}
    >
      <header style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, margin: 0, fontWeight: 600 }}>
          maintenance-triage · web test
        </h1>
        <p style={{ color: "#9aa0a6", marginTop: 8, fontSize: 14 }}>
          POC-1 · agent at <code>{"$AGENT_TRIAGE_URL"}</code> · returns{" "}
          <code>hello world</code>
        </p>
      </header>

      <form onSubmit={onSubmit}>
        <label
          htmlFor="msg"
          style={{ display: "block", fontSize: 14, marginBottom: 8 }}
        >
          Tenant message
        </label>
        <textarea
          id="msg"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={4}
          style={{
            width: "100%",
            background: "#16161a",
            color: "#e6e6e6",
            border: "1px solid #2a2a2f",
            borderRadius: 8,
            padding: 12,
            fontSize: 14,
            fontFamily: "inherit",
            boxSizing: "border-box",
          }}
        />
        <button
          type="submit"
          disabled={pending || input.trim() === ""}
          style={{
            marginTop: 12,
            background: pending ? "#2a2a2f" : "#3b82f6",
            color: "white",
            border: 0,
            padding: "10px 18px",
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 500,
            cursor: pending ? "default" : "pointer",
          }}
        >
          {pending ? "Sending…" : "Send"}
        </button>
      </form>

      {result && (
        <section style={{ marginTop: 32 }}>
          <h2 style={{ fontSize: 14, color: "#9aa0a6", margin: 0 }}>
            Response · HTTP {result.status}
          </h2>
          <pre
            style={{
              marginTop: 8,
              background: result.ok ? "#0f1f12" : "#1f1010",
              border: `1px solid ${result.ok ? "#1f3a23" : "#3a1f1f"}`,
              color: result.ok ? "#86efac" : "#fca5a5",
              padding: 16,
              borderRadius: 8,
              fontSize: 13,
              overflowX: "auto",
              whiteSpace: "pre-wrap",
            }}
          >
            {result.ok
              ? JSON.stringify(result.data, null, 2)
              : result.error}
          </pre>
        </section>
      )}
    </main>
  );
}
