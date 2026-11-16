import { Router } from 'express';
<<<<<<< HEAD
import { register, login, getMe, updateProfile, resetPassword } from '../controllers/authController';
=======
import {
  register,
  login,
  logout,
  getMe,
  updateProfile,
  deleteMyAccount,
} from '../controllers/authController';
>>>>>>> 03e98db8d84f475b5e841e8cac192153a6d66d0c
import { authenticateToken } from '../middlewares/auth';
import { createRateLimiter } from '../middlewares/security';
import { config } from '../config';

export const authRouter = Router();

<<<<<<< HEAD
authRouter.post('/register', register);
authRouter.post('/login', login);
authRouter.post('/reset-password', resetPassword);
=======
const authRateLimiter = createRateLimiter({
  windowMs: config.rateLimit.windowMs,
  maxRequests: config.rateLimit.maxAuthRequests,
  message: 'Limite de tentativas de autenticação excedido. Aguarde antes de tentar novamente.',
});

authRouter.post('/register', authRateLimiter, register);
authRouter.post('/login', authRateLimiter, login);
authRouter.post('/logout', authenticateToken, logout);
>>>>>>> 03e98db8d84f475b5e841e8cac192153a6d66d0c
authRouter.get('/me', authenticateToken, getMe);
authRouter.delete('/me', authenticateToken, deleteMyAccount);
authRouter.put('/profile', authenticateToken, updateProfile);
