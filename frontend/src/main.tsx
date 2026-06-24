import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import * as Sentry from "@sentry/react";
import App from './App.tsx';
import './index.css';

// Resolve your secure production DSN target dynamically from Vite's environment context
const sentryDsn = import.meta.env.VITE_SENTRY_DSN || '';

if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    environment: import.meta.env.VITE_APP_PROFILE || 'local',

    // Modern functional integrations hook for automatic browser performance tracking
    integrations: [
      Sentry.browserTracingIntegration(),
    ],

    // Capture 100% of frontend transactions during local dev/testing
    tracesSampleRate: 1.0,

    //Propagates W3C traceparent headers across origins
    tracePropagationTargets: [
      "localhost",
      /^http:\/\/localhost:5173/,
      /^http:\/\/localhost:3000/, // Maps your Ingress Gateway entry context
      /^\/api\/v1/,
    ],

    // Compliance data governance block from your template sheet
    dataCollection: {
      // userInfo: false,
      // httpBodies: []
    }
  });
  console.log('[Sentry Engine] Distributed performance tracing initialization complete.');
} else {
  console.warn('[Sentry Engine] VITE_SENTRY_DSN key missing. Running client on fallback standalone pipeline.');
}

import { DialogProvider } from './components/DialogProvider';

const container = document.getElementById("root");
if (container) {
  const root = createRoot(container);
  root.render(
    <StrictMode>
      <DialogProvider>
        <App />
      </DialogProvider>
    </StrictMode>
  );
}