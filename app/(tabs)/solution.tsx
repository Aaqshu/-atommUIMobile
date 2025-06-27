import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import axios from 'axios';
let MathView: any = null;
console.log("web===>",Platform.OS);
if (Platform.OS !== 'web') {
  MathView = require('react-native-math-view').default;
}

const SUBJECTS = ['Physics', 'Chemistry', 'Botany', 'Zoology'];
const FILTERS = ['All', 'Attempted', 'Unseen', 'Bookmarked'];

// Helper to map subject to question_id prefix
const SUBJECT_PREFIXES: Record<string, string[]> = {
  Physics: ['p11', 'p12'],
  Chemistry: ['c11', 'c12'],
  Botany: ['b11', 'b12'],
  Zoology: ['z11', 'z12'],
};

function getStatus(questionId: string, solutionData: any) {
  if (solutionData.total_correct && JSON.parse(solutionData.total_correct).includes(questionId)) return 'correct';
  if (solutionData.total_incorrect && JSON.parse(solutionData.total_incorrect).includes(questionId)) return 'incorrect';
  if (solutionData.unattempt && JSON.parse(solutionData.unattempt).includes(questionId)) return 'unattempted';
  if (solutionData.marked_questions && JSON.parse(solutionData.marked_questions).includes(questionId)) return 'bookmarked';
  return 'unseen';
}

// Helper to get user's selected answer for a question
function getUserSelectedOption(q: any, solutionData: any) {
  // If correct, find which option matches the correct answer
  if (solutionData.total_correct && JSON.parse(solutionData.total_correct).includes(q.question_id)) {
    return q.correct_option || q.correct_answer;
  }
  // If incorrect, get from wrong_options
  if (solutionData.wrong_options) {
    try {
      const wrongOptions = JSON.parse(solutionData.wrong_options);
      if (wrongOptions[q.question_id]) return wrongOptions[q.question_id];
    } catch {}
  }
  return null;
}

