import { Router } from 'express';
import { register, login, getMe, updateProfile, resetPassword } from '../controllers/authController';
import { authenticateToken } from '../middlewares/auth';

export const authRouter = Router();

authRouter.post('/register', register);
authRouter.post('/login', login);
authRouter.post('/reset-password', resetPassword);
authRouter.get('/me', authenticateToken, getMe);
authRouter.put('/profile', authenticateToken, updateProfile);
