/**
 * Smart Tennis Arena — Acesso à Smart Tennis Arena (Login & Cadastro JWT)
 * Responsivo para Smartphone, Tablet & Desktop Web (RF01 & RF02)
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
  UserRole,
} from '../../../packages/shared/src/contracts/user';
import { useAccessibility } from '../context/AccessibilityContext';
import { useResponsive } from './useResponsive';
import { UserCheckIcon, LogOutIcon } from './Icons';

interface AuthViewProps {
  onAuthSuccess?: () => void;
}

export function AuthView({ onAuthSuccess }: AuthViewProps) {
  const { theme, fs } = useAccessibility();
  const { isMobile, isSmallPhone } = useResponsive();
  const { user, login, register, logout, error, clearError, isLoading } = useAuth();

  const [isLoginTab, setIsLoginTab] = useState(true);

  // Login
  const [loginEmail, setLoginEmail] = useState('jogador@smarttennis.com');
  const [loginPassword, setLoginPassword] = useState('jogador123');

  // Novo Cadastro (RF01 + RF02)
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regRole, setRegRole] = useState<UserRole>('JOGADOR');
  const [regAgeGroup, setRegAgeGroup] = useState<AgeGroup>('ADULTO');
  const [regSkillLevel, setRegSkillLevel] = useState<SkillLevel>('INICIANTE');
  const [regGoals, setRegGoals] = useState('');
  const [regRestrictions, setRegRestrictions] = useState('');

  const [localMsg, setLocalMsg] = useState<string | null>(null);

  const fillQuickDemo = (kind: 'jogador' | 'kids' | 'treinador' | 'admin') => {
    clearError();
    setLocalMsg(null);
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

  const handleLogin = async () => {
    clearError();
    setLocalMsg(null);
    if (!loginEmail.trim() || !loginPassword) {
      setLocalMsg('Informe o e-mail institucional e a senha de acesso.');
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
    if (!regName.trim() || !regEmail.trim() || !regPassword) {
      setLocalMsg('Preencha nome completo, e-mail e senha.');
      return;
    }
    if (regPassword.length < 6) {
      setLocalMsg('A senha deve ter no mínimo 6 caracteres.');
      return;
    }
    try {
      await register({
        name: regName.trim(),
        email: regEmail.trim(),
        password: regPassword,
        role: regRole,
        ageGroup: regAgeGroup,
        skillLevel: regSkillLevel,
        trainingGoals: regGoals || undefined,
        physicalRestrictions: regRestrictions || undefined,
      });
      onAuthSuccess?.();
    } catch {
      // Tratado pelo AuthContext
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
          Autenticação protegida via JWT e hash bcrypt integrada ao backend Node/TypeScript.
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
            <Text style={[styles.label, { color: theme.text, fontSize: fs(12) }]}>
              Nome Completo
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
              placeholder="Ex: Beatriz Haddad"
              placeholderTextColor={theme.textMuted}
            />

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
              value={regEmail}
              onChangeText={setRegEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="atleta@smarttennis.com"
              placeholderTextColor={theme.textMuted}
            />

            <Text style={[styles.label, { color: theme.text, fontSize: fs(12) }]}>
              Senha de Acesso (mín. 6 dígitos)
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
              Perfil de Acesso (RBAC - RF01)
            </Text>
            <View style={styles.choiceRow}>
              {(['JOGADOR', 'TREINADOR', 'ADMIN'] as UserRole[]).map((r) => (
                <TouchableOpacity
                  key={r}
                  style={[
                    styles.choicePill,
                    {
                      backgroundColor:
                        regRole === r ? theme.surfaceMint : theme.surfaceMuted,
                      borderColor:
                        regRole === r ? theme.primary : theme.borderNeutral,
                    },
                  ]}
                  onPress={() => setRegRole(r)}
                >
                  <Text
                    style={{
                      color: regRole === r ? theme.primaryDark : theme.textSecondary,
                      fontWeight: '700',
                      fontSize: fs(11),
                    }}
                  >
                    {r === 'JOGADOR' ? 'Atleta' : r === 'TREINADOR' ? 'Coach' : 'Admin'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

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
                  onPress={() => setRegAgeGroup(ag)}
                >
                  <Text
                    style={{
                      color:
                        regAgeGroup === ag ? theme.primaryDark : theme.textSecondary,
                      fontWeight: '700',
                      fontSize: fs(11),
                    }}
                  >
                    {ag === 'KIDS' ? '🧒 Modo Kids' : '🎾 Modo Pro'}
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

            <Text style={[styles.label, { color: theme.text, fontSize: fs(12) }]}>
              Objetivos de Treino & Observações (Opcional)
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
              placeholder="Ex: Melhorar reflexo de fundo de quadra"
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
              placeholder="Restrições físicas / notas LGPD (opcional)"
              placeholderTextColor={theme.textMuted}
            />

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

        {/* Rodapé da Sessão Atual */}
        <View style={[styles.footerDivider, { backgroundColor: theme.borderNeutral }]} />
        <View style={styles.footerRow}>
          <Text style={{ color: theme.textSecondary, fontSize: fs(12) }}>
            Sessão atual:{' '}
            <Text style={{ fontWeight: '800', color: theme.text }}>
              {currentRoleLabel}
            </Text>
          </Text>

          {user && (
            <TouchableOpacity
              accessibilityRole="button"
              style={styles.logoutBtn}
              onPress={logout}
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
    maxWidth: 480,
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
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
});
