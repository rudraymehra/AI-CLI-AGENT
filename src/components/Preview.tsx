"use client";

import { useEffect, useState } from "react";

export function Preview({
    refreshKey,
    enabled,
    html,
}: {
    refreshKey: number;
    enabled: boolean;
    html?: string | null;
}) {
    const [available, setAvailable] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // if HTML was streamed via SSE, skip the fetch entirely
    const haveInline = enabled && typeof html === "string" && html.length > 0;

    useEffect(() => {
        if (!enabled || haveInline) {
            setAvailable(false);
            setError(null);
            return;
        }
        let cancelled = false;
        setError(null);
        setAvailable(false);
        fetch(`/api/preview?file=scaler_clone/index.html&t=${refreshKey}`)
            .then((r) => {
                if (cancelled) return;
                if (r.ok) setAvailable(true);
                else setError(`no preview yet · status ${r.status}`);
            })
            .catch((e) => {
                if (!cancelled) setError(String(e));
            });
        return () => {
            cancelled = true;
        };
    }, [refreshKey, enabled, haveInline]);

    // for "open" / "download": when we have inline HTML, build a blob URL so
    // the buttons work even if the on-disk file isn't reachable
    const [blobUrl, setBlobUrl] = useState<string | null>(null);
    useEffect(() => {
        if (!haveInline || !html) {
            setBlobUrl(null);
            return;
        }
        const blob = new Blob([html], { type: "text/html;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        setBlobUrl(url);
        return () => URL.revokeObjectURL(url);
    }, [haveInline, html]);

    const openHref = haveInline
        ? blobUrl ?? "#"
        : `/api/preview?file=scaler_clone/index.html&t=${refreshKey}`;
    const downloadHref = haveInline
        ? blobUrl ?? "#"
        : `/api/preview?file=scaler_clone/index.html&download=1`;

    const live = enabled && (haveInline || available);

    return (
        <div className="flex flex-col h-full">

            {/* terminal-style header */}
            <div className="flex items-center justify-between mb-3 pb-3 border-b border-[var(--color-rule)]">
                <div className="flex items-center gap-3 min-w-0">
                    {/* traffic light dots */}
                    <div className="flex gap-1.5 shrink-0">
                        <span className="w-[10px] h-[10px] rounded-full bg-rust" />
                        <span className="w-[10px] h-[10px] rounded-full bg-terra" />
                        <span className="w-[10px] h-[10px] rounded-full bg-acid-dim" />
                    </div>
                    <div className="min-w-0">
                        <div className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-muted">
                            preview
                        </div>
                        <div className="font-mono text-[12px] text-paper-dim truncate">
                            scaler_clone/index.html
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <span
                        className="font-mono text-[10px] uppercase tracking-[0.14em] flex items-center gap-1.5"
                        style={{ color: live ? "var(--color-acid)" : "var(--color-muted)" }}
                    >
                        <span
                            className={`w-[6px] h-[6px] rounded-full ${live ? "pulse-dot" : ""}`}
                            style={{
                                background: live ? "var(--color-acid)" : "var(--color-muted)",
                                boxShadow: live ? "0 0 0 4px rgba(199,255,61,0.18)" : "none",
                            }}
                        />
                        {live ? "live" : "idle"}
                    </span>

                    <a
                        href={openHref}
                        target="_blank"
                        rel="noreferrer"
                        aria-disabled={!enabled}
                        className={`font-mono text-[10.5px] uppercase tracking-[0.14em] px-3 py-1.5 rounded-full border border-[var(--color-rule)] transition-colors ${
                            enabled
                                ? "text-paper-dim hover:border-paper-dim hover:text-paper"
                                : "opacity-30 pointer-events-none"
                        }`}
                    >
                        open ↗
                    </a>
                    <a
                        href={downloadHref}
                        download={haveInline ? "index.html" : undefined}
                        aria-disabled={!enabled}
                        className={`font-mono text-[10.5px] uppercase tracking-[0.14em] px-3 py-1.5 rounded-full border border-[var(--color-rule)] transition-colors ${
                            enabled
                                ? "text-paper-dim hover:border-paper-dim hover:text-paper"
                                : "opacity-30 pointer-events-none"
                        }`}
                    >
                        download ↓
                    </a>
                </div>
            </div>

            {/* preview frame */}
            <div className="flex-1 rounded-md overflow-hidden border border-[var(--color-rule)] bg-paper relative">
                {haveInline ? (
                    <iframe
                        key={refreshKey}
                        srcDoc={html ?? ""}
                        className="w-full h-full"
                        title="Scaler clone preview"
                        sandbox="allow-scripts"
                    />
                ) : enabled && available ? (
                    <iframe
                        key={refreshKey}
                        src={`/api/preview?file=scaler_clone/index.html&t=${refreshKey}`}
                        className="w-full h-full"
                        title="Scaler clone preview"
                        sandbox="allow-same-origin allow-scripts"
                    />
                ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8 bg-[var(--color-ink-2)]">
                        <div className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-muted mb-4">
                            [ no render yet ]
                        </div>
                        <p className="font-display italic text-[20px] leading-tight text-paper-dim max-w-sm">
                            {!enabled
                                ? "send the agent an instruction. the rendered page lands here."
                                : (error ?? "waiting for the agent to write index.html...")}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
