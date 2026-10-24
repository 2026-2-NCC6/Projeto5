import React, { useState, useEffect } from 'react';
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
import { EmergencyStopButton } from './src/components/EmergencyStopButton';
import { SessionSummaryModal } from './src/components/SessionSummaryModal';
import { AuthModal } from './src/components/AuthModal';
import { UserManagementModal } from './src/components/UserManagementModal';
import { HardwareModal } from './src/components/HardwareModal';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { DEFAULT_DRILLS } from '../packages/shared/src/contracts/drills';
import { GameState } from '../packages/shared/src/fsm/types';

function MainScreen() {
  const { state, actions } = useGameEngine();
  const { user } = useAuth();

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isHardwareModalOpen, setIsHardwareModalOpen] = useState(false);

  // Sincronização automática do perfil do praticante (RF02) com o modo do jogo (RF11)
  useEffect(() => {
    if (user?.profile?.ageGroup) {
      actions.setIsKidsMode(user.profile.ageGroup === 'KIDS');
    }
  }, [user?.profile?.ageGroup]);

  const isPlaying =
    state.gameState === GameState.RUNNING_TARGET_ACTIVE ||
    state.gameState === GameState.TARGET_HIT ||
    state.gameState === GameState.TARGET_MISS_TIMEOUT;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#0B0F19" />
      <ScrollView contentContainerStyle={styles.container}>
        {/* Top Navbar */}
        <View style={styles.navBar}>
          <View style={styles.brandContainer}>
            <Text style={styles.brandTitle}>SMART TENNIS ARENA</Text>
            <Text style={styles.brandSubtitle}>Ecossistema Gamificado de Treino (IoT)</Text>
          </View>

          <View style={styles.navActions}>
            {/* Botão de Usuário / Autenticação (RF01, RF02, RF17) */}
            <TouchableOpacity
              style={[
                styles.userBadge,
                user ? styles.userBadgeLoggedIn : styles.userBadgeLoggedOut,
              ]}
              onPress={() => {
                if (user) {
                  setIsUserModalOpen(true);
                } else {
                  setIsAuthModalOpen(true);
                }
              }}
            >
              <Text style={styles.userBadgeText}>
                {user
                  ? `${user.role === 'ADMIN' ? '👑' : user.role === 'TREINADOR' ? '📋' : '🎾'} ${user.name.split(' ')[0]}`
                  : '🔑 Entrar / Cadastrar'}
              </Text>
            </TouchableOpacity>

            {/* Status e Gestão do Hardware IoT (RF05) */}
            <TouchableOpacity
              style={[
                styles.statusBadge,
                state.isHardwareConnected
                  ? styles.statusBadgeConnected
                  : styles.statusBadgeDisconnected,
              ]}
              onPress={() => setIsHardwareModalOpen(true)}
            >
              <View
                style={[
                  styles.statusDot,
                  state.isHardwareConnected ? styles.dotConnected : styles.dotDisconnected,
                ]}
              />
              <Text style={styles.statusText}>
                {state.isHardwareConnected
                  ? state.hardwareDeviceName || 'IoT Conectado'
                  : '🔌 Conectar IoT (USB/Mock)'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Banner do Praticante Conectado (RF02) */}
        {user && user.profile && (
          <View style={styles.playerInfoBanner}>
            <Text style={styles.playerInfoTitle}>
              PRATICANTE: <Text style={styles.playerInfoBold}>{user.name}</Text> ({user.profile.ageGroup === 'KIDS' ? '🧒 Kids' : '🎾 Adulto/Pro'} • Nível {user.profile.skillLevel})
            </Text>
            {user.profile.trainingGoals && (
              <Text style={styles.playerInfoGoal}>
                🎯 Meta: {user.profile.trainingGoals}
              </Text>
            )}
          </View>
        )}

        {/* Seletor de Modo: Kids Mode vs Pro Mode (RF11) */}
        <View style={styles.modeSelector}>
          <TouchableOpacity
            style={[styles.modeButton, state.isKidsMode && styles.modeButtonKidsActive]}
            onPress={() => actions.setIsKidsMode(true)}
          >
            <Text style={styles.modeButtonText}>🧒 MODO KIDS (Lúdico)</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeButton, !state.isKidsMode && styles.modeButtonProActive]}
            onPress={() => actions.setIsKidsMode(false)}
          >
            <Text style={styles.modeButtonText}>🎾 MODO PRO (Métrico)</Text>
          </TouchableOpacity>
        </View>

        {/* Seletor de Treinos (Catálogo Básico) */}
        <View style={styles.drillSelectorCard}>
          <Text style={styles.drillSelectorLabel}>TREINO SELECIONADO:</Text>
          <View style={styles.drillOptions}>
            {DEFAULT_DRILLS.map((drill) => {
              const isSelected = state.selectedDrill.id === drill.id;
              return (
                <TouchableOpacity
                  key={drill.id}
                  style={[styles.drillOptionBtn, isSelected && styles.drillOptionBtnActive]}
                  onPress={() => actions.setSelectedDrill(drill)}
                >
                  <Text
                    style={[
                      styles.drillOptionText,
                      isSelected && styles.drillOptionTextActive,
                    ]}
                  >
                    {drill.title}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* HUD de Pontuação e Métricas em Tempo Real */}
        <ScoreHUD
          score={state.score}
          streak={state.streak}
          remainingMs={state.stepRemainingMs}
          totalMs={state.stepTotalMs}
          currentStep={state.currentStepIndex}
          totalSteps={state.selectedDrill.steps.length}
          lastPointsAdded={state.lastPointsAdded}
          lastHitResult={state.lastHitResult}
          isKidsMode={state.isKidsMode}
        />

        {/* Banner de Contagem Regressiva Preparatória (3, 2, 1, GO!) */}
        {state.gameState === GameState.COUNTDOWN && (
          <View style={styles.countdownBanner}>
            <Text style={styles.countdownNumber}>{state.countdownValue}</Text>
            <Text style={styles.countdownLabel}>PREPARE-SE PARA O SAQUE!</Text>
          </View>
        )}

        {/* Painel Interativo de Alvos com Anel de 8 LEDs e Detecção */}
        <TargetBoard
          activeTarget={state.activeTarget}
          ledCount={state.ledCount}
          lastHitTarget={state.lastHitTarget}
          lastHitResult={state.lastHitResult}
          isKidsMode={state.isKidsMode}
          onTargetPress={(targetId) => {
            actions.tapTargetSimulated(targetId);
          }}
        />

        {/* Botão de Ação Primária: Iniciar Treino */}
        {!isPlaying && state.gameState !== GameState.COUNTDOWN && (
          <TouchableOpacity
            style={styles.startSessionButton}
            onPress={actions.startSession}
          >
            <Text style={styles.startSessionText}>▶ INICIAR SESSÃO DE TREINO</Text>
          </TouchableOpacity>
        )}

        {/* Botão Oficial de Parada Segura (RF22) */}
        <EmergencyStopButton
          isEngaged={state.gameState === GameState.EMERGENCY_STOP}
          alertMessage={state.emergencyAlert}
          onTriggerStop={actions.triggerEmergencyStop}
          onResetStop={actions.resetEmergencyStop}
        />

        {/* Modal de Resumo Analítico ao Finalizar o Treino (RF12) */}
        <SessionSummaryModal
          visible={state.gameState === GameState.COMPLETED}
          metrics={state.metrics}
          isKidsMode={state.isKidsMode}
          onClose={() => actions.resetEmergencyStop()}
          onRestart={actions.startSession}
        />

        {/* Modal de Login / Cadastro (RF01, RF02) */}
        <AuthModal
          visible={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
        />

        {/* Modal de Gestão de Usuário e Admin (RF02, RF17, RF23) */}
        <UserManagementModal
          visible={isUserModalOpen}
          onClose={() => setIsUserModalOpen(false)}
        />

        {/* Modal de Conexão e Diagnóstico de Hardware IoT (RF05) */}
        <HardwareModal
          visible={isHardwareModalOpen}
          onClose={() => setIsHardwareModalOpen(false)}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainScreen />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0B0F19',
  },
  container: {
    padding: 16,
    alignItems: 'center',
    paddingBottom: 40,
  },
  navBar: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    flexWrap: 'wrap',
    gap: 8,
  },
  brandContainer: {
    minWidth: 180,
  },
  brandTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#38BDF8',
    letterSpacing: 1,
  },
  brandSubtitle: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },
  navActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  userBadge: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  userBadgeLoggedIn: {
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    borderColor: '#38BDF8',
  },
  userBadgeLoggedOut: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderColor: '#F59E0B',
  },
  userBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  statusBadgeConnected: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: '#10B981',
  },
  statusBadgeDisconnected: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: '#EF4444',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  dotConnected: {
    backgroundColor: '#10B981',
  },
  dotDisconnected: {
    backgroundColor: '#EF4444',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#E2E8F0',
  },
  playerInfoBanner: {
    width: '100%',
    backgroundColor: 'rgba(30, 41, 59, 0.7)',
    borderColor: '#334155',
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  playerInfoTitle: {
    fontSize: 11,
    color: '#94A3B8',
  },
  playerInfoBold: {
    color: '#38BDF8',
    fontWeight: '800',
  },
  playerInfoGoal: {
    fontSize: 10,
    color: '#F59E0B',
    marginTop: 2,
    fontWeight: '600',
  },
  modeSelector: {
    flexDirection: 'row',
    width: '100%',
    gap: 8,
    marginBottom: 12,
  },
  modeButton: {
    flex: 1,
    backgroundColor: '#1E293B',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  modeButtonKidsActive: {
    backgroundColor: '#D97706',
    borderColor: '#F59E0B',
  },
  modeButtonProActive: {
    backgroundColor: '#0284C7',
    borderColor: '#38BDF8',
  },
  modeButtonText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  drillSelectorCard: {
    width: '100%',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  drillSelectorLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
    marginBottom: 8,
  },
  drillOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  drillOptionBtn: {
    flex: 1,
    backgroundColor: '#0F172A',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
  },
  drillOptionBtnActive: {
    borderColor: '#38BDF8',
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
  },
  drillOptionText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
    textAlign: 'center',
  },
  drillOptionTextActive: {
    color: '#38BDF8',
    fontWeight: '800',
  },
  countdownBanner: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderWidth: 2,
    borderColor: '#38BDF8',
    borderRadius: 16,
    padding: 16,
    width: '100%',
    alignItems: 'center',
    marginVertical: 10,
  },
  countdownNumber: {
    fontSize: 54,
    fontWeight: '900',
    color: '#38BDF8',
  },
  countdownLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#E0F2FE',
    letterSpacing: 1,
  },
  startSessionButton: {
    backgroundColor: '#10B981',
    width: '100%',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginVertical: 10,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  startSessionText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 1,
  },
});
