import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

interface LatencyStats {
  totalRequests: number;
  errorResponses: number;
  totalDurationMs: number;
  maxDurationMs: number;
  recentDurationsMs: number[];
}

const stats: LatencyStats = {
  totalRequests: 0,
  errorResponses: 0,
  totalDurationMs: 0,
  maxDurationMs: 0,
  recentDurationsMs: [],
};

/**
 * Middleware de Observabilidade Estruturada e Correlação Ponta a Ponta (Seção 5)
 * Propaga `X-Correlation-Id` integrando Mobile, controlador IoT e Backend API.
 */
export function correlationAndStructuredLogger(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const incomingId =
    (req.headers['x-correlation-id'] as string | undefined)?.trim() ||
    (req.body && typeof req.body.correlationId === 'string' ? req.body.correlationId.trim() : '');

  const correlationId =
    incomingId && incomingId.length >= 6 && incomingId.length <= 96
      ? incomingId.replace(/[^a-zA-Z0-9._:-]/g, '')
      : `sta-${crypto.randomUUID()}`;

  req.correlationId = correlationId;
  res.setHeader('X-Correlation-Id', correlationId);

  const start = performance.now();

  res.on('finish', () => {
    const durationMs = Math.round((performance.now() - start) * 100) / 100;

    stats.totalRequests += 1;
    if (res.statusCode >= 400) stats.errorResponses += 1;
    stats.totalDurationMs += durationMs;
    if (durationMs > stats.maxDurationMs) stats.maxDurationMs = durationMs;
    stats.recentDurationsMs.push(durationMs);
    if (stats.recentDurationsMs.length > 200) {
      stats.recentDurationsMs.shift();
    }

    const logEntry = {
      timestamp: new Date().toISOString(),
      level: res.statusCode >= 500 ? 'ERROR' : res.statusCode >= 400 ? 'WARN' : 'INFO',
      service: 'smart-tennis-arena-api',
      correlationId,
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      durationMs,
      userId: req.user?.id ?? null,
      role: req.user?.role ?? null,
    };

    console.log(JSON.stringify(logEntry));
  });

  next();
}

export function getObservabilityMetrics() {
  const sorted = [...stats.recentDurationsMs].sort((a, b) => a - b);
  const p95Index = sorted.length > 0 ? Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95)) : 0;

  return {
    totalRequests: stats.totalRequests,
    errorResponses: stats.errorResponses,
    averageLatencyMs:
      stats.totalRequests > 0
        ? Math.round((stats.totalDurationMs / stats.totalRequests) * 100) / 100
        : 0,
    p95LatencyMs: sorted.length > 0 ? sorted[p95Index] : 0,
    maxLatencyMs: stats.maxDurationMs,
  };
}

