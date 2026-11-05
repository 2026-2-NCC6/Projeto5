/**
 * Smart Tennis Arena — Validação de Entradas, RBAC e Proteção LGPD (Menores e Anonimização)
 * Alinhado com: RF01, RF02, Seção 3 (Proteção de Crianças/Adolescentes) e Seção 5 (Segurança e LGPD)
 */

import type {
  AgeGroup,
  SkillLevel,
  UserRole,
  UserWithProfile,
} from '../contracts/user';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const VALID_ROLES: ReadonlySet<string> = new Set(['JOGADOR', 'TREINADOR', 'ADMIN']);
const VALID_SKILLS: ReadonlySet<string> = new Set(['INICIANTE', 'INTERMEDIARIO', 'AVANCADO']);
const VALID_AGE_GROUPS: ReadonlySet<string> = new Set(['KIDS', 'ADULTO']);

export function isValidEmail(email: unknown): email is string {
  if (typeof email !== 'string') return false;
  const trimmed = email.trim();
  return trimmed.length >= 5 && trimmed.length <= 191 && EMAIL_REGEX.test(trimmed);
}

export function isValidUserRole(role: unknown): role is UserRole {
  return typeof role === 'string' && VALID_ROLES.has(role);
}

export function isValidSkillLevel(level: unknown): level is SkillLevel {
  return typeof level === 'string' && VALID_SKILLS.has(level);
}

export function isValidAgeGroup(group: unknown): group is AgeGroup {
  return typeof group === 'string' && VALID_AGE_GROUPS.has(group);
}

/**
 * Higieniza campos textuais removendo caracteres de controle e tags de script (proteção XSS/OWASP),
 * retornando `null` quando vazio para permitir limpeza explícita no banco de dados.
 */
export function sanitizeOptionalText(input: unknown, maxLength: number = 500): string | null | undefined {
  if (input === undefined) return undefined;
  if (input === null) return null;
  if (typeof input !== 'string') return null;

  const cleaned = input
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/<\s*\/?\s*script\b[^>]*>/gi, '')
    .replace(/[<>]/g, '')
    .trim();

  if (cleaned.length === 0) return null;
  return cleaned.slice(0, maxLength);
}

export interface ValidatedRegistration {
  valid: boolean;
  error?: string;
  privilegeEscalationAttempt?: boolean;
}

/**
 * Valida regras de negócio, segurança e proteção reforçada de menores (LGPD) no cadastro.
 */
export function validateRegistrationPayload(
  payload: {
    name?: unknown;
    email?: unknown;
    password?: unknown;
    role?: unknown;
    ageGroup?: unknown;
    skillLevel?: unknown;
    guardianName?: unknown;
    guardianConsent?: unknown;
  },
  options: { allowPrivilegedRoles?: boolean } = {}
): ValidatedRegistration {
  if (typeof payload.name !== 'string' || payload.name.trim().length < 2 || payload.name.trim().length > 150) {
    return { valid: false, error: 'O nome deve conter entre 2 e 150 caracteres' };
  }

  if (!isValidEmail(payload.email)) {
    return { valid: false, error: 'Informe um endereço de e-mail válido' };
  }

  if (typeof payload.password !== 'string' || payload.password.length < 6 || payload.password.length > 128) {
    return { valid: false, error: 'A senha deve conter entre 6 e 128 caracteres' };
  }

  if (payload.role !== undefined) {
    if (!isValidUserRole(payload.role)) {
      return { valid: false, error: 'Perfil de acesso inválido' };
    }
    if (!options.allowPrivilegedRoles && payload.role !== 'JOGADOR') {
      return {
        valid: false,
        privilegeEscalationAttempt: true,
        error: 'Auto-cadastro público permite apenas o perfil JOGADOR. Contas de Treinador e Administrador exigem autorização administrativa.',
      };
    }
  }

  if (payload.skillLevel !== undefined && !isValidSkillLevel(payload.skillLevel)) {
    return { valid: false, error: 'Nível técnico inválido' };
  }

  if (payload.ageGroup !== undefined && !isValidAgeGroup(payload.ageGroup)) {
    return { valid: false, error: 'Faixa etária inválida' };
  }

  // Proteção reforçada para crianças e adolescentes (Seção 3 e Seção 5 - LGPD Art. 14)
  if (payload.ageGroup === 'KIDS') {
    if (payload.guardianConsent !== true) {
      return {
        valid: false,
        error: 'Cadastro infantil (Modo Kids) exige consentimento explícito do responsável legal (LGPD)',
      };
    }
    if (typeof payload.guardianName !== 'string' || payload.guardianName.trim().length < 3) {
      return {
        valid: false,
        error: 'Informe o nome do responsável legal para autorizar o perfil infantil (LGPD)',
      };
    }
  }

  return { valid: true };
}

export function maskEmailAddress(email: string): string {
  const [local, domain] = email.split('@');
  if (!local || !domain) return '***@***';
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}***@${domain}`;
}

export function anonymizeDisplayName(fullName: string, isMinor: boolean): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return isMinor ? 'Atleta Kids' : 'Atleta';
  const first = parts[0];
  const lastInitial = parts.length > 1 ? ` ${parts[parts.length - 1][0].toUpperCase()}.` : '';
  return isMinor ? `${first}${lastInitial} (Menor Protegido)` : `${first}${lastInitial}`;
}

/**
 * Aplica regras de minimização de exposição de dados de menores (acesso restrito)
 * e modo de anonimização para demonstrações públicas (Seção 3 e Seção 5 - LGPD).
 */
export function applyPrivacyPolicyToUser(
  target: UserWithProfile,
  requester: { id: number; role: UserRole },
  options: { anonymizeDemo?: boolean } = {}
): UserWithProfile {
  const isSelf = requester.id === target.id;
  const isAdmin = requester.role === 'ADMIN';
  const isMinor = target.profile?.ageGroup === 'KIDS';
  const anonymize = Boolean(options.anonymizeDemo);

  // Modo de anonimização para demonstração pública (Seção 5)
  if (anonymize) {
    return {
      ...target,
      name: anonymizeDisplayName(target.name, isMinor),
      email: maskEmailAddress(target.email),
      profile: target.profile
        ? {
            ...target.profile,
            physicalRestrictions: target.profile.physicalRestrictions ? '[Oculto no modo demonstração]' : null,
            guardianName: target.profile.guardianName ? '[Responsável verificado]' : null,
          }
        : null,
    };
  }

  // Acesso restrito aos dados de crianças e adolescentes (Seção 3):
  // Apenas o próprio titular ou ADMIN visualizam e-mail completo, notas de restrição física e nome do responsável.
  if (isMinor && !isSelf && !isAdmin) {
    return {
      ...target,
      name: anonymizeDisplayName(target.name, true),
      email: maskEmailAddress(target.email),
      profile: target.profile
        ? {
            ...target.profile,
            physicalRestrictions: target.profile.physicalRestrictions
              ? '[Acesso restrito — Proteção LGPD Menores]'
              : null,
            guardianName: target.profile.guardianName ? '[Responsável verificado]' : null,
          }
        : null,
    };
  }

  return target;
}
