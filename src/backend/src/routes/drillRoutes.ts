import { Router } from 'express';
import {
  listDrills,
  getDrillById,
  saveDrill,
  updateDrillStatus,
} from '../controllers/drillController';
import { optionalAuthenticateToken } from '../middlewares/auth';

export const drillRouter = Router();

drillRouter.get('/', listDrills);
drillRouter.get('/:id', getDrillById);
drillRouter.post('/', optionalAuthenticateToken, saveDrill);
drillRouter.put('/:id', optionalAuthenticateToken, saveDrill);
drillRouter.patch('/:id/status', optionalAuthenticateToken, updateDrillStatus);
