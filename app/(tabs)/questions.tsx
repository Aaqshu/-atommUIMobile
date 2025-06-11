import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Platform, ActivityIndicator } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/hooks/useAuth';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Book, Clock, Beaker, Leaf, Fish } from 'lucide-react-native';
import SubjectDetails from '@/components/questions/SubjectDetails';
import axios from 'axios';

type Subject = {
  name: string;
  id: string;
  progress: number;
  icon: React.ReactNode;
  totalQuestions: number;
};

type TabType = 'most-wanted' | 'previous-year';
type ClassType = '11' | '12';

type SubjectStats = {
  c11?: number;
  z11?: number;
  b11?: number;
  p11?: number;
  c12?: number;
  z12?: number;
  b12?: number;
  p12?: number;
};

type PYQStats = {
  physics_11?: number;
  chemistry_11?: number;
  botany_11?: number;
  zoology_11?: number;
  physics_12?: number;
  chemistry_12?: number;
  botany_12?: number;
  zoology_12?: number;
};

export default function QuestionsScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('most-wanted');
  const [activeClass, setActiveClass] = useState<ClassType>('11');
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [subjectStats, setSubjectStats] = useState<SubjectStats | null>(null);
  const [pyqStats, setPyqStats] = useState<PYQStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStats();
  }, [activeClass, activeTab]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);

      if (activeTab === 'most-wanted') {
        const mwEndpoint = `https://atomm-57b7d9183bae.herokuapp.com/api/admin/data/totalQuestions${activeClass}`;
        const mwResponse = await axios.get(mwEndpoint);
        setSubjectStats(mwResponse.data.data[0]);
        setPyqStats(null); // Clear PYQ stats when switching to MW
      } else {
        const pyqEndpoint = `https://atomm-57b7d9183bae.herokuapp.com/api/admin/data/getTotalPYQsQuestions${activeClass}`;
        const pyqResponse = await axios.get(pyqEndpoint);
        // Ensure we're getting the first item from the data array
        const pyqData = Array.isArray(pyqResponse.data.data) ? pyqResponse.data.data[0] : pyqResponse.data.data;
        setPyqStats(pyqData);
        setSubjectStats(null); // Clear MW stats when switching to PYQ
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
      setError('Failed to load questions data');
    } finally {
      setLoading(false);
    }
  };

  const getSubjects = (): Subject[] => {
    if (activeTab === 'most-wanted' && !subjectStats) return [];
    if (activeTab === 'previous-year' && !pyqStats) return [];

    const subjects = {
      '11': [
        { 
          name: 'Physics',
          id: 'p11',
          progress: 0,
          totalQuestions: activeTab === 'most-wanted' 
            ? (subjectStats?.p11 || 0)
            : (pyqStats?.physics_11 || 0),
          icon: <Clock size={24} color={colors.primary} />
        },
        {
          name: 'Chemistry',
          id: 'c11',
          progress: 0,
          totalQuestions: activeTab === 'most-wanted'
            ? (subjectStats?.c11 || 0)
            : (pyqStats?.chemistry_11 || 0),
          icon: <Beaker size={24} color="#8B5CF6" />
        },
        {
          name: 'Botany',
          id: 'b11',
          progress: 0,
          totalQuestions: activeTab === 'most-wanted'
            ? (subjectStats?.b11 || 0)
            : (pyqStats?.botany_11 || 0),
          icon: <Leaf size={24} color="#10B981" />
        },
        {
          name: 'Zoology',
          id: 'z11',
          progress: 0,
          totalQuestions: activeTab === 'most-wanted'
            ? (subjectStats?.z11 || 0)
            : (pyqStats?.zoology_11 || 0),
          icon: <Fish size={24} color="#F59E0B" />
        },
      ],
      '12': [
        { 
          name: 'Physics',
          id: 'p12',
          progress: 0,
          totalQuestions: activeTab === 'most-wanted'
            ? (subjectStats?.p12 || 0)
            : (pyqStats?.physics_12 || 0),
          icon: <Clock size={24} color={colors.primary} />
        },
        {
          name: 'Chemistry',
          id: 'c12',
          progress: 0,
          totalQuestions: activeTab === 'most-wanted'
            ? (subjectStats?.c12 || 0)
            : (pyqStats?.chemistry_12 || 0),
          icon: <Beaker size={24} color="#8B5CF6" />
        },
        {
          name: 'Botany',
          id: 'b12',
          progress: 0,
          totalQuestions: activeTab === 'most-wanted'
            ? (subjectStats?.b12 || 0)
            : (pyqStats?.botany_12 || 0),
          icon: <Leaf size={24} color="#10B981" />
        },
        {
          name: 'Zoology',
          id: 'z12',
          progress: 0,
          totalQuestions: activeTab === 'most-wanted'
            ? (subjectStats?.z12 || 0)
            : (pyqStats?.zoology_12 || 0),
          icon: <Fish size={24} color="#F59E0B" />
        },
      ]
    };

    return subjects[activeClass];
  };

  const renderSubject = (subject: Subject) => (
    <TouchableOpacity
      key={subject.name}
      onPress={() => setSelectedSubject(subject)}
      activeOpacity={0.8}
    >
      <Animated.View
        entering={FadeIn.duration(600)}
        style={[styles.subjectCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
      >
        <View style={styles.subjectHeader}>
          <Text style={[styles.subjectName, { color: colors.text }]}>{subject.name}</Text>
          {subject.icon}
        </View>
        <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
          <View
            style={[
              styles.progressFill,
              { width: `${subject.progress}%`, backgroundColor: colors.primary },
            ]}
          />
        </View>
        <Text style={[styles.progressText, { color: colors.textSecondary }]}>
          {subject.totalQuestions} Questions Available
        </Text>
      </Animated.View>
    </TouchableOpacity>
  );

  if (selectedSubject) {
    return (
      <SubjectDetails
        subject={selectedSubject.name}
        subjectId={selectedSubject.id}
        onBack={() => setSelectedSubject(null)}
        type={activeTab}
        token={user?.token}
      />
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.classContainer}>
        <TouchableOpacity
          style={[
            styles.classTab,
            activeClass === '11' && { backgroundColor: colors.primary },
          ]}
          onPress={() => setActiveClass('11')}
        >
          <Text
            style={[
              styles.classText,
              { color: activeClass === '11' ? '#fff' : colors.text },
            ]}
          >
            Class 11
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.classTab,
            activeClass === '12' && { backgroundColor: colors.primary },
          ]}
          onPress={() => setActiveClass('12')}
        >
          <Text
            style={[
              styles.classText,
              { color: activeClass === '12' ? '#fff' : colors.text },
            ]}
          >
            Class 12
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'most-wanted' && { backgroundColor: colors.primary },
          ]}
          onPress={() => setActiveTab('most-wanted')}
        >
          <Text
            style={[
              styles.tabText,
              { color: activeTab === 'most-wanted' ? '#fff' : colors.text },
            ]}
          >
            Most Wanted 2025
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'previous-year' && { backgroundColor: colors.primary },
          ]}
          onPress={() => setActiveTab('previous-year')}
        >
          <Text
            style={[
              styles.tabText,
              { color: activeTab === 'previous-year' ? '#fff' : colors.text },
            ]}
          >
            Previous Year
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Book size={24} color={colors.primary} />
          <Text style={[styles.headerText, { color: colors.text }]}>
            {activeTab === 'most-wanted' ? 'Most Wanted Questions 2025' : 'Previous Year Questions'}
          </Text>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
              Loading questions...
            </Text>
          </View>
        ) : error ? (
          <View style={[styles.errorContainer, { backgroundColor: colors.danger + '20' }]}>
            <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
            <TouchableOpacity
              style={[styles.retryButton, { backgroundColor: colors.danger }]}
              onPress={fetchStats}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          getSubjects().map(renderSubject)
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  classContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  classTab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
      web: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
    }),
  },
  classText: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
  },
  tabContainer: {
    flexDirection: 'row',
    padding: 16,
    paddingTop: 0,
    gap: 12,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
      web: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
    }),
  },
  tabText: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    gap: 12,
  },
  headerText: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 32,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    fontFamily: 'Inter-Medium',
  },
  errorContainer: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  errorText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    marginBottom: 12,
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Inter-Medium',
  },
  subjectCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  subjectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  subjectName: {
    fontSize: 18,
    fontFamily: 'Inter-Medium',
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    marginBottom: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
  },
});