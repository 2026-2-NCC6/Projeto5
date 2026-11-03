import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Platform } from 'react-native';

export interface AppTheme {
  bg: string;
  surface: string;
  surfaceMint: string;
  surfaceMuted: string;
  primary: string;
  primaryDark: string;
  primarySoft: string;
  primaryBorder: string;
  border: string;
  borderNeutral: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  danger: string;
  dangerSoft: string;
  dangerBorder: string;
  warning: string;
  warningSoft: string;
  warningBorder: string;
  terminalBg: string;
  terminalText: string;
}

const DEFAULT_THEME: AppTheme = {
  bg: '#F6FBF8',
  surface: '#FFFFFF',
  surfaceMint: '#ECFDF5',
  surfaceMuted: '#F8FAFC',
  primary: '#059669',
  primaryDark: '#047857',
  primarySoft: '#D1FAE5',
  primaryBorder: '#A7F3D0',
  border: '#D1FAE5',
  borderNeutral: '#E2E8F0',
  text: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#64748B',
  danger: '#DC2626',
  dangerSoft: '#FEF2F2',
  dangerBorder: '#FECACA',
  warning: '#B45309',
  warningSoft: '#FEF3C7',
  warningBorder: '#FDE68A',
  terminalBg: '#040914',
  terminalText: '#22C55E',
};

const HIGH_CONTRAST_THEME: AppTheme = {
  bg: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceMint: '#E6F9EF',
  surfaceMuted: '#F1F5F9',
  primary: '#065F46',
  primaryDark: '#022C22',
  primarySoft: '#A7F3D0',
  primaryBorder: '#065F46',
  border: '#047857',
  borderNeutral: '#334155',
  text: '#000000',
  textSecondary: '#1E293B',
  textMuted: '#334155',
  danger: '#B91C1C',
  dangerSoft: '#FEE2E2',
  dangerBorder: '#B91C1C',
  warning: '#92400E',
  warningSoft: '#FDE68A',
  warningBorder: '#92400E',
  terminalBg: '#000000',
  terminalText: '#4ADE80',
};

type FontStep = 0 | 1 | 2; // 0 = 100%, 1 = 112%, 2 = 124%
const FONT_MULTIPLIERS: Record<FontStep, number> = {
  0: 1,
  1: 1.12,
  2: 1.24,
};

interface AccessibilityContextValue {
  highContrast: boolean;
  toggleHighContrast: () => void;
  fontStep: FontStep;
  cycleFontSize: () => void;
  soundEnabled: boolean;
  toggleSound: () => void;
  fs: (baseSize: number) => number;
  theme: AppTheme;
  playSound: (kind: 'hit' | 'miss' | 'tick' | 'estop' | 'complete') => void;
}

const AccessibilityContext = createContext<AccessibilityContextValue | undefined>(undefined);

export function AccessibilityProvider({ children }: { children: ReactNode }) {
  const [highContrast, setHighContrast] = useState(false);
  const [fontStep, setFontStep] = useState<FontStep>(0);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const toggleHighContrast = useCallback(() => {
    setHighContrast((prev) => !prev);
  }, []);

  const cycleFontSize = useCallback(() => {
    setFontStep((prev) => ((prev + 1) % 3) as FontStep);
  }, []);

  const toggleSound = useCallback(() => {
    setSoundEnabled((prev) => !prev);
  }, []);

  const fs = useCallback(
    (baseSize: number) => Math.round(baseSize * FONT_MULTIPLIERS[fontStep]),
    [fontStep]
  );

  const playSound = useCallback(
    (kind: 'hit' | 'miss' | 'tick' | 'estop' | 'complete') => {
      if (!soundEnabled || Platform.OS !== 'web') return;
      try {
        const AudioCtx =
          (window as any).AudioContext || (window as any).webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        const now = ctx.currentTime;
        if (kind === 'hit') {
          osc.type = 'sine';
          osc.frequency.setValueAtTime(660, now);
          osc.frequency.exponentialRampToValueAtTime(980, now + 0.11);
          gain.gain.setValueAtTime(0.08, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
          osc.start(now);
          osc.stop(now + 0.15);
        } else if (kind === 'miss') {
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(280, now);
          osc.frequency.linearRampToValueAtTime(190, now + 0.18);
          gain.gain.setValueAtTime(0.07, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
          osc.start(now);
          osc.stop(now + 0.21);
        } else if (kind === 'tick') {
          osc.type = 'sine';
          osc.frequency.setValueAtTime(520, now);
          gain.gain.setValueAtTime(0.05, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
          osc.start(now);
          osc.stop(now + 0.09);
        } else if (kind === 'complete') {
          osc.type = 'sine';
          osc.frequency.setValueAtTime(523.25, now);
          osc.frequency.setValueAtTime(659.25, now + 0.1);
          osc.frequency.setValueAtTime(783.99, now + 0.2);
          gain.gain.setValueAtTime(0.08, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
          osc.start(now);
          osc.stop(now + 0.36);
        } else if (kind === 'estop') {
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(220, now);
          gain.gain.setValueAtTime(0.1, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
          osc.start(now);
          osc.stop(now + 0.32);
        }
      } catch {
        // Ignora bloqueios de autoplay do navegador
      }
    },
    [soundEnabled]
  );

  const theme = highContrast ? HIGH_CONTRAST_THEME : DEFAULT_THEME;

  return (
    <AccessibilityContext.Provider
      value={{
        highContrast,
        toggleHighContrast,
        fontStep,
        cycleFontSize,
        soundEnabled,
        toggleSound,
        fs,
        theme,
        playSound,
      }}
    >
      {children}
    </AccessibilityContext.Provider>
  );
}

const FALLBACK_ACCESSIBILITY: AccessibilityContextValue = {
  highContrast: false,
  toggleHighContrast: () => {},
  fontStep: 0,
  cycleFontSize: () => {},
  soundEnabled: true,
  toggleSound: () => {},
  fs: (baseSize: number) => baseSize,
  theme: DEFAULT_THEME,
  playSound: () => {},
};

export function useAccessibility(): AccessibilityContextValue {
  const ctx = useContext(AccessibilityContext);
  return ctx ?? FALLBACK_ACCESSIBILITY;
}
