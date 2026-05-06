"use client";

import type { AgentStep } from "@/lib/types";

const STEP_THEME: Record<string, { color: string; bg: string; label: string; icon: string }> = {
    USER:    { color: "#d0b8f8", bg: "rgba(208,184,248,0.06)", label: "DIRECTIVE", icon: "//" },
    START:   { color: "#ff00aa", bg: "rgba(255,0,170,0.06)",   label: "INIT",      icon: "◈"  },
    THINK:   { color: "#7858a8", bg: "rgba(120,88,168,0.06)",  label: "THINK",     icon: "~"  },
    TOOL:    { color: "#00f5ff", bg: "rgba(0,245,255,0.06)",   label: "EXEC",      icon: "→"  },
    OBSERVE: { color: "#f5ff00", bg: "rgba(245,255,0,0.06)",   label: "RECV",      icon: "◂"  },
    OUTPUT:  { color: "#00ff88", bg: "rgba(0,255,136,0.06)",   label: "OUTPUT",    icon: "✓"  },
    ERROR:   { color: "#ff0044", bg: "rgba(255,0,68,0.06)",    label: "ERR",       icon: "✕"  },
};

export type UIMessage = {
    kind: "USER" | "START" | "THINK" | "TOOL" | "OBSERVE" | "OUTPUT" | "ERROR";
    content: string;
    tool_name?: string;
    tool_args?: string;
};

export function StepBubble({ msg }: { msg: UIMessage }) {
    const t = STEP_THEME[msg.kind] ?? STEP_THEME.START;
    const isOutput = msg.kind === "OUTPUT";

    return (
        <div
            className="fade-up relative pl-3"
            style={{ borderLeft: `2px solid ${t.color}`, boxShadow: `inset 6px 0 16px ${t.bg}` }}
        >
            <div
                className="px-3 py-2.5"
                style={{
                    background: t.bg,
                    borderTop:    `1px solid ${t.color}22`,
                    borderRight:  `1px solid ${t.color}11`,
                    borderBottom: `1px solid ${t.color}11`,
                }}
            >
                {/* label row */}
                <div
                    className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] mb-1.5"
                    style={{ color: t.color, textShadow: `0 0 8px ${t.color}` }}
                >
                    <span>{t.icon}</span>
                    <span>{t.label}</span>
                    {msg.tool_name && (
                        <>
                            <span style={{ color: "var(--color-wire)", textShadow: "none" }}>::</span>
                            <span
                                className="normal-case tracking-normal text-[11px]"
                                style={{ color: "var(--color-neon-dim)", textShadow: "none" }}
                            >
                                {msg.tool_name}
                            </span>
                        </>
                    )}
                </div>

                {/* body */}
                <div
                    className={`break-words whitespace-pre-wrap leading-relaxed ${isOutput ? "text-[13.5px]" : "text-[12px]"}`}
                    style={{
                        color:      isOutput ? "var(--color-lime)" : "var(--color-chrome)",
                        textShadow: isOutput ? "0 0 10px var(--color-lime)" : "none",
                        fontFamily: "var(--font-mono)",
                    }}
                >
                    {msg.content}
                </div>

                {/* tool_args expandable */}
                {msg.tool_args && (
                    <details className="mt-2">
                        <summary
                            className="cursor-pointer text-[10px] uppercase tracking-[0.14em] select-none"
                            style={{ color: "var(--color-chrome-muted)" }}
                        >
                            [ ARGS ]
                        </summary>
                        <pre
                            className="mt-2 max-h-52 overflow-auto p-3 text-[11px] whitespace-pre-wrap break-all"
                            style={{
                                background:  "var(--color-void)",
                                border:      "1px solid var(--color-wire)",
                                color:       "var(--color-chrome-dim)",
                                fontFamily:  "var(--font-mono)",
                            }}
                        >
                            {msg.tool_args}
                        </pre>
                    </details>
                )}
            </div>
        </div>
    );
}

export function stepToMessage(step: AgentStep): UIMessage {
    return {
        kind:      step.step,
        content:   step.content ?? "",
        tool_name: step.tool_name,
        tool_args: step.tool_args,
    };
}
