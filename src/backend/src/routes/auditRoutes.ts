import { Router } from 'express';
import { getAuditLogs, createAuditEvent } from '../controllers/auditController';
import { authenticateToken, optionalAuthenticateToken, requireRole } from '../middlewares/auth';

export const auditRouter = Router();

// Registro de eventos críticos (ex: Parada de Emergência !EMG - RF22 e RF23)
auditRouter.post('/event', optionalAuthenticateToken, createAuditEvent);

// Apenas Administradores têm acesso à listagem da auditoria global (RF23)
auditRouter.get('/', authenticateToken, requireRole('ADMIN'), getAuditLogs);
