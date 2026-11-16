import { Router } from 'express';
import {
  getSessionAnalytics,
  getSessionById,
  getSessionStats,
  listSessions,
  submitSession,
} from '../controllers/sessionController';
import { optionalAuthenticateToken } from '../middlewares/auth';

export const sessionRouter = Router();

sessionRouter.post('/', optionalAuthenticateToken, submitSession);
sessionRouter.get('/', optionalAuthenticateToken, listSessions);
sessionRouter.get('/stats', optionalAuthenticateToken, getSessionStats);
sessionRouter.get('/analytics', optionalAuthenticateToken, getSessionAnalytics);
sessionRouter.get('/:id', optionalAuthenticateToken, getSessionById);
