/**
 * Smart Tennis Arena — Gestão de Atletas e Comissões (RBAC - RF17)
 * + Meu Perfil Esportivo Completo (RF02) + Anonimização LGPD + Logs de Auditoria & Segurança (RF23)
 * Responsivo para Smartphone, Tablet & Desktop Web
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { hardwareManager } from '../hardware/hardwareManager';
import {
  AuditLog,
  SkillLevel,
  AgeGroup,
  UserRole,
  UserWithProfile,
} from '../../../packages/shared/src/contracts/user';
import {
  CategoryRecord,
  IoTDeviceRecord,
  IoTDeviceStatus,
  IoTTransportType,
  SafetyIncidentRecord,
  SystemSettingRecord,
} from '../../../packages/shared/src/contracts/admin';
import {
  anonymizeDisplayName,
  maskEmailAddress,
} from '../../../packages/shared/src/security/validation';
import { useAccessibility } from '../context/AccessibilityContext';
import { useResponsive } from './useResponsive';
import {
  ActivityIcon,
  CpuIcon,
  FileTextIcon,
  ShieldAlertIcon,
  SlidersIcon,
  TrashIcon,
  RefreshIcon,
  EyeIcon,
  CheckCircleIcon,
  LockIcon,
  CloseIcon,
  UsersIcon,
} from './Icons';

type ManagementSubTab =
  | 'USERS'
  | 'DEVICES'
  | 'CATEGORIES_SETTINGS'
  | 'INCIDENTS_MOTHER';

export interface MotherPlatformSyncLogRecord {
  id: number;
  receiptId: string;
  direction: string;
  entityId: string;
  mode: string;
  status: string;
  telemetryForwarded: boolean;
  correlationId?: string | null;
  summary?: Record<string, unknown> | null;
  createdAt: string;
}

const TRANSPORT_OPTIONS: IoTTransportType[] = [
  'USB_SERIAL',
  'WIFI_WS',
  'BLE',
  'SIMULATOR',
];

const DEVICE_STATUS_CYCLE: Record<IoTDeviceStatus, IoTDeviceStatus> = {
  ONLINE: 'MAINTENANCE',
  MAINTENANCE: 'OFFLINE',
  OFFLINE: 'ONLINE',
  FAULT: 'ONLINE',
};

interface ManagementViewProps {
  onCountChange?: (count: number) => void;
  onNavigateToArena?: () => void;
}

const DEMO_FALLBACK_PROFILES: Array<{
  id: number;
  name: string;
  email: string;
  demoPass: string;
  role: UserRole;
  isMinor?: boolean;
  summary: string;
}> = [
  {
    id: 101,
    name: 'Lucas Praticante (Atleta)',
    email: 'jogador@smarttennis.com',
    demoPass: 'jogador123',
    role: 'JOGADOR',
    summary: 'Modo Pro • Intermediário • Precisão Forehand',
  },
  {
    id: 102,
    name: 'Carlos Treinador (Coach)',
    email: 'treinador@smarttennis.com',
    demoPass: 'treinador123',
    role: 'TREINADOR',
    summary: 'Comissão Técnica • Calibração de Protocolos',
  },
  {
    id: 103,
    name: 'Administrador Arena (Admin)',
    email: 'admin@smarttennis.com',
    demoPass: 'admin123',
    role: 'ADMIN',
    summary: 'RBAC Global • Auditoria MySQL & IoT',
  },
  {
    id: 104,
    name: 'Theo Kids (Juvenil)',
    email: 'kids@smarttennis.com',
    demoPass: 'kids123',
    role: 'JOGADOR',
    isMinor: true,
    summary: 'Modo Kids (Lúdico) • Proteção LGPD • Sem penalidade',
  },
];

function getInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return fullName.slice(0, 2).toUpperCase();
}

function getRoleBadgeLabel(role: UserRole): string {
  if (role === 'ADMIN') return 'ADMIN';
  if (role === 'TREINADOR') return 'COACH';
  return 'ATHLETE';
}

function getNextRole(role: UserRole): UserRole {
  if (role === 'JOGADOR') return 'TREINADOR';
  if (role === 'TREINADOR') return 'ADMIN';
  return 'JOGADOR';
}

export function ManagementView({
  onCountChange,
  onNavigateToArena,
}: ManagementViewProps) {
  const { theme, fs } = useAccessibility();
  const { width, isMobile, cardPadding, sectionGap } = useResponsive();
  const isWide = width >= 980;

  const { user, login, updateProfile } = useAuth();

  const [usersList, setUsersList] = useState<UserWithProfile[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [anonymizeDemo, setAnonymizeDemo] = useState(false);

  // Criação administrativa de usuário (Exclusivo ADMIN - RF01 / RF17)
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('JOGADOR');
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  // Editor completo do próprio perfil esportivo e consentimentos LGPD (RF02)
  const [showProfileEditor, setShowProfileEditor] = useState(false);
  const [profName, setProfName] = useState('');
  const [profSkill, setProfSkill] = useState<SkillLevel>('INICIANTE');
  const [profAge, setProfAge] = useState<AgeGroup>('ADULTO');
  const [profGoals, setProfGoals] = useState('');
  const [profPrefs, setProfPrefs] = useState('');
  const [profRestr, setProfRestr] = useState('');
  const [profGuardian, setProfGuardian] = useState('');
  const [profGuardianConsent, setProfGuardianConsent] = useState(false);
  const [profTelemetryConsent, setProfTelemetryConsent] = useState(true);
  const [isSavingProf, setIsSavingProf] = useState(false);

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [isLoadingAudit, setIsLoadingAudit] = useState(false);

  // Sub-abas do Painel Administrativo Unificado (RF17, RF19, RF22, RF23)
  const [activeSubTab, setActiveSubTab] = useState<ManagementSubTab>('USERS');

  // Dispositivos IoT (RF05 / RF17)
  const [devices, setDevices] = useState<IoTDeviceRecord[]>([]);
  const [isLoadingDevices, setIsLoadingDevices] = useState(false);
  const [newDevCode, setNewDevCode] = useState('');
  const [newDevName, setNewDevName] = useState('');
  const [newDevModel, setNewDevModel] = useState('Arduino Uno R3 + Piezo 5x');
  const [newDevFw, setNewDevFw] = useState('2.4.0');
  const [newDevTransport, setNewDevTransport] = useState<IoTTransportType>('USB_SERIAL');
  const [newDevPairingToken, setNewDevPairingToken] = useState('');
  const [createdPairingTokenOnce, setCreatedPairingTokenOnce] = useState<string | null>(null);
  const [isSavingDevice, setIsSavingDevice] = useState(false);
  const [deviceFeedback, setDeviceFeedback] = useState<string | null>(null);

  // Categorias & Parâmetros do Sistema (RF17)
  const [categories, setCategories] = useState<CategoryRecord[]>([]);
  const [systemSettings, setSystemSettings] = useState<SystemSettingRecord[]>([]);
  const [editingSettings, setEditingSettings] = useState<Record<string, string>>({});
  const [isLoadingCatSettings, setIsLoadingCatSettings] = useState(false);
  const [newCatSlug, setNewCatSlug] = useState('');
  const [newCatCode, setNewCatCode] = useState('');
  const [newCatName, setNewCatName] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');
  const [newCatAudience, setNewCatAudience] = useState('TODOS');
  const [savingSettingKey, setSavingSettingKey] = useState<string | null>(null);
  const [catSettingsFeedback, setCatSettingsFeedback] = useState<string | null>(null);

  // Incidentes !EMG & Plataforma Mãe (RF19 / RF22)
  const [incidents, setIncidents] = useState<SafetyIncidentRecord[]>([]);
  const [unresolvedOnly, setUnresolvedOnly] = useState(false);
  const [motherLogs, setMotherLogs] = useState<MotherPlatformSyncLogRecord[]>([]);
  const [isLoadingIncidents, setIsLoadingIncidents] = useState(false);
  const [incidentsFeedback, setIncidentsFeedback] = useState<string | null>(null);

  const isAdmin = user?.role === 'ADMIN';
  const isCoachOrAdmin = user?.role === 'ADMIN' || user?.role === 'TREINADOR';

  useEffect(() => {
    if (user) {
      setProfName(user.name || '');
      setProfSkill(user.profile?.skillLevel || 'INICIANTE');
      setProfAge(user.profile?.ageGroup || 'ADULTO');
      setProfGoals(user.profile?.trainingGoals || '');
      setProfPrefs(user.profile?.preferences || '');
      setProfRestr(user.profile?.physicalRestrictions || '');
      setProfGuardian(user.profile?.guardianName || '');
      setProfGuardianConsent(Boolean(user.profile?.guardianConsent));
      setProfTelemetryConsent(
        user.profile?.telemetryConsent !== undefined
          ? Boolean(user.profile.telemetryConsent)
          : user.profile?.ageGroup !== 'KIDS'
      );
    }
  }, [user]);

  const loadUsers = useCallback(async () => {
    if (!isCoachOrAdmin) return;
    setIsLoadingUsers(true);
    try {
      const list = await api.listUsers(undefined, undefined, anonymizeDemo);
      setUsersList(list);
      onCountChange?.(list.length);
    } catch (err) {
      console.warn('RBAC listUsers:', err);
    } finally {
      setIsLoadingUsers(false);
    }
  }, [isCoachOrAdmin, anonymizeDemo, onCountChange]);

  const loadAudit = useCallback(async () => {
    if (!isAdmin) return;
    setIsLoadingAudit(true);
    try {
      const logs = await api.getAuditLogs(15);
      setAuditLogs(logs);
    } catch (err) {
      console.warn('RBAC getAuditLogs:', err);
    } finally {
      setIsLoadingAudit(false);
    }
  }, [isAdmin]);

  const loadDevices = useCallback(async () => {
    setIsLoadingDevices(true);
    try {
      const list = await api.listDevices();
      setDevices(Array.isArray(list) ? list : []);
    } catch (err: any) {
      setDeviceFeedback(`⚠ ${err?.message || 'Falha ao carregar dispositivos IoT'}`);
    } finally {
      setIsLoadingDevices(false);
    }
  }, []);

  const loadCategoriesAndSettings = useCallback(async () => {
    setIsLoadingCatSettings(true);
    try {
      const [cats, settings] = await Promise.all([
        api.listCategories(),
        api.listSystemSettings(),
      ]);
      setCategories(Array.isArray(cats) ? cats : []);
      const safeSettings = Array.isArray(settings) ? settings : [];
      setSystemSettings(safeSettings);
      const nextDraft: Record<string, string> = {};
      for (const s of safeSettings) {
        nextDraft[s.settingKey] = s.settingValue;
      }
      setEditingSettings(nextDraft);
    } catch (err: any) {
      setCatSettingsFeedback(
        `⚠ ${err?.message || 'Falha ao carregar categorias e parâmetros'}`
      );
    } finally {
      setIsLoadingCatSettings(false);
    }
  }, []);

  const loadIncidentsAndMotherLogs = useCallback(async () => {
    if (!isCoachOrAdmin) return;
    setIsLoadingIncidents(true);
    try {
      const [incList, mpLogs] = await Promise.all([
        api.listSafetyIncidents(unresolvedOnly),
        api.getMotherPlatformSyncLogs(25),
      ]);
      setIncidents(Array.isArray(incList) ? incList : []);
      setMotherLogs(Array.isArray(mpLogs) ? mpLogs : []);
    } catch (err: any) {
      setIncidentsFeedback(
        `⚠ ${err?.message || 'Falha ao consultar incidentes e logs da Plataforma Mãe'}`
      );
    } finally {
      setIsLoadingIncidents(false);
    }
  }, [isCoachOrAdmin, unresolvedOnly]);

  useEffect(() => {
    if (isCoachOrAdmin) {
      loadUsers();
    } else {
      onCountChange?.(DEMO_FALLBACK_PROFILES.length);
    }
    if (isAdmin) {
      loadAudit();
    }
  }, [isCoachOrAdmin, isAdmin, loadUsers, loadAudit, onCountChange]);

  useEffect(() => {
    if (activeSubTab === 'DEVICES') {
      loadDevices();
    } else if (activeSubTab === 'CATEGORIES_SETTINGS') {
      loadCategoriesAndSettings();
    } else if (activeSubTab === 'INCIDENTS_MOTHER') {
      loadIncidentsAndMotherLogs();
    }
  }, [
    activeSubTab,
    loadDevices,
    loadCategoriesAndSettings,
    loadIncidentsAndMotherLogs,
  ]);

  const cycleNewRole = () => {
    setNewRole((prev) => getNextRole(prev));
  };

  const handleQuickAddUser = async () => {
    setFeedbackMsg(null);
    if (!isAdmin) {
      setFeedbackMsg('⚠ Apenas Administradores podem cadastrar contas diretamente.');
      return;
    }
    if (!newName.trim() || !newEmail.trim()) {
      setFeedbackMsg('Preencha nome completo e e-mail institucional.');
      return;
    }

    setIsAddingUser(true);
    try {
      await api.createUserByAdmin({
        name: newName.trim(),
        email: newEmail.trim().toLowerCase(),
        role: newRole,
        ageGroup: 'ADULTO',
        skillLevel: 'INTERMEDIARIO',
      });

      setNewName('');
      setNewEmail('');
      setFeedbackMsg(
        `✓ Perfil ${getRoleBadgeLabel(newRole)} cadastrado pelo Admin (senha inicial: arena123)`
      );
      await loadUsers();
      await loadAudit();
    } catch (err: any) {
      setFeedbackMsg(`⚠ ${err.message || 'Falha ao cadastrar perfil'}`);
    } finally {
      setIsAddingUser(false);
    }
  };

  const handleCycleUserRole = async (u: UserWithProfile) => {
    if (!isAdmin || user?.id === u.id) return;
    const nextRole = getNextRole(u.role);
    try {
      await api.updateUser(u.id, { role: nextRole });
      setFeedbackMsg(`✓ Papel de ${u.name} atualizado para ${getRoleBadgeLabel(nextRole)}`);
      await loadUsers();
      await loadAudit();
    } catch (err: any) {
      setFeedbackMsg(`⚠ ${err.message || 'Falha ao atualizar papel do usuário'}`);
    }
  };

  const handleDeleteUser = async (targetId: number) => {
    const confirmed =
      Platform.OS === 'web'
        ? window.confirm('Deseja remover este perfil do banco de dados?')
        : true;
    if (!confirmed) return;

    try {
      await api.deleteUser(targetId);
      await loadUsers();
      await loadAudit();
    } catch (err: any) {
      setFeedbackMsg(`⚠ ${err.message || 'Sem permissão para remover'}`);
    }
  };

  const handleToggleActive = async (u: UserWithProfile) => {
    try {
      await api.updateUser(u.id, { isActive: !u.isActive });
      await loadUsers();
      await loadAudit();
    } catch (err: any) {
      setFeedbackMsg(`⚠ ${err.message || 'Apenas ADMIN pode ativar/desativar contas'}`);
    }
  };

  const handleSwitchDemoProfile = async (email: string, password: string) => {
    setFeedbackMsg(null);
    try {
      await login({ email, password });
      setFeedbackMsg('✓ Perfil autenticado via JWT com sucesso!');
    } catch (err: any) {
      setFeedbackMsg(`⚠ ${err.message || 'Falha ao autenticar perfil demo'}`);
    }
  };

  const handleSaveOwnProfile = async () => {
    setFeedbackMsg(null);
    if (profAge === 'KIDS') {
      if (!profGuardianConsent || profGuardian.trim().length < 3) {
        setFeedbackMsg(
          '⚠ Modo Kids exige nome e consentimento explícito do responsável legal (LGPD).'
        );
        return;
      }
    }

    setIsSavingProf(true);
    try {
      await updateProfile({
        name: profName.trim(),
        skillLevel: profSkill,
        ageGroup: profAge,
        // Envia null quando limpo para atualizar de fato no MySQL (correção RF02)
        trainingGoals: profGoals.trim() || null,
        preferences: profPrefs.trim() || null,
        physicalRestrictions: profRestr.trim() || null,
        guardianName: profAge === 'KIDS' ? profGuardian.trim() : null,
        guardianConsent: profAge === 'KIDS' ? profGuardianConsent : false,
        telemetryConsent: profTelemetryConsent,
      });
      setFeedbackMsg('✓ Perfil esportivo e preferências LGPD (RF02) salvos no MySQL!');
      setShowProfileEditor(false);
      if (isCoachOrAdmin) loadUsers();
      if (isAdmin) loadAudit();
    } catch (err: any) {
      setFeedbackMsg(`⚠ ${err.message || 'Erro ao salvar perfil'}`);
    } finally {
      setIsSavingProf(false);
    }
  };

  const handleRegisterDevice = async () => {
    setDeviceFeedback(null);
    setCreatedPairingTokenOnce(null);
    if (!isAdmin) {
      setDeviceFeedback('⚠ Apenas Administradores podem registrar dispositivos IoT.');
      return;
    }
    if (!newDevCode.trim() || !newDevName.trim() || !newDevModel.trim()) {
      setDeviceFeedback('Preencha código do dispositivo, nome e modelo de hardware.');
      return;
    }

    setIsSavingDevice(true);
    try {
      const res = await api.registerDevice({
        deviceCode: newDevCode.trim().toUpperCase(),
        name: newDevName.trim(),
        hardwareModel: newDevModel.trim(),
        firmwareVersion: newDevFw.trim() || '2.4.0',
        transportType: newDevTransport,
        pairingToken: newDevPairingToken.trim() || undefined,
      });
      setCreatedPairingTokenOnce(res.pairingTokenOnce);
      setNewDevCode('');
      setNewDevName('');
      setNewDevPairingToken('');
      setDeviceFeedback(`✓ Dispositivo ${res.device.deviceCode} cadastrado na Arena!`);
      await loadDevices();
      if (isAdmin) loadAudit();
    } catch (err: any) {
      setDeviceFeedback(`⚠ ${err?.message || 'Falha ao cadastrar dispositivo IoT'}`);
    } finally {
      setIsSavingDevice(false);
    }
  };

  const handleCycleDeviceStatus = async (dev: IoTDeviceRecord) => {
    if (!isAdmin) return;
    const nextStatus = DEVICE_STATUS_CYCLE[dev.status] || 'ONLINE';
    setDeviceFeedback(null);
    try {
      await api.updateDevice(dev.id, { status: nextStatus });
      setDeviceFeedback(`✓ Status de ${dev.deviceCode} alterado para ${nextStatus}.`);
      await loadDevices();
      if (isAdmin) loadAudit();
    } catch (err: any) {
      setDeviceFeedback(`⚠ ${err?.message || 'Falha ao atualizar status do dispositivo'}`);
    }
  };

  const handleToggleDeviceActive = async (dev: IoTDeviceRecord) => {
    if (!isAdmin) return;
    setDeviceFeedback(null);
    try {
      await api.updateDevice(dev.id, { active: !dev.active });
      setDeviceFeedback(
        `✓ Dispositivo ${dev.deviceCode} ${!dev.active ? 'ativado' : 'desativado'}.`
      );
      await loadDevices();
    } catch (err: any) {
      setDeviceFeedback(`⚠ ${err?.message || 'Falha ao alterar ativação do dispositivo'}`);
    }
  };

  const handleCalibrateDeviceThresholds = async (
    dev: IoTDeviceRecord,
    thresholdMv: number
  ) => {
    if (!isAdmin) return;
    setDeviceFeedback(null);
    try {
      await api.updateDevice(dev.id, {
        piezoThresholds: [thresholdMv, thresholdMv, thresholdMv, thresholdMv, thresholdMv],
      });
      setDeviceFeedback(
        `✓ Limiares piezoelétricos de ${dev.deviceCode} calibrados em ${thresholdMv} mV.`
      );
      await loadDevices();
    } catch (err: any) {
      setDeviceFeedback(`⚠ ${err?.message || 'Falha ao calibrar sensores piezo'}`);
    }
  };

  const handleCreateCategory = async () => {
    setCatSettingsFeedback(null);
    if (!isAdmin) {
      setCatSettingsFeedback('⚠ Apenas Administradores podem cadastrar categorias.');
      return;
    }
    if (!newCatSlug.trim() || !newCatCode.trim() || !newCatName.trim()) {
      setCatSettingsFeedback('Preencha slug, código e nome da categoria.');
      return;
    }
    try {
      await api.createCategory({
        slug: newCatSlug.trim().toLowerCase(),
        code: newCatCode.trim().toUpperCase(),
        name: newCatName.trim(),
        description: newCatDesc.trim(),
        targetAudience: newCatAudience.trim() || 'TODOS',
      });
      setNewCatSlug('');
      setNewCatCode('');
      setNewCatName('');
      setNewCatDesc('');
      setCatSettingsFeedback('✓ Nova categoria criada e persistida no MySQL!');
      await loadCategoriesAndSettings();
    } catch (err: any) {
      setCatSettingsFeedback(`⚠ ${err?.message || 'Falha ao criar categoria'}`);
    }
  };

  const handleToggleCategoryActive = async (cat: CategoryRecord) => {
    if (!isAdmin) return;
    setCatSettingsFeedback(null);
    try {
      await api.updateCategory(cat.id, { active: !cat.active });
      setCatSettingsFeedback(
        `✓ Categoria "${cat.name}" ${!cat.active ? 'ativada' : 'desativada'}.`
      );
      await loadCategoriesAndSettings();
    } catch (err: any) {
      setCatSettingsFeedback(`⚠ ${err?.message || 'Falha ao atualizar categoria'}`);
    }
  };

  const handleSaveSystemSetting = async (settingKey: string) => {
    if (!isAdmin) return;
    setCatSettingsFeedback(null);
    setSavingSettingKey(settingKey);
    try {
      const value = editingSettings[settingKey] ?? '';
      await api.updateSystemSetting(settingKey, value);
      setCatSettingsFeedback(`✓ Parâmetro "${settingKey}" atualizado no MySQL.`);
      await loadCategoriesAndSettings();
    } catch (err: any) {
      setCatSettingsFeedback(`⚠ ${err?.message || 'Falha ao atualizar parâmetro'}`);
    } finally {
      setSavingSettingKey(null);
    }
  };

  const handleResolveIncident = async (id: number) => {
    if (!isCoachOrAdmin) return;
    setIncidentsFeedback(null);
    try {
      await api.resolveSafetyIncident(id);
      setIncidentsFeedback(`✓ Incidente #${id} marcado como resolvido com trilha auditável.`);
      await loadIncidentsAndMotherLogs();
      if (isAdmin) loadAudit();
    } catch (err: any) {
      setIncidentsFeedback(`⚠ ${err?.message || 'Falha ao resolver incidente'}`);
    }
  };

  const hwHistory = hardwareManager.logHistory.slice(-4).reverse();
  const displayProfilesCount = isCoachOrAdmin
    ? usersList.length
    : DEMO_FALLBACK_PROFILES.length;

  const subTabs: Array<{
    key: ManagementSubTab;
    label: string;
    mobileLabel: string;
    renderIcon: (color: string) => React.ReactNode;
  }> = [
    {
      key: 'USERS',
      label: '1. Usuários, Perfis & Auditoria',
      mobileLabel: 'Usuários',
      renderIcon: (c) => <UsersIcon size={14} color={c} />,
    },
    {
      key: 'DEVICES',
      label: '2. Dispositivos IoT (RF05)',
      mobileLabel: 'IoT',
      renderIcon: (c) => <CpuIcon size={14} color={c} />,
    },
    {
      key: 'CATEGORIES_SETTINGS',
      label: '3. Categorias & Parâmetros (RF17)',
      mobileLabel: 'Parâmetros',
      renderIcon: (c) => <SlidersIcon size={14} color={c} />,
    },
    {
      key: 'INCIDENTS_MOTHER',
      label: '4. Incidentes !EMG & Plataforma Mãe',
      mobileLabel: 'Incidentes',
      renderIcon: (c) => <ShieldAlertIcon size={14} color={c} />,
    },
  ];

  return (
    <View style={{ gap: sectionGap }}>
      {/* Barra Unificada de Sub-Abas Administrativas (RF17, RF19, RF22, RF23) */}
      <View
        style={[
          styles.subTabsBar,
          {
            backgroundColor: theme.surface,
            borderColor: theme.border,
            padding: isMobile ? 8 : 10,
          },
        ]}
      >
        {subTabs.map((tab) => {
          const isActive = activeSubTab === tab.key;
          const color = isActive ? '#FFFFFF' : theme.textSecondary;
          return (
            <TouchableOpacity
              key={tab.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              activeOpacity={0.85}
              style={[
                styles.subTabPill,
                {
                  backgroundColor: isActive ? theme.primary : theme.surfaceMuted,
                  borderColor: isActive ? theme.primary : theme.borderNeutral,
                },
              ]}
              onPress={() => setActiveSubTab(tab.key)}
            >
              {tab.renderIcon(color)}
              <Text
                style={{
                  color,
                  fontWeight: '700',
                  fontSize: fs(isMobile ? 11 : 12),
                }}
              >
                {isMobile ? tab.mobileLabel : tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {activeSubTab === 'USERS' && (
        <View
          style={[
            styles.grid,
            !isWide && styles.gridStacked,
            { gap: sectionGap },
          ]}
        >
      {/* COLUNA ESQUERDA: Gestão de Atletas e Comissões (RBAC) */}
      <View
        style={[
          styles.leftCard,
          !isWide && styles.fullWidth,
          {
            backgroundColor: theme.surface,
            borderColor: theme.border,
            padding: cardPadding,
          },
        ]}
      >
        <View style={styles.headerRow}>
          <View style={{ flex: isMobile ? undefined : 1, width: isMobile ? '100%' : undefined }}>
            <Text
              style={[
                styles.cardTitle,
                { color: theme.text, fontSize: isMobile ? fs(16) : fs(18) },
              ]}
            >
              Gestão de Atletas e Comissões (RBAC)
            </Text>
            <Text
              style={[
                styles.cardSubtitle,
                { color: theme.textSecondary, fontSize: fs(12) },
              ]}
            >
              Controle de acesso por perfil, personalização RF02 e proteção LGPD
            </Text>
          </View>

          <View
            style={[
              styles.headerBadgesRow,
              isMobile && { width: '100%', justifyContent: 'space-between' },
            ]}
          >
            {/* Modo de Anonimização para Demonstrações Públicas (Seção 5 - LGPD) */}
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Alternar anonimização LGPD para demonstrações"
              style={[
                styles.editOwnBtn,
                {
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 5,
                  backgroundColor: anonymizeDemo
                    ? theme.primarySoft
                    : theme.surfaceMuted,
                  borderColor: anonymizeDemo
                    ? theme.primary
                    : theme.borderNeutral,
                },
              ]}
              onPress={() => setAnonymizeDemo((v) => !v)}
            >
              <EyeIcon
                size={13}
                color={anonymizeDemo ? theme.primaryDark : theme.textSecondary}
              />
              <Text
                style={{
                  color: anonymizeDemo ? theme.primaryDark : theme.textSecondary,
                  fontWeight: '700',
                  fontSize: fs(11),
                }}
              >
                {anonymizeDemo ? 'LGPD Anônimo' : 'Anonimizar'}
              </Text>
            </TouchableOpacity>

            {user && (
              <TouchableOpacity
                style={[
                  styles.editOwnBtn,
                  {
                    backgroundColor: showProfileEditor
                      ? theme.primary
                      : theme.surfaceMuted,
                    borderColor: theme.borderNeutral,
                  },
                ]}
                onPress={() => setShowProfileEditor((v) => !v)}
              >
                <Text
                  style={{
                    color: showProfileEditor ? '#FFFFFF' : theme.textSecondary,
                    fontWeight: '700',
                    fontSize: fs(11),
                  }}
                >
                  {showProfileEditor ? 'Fechar RF02' : 'Meu Perfil RF02'}
                </Text>
              </TouchableOpacity>
            )}

            <View
              style={[
                styles.countPill,
                { backgroundColor: theme.surfaceMint, borderColor: theme.primaryBorder },
              ]}
            >
              <Text
                style={{
                  color: theme.primaryDark,
                  fontWeight: '800',
                  fontSize: fs(11),
                }}
              >
                {displayProfilesCount} perfis ativos
              </Text>
            </View>
          </View>
        </View>

        {feedbackMsg && (
          <View
            style={[
              styles.feedbackBanner,
              { backgroundColor: theme.surfaceMint, borderColor: theme.primaryBorder },
            ]}
          >
            <Text style={{ color: theme.primaryDark, fontWeight: '700', fontSize: fs(12) }}>
              {feedbackMsg}
            </Text>
          </View>
        )}

        {/* Painel Expansível: Editar Meu Perfil do Praticante Completo (RF02 + LGPD) */}
        {user && showProfileEditor && (
          <View
            style={[
              styles.rf02EditorBox,
              { backgroundColor: theme.bg, borderColor: theme.primaryBorder },
            ]}
          >
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 10,
                gap: 8,
              }}
            >
              <Text
                style={{
                  color: theme.primaryDark,
                  fontWeight: '800',
                  fontSize: fs(13),
                  flex: 1,
                }}
              >
                Personalização Esportiva & Privacidade do Praticante (RF02)
              </Text>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Fechar editor de perfil"
                onPress={() => setShowProfileEditor(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: theme.surface,
                  borderWidth: 1,
                  borderColor: theme.borderNeutral,
                }}
              >
                <CloseIcon size={14} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={[styles.quickFormRow, isMobile && { flexDirection: 'column', alignItems: 'stretch' }]}>
              <TextInput
                style={[
                  styles.formInput,
                  isMobile && { width: '100%' },
                  { backgroundColor: theme.surface, borderColor: theme.borderNeutral, color: theme.text, fontSize: fs(13) },
                ]}
                value={profName}
                onChangeText={setProfName}
                placeholder="Seu nome"
                placeholderTextColor={theme.textMuted}
              />
              <TextInput
                style={[
                  styles.formInput,
                  isMobile && { width: '100%' },
                  { backgroundColor: theme.surface, borderColor: theme.borderNeutral, color: theme.text, fontSize: fs(13) },
                ]}
                value={profGoals}
                onChangeText={setProfGoals}
                placeholder="Objetivos (ex: Precisão de forehand)"
                placeholderTextColor={theme.textMuted}
              />
            </View>

            <View style={[styles.quickFormRow, { marginTop: 8 }, isMobile && { flexDirection: 'column', alignItems: 'stretch' }]}>
              <TextInput
                style={[
                  styles.formInput,
                  isMobile && { width: '100%' },
                  { backgroundColor: theme.surface, borderColor: theme.borderNeutral, color: theme.text, fontSize: fs(13) },
                ]}
                value={profPrefs}
                onChangeText={setProfPrefs}
                placeholder="Preferências de treino / ritmo / feedbacks (RF02)"
                placeholderTextColor={theme.textMuted}
              />
              <TextInput
                style={[
                  styles.formInput,
                  isMobile && { width: '100%' },
                  { backgroundColor: theme.surface, borderColor: theme.borderNeutral, color: theme.text, fontSize: fs(13) },
                ]}
                value={profRestr}
                onChangeText={setProfRestr}
                placeholder="Restrições físicas / observações LGPD (RF02)"
                placeholderTextColor={theme.textMuted}
              />
            </View>

            {profAge === 'KIDS' && (
              <View style={[styles.quickFormRow, { marginTop: 8 }, isMobile && { flexDirection: 'column', alignItems: 'stretch' }]}>
                <TextInput
                  style={[
                    styles.formInput,
                    isMobile && { width: '100%' },
                    { backgroundColor: theme.surface, borderColor: theme.primaryBorder, color: theme.text, fontSize: fs(13) },
                  ]}
                  value={profGuardian}
                  onChangeText={setProfGuardian}
                  placeholder="Nome do Responsável Legal (obrigatório Modo Kids)"
                  placeholderTextColor={theme.textMuted}
                />
                <TouchableOpacity
                  style={[
                    styles.chipToggle,
                    {
                      flexDirection: 'row',
                      justifyContent: 'center',
                      gap: 6,
                      backgroundColor: profGuardianConsent ? theme.primarySoft : theme.surface,
                      borderColor: profGuardianConsent ? theme.primary : theme.borderNeutral,
                    },
                  ]}
                  onPress={() => setProfGuardianConsent((v) => !v)}
                >
                  {profGuardianConsent && <CheckCircleIcon size={13} color={theme.primaryDark} />}
                  <Text
                    style={{
                      color: profGuardianConsent ? theme.primaryDark : theme.textSecondary,
                      fontWeight: '700',
                      fontSize: fs(11),
                    }}
                  >
                    Consentimento Parental LGPD
                  </Text>
                </TouchableOpacity>
              </View>
            )}
            <View style={[styles.quickFormRow, { marginTop: 8 }]}>
              {(['KIDS', 'ADULTO'] as AgeGroup[]).map((ag) => (
                <TouchableOpacity
                  key={ag}
                  style={[
                    styles.chipToggle,
                    {
                      backgroundColor: profAge === ag ? theme.primary : theme.surface,
                      borderColor: profAge === ag ? theme.primary : theme.borderNeutral,
                    },
                  ]}
                  onPress={() => setProfAge(ag)}
                >
                  <Text
                    style={{
                      color: profAge === ag ? '#FFFFFF' : theme.textSecondary,
                      fontWeight: '700',
                      fontSize: fs(11),
                    }}
                  >
                    {ag === 'KIDS' ? '🧒 Modo Kids' : '🎾 Modo Pro'}
                  </Text>
                </TouchableOpacity>
              ))}

              {(['INICIANTE', 'INTERMEDIARIO', 'AVANCADO'] as SkillLevel[]).map(
                (lvl) => (
                  <TouchableOpacity
                    key={lvl}
                    style={[
                      styles.chipToggle,
                      {
                        backgroundColor:
                          profSkill === lvl ? theme.primarySoft : theme.surface,
                        borderColor:
                          profSkill === lvl ? theme.primary : theme.borderNeutral,
                      },
                    ]}
                    onPress={() => setProfSkill(lvl)}
                  >
                    <Text
                      style={{
                        color:
                          profSkill === lvl ? theme.primaryDark : theme.textSecondary,
                        fontWeight: '700',
                        fontSize: fs(11),
                      }}
                    >
                      {lvl.charAt(0) + lvl.slice(1).toLowerCase()}
                    </Text>
                  </TouchableOpacity>
                )
              )}

              <TouchableOpacity
                style={[
                  styles.chipToggle,
                  {
                    backgroundColor: profTelemetryConsent
                      ? theme.surfaceMint
                      : theme.surface,
                    borderColor: profTelemetryConsent
                      ? theme.primary
                      : theme.borderNeutral,
                  },
                ]}
                onPress={() => setProfTelemetryConsent((v) => !v)}
              >
                <Text
                  style={{
                    color: profTelemetryConsent
                      ? theme.primaryDark
                      : theme.textSecondary,
                    fontWeight: '700',
                    fontSize: fs(11),
                  }}
                >
                  Telemetria: {profTelemetryConsent ? 'ON' : 'OFF'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.addBtn,
                  isMobile && { width: '100%' },
                  { backgroundColor: theme.primary },
                ]}
                disabled={isSavingProf}
                onPress={handleSaveOwnProfile}
              >
                <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: fs(12) }}>
                  {isSavingProf ? 'Salvando...' : 'Salvar RF02'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Barra Rápida de Adição Administrativa (Restrita a ADMIN - RF01 / RF17) */}
        {isAdmin ? (
          <View
            style={[
              styles.addBar,
              isMobile && { flexDirection: 'column', alignItems: 'stretch' },
              { backgroundColor: theme.bg, borderColor: theme.primaryBorder },
            ]}
          >
            <TextInput
              style={[
                styles.formInput,
                isMobile && { width: '100%', minWidth: 0 },
                {
                  backgroundColor: theme.surface,
                  borderColor: theme.borderNeutral,
                  color: theme.text,
                  fontSize: fs(12),
                },
              ]}
              value={newName}
              onChangeText={setNewName}
              placeholder="Nome completo do atleta/treinador"
              placeholderTextColor={theme.textMuted}
            />
            <TextInput
              style={[
                styles.formInput,
                isMobile && { width: '100%', minWidth: 0 },
                {
                  backgroundColor: theme.surface,
                  borderColor: theme.borderNeutral,
                  color: theme.text,
                  fontSize: fs(12),
                },
              ]}
              value={newEmail}
              onChangeText={setNewEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="E-mail institucional"
              placeholderTextColor={theme.textMuted}
            />

            <View
              style={[
                styles.addBarActionsRow,
                isMobile && { width: '100%' },
              ]}
            >
              <TouchableOpacity
                accessibilityRole="button"
                style={[
                  styles.roleSelectPill,
                  isMobile && { flex: 1, alignItems: 'center' },
                  { backgroundColor: theme.surface, borderColor: theme.borderNeutral },
                ]}
                onPress={cycleNewRole}
              >
                <Text style={{ color: theme.text, fontWeight: '700', fontSize: fs(11) }}>
                  {getRoleBadgeLabel(newRole)} ▾
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                accessibilityRole="button"
                activeOpacity={0.85}
                style={[
                  styles.addBtn,
                  isMobile && { flex: 1.4 },
                  { backgroundColor: theme.primary },
                ]}
                disabled={isAddingUser}
                onPress={handleQuickAddUser}
              >
                <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: fs(12) }}>
                  {isAddingUser ? '...' : '+ Adicionar'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View
            style={[
              styles.rbacHintBar,
              { backgroundColor: theme.surfaceMuted, borderColor: theme.borderNeutral },
            ]}
          >
            <LockIcon size={14} color={theme.primaryDark} />
            <Text style={{ color: theme.textSecondary, fontSize: fs(11), flex: 1, lineHeight: 16 }}>
              Controle de menor privilégio ativo (RF01): criação direta de Treinadores e Administradores é exclusiva do perfil <Text style={{ fontWeight: '800', color: theme.text }}>ADMIN</Text>.
            </Text>
          </View>
        )}

        {/* Lista de Perfis */}
        {isLoadingUsers ? (
          <ActivityIndicator color={theme.primary} style={{ marginVertical: 28 }} />
        ) : isCoachOrAdmin && usersList.length > 0 ? (
          <View style={styles.profileList}>
            {usersList.map((u) => {
              const isCurrentUser = user?.id === u.id;
              const demoMatch = DEMO_FALLBACK_PROFILES.find(
                (d) => d.email.toLowerCase() === u.email.toLowerCase()
              );

              return (
                <View
                  key={u.id}
                  style={[
                    styles.profileCard,
                    isMobile && { flexDirection: 'column', alignItems: 'stretch' },
                    {
                      backgroundColor: theme.surface,
                      borderColor: isCurrentUser
                        ? theme.primaryBorder
                        : theme.borderNeutral,
                      opacity: u.isActive ? 1 : 0.6,
                    },
                  ]}
                >
                  <View style={styles.profileLeft}>
                    <View
                      style={[
                        styles.avatarCircle,
                        { backgroundColor: theme.primarySoft },
                      ]}
                    >
                      <Text
                        style={{
                          color: theme.primaryDark,
                          fontWeight: '800',
                          fontSize: fs(13),
                        }}
                      >
                        {getInitials(u.name)}
                      </Text>
                    </View>

                    <View style={{ flex: 1 }}>
                      <View style={styles.nameBadgeRow}>
                        <Text
                          style={[
                            styles.profileName,
                            { color: theme.text, fontSize: fs(13) },
                          ]}
                        >
                          {u.name}
                        </Text>
                        <TouchableOpacity
                          disabled={!isAdmin || isCurrentUser}
                          accessibilityLabel={
                            isAdmin && !isCurrentUser
                              ? `Alterar papel de ${u.name}`
                              : undefined
                          }
                          style={[
                            styles.roleBadge,
                            { backgroundColor: theme.primarySoft },
                          ]}
                          onPress={() => handleCycleUserRole(u)}
                        >
                          <Text
                            style={{
                              color: theme.primaryDark,
                              fontWeight: '800',
                              fontSize: fs(10),
                            }}
                          >
                            {getRoleBadgeLabel(u.role)}
                            {isAdmin && !isCurrentUser ? ' ↻' : ''}
                          </Text>
                        </TouchableOpacity>
                      </View>

                      <Text
                        style={[
                          styles.profileMeta,
                          { color: theme.textSecondary, fontSize: fs(11) },
                        ]}
                      >
                        {u.email} •{' '}
                        {u.profile
                          ? `${u.profile.ageGroup === 'KIDS' ? 'Modo Kids (LGPD)' : 'Modo Pro'} • ${u.profile.skillLevel}`
                          : 'Conta verificada'}
                      </Text>
                    </View>
                  </View>

                  <View
                    style={[
                      styles.profileActions,
                      isMobile && { justifyContent: 'flex-end', width: '100%' },
                    ]}
                  >
                    {isCurrentUser ? (
                      <View
                        style={[
                          styles.activeProfileBtn,
                          { backgroundColor: theme.primary },
                        ]}
                      >
                        <Text
                          style={{
                            color: '#FFFFFF',
                            fontWeight: '800',
                            fontSize: fs(11),
                          }}
                        >
                          Perfil em Uso
                        </Text>
                      </View>
                    ) : demoMatch ? (
                      <TouchableOpacity
                        style={[
                          styles.switchProfileBtn,
                          {
                            backgroundColor: theme.surface,
                            borderColor: theme.primaryBorder,
                          },
                        ]}
                        onPress={async () => {
                          await handleSwitchDemoProfile(
                            demoMatch.email,
                            demoMatch.demoPass
                          );
                          onNavigateToArena?.();
                        }}
                      >
                        <Text
                          style={{
                            color: theme.primaryDark,
                            fontWeight: '700',
                            fontSize: fs(11),
                          }}
                        >
                          Usar Perfil
                        </Text>
                      </TouchableOpacity>
                    ) : isAdmin ? (
                      <TouchableOpacity
                        style={[
                          styles.switchProfileBtn,
                          {
                            backgroundColor: theme.surface,
                            borderColor: theme.borderNeutral,
                          },
                        ]}
                        onPress={() => handleToggleActive(u)}
                      >
                        <Text
                          style={{
                            color: theme.textSecondary,
                            fontWeight: '700',
                            fontSize: fs(11),
                          }}
                        >
                          {u.isActive ? 'Ativo' : 'Inativo'}
                        </Text>
                      </TouchableOpacity>
                    ) : null}

                    {isAdmin && !isCurrentUser && (
                      <TouchableOpacity
                        accessibilityLabel={`Remover ${u.name}`}
                        style={styles.trashBtn}
                        onPress={() => handleDeleteUser(u.id)}
                      >
                        <TrashIcon size={16} color={theme.textMuted} />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          <View style={styles.profileList}>
            {DEMO_FALLBACK_PROFILES.map((item) => {
              const isCurrent =
                user?.email.toLowerCase() === item.email.toLowerCase();
              const shouldMaskMinor = Boolean(item.isMinor && !isAdmin && !isCurrent);
              const displayName =
                anonymizeDemo || shouldMaskMinor
                  ? anonymizeDisplayName(item.name, Boolean(item.isMinor))
                  : item.name;
              const displayEmail =
                anonymizeDemo || shouldMaskMinor
                  ? maskEmailAddress(item.email)
                  : item.email;

              return (
                <View
                  key={item.id}
                  style={[
                    styles.profileCard,
                    isMobile && { flexDirection: 'column', alignItems: 'stretch' },
                    {
                      backgroundColor: theme.surface,
                      borderColor: isCurrent
                        ? theme.primaryBorder
                        : theme.borderNeutral,
                    },
                  ]}
                >
                  <View style={styles.profileLeft}>
                    <View
                      style={[
                        styles.avatarCircle,
                        { backgroundColor: theme.primarySoft },
                      ]}
                    >
                      <Text
                        style={{
                          color: theme.primaryDark,
                          fontWeight: '800',
                          fontSize: fs(13),
                        }}
                      >
                        {getInitials(displayName)}
                      </Text>
                    </View>

                    <View style={{ flex: 1 }}>
                      <View style={styles.nameBadgeRow}>
                        <Text
                          style={[
                            styles.profileName,
                            { color: theme.text, fontSize: fs(13) },
                          ]}
                        >
                          {displayName}
                        </Text>
                        <View
                          style={[
                            styles.roleBadge,
                            { backgroundColor: theme.primarySoft },
                          ]}
                        >
                          <Text
                            style={{
                              color: theme.primaryDark,
                              fontWeight: '800',
                              fontSize: fs(10),
                            }}
                          >
                            {getRoleBadgeLabel(item.role)}
                          </Text>
                        </View>
                      </View>
                      <Text
                        style={[
                          styles.profileMeta,
                          { color: theme.textSecondary, fontSize: fs(11) },
                        ]}
                      >
                        {displayEmail} • {item.summary}
                      </Text>
                    </View>
                  </View>

                  <View
                    style={[
                      styles.profileActions,
                      isMobile && { justifyContent: 'flex-end', width: '100%' },
                    ]}
                  >
                    {isCurrent ? (
                      <View
                        style={[
                          styles.activeProfileBtn,
                          { backgroundColor: theme.primary },
                        ]}
                      >
                        <Text
                          style={{
                            color: '#FFFFFF',
                            fontWeight: '800',
                            fontSize: fs(11),
                          }}
                        >
                          Perfil em Uso
                        </Text>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={[
                          styles.switchProfileBtn,
                          {
                            backgroundColor: theme.surface,
                            borderColor: theme.primaryBorder,
                          },
                        ]}
                        onPress={() =>
                          handleSwitchDemoProfile(item.email, item.demoPass)
                        }
                      >
                        <Text
                          style={{
                            color: theme.primaryDark,
                            fontWeight: '700',
                            fontSize: fs(11),
                          }}
                        >
                          Usar Perfil
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </View>

      {/* COLUNA DIREITA: Logs de Auditoria & Segurança */}
      <View
        style={[
          styles.rightCard,
          !isWide && styles.fullWidth,
          {
            backgroundColor: theme.surface,
            borderColor: theme.border,
            padding: cardPadding,
          },
        ]}
      >
        <View style={styles.headerRow}>
          <View style={styles.auditTitleRow}>
            <FileTextIcon size={18} color={theme.primary} />
            <Text
              style={[
                styles.cardTitle,
                { color: theme.text, fontSize: isMobile ? fs(16) : fs(17) },
              ]}
            >
              Logs de Auditoria & Segurança
            </Text>
          </View>

          <TouchableOpacity
            style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}
            onPress={() => {
              if (isAdmin) loadAudit();
            }}
          >
            {isAdmin && <RefreshIcon size={13} color={theme.primaryDark} />}
            <Text
              style={{
                color: theme.primaryDark,
                fontWeight: '700',
                fontSize: fs(11),
              }}
            >
              MySQL Audit Trail
            </Text>
          </TouchableOpacity>
        </View>

        {isLoadingAudit ? (
          <ActivityIndicator color={theme.primary} style={{ marginVertical: 24 }} />
        ) : (
          <View style={styles.auditList}>
            {isAdmin &&
              auditLogs.slice(0, 6).map((log) => {
                const timeOnly = new Date(log.createdAt)
                  .toTimeString()
                  .split(' ')[0];
                const isWarn =
                  log.action.includes('DELETE') ||
                  log.action.includes('FAIL') ||
                  log.action.includes('STOP') ||
                  log.action.includes('BLOCKED');

                return (
                  <View
                    key={`db-${log.id}`}
                    style={[
                      styles.auditItem,
                      {
                        backgroundColor: theme.bg,
                        borderColor: theme.border,
                      },
                    ]}
                  >
                    <View style={styles.auditItemTop}>
                      <Text
                        style={{
                          color: theme.text,
                          fontWeight: '800',
                          fontSize: fs(12),
                          flex: 1,
                        }}
                      >
                        {log.userName || 'Sistema MySQL'}
                      </Text>
                      <View
                        style={[
                          styles.auditTag,
                          {
                            backgroundColor: isWarn
                              ? theme.warningSoft
                              : theme.primarySoft,
                          },
                        ]}
                      >
                        <Text
                          style={{
                            color: isWarn ? theme.warning : theme.primaryDark,
                            fontWeight: '800',
                            fontSize: fs(10),
                          }}
                        >
                          {isWarn ? 'WARN' : 'INFO'} • {timeOnly}
                        </Text>
                      </View>
                    </View>
                    <Text
                      style={{
                        color: theme.textSecondary,
                        fontSize: fs(11),
                        marginTop: 4,
                      }}
                    >
                      {log.action}: {log.details || 'Evento auditado com sucesso'}
                    </Text>
                  </View>
                );
              })}

            {hwHistory.map((h) => {
              const isWarn = h.direction === 'ERR' || h.message.includes('CALIB');
              return (
                <View
                  key={h.id}
                  style={[
                    styles.auditItem,
                    {
                      backgroundColor: theme.bg,
                      borderColor: theme.border,
                    },
                  ]}
                >
                  <View style={styles.auditItemTop}>
                    <Text
                      style={{
                        color: theme.text,
                        fontWeight: '800',
                        fontSize: fs(12),
                        flex: 1,
                      }}
                    >
                      {h.direction === 'ERR' ? 'Segurança Fail-Safe' : 'Sistema Arduino'}
                    </Text>
                    <View
                      style={[
                        styles.auditTag,
                        {
                          backgroundColor: isWarn
                            ? theme.warningSoft
                            : theme.primarySoft,
                        },
                      ]}
                    >
                      <Text
                        style={{
                          color: isWarn ? theme.warning : theme.primaryDark,
                          fontWeight: '800',
                          fontSize: fs(10),
                        }}
                      >
                        {isWarn ? 'WARN' : 'INFO'} • {h.timestamp}
                      </Text>
                    </View>
                  </View>
                  <Text
                    style={{
                      color: theme.textSecondary,
                      fontSize: fs(11),
                      marginTop: 4,
                    }}
                  >
                    {h.message}
                  </Text>
                </View>
              );
            })}

            {!isAdmin && (
              <View
                style={[
                  styles.rbacNotice,
                  {
                    backgroundColor: theme.surfaceMuted,
                    borderColor: theme.borderNeutral,
                  },
                ]}
              >
                <Text
                  style={{
                    color: theme.textSecondary,
                    fontSize: fs(11),
                    lineHeight: 16,
                  }}
                >
                  🔒 RBAC Ativo (RF23): Selecione &quot;Usar Perfil&quot; no Administrador Arena para carregar todos os registros globais da tabela `audit_logs` do MySQL.
                </Text>
              </View>
            )}
          </View>
        )}
      </View>
        </View>
      )}

      {/* SUB-ABA 2: DISPOSITIVOS IoT & CALIBRAÇÃO (RF05 / RF17) */}
      {activeSubTab === 'DEVICES' && (
        <View
          style={[
            styles.leftCard,
            styles.fullWidth,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
              padding: cardPadding,
            },
          ]}
        >
          <View style={styles.headerRow}>
            <View style={{ flex: 1, minWidth: 200 }}>
              <View style={styles.auditTitleRow}>
                <CpuIcon size={18} color={theme.primary} />
                <Text
                  style={[
                    styles.cardTitle,
                    { color: theme.text, fontSize: isMobile ? fs(16) : fs(18) },
                  ]}
                >
                  Controladores & Dispositivos IoT (RF05 / RF17)
                </Text>
              </View>
              <Text style={[styles.cardSubtitle, { color: theme.textSecondary, fontSize: fs(12) }]}>
                Cadastre controladores Arduino/Wi-Fi, calibre limiares dos 5 piezos e alterne status operacional.
              </Text>
            </View>

            <TouchableOpacity
              style={[
                styles.editOwnBtn,
                {
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 5,
                  backgroundColor: theme.surfaceMint,
                  borderColor: theme.primaryBorder,
                },
              ]}
              onPress={loadDevices}
            >
              <RefreshIcon size={13} color={theme.primaryDark} />
              <Text style={{ color: theme.primaryDark, fontWeight: '700', fontSize: fs(11) }}>
                Atualizar
              </Text>
            </TouchableOpacity>
          </View>

          {deviceFeedback && (
            <View
              style={[
                styles.feedbackBanner,
                { backgroundColor: theme.surfaceMint, borderColor: theme.primaryBorder },
              ]}
            >
              <Text style={{ color: theme.primaryDark, fontWeight: '700', fontSize: fs(12) }}>
                {deviceFeedback}
              </Text>
            </View>
          )}

          {createdPairingTokenOnce && (
            <View
              style={[
                styles.feedbackBanner,
                { backgroundColor: theme.warningSoft, borderColor: theme.warningBorder },
              ]}
            >
              <Text style={{ color: theme.warning, fontWeight: '800', fontSize: fs(11.5) }}>
                🔑 Token de Pareamento Único (salve agora): {createdPairingTokenOnce}
              </Text>
            </View>
          )}

          {isAdmin ? (
            <View
              style={[
                styles.rf02EditorBox,
                { backgroundColor: theme.bg, borderColor: theme.primaryBorder },
              ]}
            >
              <Text style={{ color: theme.primaryDark, fontWeight: '800', fontSize: fs(12.5), marginBottom: 8 }}>
                + Registrar Novo Controlador IoT (RF05)
              </Text>
              <View style={[styles.quickFormRow, isMobile && { flexDirection: 'column', alignItems: 'stretch' }]}>
                <TextInput
                  style={[
                    styles.formInput,
                    { backgroundColor: theme.surface, borderColor: theme.borderNeutral, color: theme.text, fontSize: fs(12) },
                  ]}
                  value={newDevCode}
                  onChangeText={setNewDevCode}
                  placeholder="Código (ex: STA-QUADRA-02)"
                  placeholderTextColor={theme.textMuted}
                  autoCapitalize="characters"
                />
                <TextInput
                  style={[
                    styles.formInput,
                    { backgroundColor: theme.surface, borderColor: theme.borderNeutral, color: theme.text, fontSize: fs(12) },
                  ]}
                  value={newDevName}
                  onChangeText={setNewDevName}
                  placeholder="Nome identificador (ex: Controlador Quadra Central)"
                  placeholderTextColor={theme.textMuted}
                />
              </View>

              <View style={[styles.quickFormRow, { marginTop: 8 }, isMobile && { flexDirection: 'column', alignItems: 'stretch' }]}>
                <TextInput
                  style={[
                    styles.formInput,
                    { backgroundColor: theme.surface, borderColor: theme.borderNeutral, color: theme.text, fontSize: fs(12) },
                  ]}
                  value={newDevModel}
                  onChangeText={setNewDevModel}
                  placeholder="Modelo Hardware"
                  placeholderTextColor={theme.textMuted}
                />
                <TextInput
                  style={[
                    styles.formInput,
                    { backgroundColor: theme.surface, borderColor: theme.borderNeutral, color: theme.text, fontSize: fs(12) },
                  ]}
                  value={newDevFw}
                  onChangeText={setNewDevFw}
                  placeholder="Firmware (ex: 2.4.0)"
                  placeholderTextColor={theme.textMuted}
                />
                <TextInput
                  style={[
                    styles.formInput,
                    { backgroundColor: theme.surface, borderColor: theme.borderNeutral, color: theme.text, fontSize: fs(12) },
                  ]}
                  value={newDevPairingToken}
                  onChangeText={setNewDevPairingToken}
                  placeholder="Token opcional (>= 12 chars)"
                  placeholderTextColor={theme.textMuted}
                />
              </View>

              <View style={[styles.quickFormRow, { marginTop: 8 }]}>
                <TouchableOpacity
                  style={[
                    styles.roleSelectPill,
                    { backgroundColor: theme.surface, borderColor: theme.borderNeutral },
                  ]}
                  onPress={() => {
                    const idx = TRANSPORT_OPTIONS.indexOf(newDevTransport);
                    setNewDevTransport(TRANSPORT_OPTIONS[(idx + 1) % TRANSPORT_OPTIONS.length]);
                  }}
                >
                  <Text style={{ color: theme.text, fontWeight: '700', fontSize: fs(11) }}>
                    Transporte: {newDevTransport} ↻
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.addBtn, { backgroundColor: theme.primary }]}
                  disabled={isSavingDevice}
                  onPress={handleRegisterDevice}
                >
                  <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: fs(12) }}>
                    {isSavingDevice ? 'Registrando...' : '+ Cadastrar Controlador'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View
              style={[
                styles.rbacHintBar,
                { backgroundColor: theme.surfaceMuted, borderColor: theme.borderNeutral },
              ]}
            >
              <LockIcon size={14} color={theme.primaryDark} />
              <Text style={{ color: theme.textSecondary, fontSize: fs(11), flex: 1 }}>
                Cadastro e calibração administrativa de controladores IoT exigem perfil ADMIN.
              </Text>
            </View>
          )}

          {isLoadingDevices ? (
            <ActivityIndicator color={theme.primary} style={{ marginVertical: 20 }} />
          ) : (
            <View style={styles.profileList}>
              {devices.map((dev) => (
                <View
                  key={dev.id}
                  style={[
                    styles.profileCard,
                    {
                      backgroundColor: theme.bg,
                      borderColor: dev.active ? theme.primaryBorder : theme.borderNeutral,
                      opacity: dev.active ? 1 : 0.65,
                      flexDirection: 'column',
                      alignItems: 'stretch',
                    },
                  ]}
                >
                  <View style={[styles.auditItemTop, { gap: 8 }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: theme.text, fontWeight: '800', fontSize: fs(13) }}>
                        {dev.deviceCode} • {dev.name}
                      </Text>
                      <Text style={{ color: theme.textSecondary, fontSize: fs(11), marginTop: 2 }}>
                        {dev.hardwareModel} • FW {dev.firmwareVersion} • {dev.transportType}
                      </Text>
                      <Text style={{ color: theme.primaryDark, fontWeight: '700', fontSize: fs(10.5), marginTop: 3 }}>
                        Limiares Piezo (A0..A4): [{dev.piezoThresholds.join(', ')}] mV
                      </Text>
                    </View>

                    <View style={[styles.roleBadge, { backgroundColor: theme.surfaceMint }]}>
                      <Text style={{ color: theme.primaryDark, fontWeight: '800', fontSize: fs(10) }}>
                        {dev.status} • {dev.active ? 'ATIVO' : 'INATIVO'}
                      </Text>
                    </View>
                  </View>

                  {isAdmin && (
                    <View style={[styles.quickFormRow, { marginTop: 8 }]}>
                      <TouchableOpacity
                        style={[
                          styles.switchProfileBtn,
                          { backgroundColor: theme.surface, borderColor: theme.primaryBorder },
                        ]}
                        onPress={() => handleCycleDeviceStatus(dev)}
                      >
                        <Text style={{ color: theme.primaryDark, fontWeight: '700', fontSize: fs(10.5) }}>
                          Status ↻ ({DEVICE_STATUS_CYCLE[dev.status] || 'ONLINE'})
                        </Text>
                      </TouchableOpacity>

                      {[200, 250, 320].map((mv) => (
                        <TouchableOpacity
                          key={mv}
                          style={[
                            styles.switchProfileBtn,
                            { backgroundColor: theme.surface, borderColor: theme.borderNeutral },
                          ]}
                          onPress={() => handleCalibrateDeviceThresholds(dev, mv)}
                        >
                          <Text style={{ color: theme.text, fontWeight: '700', fontSize: fs(10.5) }}>
                            Calibrar {mv} mV
                          </Text>
                        </TouchableOpacity>
                      ))}

                      <TouchableOpacity
                        style={[
                          styles.switchProfileBtn,
                          {
                            backgroundColor: dev.active ? theme.warningSoft : theme.surfaceMint,
                            borderColor: dev.active ? theme.warningBorder : theme.primaryBorder,
                          },
                        ]}
                        onPress={() => handleToggleDeviceActive(dev)}
                      >
                        <Text
                          style={{
                            color: dev.active ? theme.warning : theme.primaryDark,
                            fontWeight: '700',
                            fontSize: fs(10.5),
                          }}
                        >
                          {dev.active ? 'Desativar' : 'Reativar'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {/* SUB-ABA 3: CATEGORIAS & PARÂMETROS GERAIS (RF17) */}
      {activeSubTab === 'CATEGORIES_SETTINGS' && (
        <View
          style={[
            styles.grid,
            !isWide && styles.gridStacked,
            { gap: sectionGap },
          ]}
        >
          {/* Coluna Esquerda: Categorias de Treino */}
          <View
            style={[
              styles.leftCard,
              !isWide && styles.fullWidth,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
                padding: cardPadding,
              },
            ]}
          >
            <View style={styles.headerRow}>
              <View style={styles.auditTitleRow}>
                <SlidersIcon size={18} color={theme.primary} />
                <Text style={[styles.cardTitle, { color: theme.text, fontSize: isMobile ? fs(15.5) : fs(17) }]}>
                  Categorias de Treino (RF17)
                </Text>
              </View>
              <TouchableOpacity onPress={loadCategoriesAndSettings}>
                <RefreshIcon size={14} color={theme.primaryDark} />
              </TouchableOpacity>
            </View>

            {catSettingsFeedback && (
              <View
                style={[
                  styles.feedbackBanner,
                  { backgroundColor: theme.surfaceMint, borderColor: theme.primaryBorder },
                ]}
              >
                <Text style={{ color: theme.primaryDark, fontWeight: '700', fontSize: fs(11.5) }}>
                  {catSettingsFeedback}
                </Text>
              </View>
            )}

            {isAdmin && (
              <View
                style={[
                  styles.rf02EditorBox,
                  { backgroundColor: theme.bg, borderColor: theme.primaryBorder },
                ]}
              >
                <Text style={{ color: theme.primaryDark, fontWeight: '800', fontSize: fs(12), marginBottom: 6 }}>
                  + Nova Categoria
                </Text>
                <View style={[styles.quickFormRow, isMobile && { flexDirection: 'column', alignItems: 'stretch' }]}>
                  <TextInput
                    style={[
                      styles.formInput,
                      { backgroundColor: theme.surface, borderColor: theme.borderNeutral, color: theme.text, fontSize: fs(12) },
                    ]}
                    value={newCatSlug}
                    onChangeText={setNewCatSlug}
                    placeholder="slug (ex: voleio-rede)"
                    placeholderTextColor={theme.textMuted}
                    autoCapitalize="none"
                  />
                  <TextInput
                    style={[
                      styles.formInput,
                      { backgroundColor: theme.surface, borderColor: theme.borderNeutral, color: theme.text, fontSize: fs(12) },
                    ]}
                    value={newCatCode}
                    onChangeText={setNewCatCode}
                    placeholder="CÓDIGO (ex: VOLLEY)"
                    placeholderTextColor={theme.textMuted}
                    autoCapitalize="characters"
                  />
                </View>
                <View style={[styles.quickFormRow, { marginTop: 8 }, isMobile && { flexDirection: 'column', alignItems: 'stretch' }]}>
                  <TextInput
                    style={[
                      styles.formInput,
                      { backgroundColor: theme.surface, borderColor: theme.borderNeutral, color: theme.text, fontSize: fs(12) },
                    ]}
                    value={newCatName}
                    onChangeText={setNewCatName}
                    placeholder="Nome da categoria"
                    placeholderTextColor={theme.textMuted}
                  />
                  <TextInput
                    style={[
                      styles.formInput,
                      { backgroundColor: theme.surface, borderColor: theme.borderNeutral, color: theme.text, fontSize: fs(12) },
                    ]}
                    value={newCatAudience}
                    onChangeText={setNewCatAudience}
                    placeholder="Público (TODOS / KIDS)"
                    placeholderTextColor={theme.textMuted}
                  />
                </View>
                <View style={[styles.quickFormRow, { marginTop: 8 }, isMobile && { flexDirection: 'column', alignItems: 'stretch' }]}>
                  <TextInput
                    style={[
                      styles.formInput,
                      { backgroundColor: theme.surface, borderColor: theme.borderNeutral, color: theme.text, fontSize: fs(12) },
                    ]}
                    value={newCatDesc}
                    onChangeText={setNewCatDesc}
                    placeholder="Descrição breve da categoria"
                    placeholderTextColor={theme.textMuted}
                  />
                  <TouchableOpacity
                    style={[styles.addBtn, { backgroundColor: theme.primary }]}
                    onPress={handleCreateCategory}
                  >
                    <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: fs(11.5) }}>
                      + Criar Categoria
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {isLoadingCatSettings ? (
              <ActivityIndicator color={theme.primary} style={{ marginVertical: 20 }} />
            ) : (
              <View style={styles.profileList}>
                {categories.map((cat) => (
                  <View
                    key={cat.id}
                    style={[
                      styles.profileCard,
                      {
                        backgroundColor: theme.bg,
                        borderColor: cat.active ? theme.primaryBorder : theme.borderNeutral,
                        opacity: cat.active ? 1 : 0.65,
                      },
                    ]}
                  >
                    <View style={{ flex: 1, minWidth: 160 }}>
                      <Text style={{ color: theme.text, fontWeight: '800', fontSize: fs(12.5) }}>
                        {cat.name} ({cat.code})
                      </Text>
                      <Text style={{ color: theme.textSecondary, fontSize: fs(11), marginTop: 2 }}>
                        slug: {cat.slug} • Público: {cat.targetAudience}
                      </Text>
                      {Boolean(cat.description) && (
                        <Text style={{ color: theme.textMuted, fontSize: fs(10.5), marginTop: 2 }}>
                          {cat.description}
                        </Text>
                      )}
                    </View>
                    {isAdmin && (
                      <TouchableOpacity
                        style={[
                          styles.switchProfileBtn,
                          {
                            backgroundColor: cat.active ? theme.surfaceMint : theme.warningSoft,
                            borderColor: cat.active ? theme.primaryBorder : theme.warningBorder,
                          },
                        ]}
                        onPress={() => handleToggleCategoryActive(cat)}
                      >
                        <Text
                          style={{
                            color: cat.active ? theme.primaryDark : theme.warning,
                            fontWeight: '700',
                            fontSize: fs(10.5),
                          }}
                        >
                          {cat.active ? 'Ativa ✓' : 'Inativa'}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Coluna Direita: Parâmetros Gerais do Sistema */}
          <View
            style={[
              styles.rightCard,
              !isWide && styles.fullWidth,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
                padding: cardPadding,
              },
            ]}
          >
            <View style={styles.headerRow}>
              <View style={styles.auditTitleRow}>
                <ActivityIcon size={18} color={theme.primary} />
                <Text style={[styles.cardTitle, { color: theme.text, fontSize: isMobile ? fs(15.5) : fs(17) }]}>
                  Parâmetros Gerais do Sistema
                </Text>
              </View>
            </View>

            <View style={styles.auditList}>
              {systemSettings.map((s) => (
                <View
                  key={s.settingKey}
                  style={[
                    styles.auditItem,
                    { backgroundColor: theme.bg, borderColor: theme.borderNeutral },
                  ]}
                >
                  <Text style={{ color: theme.primaryDark, fontWeight: '800', fontSize: fs(11.5) }}>
                    {s.settingKey} ({s.valueType})
                  </Text>
                  <Text style={{ color: theme.textSecondary, fontSize: fs(10.5), marginTop: 2, marginBottom: 6 }}>
                    {s.description}
                  </Text>
                  <View style={styles.quickFormRow}>
                    <TextInput
                      editable={isAdmin}
                      style={[
                        styles.formInput,
                        {
                          minWidth: 110,
                          backgroundColor: theme.surface,
                          borderColor: theme.borderNeutral,
                          color: theme.text,
                          fontSize: fs(12),
                        },
                      ]}
                      value={editingSettings[s.settingKey] ?? s.settingValue}
                      onChangeText={(val) =>
                        setEditingSettings((prev) => ({ ...prev, [s.settingKey]: val }))
                      }
                    />
                    {isAdmin && (
                      <TouchableOpacity
                        style={[styles.addBtn, { backgroundColor: theme.primary }]}
                        disabled={savingSettingKey === s.settingKey}
                        onPress={() => handleSaveSystemSetting(s.settingKey)}
                      >
                        <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: fs(11) }}>
                          {savingSettingKey === s.settingKey ? '...' : 'Salvar'}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ))}
            </View>
          </View>
        </View>
      )}

      {/* SUB-ABA 4: INCIDENTES !EMG & PLATAFORMA MÃE (RF19 / RF22 / RF23) */}
      {activeSubTab === 'INCIDENTS_MOTHER' && (
        <View
          style={[
            styles.grid,
            !isWide && styles.gridStacked,
            { gap: sectionGap },
          ]}
        >
          {/* Coluna Esquerda: Incidentes de Segurança !EMG */}
          <View
            style={[
              styles.leftCard,
              !isWide && styles.fullWidth,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
                padding: cardPadding,
              },
            ]}
          >
            <View style={styles.headerRow}>
              <View style={styles.auditTitleRow}>
                <ShieldAlertIcon size={18} color={theme.danger} />
                <Text style={[styles.cardTitle, { color: theme.text, fontSize: isMobile ? fs(15.5) : fs(17) }]}>
                  Incidentes !EMG & Segurança (RF22)
                </Text>
              </View>

              <View style={styles.headerBadgesRow}>
                <TouchableOpacity
                  style={[
                    styles.editOwnBtn,
                    {
                      backgroundColor: unresolvedOnly ? theme.warningSoft : theme.surfaceMuted,
                      borderColor: unresolvedOnly ? theme.warningBorder : theme.borderNeutral,
                    },
                  ]}
                  onPress={() => setUnresolvedOnly((v) => !v)}
                >
                  <Text
                    style={{
                      color: unresolvedOnly ? theme.warning : theme.textSecondary,
                      fontWeight: '700',
                      fontSize: fs(10.5),
                    }}
                  >
                    {unresolvedOnly ? 'Somente Pendentes' : 'Todos Incidentes'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={loadIncidentsAndMotherLogs}>
                  <RefreshIcon size={14} color={theme.primaryDark} />
                </TouchableOpacity>
              </View>
            </View>

            {incidentsFeedback && (
              <View
                style={[
                  styles.feedbackBanner,
                  { backgroundColor: theme.surfaceMint, borderColor: theme.primaryBorder },
                ]}
              >
                <Text style={{ color: theme.primaryDark, fontWeight: '700', fontSize: fs(11.5) }}>
                  {incidentsFeedback}
                </Text>
              </View>
            )}

            {!isCoachOrAdmin ? (
              <View
                style={[
                  styles.rbacNotice,
                  { backgroundColor: theme.surfaceMuted, borderColor: theme.borderNeutral },
                ]}
              >
                <Text style={{ color: theme.textSecondary, fontSize: fs(11.5), lineHeight: 17 }}>
                  🔒 RBAC Ativo: Faça login como TREINADOR ou ADMIN para visualizar e resolver incidentes de parada segura (!EMG) e consultar recibos da Plataforma Mãe.
                </Text>
              </View>
            ) : isLoadingIncidents ? (
              <ActivityIndicator color={theme.primary} style={{ marginVertical: 20 }} />
            ) : incidents.length === 0 ? (
              <Text style={{ color: theme.textSecondary, fontSize: fs(12), paddingVertical: 12 }}>
                Nenhum incidente de segurança registrado para este filtro.
              </Text>
            ) : (
              <View style={styles.auditList}>
                {incidents.map((inc) => (
                  <View
                    key={inc.id}
                    style={[
                      styles.auditItem,
                      {
                        backgroundColor: theme.bg,
                        borderColor: inc.resolved ? theme.primaryBorder : theme.dangerBorder,
                      },
                    ]}
                  >
                    <View style={styles.auditItemTop}>
                      <Text style={{ color: theme.text, fontWeight: '800', fontSize: fs(12), flex: 1 }}>
                        #{inc.id} • {inc.incidentType} ({inc.source})
                      </Text>
                      <View
                        style={[
                          styles.auditTag,
                          {
                            backgroundColor: inc.resolved
                              ? theme.surfaceMint
                              : theme.dangerSoft,
                          },
                        ]}
                      >
                        <Text
                          style={{
                            color: inc.resolved ? theme.primaryDark : theme.danger,
                            fontWeight: '800',
                            fontSize: fs(10),
                          }}
                        >
                          {inc.resolved ? 'RESOLVIDO ✓' : 'PENDENTE'}
                        </Text>
                      </View>
                    </View>
                    <Text style={{ color: theme.textSecondary, fontSize: fs(11), marginTop: 4 }}>
                      {inc.reason}
                    </Text>
                    <Text style={{ color: theme.textMuted, fontSize: fs(10), marginTop: 3 }}>
                      Dispositivo: {inc.deviceCode || 'N/D'} • Operador: {inc.userName || 'Sistema'} •{' '}
                      {new Date(inc.createdAt).toLocaleString('pt-BR')}
                    </Text>
                    {!inc.resolved && (
                      <TouchableOpacity
                        style={[
                          styles.switchProfileBtn,
                          {
                            marginTop: 8,
                            alignSelf: 'flex-start',
                            backgroundColor: theme.primary,
                            borderColor: theme.primaryDark,
                          },
                        ]}
                        onPress={() => handleResolveIncident(inc.id)}
                      >
                        <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: fs(11) }}>
                          ✓ Marcar como Resolvido
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Coluna Direita: Recibos da Plataforma Mãe (RF19) */}
          <View
            style={[
              styles.rightCard,
              !isWide && styles.fullWidth,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
                padding: cardPadding,
              },
            ]}
          >
            <View style={styles.headerRow}>
              <View style={styles.auditTitleRow}>
                <CheckCircleIcon size={18} color={theme.primary} />
                <Text style={[styles.cardTitle, { color: theme.text, fontSize: isMobile ? fs(15.5) : fs(17) }]}>
                  Recibos Plataforma Mãe (RF19)
                </Text>
              </View>
            </View>

            {!isCoachOrAdmin ? (
              <Text style={{ color: theme.textSecondary, fontSize: fs(11.5) }}>
                Acesso restrito a Treinadores e Administradores.
              </Text>
            ) : (
              <View style={styles.auditList}>
                {motherLogs.length === 0 ? (
                  <Text style={{ color: theme.textSecondary, fontSize: fs(12) }}>
                    Nenhum recibo de sincronização registrado ainda.
                  </Text>
                ) : (
                  motherLogs.map((log) => (
                    <View
                      key={log.id}
                      style={[
                        styles.auditItem,
                        { backgroundColor: theme.bg, borderColor: theme.borderNeutral },
                      ]}
                    >
                      <View style={styles.auditItemTop}>
                        <Text style={{ color: theme.primaryDark, fontWeight: '800', fontSize: fs(11.5), flex: 1 }}>
                          {log.receiptId}
                        </Text>
                        <View style={[styles.auditTag, { backgroundColor: theme.surfaceMint }]}>
                          <Text style={{ color: theme.primaryDark, fontWeight: '800', fontSize: fs(9.5) }}>
                            {log.status} ({log.mode})
                          </Text>
                        </View>
                      </View>
                      <Text style={{ color: theme.textSecondary, fontSize: fs(10.5), marginTop: 3 }}>
                        {log.direction} • Entidade: {log.entityId} • Telemetria LGPD:{' '}
                        {log.telemetryForwarded ? 'SIM' : 'NÃO'}
                      </Text>
                      <Text style={{ color: theme.textMuted, fontSize: fs(10), marginTop: 2 }}>
                        {new Date(log.createdAt).toLocaleString('pt-BR')}
                      </Text>
                    </View>
                  ))
                )}
              </View>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  subTabsBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    borderRadius: 16,
    borderWidth: 1,
    width: '100%',
  },
  subTabPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  grid: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    width: '100%',
  },
  gridStacked: {
    flexDirection: 'column',
  },
  fullWidth: {
    width: '100%',
  },
  leftCard: {
    flex: 5.8,
    borderRadius: 20,
    borderWidth: 1,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 1,
  },
  rightCard: {
    flex: 4.2,
    borderRadius: 20,
    borderWidth: 1,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  headerBadgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  auditTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
  },
  cardTitle: {
    fontWeight: '800',
    letterSpacing: -0.3,
    flexShrink: 1,
  },
  cardSubtitle: {
    marginTop: 2,
  },
  countPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  editOwnBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  feedbackBanner: {
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 14,
  },
  rf02EditorBox: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  quickFormRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
  },
  chipToggle: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 9,
    borderWidth: 1,
  },
  addBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
    alignItems: 'center',
  },
  rbacHintBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  addBarActionsRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  formInput: {
    flex: 1,
    minWidth: 155,
    minHeight: 42,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  roleSelectPill: {
    minHeight: 42,
    justifyContent: 'center',
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
  },
  addBtn: {
    minHeight: 42,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileList: {
    gap: 10,
  },
  profileCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
    padding: 13,
    borderRadius: 14,
    borderWidth: 1,
  },
  profileLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    flex: 1,
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 2,
  },
  profileName: {
    fontWeight: '800',
  },
  roleBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  profileMeta: {
    fontWeight: '500',
  },
  profileActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  activeProfileBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  switchProfileBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  trashBtn: {
    padding: 8,
  },
  auditList: {
    gap: 10,
  },
  auditItem: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 13,
  },
  auditItemTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  auditTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  rbacNotice: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 4,
  },
});
