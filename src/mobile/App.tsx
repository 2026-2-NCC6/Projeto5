import React, { useState, useEffect, useRef } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  StatusBar,
} from 'react-native';
import { useGameEngine } from './src/fsm/useGameEngine';
import { TargetBoard } from './src/components/TargetBoard';
import { ScoreHUD } from './src/components/ScoreHUD';
import { DrillCatalogCard } from './src/components/DrillCatalogCard';
import { SessionSummaryView } from './src/components/SessionSummaryModal';
import { HardwareView } from './src/components/HardwareModal';
import { SessionPrepModal } from './src/components/SessionPrepModal';
import { HardwareSensorHUD } from './src/components/HardwareSensorHUD';
import { ManagementView } from './src/components/UserManagementModal';
import { AuthView } from './src/components/AuthModal';
import { useResponsive } from './src/components/useResponsive';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import {
  AccessibilityProvider,
  useAccessibility,
} from './src/context/AccessibilityContext';
import { hardwareManager } from './src/hardware/hardwareManager';
import { DEFAULT_DRILLS } from '../packages/shared/src/contracts/drills';
import { GameState } from '../packages/shared/src/fsm/types';
import {
  TargetIcon,
  AwardIcon,
  CpuIcon,
  UsersIcon,
  LockIcon,
  EyeIcon,
  VolumeIcon,
  VolumeMuteIcon,
} from './src/components/Icons';

type AppTab = 'ARENA' | 'SUMMARY' | 'HARDWARE' | 'MANAGEMENT' | 'AUTH';

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function getShortFsmTag(gs: GameState): string {
  switch (gs) {
    case GameState.COUNTDOWN:
      return 'PREP';
    case GameState.RUNNING_TARGET_ACTIVE:
      return 'ACTIVE';
    case GameState.TARGET_HIT:
      return 'HIT';
    case GameState.TARGET_MISS_TIMEOUT:
      return 'MISS';
    case GameState.COMPLETED:
      return 'DONE';
    case GameState.EMERGENCY_STOP:
      return 'STOP';
    default:
      return 'IDLE';
  }
}

