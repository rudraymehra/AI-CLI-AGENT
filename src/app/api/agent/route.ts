import { sendWithRetry, safeParseStep } from "@/lib/llm";
import { tool_map, tool_names } from "@/lib/tools";
import type { Turn } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_ITERATIONS = 30;

export async function POST(req: Request) {
  let body: { message?: string; history?: Turn[] };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const message = body.message?.trim();
  const incomingHistory: Turn[] = Array.isArray(body.history)
    ? body.history.filter(
        (t) =>
          t &&
          (t.role === "user" || t.role === "model") &&
          Array.isArray(t.parts),
      )
    : [];
  if (!message) {
    return new Response(JSON.stringify({ error: "message is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const enc = new TextEncoder();
      const send = (event: string, data: unknown) => {
        controller.enqueue(
          enc.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
        );
      };

      const history: Turn[] = [...incomingHistory];
      let nextInput = message;
      let iterations = 0;
      let wroteAnyFile = false;       // did writeFile actually run successfully this turn
      let outputBlockedOnce = false;  // only push back once to avoid an infinite loop

      try {
        while (iterations++ < MAX_ITERATIONS) {
          let raw = "";
          let modelUsed = "";
          try {
            const out = await sendWithRetry(history, nextInput);
            raw = out.text;
            modelUsed = out.modelUsed;
          } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e);
            send("error", { message: `Gemini call failed: ${msg}` });
            break;
          }

          // Persist this turn into history.
          history.push({ role: "user", parts: [{ text: nextInput }] });
          history.push({ role: "model", parts: [{ text: raw }] });

          let parsed: {
            step?: string;
            content?: string;
            tool_name?: string;
            tool_args?: unknown;
          };
          try {
            parsed = safeParseStep(raw);
          } catch {
            nextInput = JSON.stringify({
              step: "OBSERVE",
              content:
                "Your last reply was not valid JSON. Re-emit exactly one JSON object matching the required schema, with no markdown fences.",
            });
            send("step", {
              step: "OBSERVE",
              content: "(internal) invalid JSON from model, asking it to retry",
            });
            continue;
          }

          send("step", { ...parsed, _model: modelUsed });

          if (parsed.step === "TOOL") {
            const name = String(parsed.tool_name ?? "");
            const fn = tool_map[name];
            let observation: unknown;
            if (!fn) {
              observation = `Tool "${name}" not available. Available: ${tool_names.join(", ")}`;
            } else {
              try {
                observation = await fn(parsed.tool_args);
              } catch (e: unknown) {
                const msg = e instanceof Error ? e.message : String(e);
                observation = `Error running ${name}: ${msg}`;
              }
            }
            // mark the run as having produced a real file write (string starting with "Wrote ")
            if (name === "writeFile" && typeof observation === "string" && observation.startsWith("Wrote ")) {
              wroteAnyFile = true;
            }
            send("observe", { content: observation });

            // For writeFile, also stream the content to the client so the
            // iframe can render via srcDoc — necessary on Vercel where /tmp
            // is per-Lambda and a follow-up GET may hit a different instance.
            if (name === "writeFile") {
              try {
                const args =
                  typeof parsed.tool_args === "string"
                    ? JSON.parse(parsed.tool_args)
                    : parsed.tool_args;
                if (
                  args &&
                  typeof args === "object" &&
                  typeof (args as { filepath?: unknown }).filepath === "string" &&
                  typeof (args as { content?: unknown }).content === "string"
                ) {
                  const a = args as { filepath: string; content: string };
                  send("file", { filepath: a.filepath, content: a.content });
                }
              } catch {
                // ignore — observation already streamed
              }
            }

            nextInput = JSON.stringify({ step: "OBSERVE", content: observation });
            continue;
          }

          if (parsed.step === "OUTPUT") {
            // guard: don't accept OUTPUT if no file was actually written. flash-lite
            // sometimes describes the task as if it were done — push back exactly once.
            if (!wroteAnyFile && !outputBlockedOnce) {
              outputBlockedOnce = true;
              nextInput = JSON.stringify({
                step: "OBSERVE",
                content:
                  "REJECTED. You emitted OUTPUT but never called the writeFile tool, so nothing exists on disk. Do NOT skip the work. Emit a TOOL step now with tool_name=\"writeFile\" and tool_args as a JSON-stringified object containing filepath (e.g. \"scaler_clone/index.html\") and content (the full HTML/CSS/JS). After it succeeds, then OUTPUT.",
              });
              send("step", {
                step: "OBSERVE",
                content: "(internal) blocked premature OUTPUT — forcing actual writeFile call",
              });
              continue;
            }
            break;
          }

          nextInput = JSON.stringify({
            step: "OBSERVE",
            content: "Continue with the next step.",
          });
        }

        if (iterations >= MAX_ITERATIONS) {
          send("error", { message: `Stopped: hit max iterations (${MAX_ITERATIONS})` });
        }

        send("done", { history });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
