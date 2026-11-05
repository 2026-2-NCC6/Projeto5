import { Router } from 'express';
import {
  createDrill,
  getDrillById,
  getDrillVersions,
  listDrills,
  updateDrill,
  updateDrillStatus,
  validateDrillEndpoint,
} from '../controllers/drillController';
import {
  authenticateToken,
  optionalAuthenticateToken,
  requireRole,
} from '../middlewares/auth';

export const drillRouter = Router();

// Leitura pública / autenticada do catálogo e versões (RF03, RF16, RF18)
drillRouter.get('/', optionalAuthenticateToken, listDrills);
drillRouter.post('/validate', authenticateToken, requireRole('TREINADOR', 'ADMIN'), validateDrillEndpoint);
drillRouter.get('/:id', optionalAuthenticateToken, getDrillById);
drillRouter.get('/:id/versions', optionalAuthenticateToken, getDrillVersions);

// Criação, edição e publicação restritas a Treinador/Autor e Administrador (RF14, RF16, RF20)
drillRouter.post('/', authenticateToken, requireRole('TREINADOR', 'ADMIN'), createDrill);
drillRouter.put('/:id', authenticateToken, requireRole('TREINADOR', 'ADMIN'), updateDrill);
drillRouter.post('/:id/status', authenticateToken, requireRole('TREINADOR', 'ADMIN'), updateDrillStatus);

