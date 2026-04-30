"use client";

import Image from "next/image";
import { useState } from "react";
import type { Sample, Urgency, Category } from "@/lib/samples";
import { MODELS, DEFAULT_MODEL_ID, modelById } from "@/lib/models";

type RiskAppetite = "cost_first" | "balanced" | "speed_first";

type AgentResponse = {
  ok: boolean;
  status: number;
  elapsedMs: number;
  body: unknown;
};

const CATEGORY_SHORT: Record<Category, string> = {
  plumbing: "plmb",
  electrical: "elec",
  hvac: "hvac",
  structural: "strc",
  pest: "pest",
  appliance: "appl",
  general: "gen",
};

const CATEGORY_DOT: Record<Category, string> = {
  plumbing: "bg-sky-500",
  electrical: "bg-amber-500",
  hvac: "bg-cyan-500",
  structural: "bg-orange-500",
  pest: "bg-rose-500",
  appliance: "bg-violet-500",
  general: "bg-slate-500",
};

function urgencyClasses(u: Urgency | string | undefined): string {
  switch (u) {
    case "emergency":
      return "bg-red-50 text-red-700 border-red-200";
    case "medium":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "low":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    default:
      return "bg-zinc-50 text-zinc-600 border-zinc-200";
  }
}

function statusClasses(status: number): string {
  if (status >= 500) return "text-red-600";
  if (status >= 400) return "text-amber-600";
  if (status >= 200) return "text-emerald-600";
  return "text-zinc-500";
}

interface TriageFormProps {
  samples: Sample[];
}

