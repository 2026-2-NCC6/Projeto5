import { Request, Response, NextFunction } from 'express';
import { config } from '../config';

/**
 * Cabeçalhos HTTP de segurança alinhados às recomendações OWASP Top 10 (Seção 5 do Edital)
 */
export function securityHeaders(req: Request, res: Response, next: NextFunction): void {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-XSS-Protection', '0');
  res.setHeader('Permissions-Policy', 'geolocation=(), camera=(), microphone=()');
  if (req.path === '/api/docs' || req.path === '/api/v1/docs') {
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'self'; frame-ancestors 'none'"
    );
  } else {
    res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");
  }
  if (config.isProduction) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
}

/**
 * Validador de origem CORS:
 * - Em produção: exige correspondência estrita com `CORS_ORIGINS`.
 * - Em desenvolvimento: aceita `CORS_ORIGINS` + localhost e IPs privados de rede local (Expo Go Wi-Fi).
 */
export function isAllowedCorsOrigin(origin: string | undefined): boolean {
  // Requisições sem cabeçalho Origin (ex.: apps nativos Android/iOS, curl, healthchecks)
  if (!origin) return true;

  if (config.corsOrigins.includes(origin)) {
    return true;
  }

  if (!config.isProduction) {
    const devOriginPattern =
      /^https?:\/\/(localhost|127\.0\.0\.1|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3})(:\d+)?$/i;
    return devOriginPattern.test(origin);
  }

  return false;
}

interface RateBucket {
  count: number;
  resetAt: number;
}

/**
 * Limitador de taxa em memória por IP para mitigação de ataques de força bruta em rotas sensíveis.
 */
export function createRateLimiter(options: {
  windowMs: number;
  maxRequests: number;
  message?: string;
}) {
  const buckets = new Map<string, RateBucket>();

  return (req: Request, res: Response, next: NextFunction): void => {
    const now = Date.now();
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const key = `${ip}:${req.baseUrl}${req.path}`;

    // Limpeza oportunista para evitar acúmulo de memória
    if (buckets.size > 2000) {
      for (const [k, v] of buckets.entries()) {
        if (v.resetAt <= now) buckets.delete(k);
      }
    }

    const current = buckets.get(key);
    if (!current || current.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + options.windowMs });
      next();
      return;
    }

    current.count += 1;
    if (current.count > options.maxRequests) {
      const retryAfterSec = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
      res.setHeader('Retry-After', String(retryAfterSec));
      res.status(429).json({
        error:
          options.message ||
          'Muitas tentativas em curto intervalo. Aguarde alguns instantes antes de tentar novamente.',
      });
      return;
    }

    next();
  };
}

/**
 * Registro de revogação de tokens JWT para invalidação imediata no Logout (RF01).
 */
const revokedTokens = new Map<string, number>();

export function revokeJwtToken(token: string, expEpochSeconds?: number): void {
  const now = Date.now();
  for (const [tok, expiresAt] of revokedTokens.entries()) {
    if (expiresAt <= now) revokedTokens.delete(tok);
  }
  const expiresAtMs = expEpochSeconds
    ? expEpochSeconds * 1000
    : now + 7 * 24 * 60 * 60 * 1000;
  revokedTokens.set(token, expiresAtMs);
}

export function isJwtTokenRevoked(token: string): boolean {
  const expiresAt = revokedTokens.get(token);
  if (!expiresAt) return false;
  if (expiresAt <= Date.now()) {
    revokedTokens.delete(token);
    return false;
  }
  return true;
}

