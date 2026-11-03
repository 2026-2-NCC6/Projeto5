import React from 'react';
import { Platform, Text } from 'react-native';

export interface IconProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
}

function SvgWrap({
  size = 18,
  color = '#059669',
  strokeWidth = 2,
  fallback,
  children,
}: IconProps & { fallback: string; children: React.ReactNode }) {
  if (Platform.OS !== 'web') {
    return <Text style={{ fontSize: size * 0.85, color }}>{fallback}</Text>;
  }
  return React.createElement(
    'svg',
    {
      width: size,
      height: size,
      viewBox: '0 0 24 24',
      fill: 'none',
      stroke: color,
      strokeWidth,
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
      style: { display: 'inline-block', verticalAlign: 'middle', flexShrink: 0 },
    },
    children
  );
}

const el = React.createElement;

export const TargetIcon: React.FC<IconProps> = (props) => (
  <SvgWrap {...props} fallback="◎">
    {el('circle', { cx: 12, cy: 12, r: 10 })}
    {el('circle', { cx: 12, cy: 12, r: 6 })}
    {el('circle', { cx: 12, cy: 12, r: 2 })}
  </SvgWrap>
);

export const AwardIcon: React.FC<IconProps> = (props) => (
  <SvgWrap {...props} fallback="🏅">
    {el('circle', { cx: 12, cy: 8, r: 6 })}
    {el('path', { d: 'M15.477 12.89 17 22l-5-3-5 3 1.523-9.11' })}
  </SvgWrap>
);

export const ZapIcon: React.FC<IconProps> = (props) => (
  <SvgWrap {...props} fallback="⚡">
    {el('polygon', { points: '13 2 3 14 12 14 11 22 21 10 12 10 13 2' })}
  </SvgWrap>
);

export const ActivityIcon: React.FC<IconProps> = (props) => (
  <SvgWrap {...props} fallback="📈">
    {el('polyline', { points: '22 12 18 12 15 21 9 3 6 12 2 12' })}
  </SvgWrap>
);

export const ClockIcon: React.FC<IconProps> = (props) => (
  <SvgWrap {...props} fallback="🕒">
    {el('circle', { cx: 12, cy: 12, r: 10 })}
    {el('polyline', { points: '12 6 12 12 16 14' })}
  </SvgWrap>
);

export const SparklesIcon: React.FC<IconProps> = (props) => (
  <SvgWrap {...props} fallback="✨">
    {el('path', {
      d: 'm12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z',
    })}
    {el('path', { d: 'M5 3v4' })}
    {el('path', { d: 'M3 5h4' })}
  </SvgWrap>
);

export const SlidersIcon: React.FC<IconProps> = (props) => (
  <SvgWrap {...props} fallback="🎛">
    {el('line', { x1: 4, x2: 4, y1: 21, y2: 14 })}
    {el('line', { x1: 4, x2: 4, y1: 10, y2: 3 })}
    {el('line', { x1: 12, x2: 12, y1: 21, y2: 12 })}
    {el('line', { x1: 12, x2: 12, y1: 8, y2: 3 })}
    {el('line', { x1: 20, x2: 20, y1: 21, y2: 16 })}
    {el('line', { x1: 20, x2: 20, y1: 12, y2: 3 })}
    {el('line', { x1: 2, x2: 6, y1: 14, y2: 14 })}
    {el('line', { x1: 10, x2: 14, y1: 8, y2: 8 })}
    {el('line', { x1: 18, x2: 22, y1: 16, y2: 16 })}
  </SvgWrap>
);

export const CpuIcon: React.FC<IconProps> = (props) => (
  <SvgWrap {...props} fallback="🔲">
    {el('rect', { x: 4, y: 4, width: 16, height: 16, rx: 2 })}
    {el('rect', { x: 9, y: 9, width: 6, height: 6 })}
    {el('path', { d: 'M15 2v2M15 20v2M2 15h2M2 9h2M20 15h2M20 9h2M9 2v2M9 20v2' })}
  </SvgWrap>
);

export const TerminalIcon: React.FC<IconProps> = (props) => (
  <SvgWrap {...props} fallback=">_">
    {el('polyline', { points: '4 17 10 11 4 5' })}
    {el('line', { x1: 12, x2: 20, y1: 19, y2: 19 })}
  </SvgWrap>
);

export const WifiIcon: React.FC<IconProps> = (props) => (
  <SvgWrap {...props} fallback="📶">
    {el('path', { d: 'M5 12.55a11 11 0 0 1 14.08 0' })}
    {el('path', { d: 'M1.42 9a16 16 0 0 1 21.16 0' })}
    {el('path', { d: 'M8.53 16.11a6 6 0 0 1 6.95 0' })}
    {el('line', { x1: 12, x2: 12.01, y1: 20, y2: 20 })}
  </SvgWrap>
);

export const UsbIcon: React.FC<IconProps> = (props) => (
  <SvgWrap {...props} fallback="🔌">
    {el('circle', { cx: 10, cy: 7, r: 1 })}
    {el('circle', { cx: 4, cy: 20, r: 1 })}
    {el('path', { d: 'M4.7 19.3 19 5' })}
    {el('path', { d: 'm21 3-3 1 2 2Z' })}
    {el('path', { d: 'M9.26 7.68 5 12l2 5' })}
    {el('path', { d: 'm10 14 5 2 3.5-3.5' })}
    {el('path', { d: 'm18 12 1-1 1 1-1 1Z' })}
  </SvgWrap>
);

