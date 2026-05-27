# Unistyles SSR RSS Repro

Minimal Next.js App Router repro for React Native Web + Unistyles SSR memory growth.

The root route is forced to render dynamically and renders a dense React Native Web screen with Unistyles style bindings. The load script starts the production server with `--expose-gc`, warms the SSR route, samples `/api/rss?gc=1`, runs traffic, samples RSS again, and prints the delta.

## Run

```bash
pnpm install
pnpm repro
```

`pnpm repro` runs `next build` and then the default load test:

```bash
node scripts/load-rss.mjs --rps 10000 --duration 30
```

## Useful Options

```bash
node scripts/load-rss.mjs --rps 10000 --duration 60 --concurrency 2048
node scripts/load-rss.mjs --port 3100 --rps 1000 --duration 10
node scripts/load-rss.mjs --rps 10000 --duration 5 --request-timeout 2000 --drain-timeout 5000
node scripts/load-rss.mjs --url http://127.0.0.1:3000 --rps 10000 --duration 30
```

Use `--url` when you want to start the server yourself, for example to compare an unpatched dependency against a PR branch. The reported `achievedRps` shows what the local machine actually delivered.
