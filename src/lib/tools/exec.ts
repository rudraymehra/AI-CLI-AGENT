import { exec } from "node:child_process";
import { promisify } from "node:util";
import { promises as fs } from "node:fs";
import { GENERATED_ROOT as ROOT } from "../paths";

const pexec = promisify(exec);
const ALLOWED = /^(mkdir|ls|cat|echo|pwd)\b/;
const FORBIDDEN = /[;&|`$><]/;

async function ensureRoot() {
  await fs.mkdir(ROOT, { recursive: true });
}

export async function executeCommand(args: unknown) {
  const cmd = typeof args === "string" ? args.trim() : String(args ?? "").trim();
  if (!cmd) return "Error: empty command";
  if (!ALLOWED.test(cmd)) {
    return `Refused: command not allow-listed. Allowed: mkdir, ls, cat, echo, pwd. Got: ${cmd}`;
  }
  if (FORBIDDEN.test(cmd)) {
    return "Refused: shell metacharacters (; | & ` $ > <) are not allowed";
  }
  await ensureRoot();
  try {
    const { stdout, stderr } = await pexec(cmd, {
      cwd: ROOT,
      timeout: 10_000,
      maxBuffer: 1024 * 1024,
    });
    return stdout || stderr || "(no output)";
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return `Error running command: ${msg}`;
  }
}
