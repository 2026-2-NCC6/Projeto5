import dotenv from 'dotenv';
import path from 'path';
import crypto from 'crypto';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const nodeEnv = process.env.NODE_ENV || 'development';
const isProduction = nodeEnv === 'production';

function resolveJwtSecret(): string {
  const envSecret = process.env.JWT_SECRET?.trim();
  if (envSecret && envSecret.length >= 16) {
    return envSecret;
  }

  if (isProduction) {
    throw new Error(
      'FATAL: A variável de ambiente JWT_SECRET (mínimo 16 caracteres) é obrigatória em ambiente de produção.'
    );
  }

  if (envSecret && envSecret.length > 0) {
    console.warn('[Segurança] Aviso: JWT_SECRET curto detectado em ambiente local. Use >= 32 caracteres em produção.');
    return envSecret;
  }

  // Em desenvolvimento local sem .env configurado, gera segredo determinístico por máquina/sessão com aviso explícito
  const fallbackDev = crypto
    .createHash('sha256')
    .update(`sta-dev-only-${osHostnameSafe()}`)
    .digest('hex');
  console.warn('[Segurança] JWT_SECRET não definido no .env — utilizando chave efêmera exclusiva de desenvolvimento.');
  return fallbackDev;
}

function osHostnameSafe(): string {
  try {
    return process.env.COMPUTERNAME || process.env.HOSTNAME || 'localhost-dev';
  } catch {
    return 'localhost-dev';
  }
}

const rawCorsOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

export const config = {
  nodeEnv,
  isProduction,
  port: parseInt(process.env.PORT || '3001', 10),
  jwtSecret: resolveJwtSecret(),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  corsOrigins: rawCorsOrigins,
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 min
    maxAuthRequests: parseInt(process.env.RATE_LIMIT_MAX_AUTH || '25', 10),
  },
  motherPlatform: {
    mode: (process.env.MOTHER_PLATFORM_MODE || 'mock') as 'mock' | 'external',
    baseUrl: process.env.MOTHER_PLATFORM_URL || 'http://localhost:3001/api/v1/mother-platform',
    apiKey: process.env.MOTHER_PLATFORM_API_KEY || '',
  },
  iotDefaultPairingToken:
    process.env.IOT_DEFAULT_PAIRING_TOKEN || 'sta-iot-uno-r3-demo-token-2026',
  db: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'smart_tennis_arena',
    url: process.env.DATABASE_URL,
  },
};
