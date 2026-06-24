import express, { Request, Response, NextFunction } from 'express';
import http from 'http';
import dotenv from 'dotenv';
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import crypto from 'crypto';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Firebase Admin SDK via modern modular functions
initializeApp({
  projectId: process.env.FIREBASE_PROJECT_ID
});

// Resolve target microservice internal network domain names
const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://localhost:8081';
const CROCHET_SERVICE_URL = process.env.CROCHET_SERVICE_URL || 'http://localhost:8082';
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8083';

// Built-in parser for non-proxied local middleware handlers
app.use(express.json({ limit: '12mb' }));

// Request Logger Middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`[Gateway Ingress] ${req.method} ${req.url} -> Processing...`);
  next();
});

function getUuidFromFirebaseUid(uid: string): string {
  const hash = crypto.createHash('md5').update(uid).digest('hex');
  return `${hash.substring(0, 8)}-${hash.substring(8, 12)}-3${hash.substring(13, 16)}-8${hash.substring(17, 20)}-${hash.substring(20, 32)}`;
}

/**
 * Firebase Security Guard Middleware
 * Validates the token's cryptographic signature, expiration limits, and integrity.
 */
const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization challenge failed. Bearer token missing.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    // Modern getAuth() utility validation
    const decodedToken = await getAuth().verifyIdToken(token);

    // Extract the immutable user ID
    const userId = decodedToken.uid;

    // Mutate the request headers to inject the downstream identity context
    req.headers['x-user-id'] = getUuidFromFirebaseUid(userId);
    req.headers['x-user-email'] = decodedToken.email || (req.headers['x-user-email'] as string) || '';
    req.headers['x-user-name'] = decodedToken.name || (req.headers['x-user-name'] as string) || '';
    req.headers['x-user-avatar'] = decodedToken.picture || (req.headers['x-user-avatar'] as string) || '';

    // Clean out the heavy Authorization header to unburden the internal proxy size
    delete req.headers['authorization'];

    next();
  } catch (err: any) {
    console.error('[Gateway Security Block] Inbound token verification failed:', err.message);
    return res.status(401).json({ error: 'Authentication challenge failed. Token is invalid or expired.' });
  }
};

/**
 * Streaming Reverse Proxy Helper
 */
const proxyTo = (targetUrl: string) => {
  return (req: Request, res: Response) => {
    const url = new URL(targetUrl);

    // Capture and propagate distributed tracing context headers across your virtual bridge
    const traceparent = req.headers['traceparent'] || req.headers['request-id'];
    const baggage = req.headers['baggage'];

    const options: http.RequestOptions = {
      hostname: url.hostname,
      port: url.port,
      path: req.originalUrl,
      method: req.method,
      headers: {
        ...req.headers,
        host: url.host,
        // Explicitly inject trace context forward into your JRE container network
        ...(traceparent && { 'traceparent': traceparent }),
        ...(baggage && { 'baggage': baggage }),
        'x-user-id': req.headers['x-user-id'] || ''
      }
    };

    const proxyReq = http.request(options, (proxyRes) => {
      res.writeHead(proxyRes.statusCode || 500, proxyRes.headers);
      proxyRes.pipe(res, { end: true });
    });

    proxyReq.on('error', (err) => {
      console.error(`[Gateway Routing Error] Failed connection to ${targetUrl}:`, err.message);
      res.status(503).json({ error: 'Service temporarily unavailable downstream.' });
    });

    // Check if express.json() pre-parsed the body. If so, write it back out to the proxy request.
    if (req.body && Object.keys(req.body).length > 0) {
      const bodyData = JSON.stringify(req.body);
      proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
      proxyReq.write(bodyData);
      proxyReq.end();
    } else {
      // Fallback for empty requests or streaming GET requests
      req.pipe(proxyReq, { end: true });
    }
  };
};

// =========================================================================
// SECURE EDGE ROUTING FABRIC (Protected by Firebase Auth Perimeter Guard)
// =========================================================================

// 1. User Account & Identity Validation Routing
app.use('/api/v1/users', authenticate, proxyTo(USER_SERVICE_URL));
app.use('/api/v1/auth', authenticate, proxyTo(USER_SERVICE_URL));

// 2. Crochet Projects, Patterns, Logs, & Gallery Routing
app.use('/api/v1/projects', authenticate, proxyTo(CROCHET_SERVICE_URL));
app.use('/api/v1/patterns', authenticate, proxyTo(CROCHET_SERVICE_URL));
app.use('/api/v1/categories', authenticate, proxyTo(CROCHET_SERVICE_URL));
app.use('/api/v1/gallery', authenticate, proxyTo(CROCHET_SERVICE_URL));

// 3. Generative Multimodal AI Analytics Routing
app.use('/api/v1/pattern-decoder', authenticate, proxyTo(AI_SERVICE_URL));
app.use('/api/v1/reverse-engineer', authenticate, proxyTo(AI_SERVICE_URL));
app.use('/api/v1/ai', authenticate, proxyTo(AI_SERVICE_URL));
app.use('/api/v1/chats', authenticate, proxyTo(AI_SERVICE_URL));

// Global Base Unprotected Health Analytics Route (Used by Docker healthchecks)
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'UP', service: 'Gateway Edge Operational' });
});

app.listen(PORT, () => {
  console.log(` Ingress Edge Gateway running securely on port ${PORT}`);
  console.log(`   -> Proxying Users to: ${USER_SERVICE_URL}`);
  console.log(`   -> Proxying Crochet to: ${CROCHET_SERVICE_URL}`);
  console.log(`   -> Proxying AI Core to: ${AI_SERVICE_URL}`);
});