function MainWorkspace() {
  const { state, actions } = useGameEngine();
  const { user } = useAuth();
  const {
    theme,
    fs,
    highContrast,
    toggleHighContrast,
    fontStep,
    cycleFontSize,
    soundEnabled,
    toggleSound,
    playSound,
  } = useAccessibility();

  const {
    isMobile,
    isSmallPhone,
    isCompactNav,
    isDesktop,
    pagePadding,
    sectionGap,
  } = useResponsive();

  const [activeTab, setActiveTab] = useState<AppTab>('ARENA');
  const [profilesCount, setProfilesCount] = useState<number>(4);
  const [showPrepModal, setShowPrepModal] = useState<boolean>(false);

  // Sincronização automática do perfil do praticante (RF02) com o modo do jogo (RF11)
  useEffect(() => {
    if (user?.profile?.ageGroup) {
      const kids = user.profile.ageGroup === 'KIDS';
      actions.setIsKidsMode(kids);
      if (kids && !state.selectedDrill.isKidsAdapted) {
        actions.setSelectedDrill(DEFAULT_DRILLS[0]);
      } else if (!kids && state.selectedDrill.isKidsAdapted && DEFAULT_DRILLS[1]) {
        actions.setSelectedDrill(DEFAULT_DRILLS[1]);
      }
    }
  }, [user?.profile?.ageGroup]);

  // Feedback auditivo acessível nas transições da partida
  const prevStateRef = useRef<GameState>(state.gameState);
  useEffect(() => {
    if (prevStateRef.current !== state.gameState) {
      if (state.gameState === GameState.TARGET_HIT) {
        playSound('hit');
      } else if (state.gameState === GameState.TARGET_MISS_TIMEOUT) {
        playSound('miss');
      } else if (state.gameState === GameState.COMPLETED) {
        playSound('complete');
      } else if (state.gameState === GameState.COUNTDOWN) {
        playSound('tick');
      }
      prevStateRef.current = state.gameState;
    }
  }, [state.gameState, playSound]);

  const totalAttempts =
    state.metrics.hits + state.metrics.misses + state.metrics.wrongHits;
  const accuracyPct =
    totalAttempts > 0
      ? Math.round((state.metrics.hits / totalAttempts) * 100)
      : 0;

  const maxWindowRaw = Math.max(
    ...state.selectedDrill.steps.map((s) => s.durationMs)
  );
  const effectiveMaxWindowMs = state.isKidsMode
    ? Math.round(maxWindowRaw * 1.5)
    : maxWindowRaw;

  const roleDisplay = !user
    ? 'VISITANTE'
    : user.role === 'ADMIN'
    ? 'ADMIN'
    : user.role === 'TREINADOR'
    ? 'COACH'
    : 'ATHLETE';

  const firstName = user ? user.name.split(' ')[0] : 'Visitante';
  const userInitials = user ? getInitials(user.name) : 'VI';
  const hwBadge = hardwareManager.mode === 'WEB_SERIAL' ? 'USB' : 'MOCK';

  const tabs: Array<{
    key: AppTab;
    label: string;
    mobileLabel: string;
    badge: string;
    renderIcon: (color: string, size?: number) => React.ReactNode;
  }> = [
    {
      key: 'ARENA',
      label: '1. Arena & Placar (HUD)',
      mobileLabel: 'Arena',
      badge: getShortFsmTag(state.gameState),
      renderIcon: (color, size = 16) => <TargetIcon size={size} color={color} />,
    },
    {
      key: 'SUMMARY',
      label: '2. Resumo da Sessão',
      mobileLabel: 'Resumo',
      badge: `${accuracyPct}%`,
      renderIcon: (color, size = 16) => <AwardIcon size={size} color={color} />,
    },
    {
      key: 'HARDWARE',
      label: '3. Hardware & IoT Serial',
      mobileLabel: 'IoT',
      badge: hwBadge,
      renderIcon: (color, size = 16) => <CpuIcon size={size} color={color} />,
    },
    {
      key: 'MANAGEMENT',
      label: '4. Gestão de Atletas & Logs',
      mobileLabel: 'Atletas',
      badge: String(profilesCount),
      renderIcon: (color, size = 16) => <UsersIcon size={size} color={color} />,
    },
    {
      key: 'AUTH',
      label: '5. Login & Segurança JWT',
      mobileLabel: 'Conta',
      badge: user ? 'Ativo' : 'Entrar',
      renderIcon: (color, size = 16) => <LockIcon size={size} color={color} />,
    },
  ];

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.bg }]}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.surface} />

      {/* TOP HEADER RESPONSIVO (Compacto em Celular, Completo em Web/Tablet) */}
      <View
        style={[
          styles.topHeaderBar,
          {
            backgroundColor: theme.surface,
            borderBottomColor: theme.border,
            paddingHorizontal: pagePadding,
            paddingTop: isMobile ? 10 : 14,
            paddingBottom: isMobile ? 8 : 10,
          },
        ]}
      >
        <View style={styles.maxWidthWrap}>
          {isMobile ? (
            /* HEADER MOBILE COMPACTO (2 linhas enxutas para preservar área útil do jogo) */
            <View style={{ gap: 8 }}>
              <View style={styles.mobileHeaderRow1}>
                <TouchableOpacity
                  activeOpacity={0.85}
                  style={styles.mobileBrandRow}
                  onPress={() => setActiveTab('ARENA')}
                >
                  <View
                    style={[
                      styles.brandLogoMobile,
                      { backgroundColor: theme.primary },
                    ]}
                  >
                    <TargetIcon size={18} color="#FFFFFF" strokeWidth={2.2} />
                  </View>
                  <View style={{ flexShrink: 1 }}>
                    <Text
                      numberOfLines={1}
                      style={{
                        color: theme.text,
                        fontWeight: '800',
                        fontSize: isSmallPhone ? fs(14) : fs(15),
                        letterSpacing: -0.3,
                      }}
                    >
                      Smart Tennis Arena
                    </Text>
                    <Text
                      numberOfLines={1}
                      style={{
                        color: theme.primaryDark,
                        fontWeight: '600',
                        fontSize: fs(10),
                      }}
                    >
                      Acerte o Alvo • IoT
                    </Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Acessar perfil e autenticação"
                  activeOpacity={0.8}
                  style={[
                    styles.mobileUserBtn,
                    {
                      backgroundColor: theme.surface,
                      borderColor: theme.primaryBorder,
                    },
                  ]}
                  onPress={() => setActiveTab(user ? 'MANAGEMENT' : 'AUTH')}
                >
                  <View
                    style={[
                      styles.mobileAvatar,
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
                      {userInitials}
                    </Text>
                  </View>
                  {!isSmallPhone && (
                    <Text
                      numberOfLines={1}
                      style={{
                        color: theme.text,
                        fontWeight: '700',
                        fontSize: fs(11),
                        maxWidth: 74,
                      }}
                    >
                      {firstName}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>

              {/* Sub-barra Mobile: Status IoT + Acessibilidade Compacta */}
              <View style={styles.mobileHeaderRow2}>
                <TouchableOpacity
                  accessibilityRole="button"
                  activeOpacity={0.8}
                  style={[
                    styles.mobileConnChip,
                    {
                      backgroundColor: state.isHardwareConnected
                        ? theme.surfaceMint
                        : theme.warningSoft,
                      borderColor: state.isHardwareConnected
                        ? theme.primaryBorder
                        : theme.warningBorder,
                    },
                  ]}
                  onPress={() => setActiveTab('HARDWARE')}
                >
                  <View
                    style={[
                      styles.connDot,
                      {
                        backgroundColor: state.isHardwareConnected
                          ? theme.primary
                          : theme.warning,
                      },
                    ]}
                  />
                  <Text
                    numberOfLines={1}
                    style={{
                      color: state.isHardwareConnected
                        ? theme.primaryDark
                        : theme.warning,
                      fontWeight: '700',
                      fontSize: fs(10),
                    }}
                  >
                    {state.isHardwareConnected
                      ? state.hardwareDeviceName || 'Simulador'
                      : 'Conectar IoT'}
                  </Text>
                </TouchableOpacity>

                <View
                  style={[
                    styles.mobileA11yBar,
                    {
                      backgroundColor: theme.surfaceMuted,
                      borderColor: theme.borderNeutral,
                    },
                  ]}
                >
                  <TouchableOpacity
                    accessibilityLabel="Alternar alto contraste"
                    style={[
                      styles.mobileA11yIconBtn,
                      highContrast && { backgroundColor: theme.primarySoft },
                    ]}
                    onPress={toggleHighContrast}
                  >
                    <EyeIcon
                      size={14}
                      color={highContrast ? theme.primaryDark : theme.textSecondary}
                    />
                  </TouchableOpacity>

                  <TouchableOpacity
                    accessibilityLabel="Alternar tamanho da fonte"
                    style={[
                      styles.mobileA11yIconBtn,
                      fontStep > 0 && { backgroundColor: theme.primarySoft },
                    ]}
                    onPress={cycleFontSize}
                  >
                    <Text
                      style={{
                        color: fontStep > 0 ? theme.primaryDark : theme.text,
                        fontWeight: '800',
                        fontSize: fs(11),
                      }}
                    >
                      A+
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    accessibilityLabel={soundEnabled ? 'Silenciar áudio' : 'Ativar áudio'}
                    style={[
                      styles.mobileA11yIconBtn,
                      soundEnabled && { backgroundColor: theme.surfaceMint },
                    ]}
                    onPress={toggleSound}
                  >
                    {soundEnabled ? (
                      <VolumeIcon size={14} color={theme.primaryDark} />
                    ) : (
                      <VolumeMuteIcon size={14} color={theme.textMuted} />
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ) : (
            /* HEADER WEB & TABLET COMPLETO */
            <View style={[styles.brandAndControlsRow, !isCompactNav && { marginBottom: 14 }]}>
              <TouchableOpacity
                activeOpacity={0.85}
                style={styles.brandBlock}
                onPress={() => setActiveTab('ARENA')}
              >
                <View
                  style={[
                    styles.brandLogoSquare,
                    { backgroundColor: theme.primary },
                  ]}
                >
                  <TargetIcon size={22} color="#FFFFFF" strokeWidth={2.2} />
                </View>
                <View style={{ flexShrink: 1 }}>
                  <View style={styles.brandTitleRow}>
                    <Text
                      style={[
                        styles.brandTitle,
                        { color: theme.text, fontSize: fs(18) },
                      ]}
                    >
                      Smart Tennis Arena
                    </Text>
                    <View
                      style={[
                        styles.brandTagPill,
                        { backgroundColor: theme.primarySoft },
                      ]}
                    >
                      <Text
                        style={[
                          styles.brandTagText,
                          { color: theme.primaryDark, fontSize: fs(11) },
                        ]}
                      >
                        Acerte o Alvo • IoT
                      </Text>
                    </View>
                  </View>
                  <Text
                    style={[
                      styles.brandSubtitle,
                      { color: theme.textSecondary, fontSize: fs(12) },
                    ]}
                  >
                    Sistema Embarcado de Treinamento Esportivo & Telemetria em Tempo Real
                  </Text>
                </View>
              </TouchableOpacity>

              <View style={styles.headerRightGroup}>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Status da conexão de hardware IoT"
                  activeOpacity={0.8}
                  style={[
                    styles.connectionPill,
                    {
                      backgroundColor: state.isHardwareConnected
                        ? theme.surfaceMint
                        : theme.warningSoft,
                      borderColor: state.isHardwareConnected
                        ? theme.primaryBorder
                        : theme.warningBorder,
                    },
                  ]}
                  onPress={() => setActiveTab('HARDWARE')}
                >
                  <View
                    style={[
                      styles.connDot,
                      {
                        backgroundColor: state.isHardwareConnected
                          ? theme.primary
                          : theme.warning,
                      },
                    ]}
                  />
                  <Text
                    style={{
                      color: state.isHardwareConnected
                        ? theme.primaryDark
                        : theme.warning,
                      fontWeight: '700',
                      fontSize: fs(12),
                    }}
                  >
                    {state.isHardwareConnected
                      ? `Conectado (${state.hardwareDeviceName || 'Simulador'})`
                      : 'Desconectado (Conectar)'}
                  </Text>
                </TouchableOpacity>

                <View
                  style={[
                    styles.a11yGroup,
                    {
                      backgroundColor: theme.surfaceMuted,
                      borderColor: theme.borderNeutral,
                    },
                  ]}
                >
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel="Alternar modo de alto contraste"
                    style={[
                      styles.a11yBtn,
                      highContrast && { backgroundColor: theme.primarySoft },
                    ]}
                    onPress={toggleHighContrast}
                  >
                    <EyeIcon
                      size={15}
                      color={highContrast ? theme.primaryDark : theme.textSecondary}
                    />
                    <Text
                      style={{
                        color: highContrast ? theme.primaryDark : theme.textSecondary,
                        fontWeight: '700',
                        fontSize: fs(12),
                      }}
                    >
                      Contraste
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel="Aumentar ou alternar tamanho da fonte"
                    style={[
                      styles.a11yBtn,
                      fontStep > 0 && { backgroundColor: theme.primarySoft },
                    ]}
                    onPress={cycleFontSize}
                  >
                    <Text
                      style={{
                        color: fontStep > 0 ? theme.primaryDark : theme.text,
                        fontWeight: '800',
                        fontSize: fs(12),
                      }}
                    >
                      A+
                    </Text>
                    <Text
                      style={{
                        color: fontStep > 0 ? theme.primaryDark : theme.textSecondary,
                        fontWeight: '700',
                        fontSize: fs(12),
                      }}
                    >
                      Fonte
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel={
                      soundEnabled ? 'Silenciar áudio' : 'Ativar áudio'
                    }
                    style={[
                      styles.soundIconBtn,
                      {
                        backgroundColor: soundEnabled
                          ? theme.surfaceMint
                          : theme.surface,
                        borderColor: soundEnabled
                          ? theme.primaryBorder
                          : theme.borderNeutral,
                      },
                    ]}
                    onPress={toggleSound}
                  >
                    {soundEnabled ? (
                      <VolumeIcon size={15} color={theme.primaryDark} />
                    ) : (
                      <VolumeMuteIcon size={15} color={theme.textMuted} />
                    )}
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Acessar perfil e autenticação"
                  activeOpacity={0.8}
                  style={[
                    styles.userProfileChip,
                    {
                      backgroundColor: theme.surface,
                      borderColor: theme.primaryBorder,
                    },
                  ]}
                  onPress={() => setActiveTab(user ? 'MANAGEMENT' : 'AUTH')}
                >
                  <View
                    style={[
                      styles.userAvatar,
                      { backgroundColor: theme.primarySoft },
                    ]}
                  >
                    <Text
                      style={{
                        color: theme.primaryDark,
                        fontWeight: '800',
                        fontSize: fs(12),
                      }}
                    >
                      {userInitials}
                    </Text>
                  </View>
                  <View>
                    <Text
                      style={{
                        color: theme.text,
                        fontWeight: '800',
                        fontSize: fs(12),
                      }}
                    >
                      {firstName}
                    </Text>
                    <Text
                      style={{
                        color: theme.primary,
                        fontWeight: '800',
                        fontSize: fs(10),
                        letterSpacing: 0.3,
                      }}
                    >
                      {roleDisplay}
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
              <SessionPrepModal
                visible={showPrepModal}
                drill={state.selectedDrill}
                isKidsMode={state.isKidsMode}
                onConfirmStart={() => {
                  setShowPrepModal(false);
                  actions.startSession();
                }}
                onCancel={() => setShowPrepModal(false)}
              />
            </View>
          )}

          {/* TOP NAVIGATION TABS (Exibida em Páginas Web & Tablets >= 820px) */}
          {!isCompactNav && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.tabsScrollContent}
            >
              {tabs.map((tab) => {
                const isActive = activeTab === tab.key;
                return (
                  <TouchableOpacity
                    key={tab.key}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: isActive }}
                    activeOpacity={0.85}
                    onPress={() => setActiveTab(tab.key)}
                    style={[
                      styles.navTabPill,
                      isActive
                        ? { backgroundColor: theme.primary }
                        : { backgroundColor: 'transparent' },
                    ]}
                  >
                    {tab.renderIcon(isActive ? '#FFFFFF' : theme.textSecondary, 16)}
                    <Text
                      style={[
                        styles.navTabLabel,
                        {
                          color: isActive ? '#FFFFFF' : theme.textSecondary,
                          fontSize: fs(13),
                        },
                      ]}
                    >
                      {tab.label}
                    </Text>
                    <View
                      style={[
                        styles.navTabBadge,
                        {
                          backgroundColor: isActive
                            ? 'rgba(255,255,255,0.22)'
                            : theme.surfaceMint,
                        },
                      ]}
                    >
                      <Text
                        style={{
                          color: isActive ? '#FFFFFF' : theme.primaryDark,
                          fontWeight: '800',
                          fontSize: fs(10),
                        }}
                      >
                        {tab.badge}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>
      </View>

      {/* ÁREA DE CONTEÚDO PRINCIPAL */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[
          styles.mainScrollContainer,
          {
            paddingHorizontal: pagePadding,
            paddingTop: isMobile ? 12 : 20,
            paddingBottom: isCompactNav ? 28 : 48,
          },
        ]}
      >
        <View style={styles.maxWidthWrap}>
          {/* ABA 1: ARENA & PLACAR (HUD) */}
          {activeTab === 'ARENA' && (
            <View>
              <ScoreHUD
                score={state.score}
                streak={state.streak}
                maxStreak={state.maxStreak}
                currentStep={state.currentStepIndex}
                totalSteps={state.selectedDrill.steps.length}
                maxWindowMs={effectiveMaxWindowMs}
                lastPointsAdded={state.lastPointsAdded}
                gameState={state.gameState}
                activeTarget={state.activeTarget}
                countdownValue={state.countdownValue}
                metrics={state.metrics}
                isKidsMode={state.isKidsMode}
              />

              <View
                style={[
                  styles.arenaMainColumns,
                  !isDesktop && styles.arenaStacked,
                  { gap: sectionGap },
                ]}
              >
                <View style={isDesktop ? styles.arenaLeftCol : styles.fullCol}>
                  <HardwareSensorHUD
                    lastShot={state.lastMachineShot}
                    isHardwareConnected={state.isHardwareConnected}
                    hardwareDeviceName={state.hardwareDeviceName}
                    goalsMet={state.goalsMet}
                    currentSeries={state.currentSeries}
                    totalSeries={state.totalSeries}
                    isKidsMode={state.isKidsMode}
                  />
                  <TargetBoard
                    activeTarget={state.activeTarget}
                    ledCount={state.ledCount}
                    remainingMs={state.stepRemainingMs}
                    totalMs={state.stepTotalMs}
                    lastHitTarget={state.lastHitTarget}
                    lastHitResult={state.lastHitResult}
                    isKidsMode={state.isKidsMode}
                    gameState={state.gameState}
                    countdownValue={state.countdownValue}
                    emergencyAlert={state.emergencyAlert}
                    onToggleMode={actions.setIsKidsMode}
                    onTargetPress={actions.tapTargetSimulated}
                    onStartSession={() => setShowPrepModal(true)}
                    onPauseSession={actions.pauseSession}
                    onResumeSession={actions.resumeSession}
                    onAbortSession={actions.abortSession}
                    onTriggerStop={actions.triggerEmergencyStop}
                    onResetStop={actions.resetEmergencyStop}
                    onViewSummary={() => setActiveTab('SUMMARY')}
                  />
                </View>

                <View style={isDesktop ? styles.arenaRightCol : styles.fullCol}>
                  <DrillCatalogCard
                    selectedDrill={state.selectedDrill}
                    isKidsMode={state.isKidsMode}
                    onSelectDrill={actions.setSelectedDrill}
                  />
                </View>
              </View>
            </View>
          )}

          {/* ABA 2: RESUMO DA SESSÃO */}
          {activeTab === 'SUMMARY' && (
            <SessionSummaryView
              metrics={state.metrics}
              zoneAnalytics={state.zoneAnalytics}
              selectedDrill={state.selectedDrill}
              athleteName={user ? user.name : 'Praticante Convidado'}
              athleteRoleLabel={
                !user
                  ? 'Visitante'
                  : user.role === 'ADMIN'
                  ? 'Admin'
                  : user.role === 'TREINADOR'
                  ? 'Treinador'
                  : 'Atleta'
              }
              isKidsMode={state.isKidsMode}
              hasCompletedSession={state.hasCompletedSession}
              onStartNewSession={() => {
                setActiveTab('ARENA');
                actions.startSession();
              }}
            />
          )}

          {/* ABA 3: HARDWARE & IOT SERIAL */}
          {activeTab === 'HARDWARE' && <HardwareView />}

          {/* ABA 4: GESTÃO DE ATLETAS & LOGS */}
          {activeTab === 'MANAGEMENT' && (
            <ManagementView
              onCountChange={setProfilesCount}
              onNavigateToArena={() => setActiveTab('ARENA')}
            />
          )}

          {/* ABA 5: LOGIN & SEGURANÇA JWT */}
          {activeTab === 'AUTH' && (
            <AuthView onAuthSuccess={() => setActiveTab('ARENA')} />
          )}
        </View>
      </ScrollView>

      {/* BOTTOM NAVIGATION BAR NATIVA (Exibida em Celulares e Telas < 820px) */}
      {isCompactNav && (
        <View
          style={[
            styles.bottomNavBar,
            {
              backgroundColor: theme.surface,
              borderTopColor: theme.border,
            },
          ]}
        >
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key;
            const iconColor = isActive ? theme.primaryDark : theme.textMuted;

            return (
              <TouchableOpacity
                key={tab.key}
                accessibilityRole="tab"
                accessibilityState={{ selected: isActive }}
                accessibilityLabel={tab.label}
                activeOpacity={0.78}
                onPress={() => setActiveTab(tab.key)}
                style={styles.bottomNavItem}
              >
                <View
                  style={[
                    styles.bottomNavIconPill,
                    isActive && { backgroundColor: theme.primarySoft },
                  ]}
                >
                  {tab.renderIcon(iconColor, 18)}
                </View>
                <Text
                  numberOfLines={1}
                  style={{
                    color: isActive ? theme.primaryDark : theme.textMuted,
                    fontWeight: isActive ? '800' : '600',
                    fontSize: isSmallPhone ? fs(10) : fs(11),
                  }}
                >
                  {tab.mobileLabel}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <AccessibilityProvider>
      <AuthProvider>
        <MainWorkspace />
      </AuthProvider>
    </AccessibilityProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  topHeaderBar: {
    borderBottomWidth: 1,
    alignItems: 'center',
  },
  maxWidthWrap: {
    width: '100%',
    maxWidth: 1360,
    alignSelf: 'center',
  },
  mobileHeaderRow1: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  mobileBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    flex: 1,
  },
  brandLogoMobile: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mobileUserBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  mobileAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mobileHeaderRow2: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  mobileConnChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    flexShrink: 1,
  },
  mobileA11yBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 3,
    borderRadius: 999,
    borderWidth: 1,
    gap: 4,
  },
  mobileA11yIconBtn: {
    width: 28,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandAndControlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 14,
  },
  brandBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexShrink: 1,
  },
  brandLogoSquare: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  brandTitle: {
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  brandTagPill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
  },
  brandTagText: {
    fontWeight: '700',
  },
  brandSubtitle: {
    marginTop: 2,
  },
  headerRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
  },
  connectionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  connDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  a11yGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 4,
    borderRadius: 999,
    borderWidth: 1,
    gap: 4,
  },
  a11yBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  soundIconBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userProfileChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingVertical: 6,
    paddingHorizontal: 11,
    borderRadius: 14,
    borderWidth: 1,
  },
  userAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabsScrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 2,
  },
  navTabPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 9,
    paddingHorizontal: 15,
    borderRadius: 999,
  },
  navTabLabel: {
    fontWeight: '700',
  },
  navTabBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  mainScrollContainer: {
    flexGrow: 1,
  },
  arenaMainColumns: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  arenaStacked: {
    flexDirection: 'column',
  },
  arenaLeftCol: {
    flex: 6.3,
  },
  arenaRightCol: {
    flex: 3.7,
  },
  fullCol: {
    width: '100%',
  },
  bottomNavBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 6,
  },
  bottomNavItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingVertical: 2,
  },
  bottomNavIconPill: {
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