export const RefreshIcon: React.FC<IconProps> = (props) => (
  <SvgWrap {...props} fallback="↻">
    {el('path', { d: 'M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8' })}
    {el('path', { d: 'M3 3v5h5' })}
    {el('path', { d: 'M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16' })}
    {el('path', { d: 'M16 16h5v5' })}
  </SvgWrap>
);

export const UsersIcon: React.FC<IconProps> = (props) => (
  <SvgWrap {...props} fallback="👥">
    {el('path', { d: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2' })}
    {el('circle', { cx: 9, cy: 7, r: 4 })}
    {el('path', { d: 'M22 21v-2a4 4 0 0 0-3-3.87' })}
    {el('path', { d: 'M16 3.13a4 4 0 0 1 0 7.75' })}
  </SvgWrap>
);

export const FileTextIcon: React.FC<IconProps> = (props) => (
  <SvgWrap {...props} fallback="📄">
    {el('path', { d: 'M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z' })}
    {el('polyline', { points: '14 2 14 8 20 8' })}
    {el('line', { x1: 16, x2: 8, y1: 13, y2: 13 })}
    {el('line', { x1: 16, x2: 8, y1: 17, y2: 17 })}
    {el('line', { x1: 10, x2: 8, y1: 9, y2: 9 })}
  </SvgWrap>
);

export const LockIcon: React.FC<IconProps> = (props) => (
  <SvgWrap {...props} fallback="🔒">
    {el('rect', { width: 18, height: 11, x: 3, y: 11, rx: 2, ry: 2 })}
    {el('path', { d: 'M7 11V7a5 5 0 0 1 10 0v4' })}
  </SvgWrap>
);

export const UserCheckIcon: React.FC<IconProps> = (props) => (
  <SvgWrap {...props} fallback="👤">
    {el('path', { d: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2' })}
    {el('circle', { cx: 9, cy: 7, r: 4 })}
    {el('polyline', { points: '16 11 18 13 22 9' })}
  </SvgWrap>
);

export const EyeIcon: React.FC<IconProps> = (props) => (
  <SvgWrap {...props} fallback="👁">
    {el('path', { d: 'M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z' })}
    {el('circle', { cx: 12, cy: 12, r: 3 })}
  </SvgWrap>
);

export const VolumeIcon: React.FC<IconProps> = (props) => (
  <SvgWrap {...props} fallback="🔊">
    {el('polygon', { points: '11 5 6 9 2 9 2 15 6 15 11 19 11 5' })}
    {el('path', { d: 'M15.54 8.46a5 5 0 0 1 0 7.07' })}
    {el('path', { d: 'M19.07 4.93a10 10 0 0 1 0 14.14' })}
  </SvgWrap>
);

export const VolumeMuteIcon: React.FC<IconProps> = (props) => (
  <SvgWrap {...props} fallback="🔇">
    {el('polygon', { points: '11 5 6 9 2 9 2 15 6 15 11 19 11 5' })}
    {el('line', { x1: 22, x2: 16, y1: 9, y2: 15 })}
    {el('line', { x1: 16, x2: 22, y1: 9, y2: 15 })}
  </SvgWrap>
);

export const PlayIcon: React.FC<IconProps> = ({ size = 16, color = '#FFFFFF' }) => {
  if (Platform.OS !== 'web') {
    return <Text style={{ fontSize: size * 0.85, color }}>▶</Text>;
  }
  return el(
    'svg',
    {
      width: size,
      height: size,
      viewBox: '0 0 24 24',
      fill: color,
      stroke: color,
      strokeWidth: 2,
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
      style: { display: 'inline-block', verticalAlign: 'middle', flexShrink: 0 },
    },
    el('polygon', { points: '5 3 19 12 5 21 5 3' })
  );
};

export const CheckCircleIcon: React.FC<IconProps> = (props) => (
  <SvgWrap {...props} fallback="✓">
    {el('path', { d: 'M22 11.08V12a10 10 0 1 1-5.93-9.14' })}
    {el('polyline', { points: '22 4 12 14.01 9 11.01' })}
  </SvgWrap>
);

export const TrashIcon: React.FC<IconProps> = (props) => (
  <SvgWrap {...props} fallback="🗑">
    {el('path', { d: 'M3 6h18' })}
    {el('path', { d: 'M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6' })}
    {el('path', { d: 'M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2' })}
  </SvgWrap>
);

export const LogOutIcon: React.FC<IconProps> = (props) => (
  <SvgWrap {...props} fallback="↪">
    {el('path', { d: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4' })}
    {el('polyline', { points: '16 17 21 12 16 7' })}
    {el('line', { x1: 21, x2: 9, y1: 12, y2: 12 })}
  </SvgWrap>
);

export const ShieldAlertIcon: React.FC<IconProps> = (props) => (
  <SvgWrap {...props} fallback="⚠">
    {el('path', { d: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z' })}
    {el('line', { x1: 12, x2: 12, y1: 8, y2: 12 })}
    {el('line', { x1: 12, x2: 12.01, y1: 16, y2: 16 })}
  </SvgWrap>
);

