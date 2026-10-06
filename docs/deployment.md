# Vercel deployment

The frontend is plain HTML, CSS, and JavaScript ES modules. Vercel serves the static site and runs `api/persona-description.js` as a serverless function; no build command is required.

All persistent app data is stored in browser `localStorage` through `js/store.js`. The page used for the sale demo expects the supplied meme image at `assets/sell-meme.png`.

## AI endpoint configuration

Set these server-side environment variables in Vercel Project Settings → Environment Variables:

- `AI_API_KEY`: private provider key.
- `AI_API_URL`: full HTTPS URL for an OpenAI-compatible chat-completions endpoint.
- `AI_MODEL`: model identifier accepted by that endpoint.

`.env.example` contains placeholders only. For local Vercel Function testing, use `vercel dev` and a private `.env.local` file. Do not add secrets to frontend variables, source files, or Git.

The browser calls only the same-origin `/api/persona-description` endpoint. The function validates the submitted fields and persona, asks for a short stylistic rewrite without adding facts, and limits output to 360 characters. On missing configuration or provider failure, the card continues to show its normal description.

The endpoint also rejects cross-origin browser requests and applies a best-effort limit of 10 requests per minute per client IP on each warm function instance. This in-memory limit is not a substitute for provider quotas or platform-level abuse controls.

Run automated tests from the project root with `node --test`.
