# New Relic — Full-Stack Monitoring

Full observability from frontend to backend using New Relic APM + Browser Agent.

## Overview

```
┌─────────────────────────────────────────────┐
│  CODE CHANGES (what we implement)           │
│                                             │
│  1. yarn add newrelic                       │
│  2. newrelic.js (agent config)              │
│  3. instrumentation.ts (Next.js hook)       │
│  4. next.config.ts (serverExternalPackages) │
│  5. app/layout.tsx (browser timing header)  │
│  6. .env (NEW_RELIC_LICENSE_KEY, APP_NAME)  │
└─────────────────────────────────────────────┘
                    ↓
            Deploy / run app
                    ↓
┌─────────────────────────────────────────────┐
│  NEW RELIC UI (manual steps)                │
│                                             │
│  1. APM → verify app appears                │
│  2. Browser → "Install with APM" → Node.js  │
│  3. Select app → done!                      │
└─────────────────────────────────────────────┘
                    ↓
        Frontend + Backend monitored 🎉
```

## Coverage

| Layer              | What it monitors                          | How                                           |
| ------------------ | ----------------------------------------- | ---------------------------------------------- |
| **Backend (APM)**  | API routes, SSR, Supabase calls, errors   | `newrelic` agent via `instrumentation.ts`       |
| **Frontend (RUM)** | Page load, Web Vitals, JS errors, AJAX    | `getBrowserTimingHeader()` in `layout.tsx`      |
| **Correlation**    | End-to-end traces front → back            | Distributed Tracing (automatic)                |
| **Logs**           | console.log/error with trace IDs          | `application_logging.forwarding`               |

## Environment Variables

```env
NEW_RELIC_LICENSE_KEY=<your-license-key>
NEW_RELIC_APP_NAME=next-calc-engine
NEW_RELIC_LOG_LEVEL=info
```

---

## Implementation Steps

### Step 1 — Install dependency

```bash
yarn add newrelic
```

### Step 2 — Create `newrelic.js` (project root)

```js
'use strict'

exports.config = {
  app_name: [process.env.NEW_RELIC_APP_NAME || 'next-calc-engine'],
  license_key: process.env.NEW_RELIC_LICENSE_KEY || 'REPLACE_ME',

  distributed_tracing: {
    enabled: true,
  },

  browser_monitoring: {
    auto_instrument: true,
  },

  application_logging: {
    forwarding: {
      enabled: true,
    },
  },

  logging: {
    level: process.env.NEW_RELIC_LOG_LEVEL || 'info',
  },

  rules: {
    ignore: [
      '^/favicon.ico',
      '^/_next/',
    ],
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

> **Why not `NODE_OPTIONS='-r newrelic'`?** The App Router's bundler can conflict with
> preloaded modules. `instrumentation.ts` is the official Next.js hook for this purpose.

### Step 4 — Modify `next.config.ts`

```diff
 import type { NextConfig } from "next";

-const nextConfig: NextConfig = {};
+const nextConfig: NextConfig = {
+  // Prevent webpack from bundling the New Relic agent
+  serverExternalPackages: ['newrelic'],
+
+  // Enable the instrumentation hook
+  experimental: {
+    instrumentationHook: true,
+  },
+};

 export default nextConfig;
```

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
+  if (process.env.NEW_RELIC_LICENSE_KEY) {
+    try {
+      const newrelic = await import('newrelic');
+      return newrelic.getBrowserTimingHeader();
+    } catch {
+      return '';
+    }
+  }
+  return '';
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

> **Note:** `getBrowserTimingHeader()` runs server-side on every request and generates
> a unique snippet that correlates with the current APM transaction. Do NOT cache it.

### Step 6 — Update `.env.example`

```diff
 NEXT_PUBLIC_SUPABASE_URL=
 SUPABASE_ANON_KEY=
 SUPABASE_SERVICE_ROLE_KEY=
+
+# New Relic Monitoring
+NEW_RELIC_LICENSE_KEY=
+NEW_RELIC_APP_NAME=next-calc-engine
+NEW_RELIC_LOG_LEVEL=info
```

### Step 7 — Update `.gitignore`

```diff
+# New Relic
+newrelic_agent.log
```

---

## New Relic UI Setup

After deploying with the code changes:

1. **Node.js APM wizard** → Select "On a host" → follow steps to get license key
2. **Browser wizard** → Select "Install with APM" → "Node.js" → select your app
3. Wait ~2-3 minutes for data to appear

### References

- [Node.js APM agent install](https://docs.newrelic.com/docs/apm/agents/nodejs-agent/installation-configuration/install-nodejs-agent/)
- [Browser monitoring via Node.js agent](https://docs.newrelic.com/docs/apm/agents/nodejs-agent/extend-your-instrumentation/browser-monitoring-nodejs-agent/)
- [Next.js instrumentation hook](https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation)

---

## No changes needed

- **Dockerfile** — agent loads via `instrumentation.ts`, not `NODE_OPTIONS`
- **No new scripts** — existing `yarn start` works as-is
