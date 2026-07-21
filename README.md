# Zhynor PDF Toolkit

**100% Free • Unlimited Usage • Offline-First • No API Costs • Privacy First**

A complete browser-based PDF management platform — merge, split, edit, convert,
compress, sign, OCR, and analyze PDF files entirely on-device. No files are
ever uploaded to a server, there is no API key to configure, and there is no
usage limit.

## Run Locally

**Prerequisites:** Node.js (18+)

1. Install dependencies:
   `npm install`
2. Run the dev server:
   `npm run dev`

No `.env` file, API key, or backend is required — every tool (PDF.js,
pdf-lib, Tesseract.js, JSZip, Canvas) runs fully client-side.

## Build for Production

`npm run build`

This produces a static `dist/` folder — plain HTML/CSS/JS with no server
process attached to it.

## Deploy (Free, Zero Server Cost)

Because the app is 100% static, it can be hosted for free on any static
host, e.g.:

- **Cloudflare Pages** — connect the GitHub repo, build command
  `npm run build`, output directory `dist`
- GitHub Pages, Netlify, or Vercel (static mode) work the same way

There is no backend to provision, no server-side AI API, and no per-user
cost — the toolkit scales to unlimited users at $0 hosting cost beyond the
free tier of your chosen static host.