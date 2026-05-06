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

    const haveInline = enabled && typeof html === "string" && html.length > 0;

    useEffect(() => {
        if (!enabled || haveInline) { setAvailable(false); setError(null); return; }
        let cancelled = false;
        setError(null); setAvailable(false);
        fetch(`/api/preview?file=scaler_clone/index.html&t=${refreshKey}`)
            .then((r) => {
                if (cancelled) return;
                if (r.ok) setAvailable(true);
                else setError(`NO_DATA · ${r.status}`);
            })
            .catch((e) => { if (!cancelled) setError(String(e)); });
        return () => { cancelled = true; };
    }, [refreshKey, enabled, haveInline]);

    const [blobUrl, setBlobUrl] = useState<string | null>(null);
    useEffect(() => {
        if (!haveInline || !html) { setBlobUrl(null); return; }
        const blob = new Blob([html], { type: "text/html;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        setBlobUrl(url);
        return () => URL.revokeObjectURL(url);
    }, [haveInline, html]);

    const openHref = haveInline
        ? (blobUrl ?? "#")
        : `/api/preview?file=scaler_clone/index.html&t=${refreshKey}`;
    const downloadHref = haveInline
        ? (blobUrl ?? "#")
        : `/api/preview?file=scaler_clone/index.html&download=1`;

    const live = enabled && (haveInline || available);

    return (
        <div
            className="flex flex-col h-full"
            style={{
                border:     "1px solid var(--color-wire)",
                boxShadow:  live
                    ? "0 0 24px rgba(0,245,255,0.07), inset 0 0 24px rgba(0,245,255,0.02)"
                    : "none",
                transition: "box-shadow 0.4s",
            }}
        >
            {/* header bar */}
            <div
                className="flex items-center justify-between px-4 py-2.5 shrink-0"
                style={{
                    borderBottom: "1px solid var(--color-wire)",
                    background:   "var(--color-void-2)",
                }}
            >
                <div className="flex items-center gap-3 min-w-0">
                    {/* neon traffic dots */}
                    <div className="flex gap-1.5 shrink-0">
                        <span className="w-[8px] h-[8px] rounded-full"
                            style={{ background: "#ff0044", boxShadow: "0 0 5px #ff0044" }} />
                        <span className="w-[8px] h-[8px] rounded-full"
                            style={{ background: "#f5ff00", boxShadow: "0 0 5px #f5ff00" }} />
                        <span className="w-[8px] h-[8px] rounded-full"
                            style={{ background: "#00ff88", boxShadow: "0 0 5px #00ff88" }} />
                    </div>
                    <div
                        className="text-[10px] uppercase tracking-[0.18em] truncate"
                        style={{ color: "var(--color-neon-dim)" }}
                    >
                        OUTPUT :: scaler_clone/index.html
                    </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    {/* live/idle badge */}
                    <span
                        className="text-[10px] uppercase tracking-[0.16em] flex items-center gap-1.5"
                        style={{ color: live ? "var(--color-neon)" : "var(--color-chrome-muted)" }}
                    >
                        <span
                            className={live ? "pulse-neon" : ""}
                            style={{
                                display: "inline-block", width: 6, height: 6, borderRadius: "50%",
                                background: live ? "var(--color-neon)" : "var(--color-chrome-muted)",
                                color:      live ? "var(--color-neon)" : "var(--color-chrome-muted)",
                                boxShadow:  live ? "0 0 6px var(--color-neon)" : "none",
                            }}
                        />
                        {live ? "LIVE" : "IDLE"}
                    </span>

                    {(["OPEN ↗", "GET ↓"] as const).map((label, i) => (
                        <a
                            key={label}
                            href={i === 0 ? openHref : downloadHref}
                            target={i === 0 ? "_blank" : undefined}
                            rel={i === 0 ? "noreferrer" : undefined}
                            download={i === 1 && haveInline ? "index.html" : undefined}
                            aria-disabled={!enabled}
                            className="text-[10px] uppercase tracking-[0.14em] px-2.5 py-1 transition-colors"
                            style={{
                                border:        "1px solid var(--color-wire)",
                                color:         enabled ? "var(--color-chrome-dim)" : "var(--color-chrome-muted)",
                                pointerEvents: enabled ? "auto" : "none",
                                opacity:       enabled ? 1 : 0.3,
                            }}
                            onMouseEnter={e => {
                                if (!enabled) return;
                                const hoverColor = i === 0 ? "var(--color-neon)" : "var(--color-magenta)";
                                e.currentTarget.style.borderColor = hoverColor;
                                e.currentTarget.style.color = hoverColor;
                            }}
                            onMouseLeave={e => {
                                e.currentTarget.style.borderColor = "var(--color-wire)";
                                e.currentTarget.style.color = "var(--color-chrome-dim)";
                            }}
                        >
                            {label}
                        </a>
                    ))}
                </div>
            </div>

            {/* preview frame */}
            <div className="flex-1 relative overflow-hidden" style={{ background: "var(--color-void-2)" }}>
                {haveInline ? (
                    <iframe
                        key={refreshKey}
                        srcDoc={html ?? ""}
                        className="w-full h-full"
                        title="preview"
                        sandbox="allow-scripts"
                    />
                ) : enabled && available ? (
                    <iframe
                        key={refreshKey}
                        src={`/api/preview?file=scaler_clone/index.html&t=${refreshKey}`}
                        className="w-full h-full"
                        title="preview"
                        sandbox="allow-same-origin allow-scripts"
                    />
                ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8">
                        <div
                            className="text-[10px] uppercase tracking-[0.22em] mb-6"
                            style={{ color: "var(--color-chrome-muted)" }}
                        >
                            [ NO_RENDER ]
                        </div>
                        <p
                            className="text-[20px] uppercase tracking-[0.1em] leading-snug"
                            style={{ fontFamily: "var(--font-display)", color: "var(--color-chrome-dim)" }}
                        >
                            {!enabled ? (
                                <>
                                    AWAITING<br />
                                    <span
                                        className="glow-neon"
                                        style={{ color: "var(--color-neon)" }}
                                    >
                                        SIGNAL...
                                    </span>
                                </>
                            ) : (
                                error ?? "RENDERING..."
                            )}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
