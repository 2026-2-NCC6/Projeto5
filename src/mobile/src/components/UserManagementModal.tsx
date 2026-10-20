import React, { useState, useEffect } from 'react';
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
import { api } from '../services/api';
import {
  AuditLog,
  SkillLevel,
  AgeGroup,
  UserRole,
  UserWithProfile,
} from '../../../packages/shared/src/contracts/user';

interface UserManagementModalProps {
  visible: boolean;
  onClose: () => void;
}

type TabType = 'PROFILE' | 'USERS' | 'AUDIT';

export function UserManagementModal({ visible, onClose }: UserManagementModalProps) {
  const { user, logout, updateProfile, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('PROFILE');

  // Estado de Edição de Perfil (RF02)
  const [name, setName] = useState('');
  const [skillLevel, setSkillLevel] = useState<SkillLevel>('INICIANTE');
  const [ageGroup, setAgeGroup] = useState<AgeGroup>('ADULTO');
  const [trainingGoals, setTrainingGoals] = useState('');
  const [restrictions, setRestrictions] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);

  // Estado de Gestão de Usuários (RF17 - Admin)
  const [usersList, setUsersList] = useState<UserWithProfile[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [userRoleFilter, setUserRoleFilter] = useState<string>('');
  const [userSearchQuery, setUserSearchQuery] = useState('');

  // Estado de Auditoria (RF23 - Admin)
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [isLoadingAudit, setIsLoadingAudit] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setSkillLevel(user.profile?.skillLevel || 'INICIANTE');
      setAgeGroup(user.profile?.ageGroup || 'ADULTO');
      setTrainingGoals(user.profile?.trainingGoals || '');
      setRestrictions(user.profile?.physicalRestrictions || '');
    }
  }, [user]);

  // Carregar lista de usuários quando a aba USERS for selecionada
  useEffect(() => {
    if (visible && activeTab === 'USERS' && (user?.role === 'ADMIN' || user?.role === 'TREINADOR')) {
      loadUsers();
    } else if (visible && activeTab === 'AUDIT' && user?.role === 'ADMIN') {
      loadAudit();
    }
  }, [visible, activeTab, userRoleFilter]);

  const loadUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const data = await api.listUsers(userRoleFilter || undefined, userSearchQuery || undefined);
      setUsersList(data);
    } catch (err: any) {
      console.error('Erro ao listar usuários:', err);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const loadAudit = async () => {
    setIsLoadingAudit(true);
    try {
      const logs = await api.getAuditLogs(30);
      setAuditLogs(logs);
    } catch (err: any) {
      console.error('Erro ao listar logs de auditoria:', err);
    } finally {
      setIsLoadingAudit(false);
    }
  };

  const handleSaveProfile = async () => {
    setIsSavingProfile(true);
    setProfileMessage(null);
    try {
      await updateProfile({
        name,
        skillLevel,
        ageGroup,
        trainingGoals,
        physicalRestrictions: restrictions,
      });
      setProfileMessage('✅ Perfil atualizado com sucesso!');
      setTimeout(() => setProfileMessage(null), 3000);
    } catch (err: any) {
      setProfileMessage(`❌ ${err.message || 'Erro ao atualizar'}`);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleToggleUserActive = async (targetUser: UserWithProfile) => {
    try {
      await api.updateUser(targetUser.id, { isActive: !targetUser.isActive });
      loadUsers();
    } catch (err: any) {
      alert(err.message || 'Erro ao alterar status');
    }
  };

  const handleDeleteUser = async (targetUserId: number) => {
    if (confirm('Deseja realmente excluir este usuário?')) {
      try {
        await api.deleteUser(targetUserId);
        loadUsers();
      } catch (err: any) {
        alert(err.message || 'Erro ao excluir usuário');
      }
    }
  };

  if (!user) return null;

  const isAdmin = user.role === 'ADMIN';
  const isCoachOrAdmin = user.role === 'ADMIN' || user.role === 'TREINADOR';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>👤 PAINEL DE CONTA & PERFIL</Text>
              <Text style={styles.headerSubtitle}>
                {user.email} • {user.role === 'ADMIN' ? '👑 Administrador' : user.role === 'TREINADOR' ? '📋 Treinador' : '🎾 Jogador'}
              </Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Abas */}
          <View style={styles.tabBar}>
            <TouchableOpacity
              style={[styles.tabItem, activeTab === 'PROFILE' && styles.tabItemActive]}
              onPress={() => setActiveTab('PROFILE')}
            >
              <Text style={[styles.tabText, activeTab === 'PROFILE' && styles.tabTextActive]}>
                MEU PERFIL (RF02)
              </Text>
            </TouchableOpacity>

            {isCoachOrAdmin && (
              <TouchableOpacity
                style={[styles.tabItem, activeTab === 'USERS' && styles.tabItemActive]}
                onPress={() => setActiveTab('USERS')}
              >
                <Text style={[styles.tabText, activeTab === 'USERS' && styles.tabTextActive]}>
                  GESTÃO USUÁRIOS (RF17)
                </Text>
              </TouchableOpacity>
            )}

            {isAdmin && (
              <TouchableOpacity
                style={[styles.tabItem, activeTab === 'AUDIT' && styles.tabItemActive]}
                onPress={() => setActiveTab('AUDIT')}
              >
                <Text style={[styles.tabText, activeTab === 'AUDIT' && styles.tabTextActive]}>
                  AUDITORIA (RF23)
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <ScrollView style={styles.scrollContent}>
            {/* ABA 1: MEU PERFIL */}
            {activeTab === 'PROFILE' && (
              <View style={styles.tabContent}>
                {profileMessage && (
                  <View style={styles.messageBox}>
                    <Text style={styles.messageText}>{profileMessage}</Text>
                  </View>
                )}

                <Text style={styles.label}>NOME COMPLETO:</Text>
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="Nome do atleta"
                  placeholderTextColor="#475569"
                />

                <Text style={styles.label}>E-MAIL (NÃO EDITÁVEL):</Text>
                <TextInput
                  style={[styles.input, { opacity: 0.6 }]}
                  value={user.email}
                  editable={false}
                />

                <Text style={styles.label}>PAPEL / ROLE:</Text>
                <View style={styles.badgeRow}>
                  <View style={styles.roleBadge}>
                    <Text style={styles.roleBadgeText}>{user.role}</Text>
                  </View>
                  <Text style={styles.roleBadgeDesc}>
                    {user.role === 'ADMIN'
                      ? 'Acesso irrestrito a gerenciamento, auditoria e telemetria'
                      : user.role === 'TREINADOR'
                      ? 'Criação e edição de treinos e acompanhamento de alunos'
                      : 'Execução de treinos gamificados, pontuação e histórico'}
                  </Text>
                </View>

                {/* RF02: Dados de Praticante */}
                <View style={styles.practitionerBox}>
                  <Text style={styles.practitionerTitle}>DADOS DO PRATICANTE (RF02)</Text>

                  <Text style={styles.subLabel}>FAIXA ETÁRIA / MODO PREFERENCIAL:</Text>
                  <View style={styles.optionRow}>
                    <TouchableOpacity
                      style={[
                        styles.halfOption,
                        ageGroup === 'KIDS' && styles.optionKidsActive,
                      ]}
                      onPress={() => setAgeGroup('KIDS')}
                    >
                      <Text style={styles.optionText}>🧒 Kids (Lúdico)</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.halfOption,
                        ageGroup === 'ADULTO' && styles.optionProActive,
                      ]}
                      onPress={() => setAgeGroup('ADULTO')}
                    >
                      <Text style={styles.optionText}>🎾 Adulto (Métrico/Pro)</Text>
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.subLabel}>NÍVEL TÉCNICO ATUAL:</Text>
                  <View style={styles.optionRow}>
                    {(['INICIANTE', 'INTERMEDIARIO', 'AVANCADO'] as SkillLevel[]).map((lvl) => (
                      <TouchableOpacity
                        key={lvl}
                        style={[
                          styles.levelOption,
                          skillLevel === lvl && styles.levelOptionActive,
                        ]}
                        onPress={() => setSkillLevel(lvl)}
                      >
                        <Text
                          style={[
                            styles.levelText,
                            skillLevel === lvl && styles.levelTextActive,
                          ]}
                        >
                          {lvl.charAt(0) + lvl.slice(1).toLowerCase()}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={styles.subLabel}>OBJETIVOS DE DESEMPENHO:</Text>
                  <TextInput
                    style={styles.input}
                    value={trainingGoals}
                    onChangeText={setTrainingGoals}
                    placeholder="Ex: Velocidade de saque, precisão de voleio"
                    placeholderTextColor="#475569"
                  />

                  <Text style={styles.subLabel}>RESTRIÇÕES FÍSICAS / NOTAS MÉDICAS:</Text>
                  <TextInput
                    style={styles.input}
                    value={restrictions}
                    onChangeText={setRestrictions}
                    placeholder="Ex: Nenhuma ou sensibilidade articular"
                    placeholderTextColor="#475569"
                  />
                </View>

                <TouchableOpacity
                  style={styles.saveBtn}
                  onPress={handleSaveProfile}
                  disabled={isSavingProfile}
                >
                  {isSavingProfile ? (
                    <ActivityIndicator color="#0B0F19" />
                  ) : (
                    <Text style={styles.saveBtnText}>SALVAR ALTERAÇÕES</Text>
                  )}
                </TouchableOpacity>

                {/* Botão de Logout */}
                <TouchableOpacity
                  style={styles.logoutBtn}
                  onPress={async () => {
                    await logout();
                    onClose();
                  }}
                >
                  <Text style={styles.logoutBtnText}>🚪 ENCERRAR SESSÃO (LOGOUT)</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* ABA 2: GESTÃO DE USUÁRIOS (RF17) */}
            {activeTab === 'USERS' && isCoachOrAdmin && (
              <View style={styles.tabContent}>
                <View style={styles.filterBar}>
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Buscar por nome ou e-mail..."
                    placeholderTextColor="#475569"
                    value={userSearchQuery}
                    onChangeText={setUserSearchQuery}
                    onSubmitEditing={loadUsers}
                  />
                  <TouchableOpacity style={styles.searchBtn} onPress={loadUsers}>
                    <Text style={styles.searchBtnText}>🔍</Text>
                  </TouchableOpacity>
                </View>

                {/* Filtro por Role */}
                <View style={styles.roleFilterRow}>
                  {['', 'JOGADOR', 'TREINADOR', 'ADMIN'].map((r) => (
                    <TouchableOpacity
                      key={r}
                      style={[
                        styles.filterBadge,
                        userRoleFilter === r && styles.filterBadgeActive,
                      ]}
                      onPress={() => setUserRoleFilter(r)}
                    >
                      <Text
                        style={[
                          styles.filterBadgeText,
                          userRoleFilter === r && styles.filterBadgeTextActive,
                        ]}
                      >
                        {r === '' ? 'Todos' : r}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {isLoadingUsers ? (
                  <ActivityIndicator color="#38BDF8" style={{ marginVertical: 30 }} />
                ) : (
                  <View style={styles.userList}>
                    {usersList.map((u) => (
                      <View key={u.id} style={styles.userCard}>
                        <View style={styles.userCardHeader}>
                          <View>
                            <Text style={styles.userCardName}>{u.name}</Text>
                            <Text style={styles.userCardEmail}>{u.email}</Text>
                          </View>
                          <View
                            style={[
                              styles.userRoleTag,
                              u.role === 'ADMIN'
                                ? { backgroundColor: 'rgba(239, 68, 68, 0.2)', borderColor: '#EF4444' }
                                : u.role === 'TREINADOR'
                                ? { backgroundColor: 'rgba(139, 92, 246, 0.2)', borderColor: '#8B5CF6' }
                                : { backgroundColor: 'rgba(56, 189, 248, 0.2)', borderColor: '#38BDF8' },
                            ]}
                          >
                            <Text style={styles.userRoleTagText}>{u.role}</Text>
                          </View>
                        </View>

                        {/* Dados adicionais do praticante */}
                        {u.profile && (
                          <View style={styles.userCardProfileInfo}>
                            <Text style={styles.userProfileDetail}>
                              Modo: {u.profile.ageGroup === 'KIDS' ? '🧒 Kids' : '🎾 Adulto'} • Nível: {u.profile.skillLevel}
                            </Text>
                            {u.profile.trainingGoals && (
                              <Text style={styles.userProfileGoals}>
                                🎯 Meta: {u.profile.trainingGoals}
                              </Text>
                            )}
                          </View>
                        )}

                        {/* Ações Administrativas (RF17) */}
                        {isAdmin && (
                          <View style={styles.userActionsRow}>
                            <TouchableOpacity
                              style={[
                                styles.actionBtn,
                                u.isActive ? styles.btnDeactivate : styles.btnActivate,
                              ]}
                              onPress={() => handleToggleUserActive(u)}
                            >
                              <Text style={styles.actionBtnText}>
                                {u.isActive ? 'Desativar Conta' : 'Ativar Conta'}
                              </Text>
                            </TouchableOpacity>

                            {u.id !== user.id && (
                              <TouchableOpacity
                                style={[styles.actionBtn, styles.btnDelete]}
                                onPress={() => handleDeleteUser(u.id)}
                              >
                                <Text style={styles.actionBtnText}>Excluir</Text>
                              </TouchableOpacity>
                            )}
                          </View>
                        )}
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* ABA 3: AUDITORIA E LOGS (RF23) */}
            {activeTab === 'AUDIT' && isAdmin && (
              <View style={styles.tabContent}>
                <View style={styles.auditHeader}>
                  <Text style={styles.auditTitle}>TRILHA DE AUDITORIA E SEGURANÇA (RF23)</Text>
                  <TouchableOpacity style={styles.refreshBtn} onPress={loadAudit}>
                    <Text style={styles.refreshBtnText}>🔄 Atualizar</Text>
                  </TouchableOpacity>
                </View>

                {isLoadingAudit ? (
                  <ActivityIndicator color="#38BDF8" style={{ marginVertical: 30 }} />
                ) : (
                  <View style={styles.auditList}>
                    {auditLogs.map((log) => (
                      <View key={log.id} style={styles.auditCard}>
                        <View style={styles.auditRowTop}>
                          <Text style={styles.auditAction}>{log.action}</Text>
                          <Text style={styles.auditTime}>
                            {new Date(log.createdAt).toLocaleString('pt-BR')}
                          </Text>
                        </View>
                        <Text style={styles.auditUser}>
                          Usuário: <Text style={{ color: '#E2E8F0' }}>{log.userName || `ID #${log.userId}` || 'Anônimo'}</Text>
                        </Text>
                        {log.details && (
                          <Text style={styles.auditDetails}>Info: {log.details}</Text>
                        )}
                      </View>
                    ))}
                  </View>
                )}
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
    maxWidth: 580,
    maxHeight: '92%',
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
  closeBtn: {
    padding: 8,
  },
  closeBtnText: {
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
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  tabTextActive: {
    color: '#38BDF8',
  },
  scrollContent: {
    padding: 16,
  },
  tabContent: {
    paddingBottom: 20,
  },
  messageBox: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: '#10B981',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  messageText: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '700',
  },
  label: {
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
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 6,
  },
  roleBadge: {
    backgroundColor: '#0284C7',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  roleBadgeText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 11,
  },
  roleBadgeDesc: {
    flex: 1,
    fontSize: 10,
    color: '#64748B',
  },
  practitionerBox: {
    backgroundColor: '#0B0F19',
    borderColor: '#1E293B',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginVertical: 12,
  },
  practitionerTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: '#F59E0B',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  optionRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
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
  saveBtn: {
    backgroundColor: '#10B981',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
  },
  logoutBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: '#EF4444',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 14,
  },
  logoutBtnText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  filterBar: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#020617',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    color: '#FFFFFF',
    fontSize: 12,
  },
  searchBtn: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 14,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  searchBtnText: {
    fontSize: 14,
  },
  roleFilterRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 14,
  },
  filterBadge: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 6,
    backgroundColor: '#020617',
    borderWidth: 1,
    borderColor: '#334155',
  },
  filterBadgeActive: {
    borderColor: '#38BDF8',
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
  },
  filterBadgeText: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '700',
  },
  filterBadgeTextActive: {
    color: '#38BDF8',
  },
  userList: {
    gap: 10,
  },
  userCard: {
    backgroundColor: '#0B0F19',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1E293B',
    padding: 12,
  },
  userCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  userCardName: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  userCardEmail: {
    color: '#64748B',
    fontSize: 11,
  },
  userRoleTag: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  userRoleTagText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  userCardProfileInfo: {
    marginTop: 4,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
  },
  userProfileDetail: {
    color: '#94A3B8',
    fontSize: 10,
  },
  userProfileGoals: {
    color: '#F59E0B',
    fontSize: 10,
    marginTop: 2,
  },
  userActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  actionBtn: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  btnActivate: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
  },
  btnDeactivate: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
  },
  btnDelete: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
  },
  actionBtnText: {
    color: '#E2E8F0',
    fontSize: 10,
    fontWeight: '700',
  },
  auditHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  auditTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: '#38BDF8',
  },
  refreshBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: '#1E293B',
    borderRadius: 6,
  },
  refreshBtnText: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '700',
  },
  auditList: {
    gap: 8,
  },
  auditCard: {
    backgroundColor: '#0B0F19',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1E293B',
    padding: 10,
  },
  auditRowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  auditAction: {
    color: '#10B981',
    fontWeight: '800',
    fontSize: 11,
  },
  auditTime: {
    color: '#64748B',
    fontSize: 10,
  },
  auditUser: {
    fontSize: 10,
    color: '#94A3B8',
  },
  auditDetails: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },
});
