import { Router } from 'express';
import {
  listUsers,
  createUserByAdmin,
  getUserById,
  updateUser,
  deleteUser,
} from '../controllers/userController';
import { authenticateToken, requireRole } from '../middlewares/auth';

export const userRouter = Router();

// Apenas usuários autenticados
userRouter.use(authenticateToken);

// Listar usuários: Admin e Treinador (RF17 - com proteção LGPD para menores)
userRouter.get('/', requireRole('ADMIN', 'TREINADOR'), listUsers);

// Criar usuário com qualquer papel (JOGADOR, TREINADOR, ADMIN): Apenas Administrador (RF01, RF17)
userRouter.post('/', requireRole('ADMIN'), createUserByAdmin);

// Obter usuário por ID
userRouter.get('/:id', getUserById);

// Atualizar usuário: Apenas Administrador
userRouter.put('/:id', requireRole('ADMIN'), updateUser);

// Excluir usuário: Apenas Administrador
userRouter.delete('/:id', requireRole('ADMIN'), deleteUser);
