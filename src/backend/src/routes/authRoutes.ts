import { Router } from 'express';
import {
  register,
  login,
  logout,
  getMe,
  updateProfile,
  deleteMyAccount,
} from '../controllers/authController';
import { authenticateToken } from '../middlewares/auth';
import { createRateLimiter } from '../middlewares/security';
import { config } from '../config';

export const authRouter = Router();

const authRateLimiter = createRateLimiter({
  windowMs: config.rateLimit.windowMs,
  maxRequests: config.rateLimit.maxAuthRequests,
  message: 'Limite de tentativas de autenticação excedido. Aguarde antes de tentar novamente.',
});

authRouter.post('/register', authRateLimiter, register);
authRouter.post('/login', authRateLimiter, login);
authRouter.post('/logout', authenticateToken, logout);
authRouter.get('/me', authenticateToken, getMe);
authRouter.delete('/me', authenticateToken, deleteMyAccount);
authRouter.put('/profile', authenticateToken, updateProfile);
