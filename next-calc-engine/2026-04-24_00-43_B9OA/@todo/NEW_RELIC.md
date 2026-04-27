# New Relic — Full-Stack Monitoring

Full observability from frontend to backend using New Relic APM + Browser Agent.

## Overview

```
┌─────────────────────────────────────────────┐
│  CODE CHANGES (what we implement)           │
│                                             │
│  1. yarn add newrelic                       │
│     yarn add -D @types/newrelic             │
│  2. newrelic.js (agent config)              │
│  3. instrumentation.ts (Next.js hook)       │
│  4. next.config.ts (serverExternalPackages) │
│  5. app/layout.tsx (browser timing header)  │
│  6. .env (NEW_RELIC_LICENSE_KEY, APP_NAME)  │
│  7. .gitignore (newrelic_agent.log)         │
└─────────────────────────────────────────────┘
                    ↓
            Deploy / run app
                    ↓
┌─────────────────────────────────────────────┐
│  NEW RELIC UI (manual steps)                │
│                                             │
│  1. APM → "Test the connection"             │
│  2. Browser → "Install with APM" → Node.js  │
│  3. Select app → done!                      │
└─────────────────────────────────────────────┘
                    ↓
        Frontend + Backend monitored 🎉
```

## Coverage

| Layer              | What it monitors                          | How                                            |
| ------------------ | ----------------------------------------- | ---------------------------------------------- |
| **Backend (APM)**  | API routes, SSR, Supabase calls, errors   | `newrelic` agent via `instrumentation.ts`      |
| **Frontend (RUM)** | Page load, Web Vitals, JS errors, AJAX    | `getBrowserTimingHeader()` in `layout.tsx`     |
| **Correlation**    | End-to-end traces front → back            | Distributed Tracing (automatic)                |
| **Logs**           | console.log/error with trace IDs          | `application_logging.forwarding`               |

A single **Ingest License Key** covers APM + Browser + Logs + Distributed Tracing.

## Environment Variables

```env
NEW_RELIC_LICENSE_KEY=<your-license-key>   # required
NEW_RELIC_APP_NAME=next-calc-engine        # optional (defaults to next-calc-engine)
NEW_RELIC_LOG_LEVEL=info                   # optional (defaults to info)
```

---

## Implementation Steps

### Step 1 — Install dependencies

```bash
yarn add newrelic
yarn add -D @types/newrelic
```

> The `newrelic` package ships without TypeScript types, so `@types/newrelic`
> is required for `app/layout.tsx` to typecheck.

### Step 2 — Create `newrelic.js` (project root)

```js
'use strict'

exports.config = {
  app_name: [process.env.NEW_RELIC_APP_NAME || 'next-calc-engine'],
  license_key: process.env.NEW_RELIC_LICENSE_KEY || '',

  distributed_tracing: { enabled: true },
  browser_monitoring: { auto_instrument: true },
  application_logging: { forwarding: { enabled: true } },

  logging: { level: process.env.NEW_RELIC_LOG_LEVEL || 'info' },

  rules: {
    ignore: ['^/favicon.ico', '^/_next/'],
  },
}
```

### Step 3 — Create `instrumentation.ts` (project root)

Next.js official hook to load the agent before anything else runs server-side.

```ts
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('newrelic')
  }
}
```

> **Note:** `instrumentation.ts` is **stable since Next.js 15** — no
> `experimental.instrumentationHook` flag is needed (in fact it was
> removed in Next 15+). We're on Next 16, so just drop the file at the
> project root and Next picks it up automatically.

> **Why not `NODE_OPTIONS='-r newrelic'`?** The App Router's bundler can
> conflict with preloaded modules. `instrumentation.ts` is the official
> Next.js hook for this purpose.

### Step 4 — Modify `next.config.ts`

```diff
 import type { NextConfig } from "next";

-const nextConfig: NextConfig = {};
+const nextConfig: NextConfig = {
+  // Prevent webpack from bundling the New Relic agent
+  serverExternalPackages: ["newrelic"],
+};

 export default nextConfig;
```

> `serverExternalPackages` is the **stable** top-level option (replaces
> `experimental.serverComponentsExternalPackages` from older Next versions).

### Step 5 — Modify `app/layout.tsx`

Inject the Browser Agent script via `newrelic.getBrowserTimingHeader()`:

```diff
 import type { Metadata } from "next";
 import "./globals.css";
 import { GlobalLoading } from "@/components/GlobalLoading";

 export const metadata: Metadata = {
   title: "Calc Engine Builder",
   description: "Visual builder for JSON calculation engines",
 };

+async function getNewRelicBrowserHeader(): Promise<string> {
+  if (!process.env.NEW_RELIC_LICENSE_KEY) return "";
+  try {
+    const newrelic = await import("newrelic");
+    // hasToRemoveScriptWrapper: return only the JS payload (no <script> tags)
+    // so we can wrap it ourselves in a single <script> below.
+    return newrelic.getBrowserTimingHeader({ hasToRemoveScriptWrapper: true });
+  } catch {
+    return "";
+  }
+}
+
-export default function RootLayout({
+export default async function RootLayout({
   children,
 }: Readonly<{
   children: React.ReactNode;
 }>) {
+  const browserTimingHeader = await getNewRelicBrowserHeader();
+
   return (
     <html lang="pt-BR">
+      <head>
+        {browserTimingHeader && (
+          <script
+            type="text/javascript"
+            dangerouslySetInnerHTML={{ __html: browserTimingHeader }}
+          />
+        )}
+      </head>
       <body>
         <GlobalLoading />
         {children}
       </body>
     </html>
   );
 }
```

> **Note:** `getBrowserTimingHeader()` runs server-side on every request and
> generates a unique snippet that correlates with the current APM transaction.
> Do NOT cache it.

### Step 6 — Update `.env.example`

```env
# New Relic Monitoring (APM + Browser/RUM + Logs)
# Only NEW_RELIC_LICENSE_KEY is required — the same Ingest License Key covers
# APM, Browser (via getBrowserTimingHeader), Logs and Distributed Tracing.
NEW_RELIC_LICENSE_KEY=        # Ingest - License key (~40 chars, ends in NRAL)
NEW_RELIC_APP_NAME=next-calc-engine
NEW_RELIC_LOG_LEVEL=info
```

### Step 7 — Update `.gitignore`

```diff
+# new relic
+newrelic_agent.log
```

---

## Local Verification

```bash
yarn dev
```

Look for this line in the console (may take a few seconds after the first request):

```
New Relic for Node.js connected to collector.newrelic.com
```

Then hit any page (e.g. `http://localhost:3000`) so the agent flushes its
first transaction.

## New Relic UI Setup

After the local agent connects:

1. **Node.js APM wizard** → click **"Test the connection"** — should turn green
2. **Browser wizard** → "Install with APM" → "Node.js" → select your app
3. Wait ~2-3 minutes for data to appear in the Browser dashboard

### References

- [Node.js APM agent install](https://docs.newrelic.com/docs/apm/agents/nodejs-agent/installation-configuration/install-nodejs-agent/)
- [Browser monitoring via Node.js agent](https://docs.newrelic.com/docs/apm/agents/nodejs-agent/extend-your-instrumentation/browser-monitoring-nodejs-agent/)
- [Next.js instrumentation hook](https://nextjs.org/docs/app/api-reference/file-conventions/instrumentation)

---

## No changes needed

- **Dockerfile** — agent loads via `instrumentation.ts`, not `NODE_OPTIONS`
- **No new scripts** — existing `yarn start` works as-is
