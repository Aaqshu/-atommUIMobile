import { useColorScheme } from 'react-native';

type ThemeColors = {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  cardBackground: string;
  text: string;
  textSecondary: string;
  border: string;
  success: string;
  warning: string;
  danger: string;
};

export const useTheme = () => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  const lightColors: ThemeColors = {
    primary: '#2563EB',
    secondary: '#4338CA',
    accent: '#8B5CF6',
    background: '#F8FAFC',
    cardBackground: '#FFFFFF',
    text: '#1E293B',
    textSecondary: '#64748B',
    border: '#E2E8F0',
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',
  };
  
  const darkColors: ThemeColors = {
    primary: '#3B82F6',
    secondary: '#6366F1',
    accent: '#A78BFA',
    background: '#0F172A',
    cardBackground: '#1E293B',
    text: '#F1F5F9',
    textSecondary: '#94A3B8',
    border: '#334155',
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',
  };
  
  return {
    isDark,
    colors: isDark ? darkColors : lightColors,
  };
};