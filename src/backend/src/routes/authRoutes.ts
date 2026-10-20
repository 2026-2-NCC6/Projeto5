import { Router } from 'express';
import { register, login, getMe, updateProfile } from '../controllers/authController';
import { authenticateToken } from '../middlewares/auth';

export const authRouter = Router();

authRouter.post('/register', register);
authRouter.post('/login', login);
authRouter.get('/me', authenticateToken, getMe);
authRouter.put('/profile', authenticateToken, updateProfile);
