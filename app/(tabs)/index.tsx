import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, ScrollView, RefreshControl } from 'react-native';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import StatsCard from '@/components/home/StatsCard';
import { CalendarClock, Brain, Trophy, Target } from 'lucide-react-native';
import WelcomeCard from '@/components/home/WelcomeCard';

type DashboardStats = {
  today: number;
  thisWeek: number;
  lastWeek: number;
  goals: number;
};

export default function HomeScreen() {
  const { user } = useAuth();
  const { colors } = useTheme();
  const [stats, setStats] = useState<DashboardStats>({
    today: 0,
    thisWeek: 0,
    lastWeek: 0,
    goals: 0
  });
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    try {
      setError(null);
      // In a real app, you would fetch data from your API here using the auth token
      const mockData = {
        today: Math.floor(Math.random() * 10),
        thisWeek: Math.floor(Math.random() * 30),
        lastWeek: Math.floor(Math.random() * 30),
        goals: Math.floor(Math.random() * 5)
      };
      setStats(mockData);
    } catch (err) {
      setError('Failed to load dashboard data');
      console.error('Dashboard data fetch error:', err);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardData();
    setRefreshing(false);
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.primary}
        />
      }
    >
      <WelcomeCard username={user?.username || 'User'} />
      
      {error && (
        <View style={[styles.errorContainer, { backgroundColor: colors.danger + '20' }]}>
          <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
        </View>
      )}
      
      <Text style={[styles.sectionTitle, { color: colors.text, fontFamily: 'Inter-Bold' }]}>
        Your Progress
      </Text>
      
      <View style={styles.statsContainer}>
        <StatsCard 
          title="Today" 
          value={stats.today.toString()} 
          icon={<CalendarClock size={24} color={colors.primary} />} 
        />
        <StatsCard 
          title="This Week" 
          value={stats.thisWeek.toString()} 
          icon={<Brain size={24} color="#8B5CF6" />} 
        />
        <StatsCard 
          title="Last Week" 
          value={stats.lastWeek.toString()} 
          icon={<Trophy size={24} color="#F59E0B" />} 
        />
        <StatsCard 
          title="Goals" 
          value={stats.goals.toString()} 
          icon={<Target size={24} color="#10B981" />} 
        />
      </View>
      
      <Text style={[styles.sectionTitle, { color: colors.text, fontFamily: 'Inter-Bold', marginTop: 24 }]}>
        Recommended Courses
      </Text>
      
      <View style={[styles.emptyState, { borderColor: colors.border }]}>
        <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>
          No courses available yet. Check back soon!
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
  },
  errorContainer: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    marginBottom: 16,
    marginTop: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  emptyState: {
    padding: 24,
    borderWidth: 1,
    borderRadius: 12,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateText: {
    fontFamily: 'Inter-Medium',
    textAlign: 'center',
  },
});