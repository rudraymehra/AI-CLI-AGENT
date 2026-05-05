import path from "node:path";

// Vercel/Lambda style serverless: only /tmp is writable.
// Locally we keep generated/ under the project root for easy inspection.
export const GENERATED_ROOT = process.env.VERCEL
  ? "/tmp/generated"
  : path.resolve(process.cwd(), "generated");
