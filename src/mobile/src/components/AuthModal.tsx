import React, { useState } from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import {
  AgeGroup,
  SkillLevel,
  UserRole,
} from '../../../packages/shared/src/contracts/user';

interface AuthModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function AuthModal({ visible, onClose, onSuccess }: AuthModalProps) {
  const { login, register, error, clearError, isLoading } = useAuth();
  const [isLoginTab, setIsLoginTab] = useState(true);

  // Campos de Login
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Campos de Cadastro (RF01, RF02)
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regRole, setRegRole] = useState<UserRole>('JOGADOR');
  const [regAgeGroup, setRegAgeGroup] = useState<AgeGroup>('ADULTO');
  const [regSkillLevel, setRegSkillLevel] = useState<SkillLevel>('INICIANTE');
  const [regGoals, setRegGoals] = useState('');
  const [regRestrictions, setRegRestrictions] = useState('');

  const [localMessage, setLocalMessage] = useState<string | null>(null);

  // Preenchimento rápido para demonstração e banca
  const fillQuickDemo = (role: 'admin' | 'treinador' | 'jogador' | 'kids') => {
    clearError();
    setLocalMessage(null);
    setIsLoginTab(true);
    if (role === 'admin') {
      setLoginEmail('admin@smarttennis.com');
      setLoginPassword('admin123');
    } else if (role === 'treinador') {
      setLoginEmail('treinador@smarttennis.com');
      setLoginPassword('treinador123');
    } else if (role === 'jogador') {
      setLoginEmail('jogador@smarttennis.com');
      setLoginPassword('jogador123');
    } else if (role === 'kids') {
      setLoginEmail('kids@smarttennis.com');
      setLoginPassword('kids123');
    }
  };

  const handleLoginSubmit = async () => {
    clearError();
    setLocalMessage(null);
    if (!loginEmail || !loginPassword) {
      setLocalMessage('Informe e-mail e senha');
      return;
    }
    try {
      await login({ email: loginEmail, password: loginPassword });
      onSuccess?.();
      onClose();
    } catch (e) {
      // Erro tratado pelo AuthContext
    }
  };

  const handleRegisterSubmit = async () => {
    clearError();
    setLocalMessage(null);
    if (!regName || !regEmail || !regPassword) {
      setLocalMessage('Preencha nome, e-mail e senha');
      return;
    }
    if (regPassword.length < 6) {
      setLocalMessage('A senha deve conter no mínimo 6 dígitos');
      return;
    }
    try {
      await register({
        name: regName,
        email: regEmail,
        password: regPassword,
        role: regRole,
        ageGroup: regAgeGroup,
        skillLevel: regSkillLevel,
        trainingGoals: regGoals || undefined,
        physicalRestrictions: regRestrictions || undefined,
      });
      onSuccess?.();
      onClose();
    } catch (e) {
      // Erro tratado pelo AuthContext
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>🔐 ACESSO À ARENA</Text>
              <Text style={styles.headerSubtitle}>Autenticação & Perfis Conectados (RF01)</Text>
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Abas */}
          <View style={styles.tabBar}>
            <TouchableOpacity
              style={[styles.tabItem, isLoginTab && styles.tabItemActive]}
              onPress={() => {
                setIsLoginTab(true);
                clearError();
                setLocalMessage(null);
              }}
            >
              <Text style={[styles.tabText, isLoginTab && styles.tabTextActive]}>
                ENTRAR
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabItem, !isLoginTab && styles.tabItemActive]}
              onPress={() => {
                setIsLoginTab(false);
                clearError();
                setLocalMessage(null);
              }}
            >
              <Text style={[styles.tabText, !isLoginTab && styles.tabTextActive]}>
                CADASTRAR
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollContent} contentContainerStyle={styles.scrollInner}>
            {/* Mensagem de Erro */}
            {(error || localMessage) && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>⚠️ {error || localMessage}</Text>
              </View>
            )}

            {isLoginTab ? (
              /* Formulário de Login */
              <View style={styles.formSection}>
                {/* Botões de Acesso Rápido para Demonstração */}
                <Text style={styles.sectionLabel}>ACESSOS RÁPIDOS PARA TESTE:</Text>
                <View style={styles.quickAccessGrid}>
                  <TouchableOpacity
                    style={[styles.quickBadge, { borderColor: '#EF4444' }]}
                    onPress={() => fillQuickDemo('admin')}
                  >
                    <Text style={styles.quickBadgeText}>👑 Admin</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.quickBadge, { borderColor: '#8B5CF6' }]}
                    onPress={() => fillQuickDemo('treinador')}
                  >
                    <Text style={styles.quickBadgeText}>📋 Treinador</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.quickBadge, { borderColor: '#0284C7' }]}
                    onPress={() => fillQuickDemo('jogador')}
                  >
                    <Text style={styles.quickBadgeText}>🎾 Jogador Pro</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.quickBadge, { borderColor: '#F59E0B' }]}
                    onPress={() => fillQuickDemo('kids')}
                  >
                    <Text style={styles.quickBadgeText}>🧒 Jogador Kids</Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.inputLabel}>E-MAIL:</Text>
                <TextInput
                  style={styles.input}
                  placeholder="exemplo@smarttennis.com"
                  placeholderTextColor="#475569"
                  value={loginEmail}
                  onChangeText={setLoginEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />

                <Text style={styles.inputLabel}>SENHA:</Text>
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor="#475569"
                  value={loginPassword}
                  onChangeText={setLoginPassword}
                  secureTextEntry
                />

                <TouchableOpacity
                  style={styles.submitBtn}
                  onPress={handleLoginSubmit}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.submitBtnText}>ENTRAR NO SISTEMA</Text>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              /* Formulário de Cadastro Completo (RF01, RF02) */
              <View style={styles.formSection}>
                <Text style={styles.inputLabel}>NOME COMPLETO:</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Nome do atleta ou treinador"
                  placeholderTextColor="#475569"
                  value={regName}
                  onChangeText={setRegName}
                />

                <Text style={styles.inputLabel}>E-MAIL:</Text>
                <TextInput
                  style={styles.input}
                  placeholder="email@exemplo.com"
                  placeholderTextColor="#475569"
                  value={regEmail}
                  onChangeText={setRegEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />

                <Text style={styles.inputLabel}>SENHA (mínimo 6 dígitos):</Text>
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor="#475569"
                  value={regPassword}
                  onChangeText={setRegPassword}
                  secureTextEntry
                />

                {/* Seleção de Perfil (RF01) */}
                <Text style={styles.inputLabel}>PAPEL / PERFIL DE ACESSO:</Text>
                <View style={styles.optionRow}>
                  {(['JOGADOR', 'TREINADOR', 'ADMIN'] as UserRole[]).map((r) => (
                    <TouchableOpacity
                      key={r}
                      style={[styles.roleOption, regRole === r && styles.roleOptionActive]}
                      onPress={() => setRegRole(r)}
                    >
                      <Text
                        style={[
                          styles.roleOptionText,
                          regRole === r && styles.roleOptionTextActive,
                        ]}
                      >
                        {r === 'JOGADOR' ? '🎾 Jogador' : r === 'TREINADOR' ? '📋 Treinador' : '👑 Admin'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Dados do Praticante (RF02) */}
                <View style={styles.rf02Box}>
                  <Text style={styles.rf02Title}>DADOS DO PRATICANTE (RF02)</Text>

                  {/* Faixa Etária */}
                  <Text style={styles.subLabel}>FAIXA ETÁRIA / MODO DE JOGO:</Text>
                  <View style={styles.optionRow}>
                    <TouchableOpacity
                      style={[
                        styles.halfOption,
                        regAgeGroup === 'KIDS' && styles.optionKidsActive,
                      ]}
                      onPress={() => setRegAgeGroup('KIDS')}
                    >
                      <Text style={styles.optionText}>🧒 Kids (Lúdico)</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.halfOption,
                        regAgeGroup === 'ADULTO' && styles.optionProActive,
                      ]}
                      onPress={() => setRegAgeGroup('ADULTO')}
                    >
                      <Text style={styles.optionText}>🎾 Adulto (Métrico)</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Nível Técnico */}
                  <Text style={styles.subLabel}>NÍVEL TÉCNICO:</Text>
                  <View style={styles.optionRow}>
                    {(['INICIANTE', 'INTERMEDIARIO', 'AVANCADO'] as SkillLevel[]).map((lvl) => (
                      <TouchableOpacity
                        key={lvl}
                        style={[
                          styles.levelOption,
                          regSkillLevel === lvl && styles.levelOptionActive,
                        ]}
                        onPress={() => setRegSkillLevel(lvl)}
                      >
                        <Text
                          style={[
                            styles.levelText,
                            regSkillLevel === lvl && styles.levelTextActive,
                          ]}
                        >
                          {lvl.charAt(0) + lvl.slice(1).toLowerCase()}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={styles.subLabel}>OBJETIVOS DE TREINO:</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Ex: Melhorar reflexo, precisão no forehand"
                    placeholderTextColor="#475569"
                    value={regGoals}
                    onChangeText={setRegGoals}
                  />

                  <Text style={styles.subLabel}>RESTRIÇÕES FÍSICAS / NOTAS (LGPD):</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Ex: Nenhuma ou sensibilidade no ombro"
                    placeholderTextColor="#475569"
                    value={regRestrictions}
                    onChangeText={setRegRestrictions}
                  />
                </View>

                <TouchableOpacity
                  style={[styles.submitBtn, { backgroundColor: '#38BDF8' }]}
                  onPress={handleRegisterSubmit}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#0B0F19" />
                  ) : (
                    <Text style={[styles.submitBtnText, { color: '#0B0F19' }]}>
                      CONCLUIR CADASTRO
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContainer: {
    backgroundColor: '#0F172A',
    width: '100%',
    maxWidth: 520,
    maxHeight: '90%',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#334155',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    backgroundColor: '#0B0F19',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#38BDF8',
    letterSpacing: 1,
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    fontSize: 18,
    color: '#94A3B8',
    fontWeight: '700',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#1E293B',
  },
  tabItem: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabItemActive: {
    borderBottomColor: '#38BDF8',
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 1,
  },
  tabTextActive: {
    color: '#38BDF8',
  },
  scrollContent: {
    padding: 16,
  },
  scrollInner: {
    paddingBottom: 20,
  },
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: '#EF4444',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: 14,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '700',
  },
  formSection: {
    width: '100%',
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  quickAccessGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 16,
  },
  quickBadge: {
    backgroundColor: '#1E293B',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  quickBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#E2E8F0',
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94A3B8',
    marginBottom: 4,
    marginTop: 8,
    letterSpacing: 0.5,
  },
  subLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
    marginBottom: 4,
    marginTop: 8,
  },
  input: {
    backgroundColor: '#020617',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    color: '#FFFFFF',
    fontSize: 13,
    marginBottom: 6,
  },
  optionRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
  },
  roleOption: {
    flex: 1,
    backgroundColor: '#020617',
    borderWidth: 1,
    borderColor: '#334155',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  roleOptionActive: {
    borderColor: '#38BDF8',
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
  },
  roleOptionText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '700',
  },
  roleOptionTextActive: {
    color: '#38BDF8',
  },
  rf02Box: {
    backgroundColor: '#0B0F19',
    borderColor: '#1E293B',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginVertical: 10,
  },
  rf02Title: {
    fontSize: 11,
    fontWeight: '900',
    color: '#F59E0B',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  halfOption: {
    flex: 1,
    backgroundColor: '#1E293B',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  optionKidsActive: {
    backgroundColor: '#D97706',
    borderColor: '#F59E0B',
  },
  optionProActive: {
    backgroundColor: '#0284C7',
    borderColor: '#38BDF8',
  },
  optionText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  levelOption: {
    flex: 1,
    backgroundColor: '#1E293B',
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  levelOptionActive: {
    borderColor: '#10B981',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  levelText: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '700',
  },
  levelTextActive: {
    color: '#10B981',
  },
  submitBtn: {
    backgroundColor: '#10B981',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 14,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1,
  },
});
