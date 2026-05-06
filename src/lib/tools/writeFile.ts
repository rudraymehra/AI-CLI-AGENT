import { promises as fs } from "node:fs";
import path from "node:path";
import { GENERATED_ROOT as ROOT } from "../paths";

type WriteArgs = { filepath: string; content: string };

function parseArgs(args: unknown): WriteArgs | string {
  if (args && typeof args === "object" && "filepath" in args && "content" in args) {
    const o = args as Record<string, unknown>;
    return { filepath: String(o.filepath), content: String(o.content) };
  }
  if (typeof args === "string") {
    try {
      const o = JSON.parse(args);
      if (o && typeof o.filepath === "string" && typeof o.content === "string") {
        return { filepath: o.filepath, content: o.content };
      }
      return "Error: parsed args missing filepath/content";
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      return `Error: tool_args must be JSON-stringified {filepath, content}. Parse error: ${msg}`;
    }
  }
  return "Error: invalid tool_args for writeFile";
}

export async function writeFile(args: unknown) {
  const parsed = parseArgs(args);
  if (typeof parsed === "string") return parsed;
  const { filepath, content } = parsed;

  const target = path.resolve(ROOT, filepath);
  if (!target.startsWith(ROOT + path.sep) && target !== ROOT) {
    return `Refused: path escapes sandbox: ${filepath}`;
  }

  try {
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, content, "utf-8");
    const rel = path.relative(process.cwd(), target);
    return `Wrote ${content.length} bytes to ${rel}`;
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return `Error writing file: ${msg}`;
  }
}
