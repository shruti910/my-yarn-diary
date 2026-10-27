import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import * as Sentry from "@sentry/react";
import App from './App.tsx';
import { auth } from './lib/firebase.ts';
import './index.css';

// Automatically redirect relative /api/ requests to the production gateway if configured
const originalFetch = window.fetch;
window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
 const gatewayUrl = import.meta.env.VITE_GATEWAY_URL;
 let isApiRequest = false;
 const isApiUrl = (url: string | URL) => {
 const value = typeof url === 'string' ? url : url.pathname;
 return value.startsWith('/api/') || value.startsWith(`${window.location.origin}/api/`);
 };

 if (typeof input === 'string' || input instanceof URL) {
 isApiRequest = isApiUrl(input);
 } else if (input && typeof input === 'object' && 'url' in input) {
 isApiRequest = isApiUrl(input.url);
 }

 if (gatewayUrl) {
 const baseUrl = gatewayUrl.endsWith('/') ? gatewayUrl.slice(0, -1) : gatewayUrl;
 
 if (typeof input === 'string') {
 if (input.startsWith('/api/')) {
 input = `${baseUrl}${input}`;
 }
 } else if (input instanceof URL) {
 if (input.pathname.startsWith('/api/')) {
 input = new URL(`${baseUrl}${input.pathname}${input.search}`);
 }
 } else if (input && typeof input === 'object' && 'url' in input) {
 const requestUrl = input.url;
 const localApiPrefix = window.location.origin + '/api/';
 if (requestUrl.startsWith(localApiPrefix)) {
 const newUrl = requestUrl.replace(window.location.origin, baseUrl);
 input = new Request(newUrl, input);
 }
 }
 }

 // Firebase owns durable session persistence. Read the current ID token from
 // the SDK for each API call rather than using an app-managed token store.
 if (!isApiRequest || !auth.currentUser) {
 return originalFetch(input, init);
 }

 const apiRequest = new Request(input, init);
 const sendWithToken = async (forceRefresh = false) => {
 const idToken = await auth.currentUser!.getIdToken(forceRefresh);
 // Clone so a retry does not reuse a consumed request body (important for
 // uploads and browsers that enforce ReadableStream locking).
 const request = apiRequest.clone();
 request.headers.set('Authorization', `Bearer ${idToken}`);
 return originalFetch(request);
 };

 const response = await sendWithToken();
 if (response.status !== 401) return response;

 // Retry once with a forced refresh. Persistent failure remains a normal 401
 // for existing callers to handle (for example, sign-out after revocation).
 return sendWithToken(true);
};

// Resolve your secure production DSN target dynamically from Vite's environment context
const sentryDsn = import.meta.env.VITE_SENTRY_DSN || '';
const gatewayOrigin = import.meta.env.VITE_GATEWAY_URL;

if (sentryDsn) {
 Sentry.init({
 dsn: sentryDsn,
 environment: import.meta.env.VITE_APP_PROFILE || 'local',

 integrations: [
 Sentry.browserTracingIntegration(),
 ],

 tracesSampleRate: import.meta.env.DEV ? 1.0 : 0.1,

 //Propagates W3C traceparent headers across origins
 tracePropagationTargets: [
 "localhost",
 /^http:\/\/localhost:5173/,
 /^http:\/\/localhost:3000/, // Maps your Ingress Gateway entry context
 /^\/api\/v1/,
 ...(gatewayOrigin ? [gatewayOrigin] : []),
 ],

 // Compliance data governance block from your template sheet
 dataCollection: {
 // userInfo: false,
 // httpBodies: []
 }
 });
}

import { DialogProvider } from './components/DialogProvider';
import { PwaUpdatePrompt } from './components/PwaUpdatePrompt';

const container = document.getElementById("root");
if (container) {
 const root = createRoot(container);
 root.render(
 <StrictMode>
 <DialogProvider>
 <App />
 {/* Registers the service worker and prompts when a new build is waiting */}
 <PwaUpdatePrompt />
 </DialogProvider>
 </StrictMode>
 );
}
