/**
 * Smart Tennis Arena — Editor de Treinos, Simulador de Validação,
 * Versionamento e Marketplace (RF14, RF15, RF16, RF18, RF20)
 * Responsivo para Smartphone, Tablet & Desktop Web
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import {
  DrillDefinition,
  DrillCategory,
  DRILL_CATEGORY_LABELS,
  DrillDifficulty,
  DrillStatus,
  DrillStep,
  DrillLicenseType,
  DrillRemunerationModel,
  TARGET_LABELS,
  TARGET_TACTICAL_NAMES,
  validateDrillDefinition,
  bumpDrillVersion,
} from '../../../packages/shared/src/contracts/drills';
import { TargetId } from '../../../packages/shared/src/protocol/serial';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useAccessibility } from '../context/AccessibilityContext';
import { useResponsive } from './useResponsive';
import {
  SlidersIcon,
  PlayIcon,
  CheckCircleIcon,
  ShieldAlertIcon,
  TrashIcon,
  SparklesIcon,
} from './Icons';

interface DrillEditorViewProps {
  drillsList: DrillDefinition[];
  initialDrill?: DrillDefinition | null;
  onDrillSaved: (saved: DrillDefinition, allDrills: DrillDefinition[]) => void;
  onPlayDrillInArena: (drill: DrillDefinition) => void;
}

const SPIN_OPTIONS: Array<'FLAT' | 'TOPSPIN' | 'BACKSPIN'> = [
  'FLAT',
  'TOPSPIN',
  'BACKSPIN',
];

const STATUS_BADGE_MAP: Record<
  DrillStatus,
  { label: string; isPublished?: boolean }
> = {
  DRAFT: { label: 'RASCUNHO (DRAFT)' },
  REVIEW: { label: 'EM REVISÃO (QA)' },
  PUBLISHED: { label: 'PUBLICADO (API)', isPublished: true },
  ARCHIVED: { label: 'ARQUIVADO' },
};

export const DrillEditorView: React.FC<DrillEditorViewProps> = ({
  drillsList,
  initialDrill,
  onDrillSaved,
  onPlayDrillInArena,
}) => {
  const { theme, fs } = useAccessibility();
  const { width, isMobile, cardPadding, sectionGap } = useResponsive();
  const { user } = useAuth();
  const isWide = width >= 980;

  const [editingId, setEditingId] = useState<string>(
    initialDrill?.id || `drill-custom-${Date.now().toString(36)}`
  );
  const [title, setTitle] = useState<string>(
    initialDrill?.title || 'Treino Tático de Precisão Diagonal'
  );
  const [description, setDescription] = useState<string>(
    initialDrill?.description ||
      'Sequência progressiva combinando bolas anguladas de fundo e aproximação à rede.'
  );
  const [category, setCategory] = useState<DrillCategory>(
    initialDrill?.category || DrillCategory.PRECISION
  );
  const [difficulty, setDifficulty] = useState<DrillDifficulty>(
    initialDrill?.difficulty || DrillDifficulty.INTERMEDIATE
  );
  const [isKidsAdapted, setIsKidsAdapted] = useState<boolean>(
    initialDrill?.isKidsAdapted ?? false
  );
  const [version, setVersion] = useState<string>(initialDrill?.version || '1.0.0');
  const [status, setStatus] = useState<DrillStatus>(
    initialDrill?.status || 'DRAFT'
  );
  const [authorName, setAuthorName] = useState<string>(
    initialDrill?.authorName || user?.name || 'Carlos Treinador'
  );
  const [changelogNote, setChangelogNote] = useState<string>(
    'Ajuste de janelas de reação e parâmetros da máquina lançadora'
  );

  // Passos da sequência (RF14 & RF09)
  const [steps, setSteps] = useState<DrillStep[]>(
    initialDrill?.steps && initialDrill.steps.length > 0
      ? initialDrill.steps
      : [
          { stepNumber: 1, targetId: 1, durationMs: 3000, ballSpeedKmh: 90, spinType: 'TOPSPIN' },
          { stepNumber: 2, targetId: 2, durationMs: 3000, ballSpeedKmh: 90, spinType: 'TOPSPIN' },
          { stepNumber: 3, targetId: 5, durationMs: 2600, ballSpeedKmh: 95, spinType: 'FLAT' },
          { stepNumber: 4, targetId: 3, durationMs: 2500, ballSpeedKmh: 85, spinType: 'BACKSPIN' },
          { stepNumber: 5, targetId: 4, durationMs: 2400, ballSpeedKmh: 100, spinType: 'FLAT' },
        ]
  );

  // Preparação & Riscos (RF04)
  const [instructionsText, setInstructionsText] = useState<string>(
    (
      initialDrill?.preparation?.instructions || [
        'Inicie no centro da linha de base em posição de expectativa.',
        'Acompanhe o disparo da máquina/simulador e acerte o alvo aceso.',
      ]
    ).join('\n')
  );
  const [safetyWarningText, setSafetyWarningText] = useState<string>(
    (
      initialDrill?.preparation?.safetyWarnings || [
        'Verifique se a quadra e os cabos dos 5 sensores estão livres de obstáculos.',
      ]
    ).join(' ')
  );

  // Metadados de Marketplace (RF20)
  const [commercialDesc, setCommercialDesc] = useState<string>(
    initialDrill?.marketplace?.commercialDescription ||
      'Protocolo certificado para academias e atletas competitivos com telemetria por zona.'
  );
  const [compatibility, setCompatibility] = useState<string>(
    initialDrill?.marketplace?.compatibility ||
      'Arduino Uno R3 + Spinshot Plus-2 / Simulador v2.4'
  );
  const [licenseType, setLicenseType] = useState<DrillLicenseType>(
    initialDrill?.marketplace?.licenseType || 'FREE_OPEN'
  );
  const [remunerationModel, setRemunerationModel] =
    useState<DrillRemunerationModel>(
      initialDrill?.marketplace?.remunerationModel || 'REVENUE_SHARE_70_30'
    );
  const [suggestedPrice, setSuggestedPrice] = useState<string>(
    String(initialDrill?.marketplace?.suggestedPriceBrl ?? 29.9)
  );

  // Simulador pré-publicação (RF15)
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [simStepIdx, setSimStepIdx] = useState<number>(-1);
  const simTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [feedbackBanner, setFeedbackBanner] = useState<{
    text: string;
    isError?: boolean;
  } | null>(null);

  useEffect(() => {
    if (initialDrill) {
      loadDrillIntoForm(initialDrill);
    }
    return () => {
      if (simTimerRef.current) clearInterval(simTimerRef.current);
    };
  }, [initialDrill]);

  const loadDrillIntoForm = (d: DrillDefinition) => {
    if (simTimerRef.current) clearInterval(simTimerRef.current);
    setIsSimulating(false);
    setSimStepIdx(-1);

    setEditingId(d.id);
    setTitle(d.title);
    setDescription(d.description);
    setCategory(d.category);
    setDifficulty(d.difficulty);
    setIsKidsAdapted(d.isKidsAdapted);
    setVersion(d.version || '1.0.0');
    setStatus(d.status || 'PUBLISHED');
    setAuthorName(d.authorName || user?.name || 'Carlos Treinador');
    setSteps(d.steps.map((s, i) => ({ ...s, stepNumber: i + 1 })));
    setInstructionsText(
      (
        d.preparation?.instructions || [
          'Posicione-se na linha de base antes de iniciar a contagem.',
        ]
      ).join('\n')
    );
    setSafetyWarningText(
      (
        d.preparation?.safetyWarnings || [
          'Mantenha a área dos sensores livre de obstáculos.',
        ]
      ).join(' ')
    );
    setCommercialDesc(d.marketplace?.commercialDescription || d.description);
    setCompatibility(
      d.marketplace?.compatibility || 'Arduino Uno R3 + Simulador Spinshot'
    );
    setLicenseType(d.marketplace?.licenseType || 'FREE_OPEN');
    setRemunerationModel(d.marketplace?.remunerationModel || 'FREE');
    setSuggestedPrice(String(d.marketplace?.suggestedPriceBrl ?? 0));
    setFeedbackBanner(null);
  };

  const handleStartBlankDrill = () => {
    if (simTimerRef.current) clearInterval(simTimerRef.current);
    setIsSimulating(false);
    setSimStepIdx(-1);

    setEditingId(`drill-custom-${Date.now().toString(36)}`);
    setTitle('Novo Treino Personalizado Arena');
    setDescription(
      'Sequência personalizada criada no Editor de Treinos para validação de precisão e reação.'
    );
    setCategory(DrillCategory.PRECISION);
    setDifficulty(DrillDifficulty.INTERMEDIATE);
    setIsKidsAdapted(false);
    setVersion('1.0.0');
    setStatus('DRAFT');
    setAuthorName(user?.name || 'Carlos Treinador');
    setSteps([
      { stepNumber: 1, targetId: 5, durationMs: 3000, ballSpeedKmh: 85, spinType: 'FLAT' },
      { stepNumber: 2, targetId: 1, durationMs: 2800, ballSpeedKmh: 90, spinType: 'TOPSPIN' },
      { stepNumber: 3, targetId: 2, durationMs: 2800, ballSpeedKmh: 90, spinType: 'TOPSPIN' },
      { stepNumber: 4, targetId: 4, durationMs: 2500, ballSpeedKmh: 95, spinType: 'FLAT' },
    ]);
    setFeedbackBanner({
      text: 'Novo rascunho v1.0.0 iniciado. Configure os passos, simule e publique!',
    });
  };

  const handleAddStep = () => {
    const nextNum = steps.length + 1;
    const nextTarget = (((steps.length) % 5) + 1) as TargetId;
    setSteps([
      ...steps,
      {
        stepNumber: nextNum,
        targetId: nextTarget,
        durationMs: isKidsAdapted ? 3800 : 2600,
        ballSpeedKmh: isKidsAdapted ? 50 : 95,
        spinType: 'TOPSPIN',
      },
    ]);
  };

  const handleRemoveStep = (idx: number) => {
    if (steps.length <= 2) {
      setFeedbackBanner({
        text: 'O treino precisa manter no mínimo 2 disparos na sequência.',
        isError: true,
      });
      return;
    }
    const next = steps
      .filter((_, i) => i !== idx)
      .map((s, i) => ({ ...s, stepNumber: i + 1 }));
    setSteps(next);
  };

  const handleUpdateStep = (idx: number, patch: Partial<DrillStep>) => {
    setSteps((prev) =>
      prev.map((s, i) => (i === idx ? { ...s, ...patch } : s))
    );
  };

  // Validação formal em tempo real (RF15)
  const validation = validateDrillDefinition({
    id: editingId,
    title,
    description,
    category,
    difficulty,
    isKidsAdapted,
    version,
    authorName,
    steps,
  });

  // Simulador visual passo a passo antes da publicação (RF15)
  const handleRunSimulation = () => {
    if (isSimulating) {
      if (simTimerRef.current) clearInterval(simTimerRef.current);
      setIsSimulating(false);
      setSimStepIdx(-1);
      return;
    }

    if (!validation.valid) {
      setFeedbackBanner({
        text: `Corrija os erros antes de simular: ${validation.errors[0]}`,
        isError: true,
      });
      return;
    }

    setIsSimulating(true);
    setSimStepIdx(0);
    let idx = 0;

    simTimerRef.current = setInterval(() => {
      idx += 1;
      if (idx >= steps.length) {
        if (simTimerRef.current) clearInterval(simTimerRef.current);
        setIsSimulating(false);
        setSimStepIdx(-1);
        setFeedbackBanner({
          text: `✓ Simulação pré-publicação concluída com sucesso (${steps.length} bolas validadas em ${validation.estimatedDurationSec}s)!`,
        });
      } else {
        setSimStepIdx(idx);
      }
    }, 650);
  };

  // Salvar rascunho ou publicar versão (RF14, RF16, RF18, RF20)
  const handlePersistDrill = async (
    targetStatus: DrillStatus,
    bumpType?: 'PATCH' | 'MINOR' | 'MAJOR'
  ) => {
    setFeedbackBanner(null);
    if (!validation.valid) {
      setFeedbackBanner({
        text: `Validação falhou: ${validation.errors.join(' ')}`,
        isError: true,
      });
      return;
    }

    setIsSaving(true);
    try {
      const nextVersion = bumpType
        ? bumpDrillVersion(version, bumpType)
        : version;

      const draftPayload: DrillDefinition & {
        bumpType?: 'PATCH' | 'MINOR' | 'MAJOR';
        changelogNote?: string;
      } = {
        id: editingId,
        title: title.trim(),
        description: description.trim(),
        category,
        difficulty,
        recommendedAgeMin: isKidsAdapted ? 5 : 12,
        recommendedAgeMax: isKidsAdapted ? 12 : undefined,
        isKidsAdapted,
        version: nextVersion,
        authorName: authorName.trim(),
        status: targetStatus,
        steps: steps.map((s, i) => ({ ...s, stepNumber: i + 1 })),
        preparation: {
          instructions: instructionsText
            .split('\n')
            .map((l) => l.trim())
            .filter(Boolean),
          scoringRulesSummary: isKidsAdapted
            ? 'Modo Kids (RN09): +50% de janela temporal automática e zero penalidade.'
            : 'Regra RN03: Pontuação por tempo restante, multiplicador de streak (até 1.5x) e bônus de força ADC.',
          equipmentRequired: isKidsAdapted
            ? ['Raquete Kids', 'Bolas Low-Compression', '5 Módulos Piezo + LEDs']
            : ['Raquete Padrão', '5 Sensores Piezoelétricos Calibrados', 'Simulador/Lançadora Spinshot'],
          safetyWarnings: [safetyWarningText.trim() || 'Verifique área segura ao redor dos alvos.'],
          requiredSensors: validation.requiredSensors,
          estimatedDurationSec: validation.estimatedDurationSec,
        },
        marketplace: {
          commercialDescription: commercialDesc.trim() || description.trim(),
          compatibility: compatibility.trim(),
          licenseType,
          remunerationModel,
          suggestedPriceBrl: Math.max(0, parseFloat(suggestedPrice) || 0),
        },
        bumpType,
        changelogNote,
      };

      const { drill: saved, syncedWithApi } = await api.saveDrill(draftPayload);
      const { drills: refreshedList } = await api.listDrills();

      setVersion(saved.version);
      setStatus(saved.status || targetStatus);
      onDrillSaved(saved, refreshedList);

      setFeedbackBanner({
        text: `✓ Treino "${saved.title}" v${saved.version} [${targetStatus}] salvo ${
          syncedWithApi ? 'no MySQL & API REST (RF18)' : 'em Cache Local Offline (RF21)'
        }!`,
      });
    } catch (err: any) {
      setFeedbackBanner({
        text: `Erro ao salvar treino: ${err.message || err}`,
        isError: true,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const activeSimStep = simStepIdx >= 0 ? steps[simStepIdx] : null;
  const currentDrillObj = drillsList.find((d) => d.id === editingId);

  return (
    <View
      style={[
        styles.grid,
        !isWide && styles.gridStacked,
        { gap: sectionGap },
      ]}
    >
      {/* COLUNA ESQUERDA: Formulário do Editor de Treinos & Marketplace (RF14 + RF20) */}
      <View
        style={[
          styles.leftCol,
          !isWide && styles.fullWidth,
          {
            backgroundColor: theme.surface,
            borderColor: theme.border,
            padding: cardPadding,
          },
        ]}
      >
        <View style={styles.headerRow}>
          <View style={{ flex: 1, minWidth: 200 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <SlidersIcon size={19} color={theme.primary} />
              <Text
                style={[
                  styles.mainTitle,
                  { color: theme.text, fontSize: isMobile ? fs(16) : fs(18) },
                ]}
              >
                Editor de Treinos & Marketplace (RF14, RF16, RF20)
              </Text>
            </View>
            <Text
              style={{
                color: theme.textSecondary,
                fontSize: fs(12),
                marginTop: 3,
              }}
            >
              Crie protocolos personalizados, valide regras, simule na quadra e publique versões na API.
            </Text>
          </View>

          <TouchableOpacity
            accessibilityRole="button"
            style={[styles.newBtn, { backgroundColor: theme.primary }]}
            onPress={handleStartBlankDrill}
          >
            <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: fs(11) }}>
              + Novo Rascunho
            </Text>
          </TouchableOpacity>
        </View>

        {/* Seletor rápido de treinos existentes para edição/versionamento */}
        <View style={styles.selectorRow}>
          {drillsList.map((d) => {
            const selected = d.id === editingId;
            return (
              <TouchableOpacity
                key={d.id}
                style={[
                  styles.selectorPill,
                  {
                    backgroundColor: selected ? theme.surfaceMint : theme.surfaceMuted,
                    borderColor: selected ? theme.primary : theme.borderNeutral,
                  },
                ]}
                onPress={() => loadDrillIntoForm(d)}
              >
                <Text
                  style={{
                    color: selected ? theme.primaryDark : theme.textSecondary,
                    fontWeight: '700',
                    fontSize: fs(10),
                  }}
                >
                  {d.title} (v{d.version})
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {feedbackBanner && (
          <View
            style={[
              styles.bannerBox,
              {
                backgroundColor: feedbackBanner.isError
                  ? theme.dangerSoft
                  : theme.surfaceMint,
                borderColor: feedbackBanner.isError
                  ? theme.dangerBorder
                  : theme.primaryBorder,
              },
            ]}
          >
            <Text
              style={{
                color: feedbackBanner.isError ? theme.danger : theme.primaryDark,
                fontWeight: '700',
                fontSize: fs(12),
              }}
            >
              {feedbackBanner.text}
            </Text>
          </View>
        )}

        {/* Dados Principais do Treino */}
        <View style={styles.formSection}>
          <Text style={[styles.label, { color: theme.text, fontSize: fs(12) }]}>
            Título do Treino & Versão Semântica (RF14, RF16)
          </Text>
          <View style={[styles.inlineRow, isMobile && { flexDirection: 'column' }]}>
            <TextInput
              style={[
                styles.input,
                {
                  flex: 3,
                  backgroundColor: theme.surfaceMuted,
                  borderColor: theme.borderNeutral,
                  color: theme.text,
                  fontSize: fs(13),
                },
              ]}
              value={title}
              onChangeText={setTitle}
              placeholder="Título do treino"
              placeholderTextColor={theme.textMuted}
            />
            <TextInput
              style={[
                styles.input,
                {
                  flex: 1,
                  minWidth: 95,
                  backgroundColor: theme.surfaceMuted,
                  borderColor: theme.borderNeutral,
                  color: theme.text,
                  fontSize: fs(13),
                },
              ]}
              value={version}
              onChangeText={setVersion}
              placeholder="1.0.0"
              placeholderTextColor={theme.textMuted}
            />
          </View>

          <Text style={[styles.label, { color: theme.text, fontSize: fs(12) }]}>
            Descrição Técnica & Objetivo Pedagógico
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.surfaceMuted,
                borderColor: theme.borderNeutral,
                color: theme.text,
                fontSize: fs(12),
              },
            ]}
            value={description}
            onChangeText={setDescription}
            placeholder="Descreva o foco técnico do exercício..."
            placeholderTextColor={theme.textMuted}
          />

          {/* Público, Categoria e Dificuldade */}
          <View style={[styles.inlineRow, { marginTop: 8, flexWrap: 'wrap' }]}>
            <TouchableOpacity
              style={[
                styles.toggleChip,
                {
                  backgroundColor: !isKidsAdapted ? theme.primary : theme.surfaceMuted,
                  borderColor: !isKidsAdapted ? theme.primary : theme.borderNeutral,
                },
              ]}
              onPress={() => setIsKidsAdapted(false)}
            >
              <Text
                style={{
                  color: !isKidsAdapted ? '#FFFFFF' : theme.textSecondary,
                  fontWeight: '700',
                  fontSize: fs(11),
                }}
              >
                🎾 Público Adulto / Pro
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.toggleChip,
                {
                  backgroundColor: isKidsAdapted ? theme.primary : theme.surfaceMuted,
                  borderColor: isKidsAdapted ? theme.primary : theme.borderNeutral,
                },
              ]}
              onPress={() => setIsKidsAdapted(true)}
            >
              <Text
                style={{
                  color: isKidsAdapted ? '#FFFFFF' : theme.textSecondary,
                  fontWeight: '700',
                  fontSize: fs(11),
                }}
              >
                🧒 Público Kids (RN09)
              </Text>
            </TouchableOpacity>

            {(
              [
                DrillCategory.PRECISION,
                DrillCategory.REACTION,
                DrillCategory.ENDURANCE,
                DrillCategory.AGILITY,
                DrillCategory.KIDS_FUN,
              ] as DrillCategory[]
            ).map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.toggleChip,
                  {
                    backgroundColor:
                      category === cat ? theme.surfaceMint : theme.surface,
                    borderColor:
                      category === cat ? theme.primary : theme.borderNeutral,
                  },
                ]}
                onPress={() => setCategory(cat)}
              >
                <Text
                  style={{
                    color: category === cat ? theme.primaryDark : theme.textSecondary,
                    fontWeight: '700',
                    fontSize: fs(10),
                  }}
                >
                  {DRILL_CATEGORY_LABELS[cat].split(' ')[0]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Sequência de Passos e Parâmetros da Máquina (RF09, RF14) */}
          <View style={styles.stepsHeaderRow}>
            <Text style={[styles.label, { color: theme.text, fontSize: fs(13), marginTop: 0 }]}>
              Sequência de Alvos & Máquina Lançadora ({steps.length} bolas)
            </Text>
            <TouchableOpacity
              style={[
                styles.addStepBtn,
                { backgroundColor: theme.surfaceMint, borderColor: theme.primaryBorder },
              ]}
              onPress={handleAddStep}
            >
              <Text style={{ color: theme.primaryDark, fontWeight: '800', fontSize: fs(11) }}>
                + Adicionar Bola
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.stepsList}>
            {steps.map((st, idx) => {
              const isSimActive = simStepIdx === idx;
              return (
                <View
                  key={idx}
                  style={[
                    styles.stepRowCard,
                    {
                      backgroundColor: isSimActive ? theme.surfaceMint : theme.bg,
                      borderColor: isSimActive ? theme.primary : theme.borderNeutral,
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: theme.primaryDark,
                      fontWeight: '800',
                      fontSize: fs(11),
                      minWidth: 26,
                    }}
                  >
                    #{idx + 1}
                  </Text>

                  {/* Seleção rápida de Alvo 1..5 */}
                  <View style={{ flexDirection: 'row', gap: 4 }}>
                    {([1, 2, 3, 4, 5] as TargetId[]).map((tId) => {
                      const active = st.targetId === tId;
                      return (
                        <TouchableOpacity
                          key={tId}
                          style={[
                            styles.targetMiniBtn,
                            {
                              backgroundColor: active ? theme.primary : theme.surface,
                              borderColor: active ? theme.primary : theme.borderNeutral,
                            },
                          ]}
                          onPress={() => handleUpdateStep(idx, { targetId: tId })}
                        >
                          <Text
                            style={{
                              color: active ? '#FFFFFF' : theme.textSecondary,
                              fontWeight: '800',
                              fontSize: fs(10),
                            }}
                          >
                            0{tId}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* Janela Temporal (ms) */}
                  <TouchableOpacity
                    style={[
                      styles.stepParamPill,
                      { backgroundColor: theme.surface, borderColor: theme.borderNeutral },
                    ]}
                    onPress={() => {
                      const windows = [1800, 2200, 2600, 3000, 3500, 4200];
                      const nextW =
                        windows[(windows.indexOf(st.durationMs) + 1) % windows.length] ||
                        2800;
                      handleUpdateStep(idx, { durationMs: nextW });
                    }}
                  >
                    <Text style={{ color: theme.text, fontWeight: '700', fontSize: fs(10) }}>
                      ⏱ {st.durationMs}ms
                    </Text>
                  </TouchableOpacity>

                  {/* Velocidade da Máquina (km/h) */}
                  <TouchableOpacity
                    style={[
                      styles.stepParamPill,
                      { backgroundColor: theme.surface, borderColor: theme.borderNeutral },
                    ]}
                    onPress={() => {
                      const speeds = [45, 65, 85, 100, 115, 125];
                      const curr = st.ballSpeedKmh || 85;
                      const nextSpd =
                        speeds[(speeds.indexOf(curr) + 1) % speeds.length] || 90;
                      handleUpdateStep(idx, { ballSpeedKmh: nextSpd });
                    }}
                  >
                    <Text style={{ color: theme.text, fontWeight: '700', fontSize: fs(10) }}>
                      🎾 {st.ballSpeedKmh || 85}km/h
                    </Text>
                  </TouchableOpacity>

                  {/* Spin da Máquina */}
                  <TouchableOpacity
                    style={[
                      styles.stepParamPill,
                      { backgroundColor: theme.surface, borderColor: theme.borderNeutral },
                    ]}
                    onPress={() => {
                      const curr = st.spinType || 'FLAT';
                      const nextSpin =
                        SPIN_OPTIONS[
                          (SPIN_OPTIONS.indexOf(curr) + 1) % SPIN_OPTIONS.length
                        ];
                      handleUpdateStep(idx, { spinType: nextSpin });
                    }}
                  >
                    <Text style={{ color: theme.primaryDark, fontWeight: '700', fontSize: fs(10) }}>
                      {st.spinType || 'FLAT'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    accessibilityLabel={`Remover passo ${idx + 1}`}
                    onPress={() => handleRemoveStep(idx)}
                  >
                    <TrashIcon size={14} color={theme.textMuted} />
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>

          {/* Metadados de Marketplace & Licenciamento Futuro (RF20) */}
          <View
            style={[
              styles.mktSection,
              { backgroundColor: theme.bg, borderColor: theme.primaryBorder },
            ]}
          >
            <Text style={{ color: theme.primaryDark, fontWeight: '800', fontSize: fs(12) }}>
              💼 Metadados de Marketplace & Licenciamento Futuro (RF20)
            </Text>

            <View style={[styles.inlineRow, { marginTop: 8, flexWrap: 'wrap' }]}>
              {(
                [
                  { key: 'FREE_OPEN', label: 'Licença Aberta (Free)' },
                  { key: 'ACADEMY_PRO', label: 'Licença Academia B2B' },
                  { key: 'MARKETPLACE_PAID', label: 'Premium Marketplace' },
                ] as const
              ).map((lic) => (
                <TouchableOpacity
                  key={lic.key}
                  style={[
                    styles.toggleChip,
                    {
                      backgroundColor:
                        licenseType === lic.key ? theme.primary : theme.surface,
                      borderColor:
                        licenseType === lic.key ? theme.primary : theme.borderNeutral,
                    },
                  ]}
                  onPress={() => setLicenseType(lic.key)}
                >
                  <Text
                    style={{
                      color: licenseType === lic.key ? '#FFFFFF' : theme.textSecondary,
                      fontWeight: '700',
                      fontSize: fs(10),
                    }}
                  >
                    {lic.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={[styles.inlineRow, { marginTop: 6, flexWrap: 'wrap' }]}>
              {(
                [
                  { key: 'FREE', label: 'Sem Cobrança (MVP)' },
                  { key: 'REVENUE_SHARE_70_30', label: 'Revenue Share 70/30' },
                  { key: 'SUBSCRIPTION_POOL', label: 'Pool Assinatura' },
                  { key: 'FIXED_LICENSE', label: 'Royalty Fixo' },
                ] as const
              ).map((rem) => (
                <TouchableOpacity
                  key={rem.key}
                  style={[
                    styles.toggleChip,
                    {
                      backgroundColor:
                        remunerationModel === rem.key
                          ? theme.surfaceMint
                          : theme.surface,
                      borderColor:
                        remunerationModel === rem.key
                          ? theme.primary
                          : theme.borderNeutral,
                    },
                  ]}
                  onPress={() => setRemunerationModel(rem.key)}
                >
                  <Text
                    style={{
                      color:
                        remunerationModel === rem.key
                          ? theme.primaryDark
                          : theme.textSecondary,
                      fontWeight: '700',
                      fontSize: fs(10),
                    }}
                  >
                    {rem.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={[styles.inlineRow, { marginTop: 8 }]}>
              <TextInput
                style={[
                  styles.input,
                  {
                    flex: 2,
                    backgroundColor: theme.surface,
                    borderColor: theme.borderNeutral,
                    color: theme.text,
                    fontSize: fs(11),
                  },
                ]}
                value={authorName}
                onChangeText={setAuthorName}
                placeholder="Autor / Treinador"
                placeholderTextColor={theme.textMuted}
              />
              <TextInput
                style={[
                  styles.input,
                  {
                    flex: 1,
                    backgroundColor: theme.surface,
                    borderColor: theme.borderNeutral,
                    color: theme.text,
                    fontSize: fs(11),
                  },
                ]}
                value={suggestedPrice}
                onChangeText={setSuggestedPrice}
                keyboardType="numeric"
                placeholder="R$ Sugerido"
                placeholderTextColor={theme.textMuted}
              />
            </View>
          </View>
        </View>
      </View>

      {/* COLUNA DIREITA: Simulador Pré-Publicação (RF15) & Versionamento (RF16) */}
      <View
        style={[
          styles.rightCol,
          !isWide && styles.fullWidth,
          {
            backgroundColor: theme.surface,
            borderColor: theme.border,
            padding: cardPadding,
          },
        ]}
      >
        <View style={styles.headerRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <SparklesIcon size={18} color={theme.primary} />
            <Text
              style={[
                styles.mainTitle,
                { color: theme.text, fontSize: isMobile ? fs(15) : fs(17) },
              ]}
            >
              Simulação & Publicação (RF15, RF16)
            </Text>
          </View>

          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor: STATUS_BADGE_MAP[status].isPublished
                  ? theme.surfaceMint
                  : theme.warningSoft,
              },
            ]}
          >
            <Text
              style={{
                color: STATUS_BADGE_MAP[status].isPublished
                  ? theme.primaryDark
                  : theme.warning,
                fontWeight: '800',
                fontSize: fs(10),
              }}
            >
              {STATUS_BADGE_MAP[status].label}
            </Text>
          </View>
        </View>

        {/* Validador Determinístico de Regras (RF15) */}
        <View
          style={[
            styles.validationBox,
            {
              backgroundColor: validation.valid ? theme.surfaceMint : theme.dangerSoft,
              borderColor: validation.valid ? theme.primaryBorder : theme.dangerBorder,
            },
          ]}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {validation.valid ? (
              <CheckCircleIcon size={16} color={theme.primaryDark} />
            ) : (
              <ShieldAlertIcon size={16} color={theme.danger} />
            )}
            <Text
              style={{
                color: validation.valid ? theme.primaryDark : theme.danger,
                fontWeight: '800',
                fontSize: fs(12),
                flex: 1,
              }}
            >
              {validation.valid
                ? 'Regras Formais Validadas (Decidibilidade OK)'
                : `${validation.errors.length} erro(s) impedem a publicação`}
            </Text>
          </View>

          <Text
            style={{
              color: theme.textSecondary,
              fontSize: fs(11),
              marginTop: 4,
            }}
          >
            Duração estimada: ~{validation.estimatedDurationSec}s • Sensores acionados: #
            {validation.requiredSensors.join(', #')}
          </Text>

          {validation.errors.map((err, i) => (
            <Text
              key={i}
              style={{ color: theme.danger, fontSize: fs(11), fontWeight: '600', marginTop: 2 }}
            >
              • {err}
            </Text>
          ))}
          {validation.warnings.map((w, i) => (
            <Text
              key={i}
              style={{ color: theme.warning, fontSize: fs(10), fontWeight: '600', marginTop: 2 }}
            >
              ⚠ {w}
            </Text>
          ))}
        </View>

        {/* Mini-Quadra de Simulação Pré-Publicação (RF15) */}
        <View
          style={[
            styles.simCourtBox,
            { backgroundColor: theme.bg, borderColor: theme.primaryBorder },
          ]}
        >
          <View style={styles.simTopRow}>
            <Text style={{ color: theme.text, fontWeight: '800', fontSize: fs(12) }}>
              Simulador Visual da Sequência (2-1-2)
            </Text>
            <TouchableOpacity
              accessibilityRole="button"
              style={[
                styles.simBtn,
                { backgroundColor: isSimulating ? theme.danger : theme.primary },
              ]}
              onPress={handleRunSimulation}
            >
              <PlayIcon size={12} color="#FFFFFF" />
              <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: fs(11) }}>
                {isSimulating ? 'Parar Simulação' : 'Simular Sequência (RF15)'}
              </Text>
            </TouchableOpacity>
          </View>

          {activeSimStep && (
            <Text
              style={{
                color: theme.primaryDark,
                fontWeight: '700',
                fontSize: fs(11),
                marginBottom: 8,
              }}
            >
              Disparo #{activeSimStep.stepNumber}/{steps.length} → Alvo 0
              {activeSimStep.targetId} ({TARGET_TACTICAL_NAMES[activeSimStep.targetId]}) •{' '}
              {activeSimStep.ballSpeedKmh || 85} km/h ({activeSimStep.spinType || 'FLAT'})
            </Text>
          )}

          <View style={styles.miniCourtGrid}>
            {([1, 2, 5, 3, 4] as TargetId[]).map((id) => {
              const lit = activeSimStep?.targetId === id;
              const isUsed = validation.requiredSensors.includes(id);
              return (
                <View
                  key={id}
                  style={[
                    styles.miniTargetNode,
                    {
                      backgroundColor: lit
                        ? theme.primary
                        : isUsed
                        ? theme.surface
                        : theme.surfaceMuted,
                      borderColor: lit ? theme.primaryDark : theme.primaryBorder,
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: lit ? '#FFFFFF' : theme.primaryDark,
                      fontWeight: '900',
                      fontSize: fs(12),
                    }}
                  >
                    0{id}
                  </Text>
                  <Text
                    numberOfLines={1}
                    style={{
                      color: lit ? '#D1FAE5' : theme.textMuted,
                      fontSize: fs(9),
                    }}
                  >
                    {TARGET_LABELS[id]}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Controles de Versionamento e Publicação (RF16) */}
        <Text style={[styles.label, { color: theme.text, fontSize: fs(12) }]}>
          Nota da Versão / Changelog (RF16)
        </Text>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: theme.surfaceMuted,
              borderColor: theme.borderNeutral,
              color: theme.text,
              fontSize: fs(12),
            },
          ]}
          value={changelogNote}
          onChangeText={setChangelogNote}
          placeholder="Descreva a alteração desta versão..."
          placeholderTextColor={theme.textMuted}
        />

        <View style={styles.publishActionsCol}>
          <View style={styles.inlineRow}>
            <TouchableOpacity
              style={[
                styles.secondaryPublishBtn,
                { backgroundColor: theme.surfaceMuted, borderColor: theme.borderNeutral },
              ]}
              disabled={isSaving}
              onPress={() => handlePersistDrill('DRAFT')}
            >
              <Text style={{ color: theme.text, fontWeight: '700', fontSize: fs(11) }}>
                Salvar Rascunho
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.secondaryPublishBtn,
                { backgroundColor: theme.warningSoft, borderColor: theme.warningBorder },
              ]}
              disabled={isSaving}
              onPress={() => handlePersistDrill('REVIEW', 'PATCH')}
            >
              <Text style={{ color: theme.warning, fontWeight: '800', fontSize: fs(11) }}>
                Enviar p/ Revisão (+Patch)
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            accessibilityRole="button"
            style={[styles.primaryPublishBtn, { backgroundColor: theme.primary }]}
            disabled={isSaving}
            onPress={() => handlePersistDrill('PUBLISHED', 'MINOR')}
          >
            {isSaving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: fs(13) }}>
                ✓ Publicar Versão no Catálogo & API (RF16 / RF18)
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            accessibilityRole="button"
            style={[
              styles.playNowBtn,
              { backgroundColor: theme.surfaceMint, borderColor: theme.primary },
            ]}
            onPress={() => {
              const playable: DrillDefinition = {
                id: editingId,
                title,
                description,
                category,
                difficulty,
                isKidsAdapted,
                version,
                authorName,
                status,
                steps,
              };
              onPlayDrillInArena(playable);
            }}
          >
            <PlayIcon size={14} color={theme.primaryDark} />
            <Text style={{ color: theme.primaryDark, fontWeight: '800', fontSize: fs(12) }}>
              Executar Este Treino na Arena Agora →
            </Text>
          </TouchableOpacity>
        </View>

        {/* Histórico de Alterações / Changelog (RF16) */}
        <Text style={[styles.label, { color: theme.text, fontSize: fs(12), marginTop: 14 }]}>
          Histórico de Versões Publicadas (RF16)
        </Text>
        <View style={styles.changelogList}>
          {(
            currentDrillObj?.changelog || [
              {
                version,
                date: new Date().toISOString().split('T')[0],
                author: authorName,
                notes: changelogNote,
              },
            ]
          )
            .slice(0, 4)
            .map((entry, i) => (
              <View
                key={i}
                style={[
                  styles.changelogItem,
                  { backgroundColor: theme.bg, borderColor: theme.borderNeutral },
                ]}
              >
                <Text style={{ color: theme.primaryDark, fontWeight: '800', fontSize: fs(11) }}>
                  v{entry.version} • {entry.date} • {entry.author}
                </Text>
                <Text style={{ color: theme.textSecondary, fontSize: fs(11), marginTop: 2 }}>
                  {entry.notes}
                </Text>
              </View>
            ))}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
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
  leftCol: {
    flex: 5.8,
    borderRadius: 20,
    borderWidth: 1,
  },
  rightCol: {
    flex: 4.2,
    borderRadius: 20,
    borderWidth: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 12,
  },
  mainTitle: {
    fontWeight: '800',
    letterSpacing: -0.3,
    flexShrink: 1,
  },
  newBtn: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
  },
  selectorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  selectorPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  bannerBox: {
    padding: 11,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  formSection: {
    gap: 6,
  },
  label: {
    fontWeight: '800',
    marginTop: 8,
    marginBottom: 4,
  },
  inlineRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  input: {
    minHeight: 42,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  toggleChip: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 9,
    borderWidth: 1,
  },
  stepsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 4,
  },
  addStepBtn: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  stepsList: {
    gap: 6,
  },
  stepRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 6,
    padding: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  targetMiniBtn: {
    width: 26,
    height: 26,
    borderRadius: 7,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepParamPill: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 7,
    borderWidth: 1,
  },
  mktSection: {
    marginTop: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  statusBadge: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  validationBox: {
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 14,
  },
  simCourtBox: {
    padding: 13,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
  },
  simTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  simBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 9,
  },
  miniCourtGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  miniTargetNode: {
    flexBasis: '30%',
    flexGrow: 1,
    minWidth: 85,
    padding: 8,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  publishActionsCol: {
    gap: 8,
    marginTop: 10,
  },
  secondaryPublishBtn: {
    flex: 1,
    minHeight: 40,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  primaryPublishBtn: {
    minHeight: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  playNowBtn: {
    minHeight: 42,
    flexDirection: 'row',
    gap: 8,
    borderRadius: 11,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  changelogList: {
    gap: 6,
  },
  changelogItem: {
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
});
