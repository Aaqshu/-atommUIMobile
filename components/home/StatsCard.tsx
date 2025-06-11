import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import Animated, { FadeIn } from 'react-native-reanimated';

type StatsCardProps = {
  title: string;
  value: string;
  icon: React.ReactNode;
};

export default function StatsCard({ title, value, icon }: StatsCardProps) {
  const { colors } = useTheme();

  return (
    <Animated.View 
      entering={FadeIn.duration(600)}
      style={[
        styles.container, 
        { 
          backgroundColor: colors.cardBackground,
          borderColor: colors.border
        }
      ]}
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.textSecondary }]}>{title}</Text>
        {icon}
      </View>
      <Text style={[styles.value, { color: colors.text }]}>{value}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '48%',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  value: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
  },
});