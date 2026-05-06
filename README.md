# Scaler Agent

So basically this is a Next.js app where Gemini runs a strict
START -> THINK -> TOOL -> OBSERVE -> OUTPUT loop, and at the end it writes
a self-contained `index.html` that looks like the Scaler Academy site.
You chat with it in the browser and it figures out the steps on its own.

## What's running under the hood

- Next.js 16 (App Router), React 19, TypeScript and Tailwind v4
- Google Gemini, default model is `gemini-2.5-flash-lite` (lowest tier but
  gives the highest free daily quota) via `@google/generative-ai`
- Server-Sent Events from `/api/agent` so the chat UI sees each step live
- File writes are sandboxed inside `./generated/`, nothing escapes that folder

## Running it locally

```bash
npm install
cp .env.local.example .env.local
# put your key inside .env.local:   GEMINI_API_KEY=...
# (optional) pick a different model: GEMINI_MODEL=gemini-2.5-flash
npm run dev
```

Then open http://localhost:3000 and the chat shows up.

## How the loop actually works

- Browser sends `{ message, history }` to `/api/agent`
- That route runs the agent server side and streams every step back over
  SSE, so you literally see the model reasoning in real time
- When the model emits a `TOOL` step, one of these gets called:
  `getTheWeatherOfCity`, `getGithubDetailsAboutUser`, `executeCommand`
  (only mkdir / ls / cat / echo / pwd are allowed, and only inside
  `./generated/`), and `writeFile` (which also stays inside `./generated/`)
- Once it writes `scaler_clone/index.html`, `/api/preview` serves that file
  and shows it in an iframe right next to the chat

## Folder layout

```
src/
  app/
    api/agent/route.ts     # the SSE agent loop
    api/preview/route.ts   # serves files from ./generated/
    page.tsx
    layout.tsx
  components/
    Chat.tsx
    StepBubble.tsx
    Preview.tsx
  lib/
    llm.ts                 # gemini client + safe JSON parsing
    prompt.ts              # the SYSTEM_PROMPT
    types.ts
    tools/
      index.ts             # the tool_map
      weather.ts
      github.ts
      exec.ts
      writeFile.ts
generated/                 # runtime output, gitignored
```

## Few things worth knowing

- This whole filesystem-based output is mainly for local dev. If you push
  it to a serverless host where the disk is read only, you'll have to swap
  `writeFile` and `exec` to in-memory and just stream the content over SSE.
- Conversation state is kept on the client side. The server returns the
  updated history on `done`, and the client sends it back on the next turn.
  Simple, and it just works.
