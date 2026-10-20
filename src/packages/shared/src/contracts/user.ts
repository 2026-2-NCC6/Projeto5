/**
 * Contratos de Usuários, Autenticação, Perfis e Auditoria (RF01, RF02, RF17, RF23)
 * Smart Tennis Arena - 6º CCOMP 2026
 */

export type UserRole = 'JOGADOR' | 'TREINADOR' | 'ADMIN';

export type SkillLevel = 'INICIANTE' | 'INTERMEDIARIO' | 'AVANCADO';

export type AgeGroup = 'KIDS' | 'ADULTO';

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PlayerProfile {
  id: number;
  userId: number;
  skillLevel: SkillLevel;
  ageGroup: AgeGroup;
  trainingGoals?: string | null;
  preferences?: string | null;
  physicalRestrictions?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UserWithProfile extends User {
  profile?: PlayerProfile | null;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface RegisterDto {
  name: string;
  email: string;
  password: string;
  role?: UserRole;
  skillLevel?: SkillLevel;
  ageGroup?: AgeGroup;
  trainingGoals?: string;
  preferences?: string;
  physicalRestrictions?: string;
}

export interface UpdateUserDto {
  name?: string;
  role?: UserRole;
  isActive?: boolean;
}

export interface UpdateProfileDto {
  name?: string;
  skillLevel?: SkillLevel;
  ageGroup?: AgeGroup;
  trainingGoals?: string;
  preferences?: string;
  physicalRestrictions?: string;
}

export interface AuthResponse {
  token: string;
  user: UserWithProfile;
}

export interface AuditLog {
  id: number;
  userId?: number | null;
  userName?: string | null;
  action: string;
  ipAddress?: string | null;
  details?: string | null;
  createdAt: string;
}
