import { Router } from 'express';
import {
  submitSession,
  listSessions,
  getSessionStats,
} from '../controllers/sessionController';
import { optionalAuthenticateToken } from '../middlewares/auth';

export const sessionRouter = Router();

sessionRouter.get('/', optionalAuthenticateToken, listSessions);
sessionRouter.get('/stats', optionalAuthenticateToken, getSessionStats);
sessionRouter.post('/', optionalAuthenticateToken, submitSession);
