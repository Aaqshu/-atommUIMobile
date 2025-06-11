import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import Animated, { FadeIn } from 'react-native-reanimated';

type WelcomeCardProps = {
  username: string;
};

export default function WelcomeCard({ username }: WelcomeCardProps) {
  const { colors } = useTheme();
  
  // Get current time to display appropriate greeting
  const hours = new Date().getHours();
  let greeting = 'Good evening';
  
  if (hours < 12) {
    greeting = 'Good morning';
  } else if (hours < 18) {
    greeting = 'Good afternoon';
  }

  return (
    <Animated.View 
      entering={FadeIn.duration(800)}
      style={[
        styles.container, 
        { 
          backgroundColor: colors.primary,
        }
      ]}
    >
      <Text style={styles.greeting}>{greeting},</Text>
      <Text style={styles.name}>{username}</Text>
      <Text style={styles.message}>Ready to learn something new today?</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
  },
  greeting: {
    fontSize: 18,
    fontFamily: 'Inter-Medium',
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 4,
  },
  name: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  message: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.9)',
  },
});