export function TriageForm({ samples }: TriageFormProps) {
  const [message, setMessage] = useState<string>(
    samples[0]?.message ??
      "leaky faucet under the kitchen sink, dripping all night",
  );
  const [risk, setRisk] = useState<RiskAppetite>("balanced");
  const [model, setModel] = useState<string>(DEFAULT_MODEL_ID);
  const [activeSample, setActiveSample] = useState<Sample | null>(
    samples[0] ?? null,
  );
  const [response, setResponse] = useState<AgentResponse | null>(null);
  const [pending, setPending] = useState<boolean>(false);

  function loadSample(s: Sample) {
    setActiveSample(s);
    setMessage(s.message);
    setResponse(null);
  }

  function clearSample() {
    setActiveSample(null);
    setResponse(null);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;
    setPending(true);
    setResponse(null);
    const start = performance.now();
    try {
      const res = await fetch("/api/run", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: message }],
          landlord_prefs: { risk_appetite: risk },
          model,
        }),
      });
      const text = await res.text();
      let body: unknown = text;
      try {
        body = JSON.parse(text);
      } catch {
        // keep as text
      }
      setResponse({
        ok: res.ok,
        status: res.status,
        elapsedMs: Math.round(performance.now() - start),
        body,
      });
    } catch (err) {
      setResponse({
        ok: false,
        status: 0,
        elapsedMs: Math.round(performance.now() - start),
        body: {
          error: {
            code: "client_fetch_failed",
            message: err instanceof Error ? err.message : String(err),
          },
        },
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-8 space-y-5 text-zinc-900">
      <Header />

      <SampleStrip
        samples={samples}
        activeId={activeSample?.id ?? null}
        onSelect={loadSample}
        onClear={clearSample}
      />

      <form onSubmit={onSubmit}>
        <Card title="Input">
          <div className="space-y-5">
            <div>
              <label
                htmlFor="msg"
                className="block text-sm font-medium text-zinc-900 mb-1.5"
              >
                Tenant message
              </label>
              <textarea
                id="msg"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                className="w-full rounded-md bg-white border border-zinc-200 p-3 text-sm leading-relaxed text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition"
                placeholder="What's going on at the unit?"
              />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <RiskRadio value={risk} onChange={setRisk} />
              <ModelSelect value={model} onChange={setModel} />
            </div>

            <PhotoStrip
              photos={activeSample?.photos ?? []}
              sampleLabel={
                activeSample
                  ? `#${activeSample.number} ${activeSample.id}`
                  : null
              }
            />

            <div className="flex items-center justify-between pt-1 border-t border-zinc-100">
              <span className="text-xs text-zinc-500">
                {message.trim().length} chars
              </span>
              <button
                type="submit"
                disabled={pending || !message.trim()}
                className="rounded-md bg-blue-600 px-5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {pending ? "Sending…" : "Send to agent →"}
              </button>
            </div>
          </div>
        </Card>
      </form>

      <ResponsePanel
        response={response}
        expected={activeSample?.expected ?? null}
        sampleLabel={
          activeSample ? `#${activeSample.number} ${activeSample.id}` : null
        }
      />
    </main>
  );
}

function Header() {
  return (
    <header className="pb-1">
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
        maintenance-triage
        <span className="text-zinc-400 font-normal"> · web test</span>
      </h1>
      <p className="mt-1 text-xs text-zinc-500">
        Agent <code className="text-emerald-600">localhost:8101</code> · Model{" "}
        <code className="text-amber-600">stub (POC-1)</code> · Schema mirrors
        the legacy <code>@liz/triage</code> two-stage shape so future POCs
        slot in without UI changes.
      </p>
    </header>
  );
}

interface SampleStripProps {
  samples: Sample[];
  activeId: string | null;
  onSelect: (s: Sample) => void;
  onClear: () => void;
}

function SampleStrip({
  samples,
  activeId,
  onSelect,
  onClear,
}: SampleStripProps) {
  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-medium text-zinc-900">
          Try a curated sample
          <span className="ml-2 text-xs font-normal text-zinc-500">
            ({samples.length})
          </span>
        </h2>
        {activeId && (
          <button
            type="button"
            onClick={onClear}
            className="text-xs text-zinc-500 hover:text-zinc-900 transition"
          >
            Clear selection
          </button>
        )}
      </div>
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
        {samples.map((s) => {
          const active = s.id === activeId;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => onSelect(s)}
              className={[
                "shrink-0 w-[136px] rounded-md border bg-white px-2.5 py-2 text-left transition",
                active
                  ? "border-blue-500 ring-2 ring-blue-500/20 shadow-sm"
                  : "border-zinc-200 hover:border-zinc-300 hover:shadow-sm",
              ].join(" ")}
              title={s.message}
            >
              <div className="flex items-center gap-1.5">
                <span
                  className={`inline-block h-1.5 w-1.5 rounded-full ${CATEGORY_DOT[s.category]}`}
                />
                <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-700">
                  #{s.number}
                </span>
                <span className="text-[10px] uppercase tracking-wider text-zinc-400">
                  {CATEGORY_SHORT[s.category]}
                </span>
              </div>
              <div
                className={[
                  "mt-1.5 inline-flex rounded border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide",
                  urgencyClasses(s.expected.urgency),
                ].join(" ")}
              >
                {s.expected.urgency}
              </div>
              {s.photos.length > 0 ? (
                <div className="mt-2 flex gap-1">
                  {s.photos.slice(0, 4).map((p) => (
                    <Image
                      key={p.filename}
                      src={p.url}
                      alt=""
                      width={20}
                      height={20}
                      style={{ width: "20px", height: "20px" }}
                      className="rounded-sm object-cover bg-zinc-100"
                    />
                  ))}
                  {s.photos.length > 4 && (
                    <span className="ml-0.5 text-[10px] text-zinc-500 self-center">
                      +{s.photos.length - 4}
                    </span>
                  )}
                </div>
              ) : (
                <div className="mt-2 text-[10px] text-zinc-400">no photos</div>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}

interface RiskRadioProps {
  value: RiskAppetite;
  onChange: (v: RiskAppetite) => void;
}

function RiskRadio({ value, onChange }: RiskRadioProps) {
  const options: { value: RiskAppetite; label: string; hint: string }[] = [
    {
      value: "cost_first",
      label: "Cost-first",
      hint: "Save money on borderline calls",
    },
    { value: "balanced", label: "Balanced", hint: "Default" },
    {
      value: "speed_first",
      label: "Speed-first",
      hint: "Resolve fast, even if pricier",
    },
  ];
  return (
    <div>
      <div className="text-sm font-medium text-zinc-900 mb-1.5">
        Landlord risk profile
        <span className="ml-2 text-xs font-normal text-zinc-500">
          (sent to agent · used by POC-2+)
        </span>
      </div>
      <div className="inline-flex rounded-md border border-zinc-200 bg-zinc-50 p-0.5">
        {options.map((o) => {
          const active = value === o.value;
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => onChange(o.value)}
              className={[
                "rounded px-3 py-1.5 text-xs font-medium transition",
                active
                  ? "bg-white text-zinc-900 shadow-sm border border-zinc-200"
                  : "text-zinc-500 hover:text-zinc-900",
              ].join(" ")}
              title={o.hint}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface ModelSelectProps {
  value: string;
  onChange: (v: string) => void;
}

function ModelSelect({ value, onChange }: ModelSelectProps) {
  // Group by provider for the <optgroup>s
  const groups = MODELS.reduce<Record<string, typeof MODELS>>((acc, m) => {
    (acc[m.provider] ||= []).push(m);
    return acc;
  }, {});
  const selected = modelById(value);

  return (
    <div>
      <div className="text-sm font-medium text-zinc-900 mb-1.5">
        Model
        <span className="ml-2 text-xs font-normal text-zinc-500">
          (OpenRouter · sent to agent in request body)
        </span>
      </div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition"
      >
        {Object.entries(groups).map(([provider, list]) => (
          <optgroup key={provider} label={provider}>
            {list.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} — ${m.cost_input}/${m.cost_output} per 1M
                {m.vision ? " · vision" : ""}
                {m.notes ? ` · ${m.notes}` : ""}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      {selected && (
        <div className="mt-1 text-xs text-zinc-500 tabular-nums">
          <code className="text-zinc-700">{selected.id}</code>
          <span className="mx-1.5 text-zinc-300">·</span>
          input ${selected.cost_input}/M
          <span className="mx-1.5 text-zinc-300">·</span>
          output ${selected.cost_output}/M
          {selected.vision && (
            <>
              <span className="mx-1.5 text-zinc-300">·</span>
              <span className="text-emerald-600">vision-capable</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}

interface PhotoStripProps {
  photos: { filename: string; url: string; contentType: string }[];
  sampleLabel: string | null;
}

function PhotoStrip({ photos, sampleLabel }: PhotoStripProps) {
  if (!sampleLabel) {
    return (
      <div className="text-xs text-zinc-500">
        <span className="font-medium text-zinc-700">Photos</span>
        <span className="ml-2">
          + Add… <span className="opacity-70">(POC-4 will wire vision)</span>
        </span>
      </div>
    );
  }

  if (photos.length === 0) {
    return (
      <div className="text-xs text-zinc-500">
        <span className="font-medium text-zinc-700">Photos</span>
        <span className="ml-2">no photos for {sampleLabel}</span>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <div className="text-sm font-medium text-zinc-900">
          Photos
          <span className="ml-2 text-xs font-normal text-zinc-500">
            {photos.length} from {sampleLabel}
          </span>
        </div>
        <span className="text-xs text-zinc-400">
          POC-4 will send these to the agent
        </span>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {photos.map((p) => (
          <a
            key={p.filename}
            href={p.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block shrink-0 group"
            title={`${p.filename} — open full size`}
          >
            <Image
              src={p.url}
              alt={p.filename}
              width={80}
              height={60}
              style={{ width: "80px", height: "60px" }}
              className="rounded-md border border-zinc-200 bg-zinc-100 object-cover group-hover:border-zinc-300 group-hover:shadow-sm transition"
            />
          </a>
        ))}
      </div>
    </div>
  );
}

interface ResponsePanelProps {
  response: AgentResponse | null;
  expected: Sample["expected"] | null;
  sampleLabel: string | null;
}

function ResponsePanel({
  response,
  expected,
  sampleLabel,
}: ResponsePanelProps) {
  const body = response?.body as
    | {
        message?: string;
        model?: string;
        usage?: {
          prompt_tokens?: number;
          completion_tokens?: number;
          total_tokens?: number;
        } | null;
        finish_reason?: string;
        gatekeeper?: {
          self_resolvable?: boolean;
          troubleshooting_guide?: string | null;
          confidence?: number;
        };
        classification?: {
          category?: string;
          urgency?: string;
          recommended_action?: string;
          cost_estimate_low?: number;
          cost_estimate_high?: number;
          confidence_score?: number;
        };
      }
    | undefined;

  const gk = body?.gatekeeper;
  const cls = body?.classification;

  return (
    <section className="rounded-lg border border-zinc-200 bg-white overflow-hidden shadow-sm">
      <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-2.5">
        <h2 className="text-sm font-medium text-zinc-900">Agent response</h2>
        {response && (
          <div className="flex items-center gap-3 text-xs">
            <span className={`font-medium ${statusClasses(response.status)}`}>
              HTTP {response.status || "—"}
            </span>
            {body?.model && (
              <span className="text-zinc-500">
                <code className="text-zinc-700">{body.model}</code>
              </span>
            )}
            {body?.usage?.total_tokens != null && (
              <span className="text-zinc-500 tabular-nums">
                {body.usage.total_tokens} tok
              </span>
            )}
            <span className="text-zinc-500 tabular-nums">
              {response.elapsedMs} ms
            </span>
          </div>
        )}
      </div>

      {!response && (
        <div className="px-4 py-8 text-center text-sm text-zinc-500">
          No response yet — submit the form above.
        </div>
      )}

      {response && (
        <div className="p-4 space-y-3">
          {body?.message && (
            <SubCard title="Reply">
              <div className="text-sm text-zinc-900 whitespace-pre-wrap leading-relaxed">
                {body.message}
              </div>
              {body?.finish_reason && body.finish_reason !== "stop" && (
                <div className="mt-2 text-xs text-amber-700">
                  finish_reason: {body.finish_reason}
                </div>
              )}
            </SubCard>
          )}
          <SubCard title="Gatekeeper">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <Field
                label="Self-resolvable"
                value={
                  gk?.self_resolvable === undefined
                    ? "—"
                    : gk.self_resolvable
                      ? "yes"
                      : "no"
                }
              />
              <Field
                label="Confidence"
                value={
                  gk?.confidence != null ? gk.confidence.toFixed(2) : "—"
                }
              />
            </div>
            <div className="mt-3 text-sm">
              <div className="text-xs text-zinc-500 mb-1">
                Troubleshooting guide
              </div>
              <div className="text-zinc-900 whitespace-pre-wrap">
                {gk?.troubleshooting_guide ?? "—"}
              </div>
            </div>
          </SubCard>

          <SubCard title="Classification">
            <div className="flex flex-wrap gap-2 mb-3">
              <Pill label="category" value={cls?.category ?? "—"} />
              <UrgencyPill value={cls?.urgency} />
              <Pill
                label="conf"
                value={
                  cls?.confidence_score != null
                    ? cls.confidence_score.toFixed(2)
                    : "—"
                }
              />
            </div>
            <div className="text-sm">
              <div className="text-xs text-zinc-500 mb-1">
                Recommended action
              </div>
              <div className="text-zinc-900 whitespace-pre-wrap">
                {cls?.recommended_action ?? "—"}
              </div>
            </div>
            <div className="mt-3 text-sm">
              <div className="text-xs text-zinc-500 mb-1">Cost estimate</div>
              <div className="text-zinc-900 tabular-nums">
                ${cls?.cost_estimate_low ?? "—"}{" "}
                <span className="text-zinc-400">–</span> $
                {cls?.cost_estimate_high ?? "—"}
              </div>
            </div>
          </SubCard>

          {expected && (
            <SubCard
              title={`Expected${sampleLabel ? ` · ${sampleLabel}` : ""}`}
              tone="info"
            >
              <div className="flex flex-wrap gap-2 mb-3">
                <Pill label="category" value={expected.category} />
                <UrgencyPill value={expected.urgency} />
                <Pill
                  label="conf"
                  value={expected.confidence_score.toFixed(2)}
                />
              </div>
              <div className="text-sm">
                <div className="text-xs text-zinc-500 mb-1">Action</div>
                <div className="text-zinc-900 whitespace-pre-wrap">
                  {expected.recommended_action}
                </div>
              </div>
              <div className="mt-3 text-xs text-zinc-500">
                Pass/fail vs. agent: ⏳ POC-5 will compare automatically
              </div>
            </SubCard>
          )}

          <details className="rounded-md border border-zinc-200 bg-zinc-50">
            <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-zinc-600 hover:text-zinc-900">
              Raw response
            </summary>
            <pre className="overflow-x-auto px-3 pb-3 pt-1 text-xs leading-relaxed text-zinc-800">
              {typeof body === "string"
                ? body
                : JSON.stringify(body, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </section>
  );
}

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-zinc-200 bg-white overflow-hidden shadow-sm">
      <div className="border-b border-zinc-200 px-4 py-2.5">
        <h2 className="text-sm font-medium text-zinc-900">{title}</h2>
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

function SubCard({
  title,
  tone,
  children,
}: {
  title: string;
  tone?: "info";
  children: React.ReactNode;
}) {
  const toneClass =
    tone === "info"
      ? "border-sky-200 bg-sky-50/40"
      : "border-zinc-200 bg-zinc-50/60";
  return (
    <div className={`rounded-md border ${toneClass} overflow-hidden`}>
      <div className="border-b border-zinc-200/70 px-3 py-1.5 text-xs uppercase tracking-wider text-zinc-500 bg-white/40">
        {title}
      </div>
      <div className="p-3">{children}</div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-zinc-500">{label}</div>
      <div className="mt-0.5 text-zinc-900">{value}</div>
    </div>
  );
}

function Pill({ label, value }: { label: string; value: string }) {
  return (
    <div className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs">
      <span className="text-zinc-500">{label}</span>
      <span className="font-medium text-zinc-900">{value}</span>
    </div>
  );
}

function UrgencyPill({ value }: { value: string | undefined }) {
  return (
    <div
      className={[
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium uppercase tracking-wide",
        urgencyClasses(value),
      ].join(" ")}
    >
      {value ?? "—"}
    </div>
  );
}
