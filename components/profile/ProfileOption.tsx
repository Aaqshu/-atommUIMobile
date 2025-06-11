import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { ChevronRight } from 'lucide-react-native';

type ProfileOptionProps = {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onPress?: () => void;
  disabled?: boolean;
};

export default function ProfileOption({ 
  icon, 
  title, 
  subtitle, 
  onPress, 
  disabled = false 
}: ProfileOptionProps) {
  const { colors } = useTheme();
  
  return (
    <TouchableOpacity 
      style={[
        styles.container,
        { borderBottomColor: colors.border },
      ]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
    >
      <View style={styles.leftContent}>
        <View style={styles.iconContainer}>
          {icon}
        </View>
        <View style={styles.textContainer}>
          <Text 
            style={[
              styles.title, 
              { 
                color: disabled ? colors.textSecondary : colors.text 
              }
            ]}
          >
            {title}
          </Text>
          <Text 
            style={[
              styles.subtitle, 
              { 
                color: disabled ? colors.textSecondary + '80' : colors.textSecondary 
              }
            ]}
          >
            {subtitle}
          </Text>
        </View>
      </View>
      <ChevronRight 
        size={20} 
        color={disabled ? colors.textSecondary + '60' : colors.textSecondary} 
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  leftContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    marginRight: 16,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontFamily: 'Inter-Medium',
    fontSize: 16,
    marginBottom: 2,
  },
  subtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
  },
});