import { Router } from 'express';
import { getAuditLogs } from '../controllers/auditController';
import { authenticateToken, requireRole } from '../middlewares/auth';

export const auditRouter = Router();

// Apenas Administradores têm acesso à auditoria global (RF23)
auditRouter.use(authenticateToken);
auditRouter.use(requireRole('ADMIN'));

auditRouter.get('/', getAuditLogs);