export default function SolutionScreen() {
  const { test_id } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [solutionData, setSolutionData] = useState<any>(null);
  const [selectedSubject, setSelectedSubject] = useState('Physics');
  const [selectedFilter, setSelectedFilter] = useState('All');
  const [expanded, setExpanded] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    if (!test_id) return;
    const fetchSolution = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await axios.post(
          'https://atomm-57b7d9183bae.herokuapp.com/api/users/fetch_solution_by_test_Id',
          { test_id }
        );
        setSolutionData(response.data.data);
      } catch (err) {
        setError('Failed to fetch solution data');
      } finally {
        setLoading(false);
      }
    };
    fetchSolution();
  }, [test_id]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
        <Text>Loading solutions...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>{error}</Text>
      </View>
    );
  }

  if (!solutionData || !solutionData.savedPayload) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>No solution data found.</Text>
      </View>
    );
  }

  // Filter questions by subject
  const questions = solutionData.savedPayload.questions.filter((q: any) => {
    const prefixes = SUBJECT_PREFIXES[selectedSubject] || [];
    return prefixes.some(prefix => q.question_id.startsWith(prefix));
  });

  // Apply filter
  const filteredQuestions = questions.filter((q: any) => {
    const status = getStatus(q.question_id, solutionData);
    if (selectedFilter === 'All') return true;
    if (selectedFilter === 'Attempted') return status === 'correct' || status === 'incorrect';
    if (selectedFilter === 'Unseen') return status === 'unattempted' || status === 'unseen';
    if (selectedFilter === 'Bookmarked') return status === 'bookmarked';
    return true;
  });

  const getStatusColor = (status: string) => {
    if (status === 'correct') return '#22c55e';
    if (status === 'incorrect') return '#ef4444';
    if (status === 'unattempted' || status === 'unseen') return '#94a3b8';
    if (status === 'bookmarked') return '#facc15';
    return '#64748b';
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
      {/* Tabs */}
      <View style={{ flexDirection: 'row', marginTop: 16, marginBottom: 8, justifyContent: 'center' }}>
        {SUBJECTS.map(subject => (
          <TouchableOpacity
            key={subject}
            style={{
              paddingVertical: 8,
              paddingHorizontal: 18,
              borderBottomWidth: 3,
              borderBottomColor: selectedSubject === subject ? '#2563eb' : 'transparent',
              marginHorizontal: 4,
            }}
            onPress={() => setSelectedSubject(subject)}
          >
            <Text style={{ color: selectedSubject === subject ? '#2563eb' : '#64748b', fontWeight: 'bold', fontSize: 16 }}>{subject}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {/* Filters */}
      <View style={{ flexDirection: 'row', justifyContent: 'center', marginBottom: 12 }}>
        {FILTERS.map(filter => (
          <TouchableOpacity
            key={filter}
            style={{
              paddingVertical: 6,
              paddingHorizontal: 16,
              borderRadius: 8,
              backgroundColor: selectedFilter === filter ? '#2563eb' : '#e5e7eb',
              marginHorizontal: 4,
            }}
            onPress={() => setSelectedFilter(filter)}
          >
            <Text style={{ color: selectedFilter === filter ? '#fff' : '#334155', fontWeight: 'bold' }}>{filter}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {/* Questions List */}
      <ScrollView style={{ flex: 1, paddingHorizontal: 8 }}>
        {filteredQuestions.map((q: any, idx: number) => {
          const status = getStatus(q.question_id, solutionData);
          const isExpanded = expanded[q.question_id];
          const userSelected = getUserSelectedOption(q, solutionData);
          // Determine correct option value
          let correctOptionValue = '';
          if (q.correct_option && q['option_' + q.correct_option]) {
            correctOptionValue = q['option_' + q.correct_option];
          } else if (q.correct_answer && q['option_' + q.correct_answer]) {
            correctOptionValue = q['option_' + q.correct_answer];
          }
          return (
            <View
              key={q.question_id}
              style={{
                backgroundColor: '#fff',
                borderRadius: 12,
                marginBottom: 12,
                borderWidth: 2,
                borderColor: getStatusColor(status),
                shadowColor: '#000',
                shadowOpacity: 0.04,
                shadowRadius: 4,
                elevation: 1,
              }}
            >
              <TouchableOpacity
                style={{ flexDirection: 'row', alignItems: 'center', padding: 16 }}
                onPress={() => setExpanded(prev => ({ ...prev, [q.question_id]: !isExpanded }))}
                activeOpacity={0.8}
              >
                <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: getStatusColor(status), alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                  <Text style={{ color: '#fff', fontWeight: 'bold' }}>{idx + 1}</Text>
                </View>
                <Text style={{ flex: 1, color: '#0f172a', fontSize: 16 }}>
                  {q.question ? q.question.replace(/\n/g, ' ').slice(0, 120) : ''}
                  {q.question && q.question.length > 120 ? '...' : ''}
                </Text>
                <Text style={{ color: getStatusColor(status), fontWeight: 'bold', marginLeft: 8, fontSize: 18 }}>{isExpanded ? '-' : '+'}</Text>
              </TouchableOpacity>
              {isExpanded && (
                <View style={{ borderTopWidth: 1, borderTopColor: '#e5e7eb', padding: 16 }}>
                  {/* Options */}
                  {(['option_a', 'option_b', 'option_c', 'option_d'] as const).map((optKey, optIdx) => {
                    const optionValue = q[optKey] || '';
                    const optionLetter = String.fromCharCode(65 + optIdx); // A, B, C, D
                    const isCorrect = correctOptionValue && optionValue === correctOptionValue;
                    const isUserSelected = userSelected && optionValue === userSelected;
                    // For unseen/seen, only show correct option
                    if ((status === 'unseen' || status === 'unattempted') && !isCorrect) {
                      return null;
                    }
                    let bg = 'transparent', color = '#334155', icon = null;
                    if (isCorrect) {
                      bg = '#dcfce7'; // green
                      color = '#22c55e';
                      icon = <Text style={{ color: '#22c55e', fontWeight: 'bold', marginLeft: 6 }}>&#10003;</Text>; // ✓
                    }
                    if (isUserSelected && !isCorrect && (status === 'correct' || status === 'incorrect')) {
                      bg = '#fee2e2'; // red
                      color = '#ef4444';
                      icon = <Text style={{ color: '#ef4444', fontWeight: 'bold', marginLeft: 6 }}>&#10007;</Text>; // ✗
                    }
                    // If user selected the correct option, keep it green with tick
                    if (isUserSelected && isCorrect && (status === 'correct' || status === 'incorrect')) {
                      bg = '#dcfce7';
                      color = '#22c55e';
                      icon = <Text style={{ color: '#22c55e', fontWeight: 'bold', marginLeft: 6 }}>&#10003;</Text>;
                    }
                    return optionValue ? (
                      <View
                        key={optKey}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          marginBottom: 6,
                          backgroundColor: bg,
                          borderRadius: 6,
                          paddingVertical: 2,
                          paddingHorizontal: 2,
                        }}
                      >
                        <Text style={{ fontWeight: 'bold', color: color, marginRight: 8 }}>{optionLetter}.</Text>
                        {Platform.OS === 'web' ? (
                          <span style={{ color, flex: 1 }}>{optionValue}</span>
                        ) : (
                          <MathView math={optionValue} color={color} style={{ flex: 1 }} />
                        )}
                        {icon}
                      </View>
                    ) : null;
                  })}
                  {/* Solution */}
                  {q.solution && (
                    <View style={{ marginTop: 12, backgroundColor: '#f1f5f9', borderRadius: 8, padding: 12 }}>
                      <Text style={{ color: '#2563eb', fontWeight: 'bold', marginBottom: 4 }}>Solution:</Text>
                      {Platform.OS === 'web' ? (
                        <span style={{ color: '#334155', flex: 1 }}>{q.solution || ''}</span>
                      ) : (
                        <MathView math={q.solution || ''} color="#334155" style={{ flex: 1 }} />
                      )}
                    </View>
                  )}
                </View>
              )}
            </View>
          );
        })}
        {filteredQuestions.length === 0 && (
          <Text style={{ textAlign: 'center', color: '#64748b', marginTop: 32 }}>No questions found for this filter.</Text>
        )}
      </ScrollView>
    </View>
  );
} 