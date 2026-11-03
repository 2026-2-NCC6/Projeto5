import { useWindowDimensions } from 'react-native';

export interface ResponsiveLayout {
  width: number;
  height: number;
  isSmallPhone: boolean; // < 380px
  isMobile: boolean;     // < 640px
  isCompactNav: boolean; // < 820px (usa Bottom Tab Bar estilo app nativo)
  isTablet: boolean;     // 640px .. 1023px
  isDesktop: boolean;    // >= 1024px
  pagePadding: number;
  cardPadding: number;
  sectionGap: number;
}

export function useResponsive(): ResponsiveLayout {
  const { width, height } = useWindowDimensions();

  const isSmallPhone = width < 380;
  const isMobile = width < 640;
  const isCompactNav = width < 820;
  const isTablet = width >= 640 && width < 1024;
  const isDesktop = width >= 1024;

  const pagePadding = isSmallPhone ? 10 : isMobile ? 14 : isTablet ? 18 : 24;
  const cardPadding = isSmallPhone ? 14 : isMobile ? 16 : isTablet ? 20 : 24;
  const sectionGap = isMobile ? 12 : isTablet ? 15 : 18;

  return {
    width,
    height,
    isSmallPhone,
    isMobile,
    isCompactNav,
    isTablet,
    isDesktop,
    pagePadding,
    cardPadding,
    sectionGap,
  };
}

