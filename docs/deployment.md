# Static deployment

The application is plain HTML, CSS, and JavaScript ES modules. Serve the project root over HTTP or deploy it as a static site on Vercel; no build command is required.

All persistent app data is stored in browser `localStorage` through `js/store.js`. The page used for the sale demo expects the supplied meme image at `assets/sell-meme.png`.

Run the automated unit tests from the project root with `node --test`.
