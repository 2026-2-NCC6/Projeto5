import { Router } from 'express';
import {
  createCategory,
  listCategories,
  listDevices,
  listSystemSettings,
  pairDevice,
  registerDevice,
  updateCategory,
  updateDevice,
  updateSystemSetting,
} from '../controllers/adminController';
import {
  authenticateToken,
  optionalAuthenticateToken,
  requireRole,
} from '../middlewares/auth';

export const categoryRouter = Router();
categoryRouter.get('/', listCategories);
categoryRouter.post('/', authenticateToken, requireRole('ADMIN'), createCategory);
categoryRouter.put('/:id', authenticateToken, requireRole('ADMIN'), updateCategory);

export const deviceRouter = Router();
deviceRouter.get('/', optionalAuthenticateToken, listDevices);
deviceRouter.post('/pair', optionalAuthenticateToken, pairDevice);
deviceRouter.post('/', authenticateToken, requireRole('ADMIN'), registerDevice);
deviceRouter.put('/:id', authenticateToken, requireRole('ADMIN'), updateDevice);

export const settingsRouter = Router();
settingsRouter.get('/', optionalAuthenticateToken, listSystemSettings);
settingsRouter.put('/:key', authenticateToken, requireRole('ADMIN'), updateSystemSetting);

