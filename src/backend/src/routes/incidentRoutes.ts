import { Router } from 'express';
import {
  listIncidents,
  reportIncident,
  resolveIncident,
} from '../controllers/incidentController';
import {
  authenticateToken,
  optionalAuthenticateToken,
  requireRole,
} from '../middlewares/auth';

export const incidentRouter = Router();

// Permite registro imediato de !EMG tanto por usuários autenticados quanto em modo quiosque/hardware (RF22)
incidentRouter.post('/', optionalAuthenticateToken, reportIncident);

// Consulta e resolução restritas a Treinadores e Administradores (RF17, RF22, RF23)
incidentRouter.get('/', authenticateToken, requireRole('TREINADOR', 'ADMIN'), listIncidents);
incidentRouter.patch('/:id/resolve', authenticateToken, requireRole('TREINADOR', 'ADMIN'), resolveIncident);

