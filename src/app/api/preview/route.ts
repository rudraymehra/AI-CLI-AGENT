import { promises as fs } from "node:fs";
import path from "node:path";
import { GENERATED_ROOT as ROOT } from "@/lib/paths";

export const runtime = "nodejs";

function contentTypeFor(p: string) {
  const ext = path.extname(p).toLowerCase();
  if (ext === ".html" || ext === ".htm") return "text/html; charset=utf-8";
  if (ext === ".css") return "text/css; charset=utf-8";
  if (ext === ".js") return "application/javascript; charset=utf-8";
  if (ext === ".json") return "application/json; charset=utf-8";
  if (ext === ".svg") return "image/svg+xml";
  return "text/plain; charset=utf-8";
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const file = url.searchParams.get("file") ?? "scaler_clone/index.html";
  const download = url.searchParams.get("download") === "1";

  const target = path.resolve(ROOT, file);
  if (!target.startsWith(ROOT + path.sep) && target !== ROOT) {
    return new Response("Forbidden", { status: 403 });
  }

  try {
    const data = await fs.readFile(target);
    const headers: Record<string, string> = {
      "Content-Type": contentTypeFor(target),
      "Cache-Control": "no-store",
    };
    if (download) {
      headers["Content-Disposition"] = `attachment; filename="${path.basename(target)}"`;
    }
    return new Response(new Uint8Array(data), { headers });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
