import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { pool } from '../db';
import { isJwtTokenRevoked } from './security';
import { UserRole } from '../../../packages/shared/src/contracts/user';

export interface AuthenticatedUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      rawToken?: string;
      tokenExp?: number;
      correlationId?: string;
    }
  }
}

export async function authenticateToken(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ error: 'Token de autenticação não fornecido' });
    return;
  }

  if (isJwtTokenRevoked(token)) {
    res.status(401).json({ error: 'Sessão encerrada. Faça login novamente.' });
    return;
  }

  try {
    const payload = jwt.verify(token, config.jwtSecret) as {
      id: number;
      email: string;
      role: UserRole;
      exp?: number;
    };

    const [rows] = await pool.query<any[]>(
      'SELECT id, name, email, role, is_active FROM users WHERE id = ?',
      [payload.id]
    );

    const user = rows[0];
    if (!user || !user.is_active) {
      res.status(401).json({ error: 'Usuário desativado ou não encontrado' });
      return;
    }

    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    };
    req.rawToken = token;
    req.tokenExp = payload.exp;

    next();
  } catch (err) {
    res.status(403).json({ error: 'Token inválido ou expirado' });
  }
}

/**
 * Autenticação opcional: popula `req.user` quando um JWT válido é fornecido,
 * mas não bloqueia visitantes anônimos (útil para catálogo público RF18).
 */
export async function optionalAuthenticateToken(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token || isJwtTokenRevoked(token)) {
    next();
    return;
  }

  try {
    const payload = jwt.verify(token, config.jwtSecret) as {
      id: number;
      email: string;
      role: UserRole;
      exp?: number;
    };

    const [rows] = await pool.query<any[]>(
      'SELECT id, name, email, role, is_active FROM users WHERE id = ?',
      [payload.id]
    );

    const user = rows[0];
    if (user && user.is_active) {
      req.user = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      };
      req.rawToken = token;
      req.tokenExp = payload.exp;
    }
  } catch {
    // Ignora token inválido na leitura pública
  }

  next();
}

export function requireRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Não autenticado' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        error: `Acesso negado. Ação restrita aos perfis: ${roles.join(', ')}`,
      });
    } else {
      next();
    }
  };
}
