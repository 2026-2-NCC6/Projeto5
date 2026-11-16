import { Router } from 'express';
import {
<<<<<<< HEAD
  submitSession,
  listSessions,
  getSessionStats,
} from '../controllers/sessionController';
import { optionalAuthenticateToken } from '../middlewares/auth';

export const sessionRouter = Router();

sessionRouter.get('/', optionalAuthenticateToken, listSessions);
sessionRouter.get('/stats', optionalAuthenticateToken, getSessionStats);
sessionRouter.post('/', optionalAuthenticateToken, submitSession);
=======
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
>>>>>>> 03e98db8d84f475b5e841e8cac192153a6d66d0c
