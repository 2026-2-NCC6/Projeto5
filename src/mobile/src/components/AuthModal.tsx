/**
 * Smart Tennis Arena — Acesso à Smart Tennis Arena (Login & Cadastro JWT)
 * Responsivo para Smartphone, Tablet & Desktop Web (RF01, RF02, RBAC & Proteção LGPD)
 */

import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import {
  AgeGroup,
  SkillLevel,
} from '../../../packages/shared/src/contracts/user';
import { isValidEmail } from '../../../packages/shared/src/security/validation';
import { useAccessibility } from '../context/AccessibilityContext';
import { useResponsive } from './useResponsive';
import {
  UserCheckIcon,
  LogOutIcon,
  LockIcon,
  CheckCircleIcon,
  TrashIcon,
} from './Icons';

interface AuthViewProps {
  onAuthSuccess?: () => void;
}

const DEMO_PROTECTED_EMAILS = new Set([
  'admin@smarttennis.com',
  'treinador@smarttennis.com',
  'jogador@smarttennis.com',
  'kids@smarttennis.com',
]);

export function AuthView({ onAuthSuccess }: AuthViewProps) {
  const { theme, fs } = useAccessibility();
  const { isMobile, isSmallPhone } = useResponsive();
  const {
    user,
    login,
    register,
    logout,
    deleteAccount,
    error,
    clearError,
    isLoading,
  } = useAuth();

  const [isLoginTab, setIsLoginTab] = useState(true);

  // Login
  const [loginEmail, setLoginEmail] = useState('jogador@smarttennis.com');
  const [loginPassword, setLoginPassword] = useState('jogador123');

  // Novo Cadastro (RF01 + RF02 + LGPD)
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regAgeGroup, setRegAgeGroup] = useState<AgeGroup>('ADULTO');
  const [regSkillLevel, setRegSkillLevel] = useState<SkillLevel>('INICIANTE');
  const [regGoals, setRegGoals] = useState('');
  const [regPreferences, setRegPreferences] = useState('');
  const [regRestrictions, setRegRestrictions] = useState('');
  const [regGuardianName, setRegGuardianName] = useState('');
  const [regGuardianConsent, setRegGuardianConsent] = useState(false);
  const [regTelemetryConsent, setRegTelemetryConsent] = useState(true);

  const [confirmDeleteStep, setConfirmDeleteStep] = useState(false);
  const [localMsg, setLocalMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fillQuickDemo = (kind: 'jogador' | 'kids' | 'treinador' | 'admin') => {
    clearError();
    setLocalMsg(null);
    setSuccessMsg(null);
    setIsLoginTab(true);
    if (kind === 'jogador') {
      setLoginEmail('jogador@smarttennis.com');
      setLoginPassword('jogador123');
    } else if (kind === 'kids') {
      setLoginEmail('kids@smarttennis.com');
      setLoginPassword('kids123');
    } else if (kind === 'treinador') {
      setLoginEmail('treinador@smarttennis.com');
      setLoginPassword('treinador123');
    } else {
      setLoginEmail('admin@smarttennis.com');
      setLoginPassword('admin123');
    }
  };

  const handleSelectAgeGroup = (ag: AgeGroup) => {
    setRegAgeGroup(ag);
    // Coleta mínima por padrão para crianças e adolescentes (Seção 3 - LGPD)
    if (ag === 'KIDS') {
      setRegTelemetryConsent(false);
    } else {
      setRegTelemetryConsent(true);
    }
  };

  const handleLogin = async () => {
    clearError();
    setLocalMsg(null);
    setSuccessMsg(null);
    if (!isValidEmail(loginEmail) || !loginPassword) {
      setLocalMsg('Informe um e-mail válido e a senha de acesso.');
      return;
    }
    try {
      await login({ email: loginEmail.trim(), password: loginPassword });
      onAuthSuccess?.();
    } catch {
      // Tratado pelo AuthContext
    }
  };

  const handleRegister = async () => {
    clearError();
    setLocalMsg(null);
    setSuccessMsg(null);

    if (!regName.trim() || regName.trim().length < 2) {
      setLocalMsg('Informe o nome completo (mínimo 2 caracteres).');
      return;
    }
    if (!isValidEmail(regEmail)) {
      setLocalMsg('Informe um endereço de e-mail válido.');
      return;
    }
    if (regPassword.length < 6) {
      setLocalMsg('A senha deve ter no mínimo 6 caracteres.');
      return;
    }
    if (regAgeGroup === 'KIDS') {
      if (!regGuardianConsent) {
        setLocalMsg(
          'Cadastro infantil (Modo Kids) exige autorização explícita do responsável legal (LGPD).'
        );
        return;
      }
      if (regGuardianName.trim().length < 3) {
        setLocalMsg(
          'Informe o nome do responsável legal para validar o perfil infantil (LGPD).'
        );
        return;
      }
    }

    try {
      await register({
        name: regName.trim(),
        email: regEmail.trim().toLowerCase(),
        password: regPassword,
        ageGroup: regAgeGroup,
        skillLevel: regSkillLevel,
        trainingGoals: regGoals.trim() || null,
        preferences: regPreferences.trim() || null,
        physicalRestrictions: regRestrictions.trim() || null,
        guardianName: regAgeGroup === 'KIDS' ? regGuardianName.trim() : null,
        guardianConsent: regAgeGroup === 'KIDS' ? regGuardianConsent : false,
        telemetryConsent: regTelemetryConsent,
      });
      onAuthSuccess?.();
    } catch {
      // Tratado pelo AuthContext
    }
  };

  const handleSelfDelete = async () => {
    if (!user) return;
    if (DEMO_PROTECTED_EMAILS.has(user.email.toLowerCase())) {
      setLocalMsg(
        'Contas institucionais de demonstração são protegidas. Cadastre uma conta própria para testar a exclusão definitiva LGPD.'
      );
      setConfirmDeleteStep(false);
      return;
    }

    if (!confirmDeleteStep) {
      setConfirmDeleteStep(true);
      return;
    }

    try {
      await deleteAccount();
      setConfirmDeleteStep(false);
      setSuccessMsg('Seus dados pessoais foram eliminados com sucesso (LGPD).');
    } catch {
      setConfirmDeleteStep(false);
    }
  };

  const currentRoleLabel = !user
    ? 'VISITANTE'
    : user.role === 'ADMIN'
    ? 'ADMIN'
    : user.role === 'TREINADOR'
    ? 'COACH'
    : 'ATHLETE';

  return (
    <View style={[styles.outerWrap, { paddingVertical: isMobile ? 2 : 10 }]}>
      <View
        style={[
          styles.card,
          {
            backgroundColor: theme.surface,
            borderColor: theme.border,
            padding: isSmallPhone ? 16 : isMobile ? 20 : 32,
          },
        ]}
      >
        {/* Ícone Superior */}
        <View
          style={[
            styles.topIconBox,
            {
              width: isMobile ? 48 : 56,
              height: isMobile ? 48 : 56,
              backgroundColor: theme.surfaceMint,
              borderColor: theme.primaryBorder,
            },
          ]}
        >
          <UserCheckIcon size={isMobile ? 22 : 25} color={theme.primaryDark} />
        </View>

        <Text
          style={[
            styles.title,
            { color: theme.text, fontSize: isMobile ? fs(19) : fs(22) },
          ]}
        >
          Acesso à Smart Tennis Arena
        </Text>
        <Text
          style={[
            styles.subtitle,
            { color: theme.textSecondary, fontSize: fs(12) },
          ]}
        >
          Autenticação protegida via JWT, menor privilégio RBAC e conformidade LGPD.
        </Text>

        {/* Segmented Control: Entrar (Login) | Novo Cadastro */}
        <View
          style={[
            styles.segmentedBar,
            { backgroundColor: theme.surfaceMuted },
          ]}
        >
          <TouchableOpacity
            accessibilityRole="tab"
            accessibilityState={{ selected: isLoginTab }}
            style={[
              styles.segmentBtn,
              isLoginTab && [
                styles.segmentBtnActive,
                { backgroundColor: theme.surface },
              ],
            ]}
            onPress={() => {
              setIsLoginTab(true);
              clearError();
              setLocalMsg(null);
              setSuccessMsg(null);
            }}
          >
            <Text
              style={[
                styles.segmentText,
                {
                  color: isLoginTab ? theme.primaryDark : theme.textSecondary,
                  fontSize: fs(12),
                },
              ]}
            >
              Entrar (Login)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            accessibilityRole="tab"
            accessibilityState={{ selected: !isLoginTab }}
            style={[
              styles.segmentBtn,
              !isLoginTab && [
                styles.segmentBtnActive,
                { backgroundColor: theme.surface },
              ],
            ]}
            onPress={() => {
              setIsLoginTab(false);
              clearError();
              setLocalMsg(null);
              setSuccessMsg(null);
            }}
          >
            <Text
              style={[
                styles.segmentText,
                {
                  color: !isLoginTab ? theme.primaryDark : theme.textSecondary,
                  fontSize: fs(12),
                },
              ]}
            >
              Novo Cadastro
            </Text>
          </TouchableOpacity>
        </View>

        {/* Mensagem de erro */}
        {(error || localMsg) && (
          <View
            style={[
              styles.alertBox,
              { backgroundColor: theme.dangerSoft, borderColor: theme.dangerBorder },
            ]}
          >
            <Text
              style={{
                color: theme.danger,
                fontWeight: '700',
                fontSize: fs(12),
              }}
            >
              {error || localMsg}
            </Text>
          </View>
        )}

        {successMsg && (
          <View
            style={[
              styles.alertBox,
              { backgroundColor: theme.surfaceMint, borderColor: theme.primaryBorder },
            ]}
          >
            <Text
              style={{
                color: theme.primaryDark,
                fontWeight: '700',
                fontSize: fs(12),
              }}
            >
              {successMsg}
            </Text>
          </View>
        )}

        {isLoginTab ? (
          <View style={styles.form}>
            {/* Atalhos Demo Discretos */}
            <View style={styles.demoRow}>
              <Text style={{ color: theme.textMuted, fontSize: fs(11), fontWeight: '600' }}>
                Demo:
              </Text>
              {[
                { key: 'jogador', label: 'Atleta Pro' },
                { key: 'kids', label: 'Kids' },
                { key: 'treinador', label: 'Coach' },
                { key: 'admin', label: 'Admin' },
              ].map((d) => (
                <TouchableOpacity
                  key={d.key}
                  style={[
                    styles.demoPill,
                    { backgroundColor: theme.surfaceMint, borderColor: theme.primaryBorder },
                  ]}
                  onPress={() => fillQuickDemo(d.key as any)}
                >
                  <Text
                    style={{
                      color: theme.primaryDark,
                      fontWeight: '700',
                      fontSize: fs(11),
                    }}
                  >
                    {d.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.label, { color: theme.text, fontSize: fs(12) }]}>
              E-mail Institucional
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.surfaceMuted,
                  borderColor: theme.borderNeutral,
                  color: theme.text,
                  fontSize: fs(14),
                },
              ]}
              value={loginEmail}
              onChangeText={setLoginEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="nome@smarttennis.com"
              placeholderTextColor={theme.textMuted}
            />

            <Text style={[styles.label, { color: theme.text, fontSize: fs(12) }]}>
              Senha de Acesso
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.surfaceMuted,
                  borderColor: theme.borderNeutral,
                  color: theme.text,
                  fontSize: fs(14),
                },
              ]}
              value={loginPassword}
              onChangeText={setLoginPassword}
              secureTextEntry
              placeholder="••••••••••••"
              placeholderTextColor={theme.textMuted}
              onSubmitEditing={handleLogin}
            />

            <TouchableOpacity
              accessibilityRole="button"
              activeOpacity={0.85}
              style={[styles.primaryBtn, { backgroundColor: theme.primary }]}
              disabled={isLoading}
              onPress={handleLogin}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={[styles.primaryBtnText, { fontSize: fs(14) }]}>
                  Autenticar e Ir para Quadra
                </Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.form}>
            {/* Selo informativo de Menor Privilégio RBAC (RF01) */}
            <View
              style={[
                styles.rbacInfoBox,
                { backgroundColor: theme.surfaceMuted, borderColor: theme.borderNeutral },
              ]}
            >
              <LockIcon size={14} color={theme.primaryDark} />
              <Text
                style={{
                  color: theme.textSecondary,
                  fontSize: fs(11),
                  flex: 1,
                  lineHeight: 16,
                }}
              >
                Auto-cadastro cria perfil <Text style={{ fontWeight: '800', color: theme.text }}>Atleta (JOGADOR)</Text>. Contas de Treinador e Admin são atribuídas exclusivamente por Administradores.
              </Text>
            </View>

            <Text style={[styles.label, { color: theme.text, fontSize: fs(12) }]}>
              {regAgeGroup === 'KIDS' ? 'Nome ou Apelido do Jovem Praticante' : 'Nome Completo'}
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.surfaceMuted,
                  borderColor: theme.borderNeutral,
                  color: theme.text,
                  fontSize: fs(14),
                },
              ]}
              value={regName}
              onChangeText={setRegName}
              placeholder={regAgeGroup === 'KIDS' ? 'Ex: Theo' : 'Ex: Beatriz Haddad'}
              placeholderTextColor={theme.textMuted}
            />

            <Text style={[styles.label, { color: theme.text, fontSize: fs(12) }]}>
              {regAgeGroup === 'KIDS' ? 'E-mail do Responsável Legal' : 'E-mail Institucional'}
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.surfaceMuted,
                  borderColor: theme.borderNeutral,
                  color: theme.text,
                  fontSize: fs(14),
                },
              ]}
              value={regEmail}
              onChangeText={setRegEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="atleta@smarttennis.com"
              placeholderTextColor={theme.textMuted}
            />

            <Text style={[styles.label, { color: theme.text, fontSize: fs(12) }]}>
              Senha de Acesso (mín. 6 caracteres)
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.surfaceMuted,
                  borderColor: theme.borderNeutral,
                  color: theme.text,
                  fontSize: fs(14),
                },
              ]}
              value={regPassword}
              onChangeText={setRegPassword}
              secureTextEntry
              placeholder="••••••••"
              placeholderTextColor={theme.textMuted}
            />

            <Text style={[styles.label, { color: theme.text, fontSize: fs(12) }]}>
              Modo Esportivo & Nível (RF02)
            </Text>
            <View style={styles.choiceRow}>
              {(['ADULTO', 'KIDS'] as AgeGroup[]).map((ag) => (
                <TouchableOpacity
                  key={ag}
                  style={[
                    styles.choicePill,
                    {
                      backgroundColor:
                        regAgeGroup === ag ? theme.surfaceMint : theme.surfaceMuted,
                      borderColor:
                        regAgeGroup === ag ? theme.primary : theme.borderNeutral,
                    },
                  ]}
                  onPress={() => handleSelectAgeGroup(ag)}
                >
                  <Text
                    style={{
                      color:
                        regAgeGroup === ag ? theme.primaryDark : theme.textSecondary,
                      fontWeight: '700',
                      fontSize: fs(11),
                    }}
                  >
                    {ag === 'KIDS' ? '🧒 Modo Kids (Menor)' : '🎾 Modo Pro (Adulto)'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={[styles.choiceRow, { marginTop: 6 }]}>
              {(['INICIANTE', 'INTERMEDIARIO', 'AVANCADO'] as SkillLevel[]).map(
                (lvl) => (
                  <TouchableOpacity
                    key={lvl}
                    style={[
                      styles.choicePill,
                      {
                        backgroundColor:
                          regSkillLevel === lvl
                            ? theme.surfaceMint
                            : theme.surfaceMuted,
                        borderColor:
                          regSkillLevel === lvl
                            ? theme.primary
                            : theme.borderNeutral,
                      },
                    ]}
                    onPress={() => setRegSkillLevel(lvl)}
                  >
                    <Text
                      style={{
                        color:
                          regSkillLevel === lvl
                            ? theme.primaryDark
                            : theme.textSecondary,
                        fontWeight: '700',
                        fontSize: fs(11),
                      }}
                    >
                      {lvl.charAt(0) + lvl.slice(1).toLowerCase()}
                    </Text>
                  </TouchableOpacity>
                )
              )}
            </View>

            {/* Proteção Reforçada de Crianças e Adolescentes (Seção 3 e Seção 5 - LGPD Art. 14) */}
            {regAgeGroup === 'KIDS' && (
              <View
                style={[
                  styles.lgpdKidsBox,
                  {
                    backgroundColor: theme.surfaceMint,
                    borderColor: theme.primaryBorder,
                  },
                ]}
              >
                <Text
                  style={{
                    color: theme.primaryDark,
                    fontWeight: '800',
                    fontSize: fs(12),
                    marginBottom: 6,
                  }}
                >
                  🛡 Proteção Reforçada de Menores (LGPD)
                </Text>
                <Text
                  style={{
                    color: theme.textSecondary,
                    fontSize: fs(11),
                    lineHeight: 16,
                    marginBottom: 8,
                  }}
                >
                  Aplicamos coleta mínima de dados e visibilidade restrita. O cadastro requer identificação e autorização do responsável legal.
                </Text>

                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: theme.surface,
                      borderColor: theme.primaryBorder,
                      color: theme.text,
                      fontSize: fs(13),
                    },
                  ]}
                  value={regGuardianName}
                  onChangeText={setRegGuardianName}
                  placeholder="Nome completo do pai, mãe ou responsável legal"
                  placeholderTextColor={theme.textMuted}
                />

                <TouchableOpacity
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: regGuardianConsent }}
                  style={styles.consentCheckRow}
                  onPress={() => setRegGuardianConsent((v) => !v)}
                >
                  <View
                    style={[
                      styles.checkboxSquare,
                      {
                        backgroundColor: regGuardianConsent
                          ? theme.primary
                          : theme.surface,
                        borderColor: regGuardianConsent
                          ? theme.primary
                          : theme.borderNeutral,
                      },
                    ]}
                  >
                    {regGuardianConsent && (
                      <CheckCircleIcon size={13} color="#FFFFFF" />
                    )}
                  </View>
                  <Text
                    style={{
                      color: theme.text,
                      fontSize: fs(11),
                      fontWeight: '600',
                      flex: 1,
                      lineHeight: 16,
                    }}
                  >
                    Declaro ser responsável legal e autorizo o uso estritamente pedagógico e esportivo na Smart Tennis Arena.
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            <Text style={[styles.label, { color: theme.text, fontSize: fs(12) }]}>
              Objetivos, Preferências & Restrições (RF02 — Opcional)
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.surfaceMuted,
                  borderColor: theme.borderNeutral,
                  color: theme.text,
                  fontSize: fs(13),
                },
              ]}
              value={regGoals}
              onChangeText={setRegGoals}
              placeholder="Objetivo (ex: Melhorar reflexo de fundo de quadra)"
              placeholderTextColor={theme.textMuted}
            />

            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.surfaceMuted,
                  borderColor: theme.borderNeutral,
                  color: theme.text,
                  fontSize: fs(13),
                  marginTop: 6,
                },
              ]}
              value={regPreferences}
              onChangeText={setRegPreferences}
              placeholder="Preferências (ex: Treinos curtos de agilidade, feedback sonoro)"
              placeholderTextColor={theme.textMuted}
            />

            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.surfaceMuted,
                  borderColor: theme.borderNeutral,
                  color: theme.text,
                  fontSize: fs(13),
                  marginTop: 6,
                },
              ]}
              value={regRestrictions}
              onChangeText={setRegRestrictions}
              placeholder="Restrições físicas / observações de mobilidade (opcional)"
              placeholderTextColor={theme.textMuted}
            />

            {/* Consentimento de Telemetria (Finalidade Explícita LGPD + RF19) */}
            <TouchableOpacity
              accessibilityRole="checkbox"
              accessibilityState={{ checked: regTelemetryConsent }}
              style={[styles.consentCheckRow, { marginTop: 12 }]}
              onPress={() => setRegTelemetryConsent((v) => !v)}
            >
              <View
                style={[
                  styles.checkboxSquare,
                  {
                    backgroundColor: regTelemetryConsent
                      ? theme.primary
                      : theme.surfaceMuted,
                    borderColor: regTelemetryConsent
                      ? theme.primary
                      : theme.borderNeutral,
                  },
                ]}
              >
                {regTelemetryConsent && (
                  <CheckCircleIcon size={13} color="#FFFFFF" />
                )}
              </View>
              <Text
                style={{
                  color: theme.textSecondary,
                  fontSize: fs(11),
                  flex: 1,
                  lineHeight: 16,
                }}
              >
                Autorizo o envio de telemetria detalhada dos sensores para histórico de evolução (RF19 / LGPD).
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              accessibilityRole="button"
              activeOpacity={0.85}
              style={[styles.primaryBtn, { backgroundColor: theme.primary }]}
              disabled={isLoading}
              onPress={handleRegister}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={[styles.primaryBtnText, { fontSize: fs(14) }]}>
                  Concluir Cadastro e Ir para Quadra
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Rodapé da Sessão Atual + Direitos do Titular LGPD */}
        <View style={[styles.footerDivider, { backgroundColor: theme.borderNeutral }]} />
        <View style={styles.footerRow}>
          <Text style={{ color: theme.textSecondary, fontSize: fs(12) }}>
            Sessão atual:{' '}
            <Text style={{ fontWeight: '800', color: theme.text }}>
              {currentRoleLabel}
            </Text>
          </Text>

          {user && (
            <View style={styles.footerActionsGroup}>
              {!DEMO_PROTECTED_EMAILS.has(user.email.toLowerCase()) && (
                <TouchableOpacity
                  accessibilityRole="button"
                  style={styles.logoutBtn}
                  onPress={handleSelfDelete}
                >
                  <TrashIcon size={14} color={theme.warning} />
                  <Text
                    style={{
                      color: theme.warning,
                      fontWeight: '700',
                      fontSize: fs(11),
                    }}
                  >
                    {confirmDeleteStep
                      ? 'Confirmar Exclusão LGPD?'
                      : 'Excluir Conta (LGPD)'}
                  </Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                accessibilityRole="button"
                style={styles.logoutBtn}
                onPress={() => {
                  setConfirmDeleteStep(false);
                  logout();
                }}
              >
                <LogOutIcon size={15} color={theme.danger} />
                <Text
                  style={{
                    color: theme.danger,
                    fontWeight: '700',
                    fontSize: fs(12),
                  }}
                >
                  Encerrar Sessão
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outerWrap: {
    width: '100%',
    alignItems: 'center',
  },
  card: {
    width: '100%',
    maxWidth: 500,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 18,
    elevation: 2,
  },
  topIconBox: {
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: {
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.4,
    marginBottom: 6,
  },
  subtitle: {
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 18,
  },
  segmentedBar: {
    flexDirection: 'row',
    width: '100%',
    padding: 4,
    borderRadius: 14,
    marginBottom: 16,
  },
  segmentBtn: {
    flex: 1,
    minHeight: 40,
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 10,
    alignItems: 'center',
  },
  segmentBtnActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  segmentText: {
    fontWeight: '800',
  },
  alertBox: {
    width: '100%',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 14,
  },
  form: {
    width: '100%',
  },
  rbacInfoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 11,
    borderWidth: 1,
    marginBottom: 6,
  },
  lgpdKidsBox: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 10,
  },
  consentCheckRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginTop: 10,
  },
  checkboxSquare: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  demoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  demoPill: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
  },
  label: {
    fontWeight: '700',
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    width: '100%',
    minHeight: 46,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  choiceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  choicePill: {
    flexGrow: 1,
    minWidth: 80,
    minHeight: 38,
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  primaryBtn: {
    width: '100%',
    minHeight: 48,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  footerDivider: {
    height: 1,
    width: '100%',
    marginTop: 22,
    marginBottom: 14,
  },
  footerRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
  },
  footerActionsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 14,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
});
