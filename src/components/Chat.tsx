"use client";

import { useEffect, useRef, useState } from "react";
import { StepBubble, stepToMessage, type UIMessage } from "./StepBubble";
import { Preview } from "./Preview";
import type { Turn } from "@/lib/types";

const DEFAULT_TASK = `Clone the Scaler Academy landing page into scaler_clone/index.html. Single self-contained file with embedded CSS and JS. Write your own copy — do not copy text from scaler.com.

Visual direction (match the current scaler.com aesthetic, NOT a dark theme):
• Background: clean white. Body text: deep navy (#0a1856 or similar).
• Accent: bright royal blue (~#2962ff) used for CTAs and highlight words.
• Typography: bold geometric sans-serif (system fallback if needed).
• Subtle diagonal "ray / sparkle" texture in the hero background (very faint blue lines radiating from the bottom).

Required sections:
1. Slim top announcement strip (dark navy bg, small white text, centered).
2. Sticky white Header — left: a small geometric logo mark + bold "SCALER" wordmark; center: uppercase nav links (Program ▾, Masterclass, AI Labs, Alumni, Resources ▾); right: outlined "Login" + filled bright-blue "Placement Report" pill CTA.
3. Hero — small uppercase blue eyebrow text framed by ‹ chevrons ›, then a HUGE bold dark-navy headline that breaks across 3 lines and has one phrase wrapped in a soft pale-blue highlight box AND another phrase in a blue gradient. Two-line subtext in muted gray. Below: a small uppercase "PROGRAMS" label and a row of 3–4 program name pills.
4. Footer — full-width dark navy strip: small white text "Need help? Talk to us at <number>" with a "Request a Call ↗" link aligned right.

Make it responsive, no external images.`;

