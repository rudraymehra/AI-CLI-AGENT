"use client";

import type { AgentStep } from "@/lib/types";

// each step gets a colored left edge + a label colour. that's most of the design.
const STEP_THEME: Record<string, { stripe: string; label: string; arrow: string }> = {
    USER:    { stripe: "var(--color-paper-dim)", label: "text-paper-dim",   arrow: "›" },
    START:   { stripe: "var(--color-terra)",     label: "text-terra",       arrow: "▸" },
    THINK:   { stripe: "var(--color-muted)",     label: "text-muted",       arrow: "·" },
    TOOL:    { stripe: "var(--color-acid)",      label: "text-acid",        arrow: "→" },
    OBSERVE: { stripe: "var(--color-acid-dim)",  label: "text-acid-dim",    arrow: "◂" },
    OUTPUT:  { stripe: "var(--color-acid)",      label: "text-acid",        arrow: "✓" },
    ERROR:   { stripe: "#ef4444",                label: "text-red-400",     arrow: "✕" },
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
    const isUser = msg.kind === "USER";

    return (
        <div className="fade-up relative">
            {/* left stripe */}
            <div
                className="absolute left-0 top-0 bottom-0 w-[3px] rounded-full"
                style={{ background: t.stripe }}
            />

            <div
                className={`pl-5 pr-4 py-3 rounded-r-md ${
                    isUser
                        ? "bg-[var(--color-ink-2)]/40"
                        : "bg-[var(--color-ink-2)]/70 border border-[var(--color-rule)]/60"
                }`}
            >
                {/* header row: STEP · tool_name */}
                <div className={`flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.14em] ${t.label}`}>
                    <span>{t.arrow}</span>
                    <span className="font-semibold">{msg.kind}</span>
                    {msg.tool_name ? (
                        <>
                            <span className="text-[var(--color-rule)]">/</span>
                            <span className="text-paper-dim normal-case tracking-normal">
                                {msg.tool_name}
                            </span>
                        </>
                    ) : null}
                </div>

                {/* body */}
                <div
                    className={`mt-1.5 break-words whitespace-pre-wrap leading-relaxed ${
                        isOutput
                            ? "font-display italic text-[17px] text-paper"
                            : "text-[13.5px] text-paper/95"
                    }`}
                >
                    {msg.content}
                </div>

                {/* expandable tool_args */}
                {msg.tool_args ? (
                    <details className="mt-2 group">
                        <summary className="cursor-pointer font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted hover:text-paper-dim select-none">
                            <span className="opacity-60">[</span> tool_args <span className="opacity-60">]</span>
                        </summary>
                        <pre className="mt-2 max-h-64 overflow-auto rounded bg-[var(--color-ink)]/80 border border-[var(--color-rule)]/70 p-3 text-[11px] font-mono text-paper-dim whitespace-pre-wrap break-all">
                            {msg.tool_args}
                        </pre>
                    </details>
                ) : null}
            </div>
        </div>
    );
}

export function stepToMessage(step: AgentStep): UIMessage {
    return {
        kind: step.step,
        content: step.content ?? "",
        tool_name: step.tool_name,
        tool_args: step.tool_args,
    };
}
