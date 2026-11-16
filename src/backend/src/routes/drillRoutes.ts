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
import { optionalAuthenticateToken } from '../middlewares/auth';

export const drillRouter = Router();

// Leitura do catálogo, detalhes e versões (RF03, RF16, RF18)
drillRouter.get('/', optionalAuthenticateToken, listDrills);
drillRouter.post('/validate', optionalAuthenticateToken, validateDrillEndpoint);
drillRouter.get('/:id', optionalAuthenticateToken, getDrillById);
drillRouter.get('/:id/versions', optionalAuthenticateToken, getDrillVersions);

// Criação, edição e publicação de treinos (RF14, RF15, RF16, RF20)
drillRouter.post('/', optionalAuthenticateToken, createDrill);
drillRouter.put('/:id', optionalAuthenticateToken, updateDrill);
drillRouter.post('/:id/status', optionalAuthenticateToken, updateDrillStatus);
drillRouter.patch('/:id/status', optionalAuthenticateToken, updateDrillStatus);
