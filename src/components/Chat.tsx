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
    const [history, setHistory]   = useState<Turn[]>([]);
    const [input, setInput]       = useState(DEFAULT_TASK);
    const [running, setRunning]   = useState(false);
    const [previewKey, setPreviewKey]       = useState(0);
    const [previewEnabled, setPreviewEnabled] = useState(false);
    const [previewHtml, setPreviewHtml]     = useState<string | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
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

            const reader  = res.body.getReader();
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
                        if (line.startsWith("event:"))      event = line.slice(6).trim();
                        else if (line.startsWith("data:"))  dataLines.push(line.slice(5).trim());
                    }
                    let data: unknown;
                    try { data = JSON.parse(dataLines.join("\n")); } catch { continue; }
                    handleEvent(event, data);
                }
            }
        } catch (e: unknown) {
            append({ kind: "ERROR", content: e instanceof Error ? e.message : String(e) });
        } finally {
            setRunning(false);
            setPreviewEnabled(true);
            setPreviewKey((k) => k + 1);
        }
    }

    function handleEvent(event: string, data: unknown) {
        if (event === "step" && data && typeof data === "object") {
            const step = data as { step?: string };
            if (["START","THINK","TOOL","OUTPUT","OBSERVE"].includes(step.step ?? "")) {
                append(stepToMessage(data as Parameters<typeof stepToMessage>[0]));
            }
        } else if (event === "observe" && data && typeof data === "object") {
            const o = data as { content: unknown };
            append({ kind: "OBSERVE", content: typeof o.content === "string" ? o.content : JSON.stringify(o.content, null, 2) });
            setPreviewKey((k) => k + 1);
        } else if (event === "done" && data && typeof data === "object") {
            const d = data as { history?: Turn[] };
            if (Array.isArray(d.history)) setHistory(d.history);
            setPreviewKey((k) => k + 1);
        } else if (event === "file" && data && typeof data === "object") {
            const f = data as { filepath?: string; content?: string };
            if (typeof f.filepath === "string" && typeof f.content === "string" && /index\.html?$/i.test(f.filepath)) {
                setPreviewHtml(f.content);
                setPreviewEnabled(true);
                setPreviewKey((k) => k + 1);
            }
        } else if (event === "error" && data && typeof data === "object") {
            append({ kind: "ERROR", content: (data as { message?: string }).message ?? "Unknown error" });
        }
    }

    function reset() {
        setMessages([]);
        setHistory([]);
        setPreviewEnabled(false);
        setPreviewHtml(null);
        setPreviewKey((k) => k + 1);
    }

    const lastKind = messages[messages.length - 1]?.kind;
    const status = running
        ? lastKind === "TOOL"    ? "EXEC"
        : lastKind === "OBSERVE" ? "RECV"
        : "PROC"
        : messages.length ? "IDLE" : "READY";

    const statusColor = running
        ? "var(--color-neon)"
        : messages.length
        ? "var(--color-chrome-dim)"
        : "var(--color-magenta)";

    return (
        <div className="relative z-10 flex flex-col lg:flex-row gap-4 h-[100dvh] p-3 lg:p-5">

            {/* ── left: agent panel ── */}
            <section className="flex flex-col flex-1 min-w-0 lg:max-w-[55%]">

                {/* header */}
                <header
                    className="flex items-center justify-between gap-4 pb-4 mb-4"
                    style={{ borderBottom: "1px solid var(--color-wire)" }}
                >
                    <div>
                        <div
                            className="text-[9.5px] uppercase tracking-[0.24em] mb-1.5"
                            style={{ color: "var(--color-chrome-muted)" }}
                        >
                            <span style={{ color: "var(--color-neon)" }}>◈</span>
                            {" "}NEURAL_AGENT · v3.0 ·{" "}
                            <span style={{ color: "var(--color-neon-dim)" }}>GEMINI-FLASH</span>
                        </div>
                        <h1
                            className="glitch flicker text-[38px] font-bold leading-none tracking-[0.06em] uppercase"
                            data-text="AGENT//"
                            style={{
                                fontFamily:  "var(--font-display)",
                                color:       "var(--color-chrome)",
                                textShadow:  "0 0 22px rgba(0,245,255,0.35)",
                            }}
                        >
                            AGENT//
                        </h1>
                        <p
                            className="text-[10.5px] mt-1 tracking-[0.14em] uppercase"
                            style={{ color: "var(--color-chrome-dim)" }}
                        >
                            autonomous code synthesis engine
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* status badge */}
                        <div
                            className="flex items-center gap-2 px-3 py-1.5 text-[9.5px] uppercase tracking-[0.2em]"
                            style={{
                                border:     `1px solid ${statusColor}`,
                                color:      statusColor,
                                boxShadow:  running ? `0 0 10px color-mix(in oklab, ${statusColor} 28%, transparent)` : "none",
                                transition: "all 0.3s",
                            }}
                        >
                            <span
                                className={running ? "pulse-neon" : ""}
                                style={{
                                    display: "inline-block", width: 6, height: 6, borderRadius: "50%",
                                    background: statusColor, color: statusColor,
                                }}
                            />
                            {status}
                        </div>

                        <button
                            type="button"
                            onClick={reset}
                            disabled={running}
                            className="text-[9.5px] uppercase tracking-[0.2em] px-3 py-1.5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            style={{ border: "1px solid var(--color-wire)", color: "var(--color-chrome-dim)" }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--color-crimson)"; e.currentTarget.style.color = "var(--color-crimson)"; }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--color-wire)";    e.currentTarget.style.color = "var(--color-chrome-dim)"; }}
                        >
                            RST ↺
                        </button>
                    </div>
                </header>

                {/* transcript */}
                <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-1.5 pr-1">
                    {messages.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center px-8 py-12">
                            <div
                                className="text-[10px] uppercase tracking-[0.24em] mb-6"
                                style={{ color: "var(--color-chrome-muted)" }}
                            >
                                [ AWAITING_INPUT ]
                            </div>
                            <p
                                className="text-[22px] leading-snug uppercase tracking-[0.08em]"
                                style={{ fontFamily: "var(--font-display)", color: "var(--color-chrome-dim)" }}
                            >
                                JACK IN.<br />
                                <span className="glow-neon" style={{ color: "var(--color-neon)" }}>BUILD.</span>
                            </p>
                            <p
                                className="text-[10px] tracking-[0.16em] uppercase mt-5"
                                style={{ color: "var(--color-chrome-muted)" }}
                            >
                                OUTPUT → <span style={{ color: "var(--color-neon-dim)" }}>./generated/</span>
                            </p>
                        </div>
                    ) : (
                        messages.map((m, i) => <StepBubble key={i} msg={m} />)
                    )}

                    {running && (
                        <div
                            className="flex items-center gap-2 px-3 py-2 text-[9.5px] uppercase tracking-[0.2em]"
                            style={{ color: "var(--color-neon-dim)" }}
                        >
                            <span
                                className="pulse-neon"
                                style={{ display: "inline-block", width: 5, height: 5, borderRadius: "50%", background: "var(--color-neon)", color: "var(--color-neon)" }}
                            />
                            PROCESSING...
                        </div>
                    )}
                </div>

                {/* input */}
                <div className="mt-4">
                    <div className="flex gap-2 items-end">
                        <div className="flex-1 relative">
                            <span
                                className="absolute left-3 top-[13px] text-[13px] select-none pointer-events-none"
                                style={{ color: "var(--color-neon)" }}
                            >
                                &gt;_
                            </span>
                            <textarea
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSend(); }}
                                disabled={running}
                                rows={3}
                                className="w-full resize-none pl-9 pr-3 py-3 text-[12px] leading-relaxed tracking-wide transition-all disabled:opacity-40"
                                style={{
                                    background:  "var(--color-void-2)",
                                    border:      "1px solid var(--color-wire)",
                                    color:       "var(--color-chrome)",
                                    fontFamily:  "var(--font-mono)",
                                    outline:     "none",
                                }}
                                onFocus={e => {
                                    e.currentTarget.style.borderColor = "var(--color-neon)";
                                    e.currentTarget.style.boxShadow   = "0 0 14px rgba(0,245,255,0.18), inset 0 0 14px rgba(0,245,255,0.04)";
                                }}
                                onBlur={e => {
                                    e.currentTarget.style.borderColor = "var(--color-wire)";
                                    e.currentTarget.style.boxShadow   = "none";
                                }}
                                placeholder="// enter directive. ⌘+↵ to execute."
                            />
                            <div
                                className="absolute right-3 bottom-2.5 text-[9.5px] uppercase tracking-[0.16em] pointer-events-none"
                                style={{ color: "var(--color-chrome-muted)" }}
                            >
                                ⌘+↵
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={handleSend}
                            disabled={running || !input.trim()}
                            className="text-[10px] uppercase tracking-[0.18em] font-bold px-5 py-3 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                            style={{
                                background:  "var(--color-neon)",
                                color:       "var(--color-void)",
                                border:      "1px solid var(--color-neon)",
                                boxShadow:   "0 0 18px rgba(0,245,255,0.45)",
                                fontFamily:  "var(--font-display)",
                            }}
                            onMouseEnter={e => { if (!running && input.trim()) e.currentTarget.style.boxShadow = "0 0 32px rgba(0,245,255,0.75)"; }}
                            onMouseLeave={e => { e.currentTarget.style.boxShadow = "0 0 18px rgba(0,245,255,0.45)"; }}
                        >
                            EXEC →
                        </button>
                    </div>

                    <div
                        className="mt-2 flex items-center justify-between text-[9.5px] uppercase tracking-[0.16em]"
                        style={{ color: "var(--color-chrome-muted)" }}
                    >
                        <span>
                            <span style={{ color: "var(--color-neon-dim)" }}>{messages.length}</span> STEPS ·{" "}
                            <span style={{ color: "var(--color-neon-dim)" }}>{(history.length / 2) | 0}</span> TURNS
                        </span>
                        <span>NEURAL_AGENT // FOR LEARNING ONLY</span>
                    </div>
                </div>
            </section>

            {/* ── right: preview panel ── */}
            <section className="flex flex-col flex-1 min-w-0 lg:max-w-[45%]">
                <Preview refreshKey={previewKey} enabled={previewEnabled} html={previewHtml} />
            </section>
        </div>
    );
}
