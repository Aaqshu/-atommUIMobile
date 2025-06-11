import React from 'react';
import { StyleSheet, View, Text, ScrollView } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { BookOpen } from 'lucide-react-native';

export default function CoursesScreen() {
  const { colors } = useTheme();

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.emptyState, { borderColor: colors.border }]}>
        <BookOpen size={48} color={colors.textSecondary} style={styles.icon} />
        <Text style={[styles.emptyStateTitle, { color: colors.text }]}>
          No Courses Yet
        </Text>
        <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>
          Your enrolled courses will appear here. Start learning today!
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
    flex: 1,
    justifyContent: 'center',
  },
  emptyState: {
    padding: 32,
    borderWidth: 1,
    borderRadius: 16,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 24,
  },
  icon: {
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 18,
    marginBottom: 8,
  },
  emptyStateText: {
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    lineHeight: 22,
  },
});