export function Chat() {
    const [messages, setMessages] = useState<UIMessage[]>([]);
    const [history, setHistory] = useState<Turn[]>([]);
    const [input, setInput] = useState(DEFAULT_TASK);
    const [running, setRunning] = useState(false);
    const [previewKey, setPreviewKey] = useState(0);
    const [previewEnabled, setPreviewEnabled] = useState(false);
    const [previewHtml, setPreviewHtml] = useState<string | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        scrollRef.current?.scrollTo({
            top: scrollRef.current.scrollHeight,
            behavior: "smooth",
        });
    }, [messages]);

    function append(msg: UIMessage) {
        setMessages((m) => [...m, msg]);
    }

    async function handleSend() {
        const text = input.trim();
        if (!text || running) return;
        setInput("");
        setRunning(true);
        append({ kind: "USER", content: text });

        try {
            const res = await fetch("/api/agent", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: text, history }),
            });
            if (!res.ok || !res.body) {
                const errText = await res.text().catch(() => "");
                append({ kind: "ERROR", content: `Request failed: ${res.status} ${errText}` });
                setRunning(false);
                return;
            }

            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let buffer = "";

            while (true) {
                const { value, done } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });

                let sepIdx;
                while ((sepIdx = buffer.indexOf("\n\n")) !== -1) {
                    const block = buffer.slice(0, sepIdx);
                    buffer = buffer.slice(sepIdx + 2);
                    if (!block.trim()) continue;

                    let event = "message";
                    const dataLines: string[] = [];
                    for (const line of block.split("\n")) {
                        if (line.startsWith("event:")) event = line.slice(6).trim();
                        else if (line.startsWith("data:")) dataLines.push(line.slice(5).trim());
                    }
                    const dataStr = dataLines.join("\n");
                    let data: unknown;
                    try {
                        data = JSON.parse(dataStr);
                    } catch {
                        continue;
                    }
                    handleEvent(event, data);
                }
            }
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e);
            append({ kind: "ERROR", content: msg });
        } finally {
            setRunning(false);
            setPreviewEnabled(true);
            setPreviewKey((k) => k + 1);
        }
    }

    function handleEvent(event: string, data: unknown) {
        if (event === "step" && data && typeof data === "object") {
            const step = data as { step?: string };
            if (
                step.step === "START" ||
                step.step === "THINK" ||
                step.step === "TOOL" ||
                step.step === "OUTPUT"
            ) {
                append(stepToMessage(data as Parameters<typeof stepToMessage>[0]));
            } else if (step.step === "OBSERVE") {
                append(stepToMessage(data as Parameters<typeof stepToMessage>[0]));
            }
        } else if (event === "observe" && data && typeof data === "object") {
            const o = data as { content: unknown };
            append({
                kind: "OBSERVE",
                content:
                    typeof o.content === "string" ? o.content : JSON.stringify(o.content, null, 2),
            });
            setPreviewKey((k) => k + 1);
        } else if (event === "done" && data && typeof data === "object") {
            const d = data as { history?: Turn[] };
            if (Array.isArray(d.history)) setHistory(d.history);
            setPreviewKey((k) => k + 1);
        } else if (event === "file" && data && typeof data === "object") {
            const f = data as { filepath?: string; content?: string };
            if (
                typeof f.filepath === "string" &&
                typeof f.content === "string" &&
                /index\.html?$/i.test(f.filepath)
            ) {
                setPreviewHtml(f.content);
                setPreviewEnabled(true);
                setPreviewKey((k) => k + 1);
            }
        } else if (event === "error" && data && typeof data === "object") {
            const e = data as { message?: string };
            append({ kind: "ERROR", content: e.message ?? "Unknown error" });
        }
    }

    function reset() {
        setMessages([]);
        setHistory([]);
        setPreviewEnabled(false);
        setPreviewHtml(null);
        setPreviewKey((k) => k + 1);
    }

    // last step kind, used for the small status pill
    const lastKind = messages[messages.length - 1]?.kind;
    const status = running
        ? lastKind === "TOOL"
            ? "running tool"
            : lastKind === "OBSERVE"
            ? "observing"
            : "thinking"
        : messages.length
        ? "idle"
        : "ready";
    const statusColor = running ? "var(--color-acid)" : messages.length ? "var(--color-paper-dim)" : "var(--color-terra)";

    return (
        <div className="relative z-10 flex flex-col lg:flex-row gap-5 h-[100dvh] p-4 lg:p-6">

            {/* ─── left column ─── */}
            <section className="flex flex-col flex-1 min-w-0 lg:max-w-[56%]">

                {/* header */}
                <header className="flex items-end justify-between gap-4 pb-4 border-b border-[var(--color-rule)] mb-4">
                    <div>
                        <div className="flex items-baseline gap-2 font-mono text-[10.5px] uppercase tracking-[0.18em] text-muted">
                            <span>agent · v3.0</span>
                            <span className="text-[var(--color-rule)]">/</span>
                            <span className="text-paper-dim">gemini-flash</span>
                        </div>
                        <h1 className="font-display text-[44px] leading-none tracking-[-0.02em] font-semibold flex items-baseline gap-1.5">
                            scaler
                            <span className="w-[7px] h-[7px] rounded-full bg-acid translate-y-[-3px]" />
                        </h1>
                        <p className="font-display italic text-[15px] text-paper-dim mt-1">
                            an autonomous engineer that ships the page itself.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* status pill */}
                        <div className="flex items-center gap-2 px-2.5 py-1.5 border border-[var(--color-rule)] rounded-full">
                            <span
                                className={`w-[6px] h-[6px] rounded-full ${running ? "pulse-dot" : ""}`}
                                style={{ background: statusColor, boxShadow: running ? `0 0 0 4px color-mix(in oklab, ${statusColor} 25%, transparent)` : "none" }}
                            />
                            <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-paper-dim">
                                {status}
                            </span>
                        </div>

                        <button
                            type="button"
                            onClick={reset}
                            disabled={running}
                            className="font-mono text-[10.5px] uppercase tracking-[0.14em] px-3 py-1.5 rounded-full border border-[var(--color-rule)] text-paper-dim hover:border-paper-dim hover:text-paper transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            reset ↺
                        </button>
                    </div>
                </header>

                {/* transcript */}
                <div
                    ref={scrollRef}
                    className="flex-1 overflow-y-auto pr-1 space-y-2"
                >
                    {messages.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center px-8 py-12">
                            <div className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-muted mb-4">
                                [ awaiting instruction ]
                            </div>
                            <p className="font-display italic text-[26px] leading-tight text-paper-dim max-w-md">
                                tell it what to <span className="text-acid not-italic font-medium">build.</span> it
                                will plan, write, and verify on its own.
                            </p>
                            <p className="mt-6 font-mono text-[11px] text-muted">
                                files land in <span className="text-paper-dim">./generated/</span>
                            </p>
                        </div>
                    ) : (
                        messages.map((m, i) => <StepBubble key={i} msg={m} />)
                    )}

                    {running ? (
                        <div className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-muted px-2 pt-1 flex items-center gap-2">
                            <span className="w-[5px] h-[5px] rounded-full bg-acid pulse-dot" />
                            <span>thinking...</span>
                        </div>
                    ) : null}
                </div>

                {/* input */}
                <div className="mt-5">
                    <div className="flex gap-3 items-end">
                        <div className="flex-1 relative">
                            {/* terminal prompt indicator */}
                            <span className="absolute left-3 top-3 font-mono text-[12px] text-acid select-none pointer-events-none">▸</span>
                            <textarea
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSend();
                                }}
                                disabled={running}
                                rows={3}
                                className="w-full resize-none rounded-md border border-[var(--color-rule)] bg-[var(--color-ink-2)] pl-8 pr-3 py-3 text-[13.5px] font-mono leading-relaxed text-paper placeholder:text-muted focus:outline-none focus:border-acid/60 focus:ring-1 focus:ring-acid/30 disabled:opacity-50 transition-colors"
                                placeholder="type an instruction. cmd/ctrl+enter to send."
                            />
                            <div className="absolute right-3 bottom-2.5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted pointer-events-none">
                                ⌘ + ↵
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={handleSend}
                            disabled={running || !input.trim()}
                            className="font-mono text-[11px] uppercase tracking-[0.14em] font-semibold px-5 py-3 rounded-md bg-acid text-ink hover:bg-acid-dim transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            send →
                        </button>
                    </div>
                    <div className="mt-2 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
                        <span>{messages.length} step{messages.length === 1 ? "" : "s"} · {history.length / 2 | 0} turn{(history.length / 2 | 0) === 1 ? "" : "s"}</span>
                        <span>scaler clone — for learning purposes</span>
                    </div>
                </div>
            </section>

            {/* ─── right column: preview ─── */}
            <section className="flex flex-col flex-1 min-w-0 lg:max-w-[44%]">
                <Preview refreshKey={previewKey} enabled={previewEnabled} html={previewHtml} />
            </section>
        </div>
    );
}
