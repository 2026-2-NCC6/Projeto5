import { Router } from 'express';
import {
  getSessionAnalytics,
  getSessionById,
  listSessions,
  submitSession,
} from '../controllers/sessionController';
import { authenticateToken } from '../middlewares/auth';

export const sessionRouter = Router();

sessionRouter.use(authenticateToken);

sessionRouter.post('/', submitSession);
sessionRouter.get('/', listSessions);
sessionRouter.get('/analytics', getSessionAnalytics);
sessionRouter.get('/:id', getSessionById);
