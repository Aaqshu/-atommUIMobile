import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Platform, ActivityIndicator } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import Animated, { FadeIn } from 'react-native-reanimated';
import { ArrowLeft, BookOpen, Eye, CircleDot, CircleCheck as CheckCircle2, Bookmark } from 'lucide-react-native';
import QuestionDetail from './QuestionDetail';
import { QuestionStateService, QuestionStatus } from '@/services/questionStateService';
import axios from 'axios';
import { useAuth } from '@/hooks/useAuth';
import MathRenderer from '@/components/common/MathRenderer';
import RichContentRenderer from '@/components/common/RichContentRenderer';

type Chapter = {
  ID: number;
  chapter_id: string;
  chapter_name: string;
  mw_total_question: number;
  pyq_total_question: number;
  subject_id: string;
  subtopic_name: string;
  total_questions: number;
};

type ExamType = 'All' | 'NEET' | 'AIPMT' | 'AIIMS';
type YearRange = 'All Years' | '2000 & Before' | '2001 - 2010' | '2011 - 2015' | '2016 - 2020' | '2021 & Onwards';

type SubjectDetailsProps = {
  subject: string;
  subjectId: string;
  onBack: () => void;
  type: 'most-wanted' | 'previous-year';
  token: string | undefined;
};

type Question = {
  question_id: string;
  question_text?: string;
  question?: string;
  option_a?: string;
  option_b?: string;
  option_c?: string;
  option_d?: string;
  options?: string[];
  correct_answer: string;
  correct_option?: string;
  explanation?: string;
  solution?: string;
  exam_type: string;
  exam_year: string;
  status?: QuestionStatus;
};

// Exam year ranges for filter (move to top-level scope)
const yearRanges = [
  'All Years',
  '2000 & Before',
  '2001 - 2010',
  '2011 - 2015',
  '2016 - 2020',
  '2021 & Onwards',
];
const getYearRange = (year: string | number) => {
  const y = typeof year === 'string' ? parseInt(year, 10) : year;
  if (!y || isNaN(y)) return 'All Years';
  if (y <= 2000) return '2000 & Before';
  if (y >= 2001 && y <= 2010) return '2001 - 2010';
  if (y >= 2011 && y <= 2015) return '2011 - 2015';
  if (y >= 2016 && y <= 2020) return '2016 - 2020';
  if (y >= 2021) return '2021 & Onwards';
  return 'All Years';
};

export default function SubjectDetails({ subject, subjectId, onBack, type, token }: SubjectDetailsProps) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedExamType, setSelectedExamType] = useState<ExamType>('All');
  const [selectedYearRange, setSelectedYearRange] = useState<YearRange>('All Years');
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [questionStates, setQuestionStates] = useState<{ [questionId: string]: QuestionStatus }>({});
  const [bookmarkedQuestions, setBookmarkedQuestions] = useState<Set<string>>(new Set());
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<'all' | 'attempted' | 'seen' | 'new' | 'bookmarked'>('all');
  const [seenIds, setSeenIds] = useState<number[]>([]);
  const [attemptedIds, setAttemptedIds] = useState<number[]>([]);
  const [bookmarkedIds, setBookmarkedIds] = useState<number[]>([]);
  // State for local exam type/year filters (for previous-year section)
  const [localExamTypes, setLocalExamTypes] = useState<string[]>([]);
  const [localExamYears, setLocalExamYears] = useState<string[]>([]);
  const [selectedLocalExamType, setSelectedLocalExamType] = useState<string>('All');
  const [selectedLocalExamYear, setSelectedLocalExamYear] = useState<string>('All Years');
  // Subtopic filter state for PYQ
  const [subtopics, setSubtopics] = useState<{ number: number; name: string }[]>([]);
  const [selectedSubtopic, setSelectedSubtopic] = useState<'all' | number>('all');
  const [visibleCount, setVisibleCount] = useState(10);

  const stats = {
    all: questions.length,
    attempted: questions.filter(q => questionStates[q.question_id] === 'attempted').length,
    seen: questions.filter(q => questionStates[q.question_id] === 'seen').length,
    new: questions.filter(q => !questionStates[q.question_id] || questionStates[q.question_id] === 'new').length,
    bookmarked: Array.from(bookmarkedQuestions).length,
  };

  useEffect(() => {
    fetchChapters();
  }, []);

  useEffect(() => {
    if (selectedChapter && questions.length > 0) {
      loadQuestionStates();
      loadBookmarkedQuestions();
    }
  }, [selectedChapter, questions]);

  const loadQuestionStates = async () => {
    if (!selectedChapter) return;
    
    try {
      const states = await QuestionStateService.getQuestionStates(type, subjectId, selectedChapter.chapter_id);
      const stateMap: { [questionId: string]: QuestionStatus } = {};
      
      questions.forEach(question => {
        const state = states[question.question_id];
        stateMap[question.question_id] = state?.status || 'new';
      });
      
      setQuestionStates(stateMap);
    } catch (error) {
      console.error('Error loading question states:', error);
    }
  };

  const loadBookmarkedQuestions = async () => {
    if (!selectedChapter) return;
    
    try {
      const bookmarked = await QuestionStateService.getBookmarkedQuestions(type, subjectId, selectedChapter.chapter_id);
      setBookmarkedQuestions(new Set(bookmarked));
    } catch (error) {
      console.error('Error loading bookmarked questions:', error);
    }
  };

  const updateQuestionState = async (questionId: string, status: QuestionStatus, selectedOption?: string, isCorrect?: boolean) => {
    if (!selectedChapter) return;
    
    try {
      await QuestionStateService.updateQuestionState(
        type,
        subjectId,
        selectedChapter.chapter_id,
        questionId,
        status,
        selectedOption,
        isCorrect
      );
      
      setQuestionStates(prev => ({
        ...prev,
        [questionId]: status
      }));
    } catch (error) {
      console.error('Error updating question state:', error);
    }
  };

  const fetchChapters = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (!token) {
        throw new Error('Authentication token is required');
      }

      const subjectMap: { [key: string]: string } = {
        'p': 'physics',
        'c': 'chemistry',
        'b': 'botany',
        'z': 'zoology'
      };
      
      const subjectPrefix = subjectId.charAt(0);
      const classNumber = subjectId.slice(1);
      const subjectName = subjectMap[subjectPrefix];
      
      const requestBody = {
        subjectName_class: `${subjectName}_${classNumber}`
      };

      const response = await axios.post(
        'https://atomm-57b7d9183bae.herokuapp.com/api/admin/data/getChaptersBySubjects',
        requestBody,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      setChapters(response.data);
    } catch (err) {
      setError('Failed to load chapters');
      console.error('Error fetching chapters:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchQuestions = async (chapter: Chapter) => {
    try {
      setLoading(true);
      setError(null);

      if (!token) {
        throw new Error('Authentication token is required');
      }

      const requestBody = {
        subjectId,
        chapterId: chapter.chapter_id,
        examType: selectedExamType !== 'All' ? selectedExamType : undefined,
        yearRange: selectedYearRange !== 'All Years' ? selectedYearRange : undefined,
      };

      const endpoint = type === 'most-wanted'
        ? 'https://atomm-57b7d9183bae.herokuapp.com/api/admin/data/getMWQuestions'
        : 'https://atomm-57b7d9183bae.herokuapp.com/api/admin/data/getPYQsQuestions';

      const response = await axios.post(
        endpoint,
        requestBody,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      // Transform API response to normalize options format
      const questionsWithStatus = response.data.map((q: Question) => {
        // Convert individual option fields to options array
        const options = [
          q.option_a || '',
          q.option_b || '',
          q.option_c || '',
          q.option_d || ''
        ].filter(option => option.trim() !== '');

        return {
          ...q,
          options: options,
          // Ensure we have the question text
          question: q.question || q.question_text || '',
          // Normalize correct answer field (always string)
          correct_answer: q.correct_answer || q.correct_option || '',
          // Normalize solution field
          solution: q.solution || q.explanation || ''
        };
      });

      setQuestions(questionsWithStatus);

      // Extract exam types and years for previous-year section
      if (type === 'previous-year') {
        const examTypeSet = new Set<string>();
        const examYearSet = new Set<string>();
        questionsWithStatus.forEach((q: any) => {
          // exam_type field (may be comma or newline separated)
          if (q.exam_type) {
            (q.exam_type.split(/[\n,]+/) as string[]).forEach((raw: string) => {
              const trimmed = raw.trim();
              if (trimmed) {
                // Try to extract year from string
                const yearMatch = trimmed.match(/(19|20)\d{2}/);
                if (yearMatch) {
                  examYearSet.add(getYearRange(yearMatch[0]));
                }
                // Extract type (before year or after dash)
                const typeMatch = trimmed.match(/^[^\d]+/);
                if (typeMatch) {
                  examTypeSet.add(typeMatch[0].replace(/[-:]$/, '').trim());
                } else {
                  // fallback: add the whole string if no year
                  examTypeSet.add(trimmed);
                }
              }
            });
          }
          // neet, aiims, aipmt keys (may be stringified arrays)
          ['neet', 'aiims', 'aipmt'].forEach(key => {
            if (q[key]) {
              let val = q[key];
              try {
                // Try to parse as array
                const arr = JSON.parse(val);
                if (Array.isArray(arr)) {
                  arr.forEach((year: string) => examYearSet.add(getYearRange(year)));
                  examTypeSet.add(key.toUpperCase());
                }
              } catch {
                // Not an array, treat as single year
                if (val && val !== '') {
                  examYearSet.add(getYearRange(val.replace(/['\[\]]/g, '')));
                  examTypeSet.add(key.toUpperCase());
                }
              }
            }
          });
        });
        // Only allow these four labels for exam type
        setLocalExamTypes(['All', 'NEET', 'AIPMT', 'AIIMS']);
        setLocalExamYears(yearRanges);
      }
    } catch (err) {
      console.error('Error fetching questions:', err);
      setError('Failed to load questions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedChapter) {
      fetchQuestions(selectedChapter);
    }
  }, [selectedExamType, selectedYearRange, selectedChapter]);

  const handleChapterSelect = (chapter: Chapter) => {
    setSelectedChapter(chapter);
    fetchQuestions(chapter);
    // Parse subtopics for PYQ
    if (type === 'previous-year' && chapter.subtopic_name) {
      try {
        // Clean and parse the subtopic_name string
        const clean = chapter.subtopic_name.replace(/'/g, '"');
        const arr = JSON.parse(clean);
        const parsed = arr.map((item: string) => {
          const match = item.match(/^(\d+)\.(.*)$/);
          if (match) {
            return { number: parseInt(match[1], 10), name: match[2].trim() };
          }
          return null;
        }).filter(Boolean);
        setSubtopics(parsed);
      } catch {
        setSubtopics([]);
      }
      setSelectedSubtopic('all');
    } else {
      setSubtopics([]);
      setSelectedSubtopic('all');
    }
  };

  // Helper to send progress data API call
  const sendProgress = async (action: 'seen' | 'attempted' | 'bookmarked', chapterId: string) => {
    if (!user?.userId) return;

    const endpoint = type === 'most-wanted'
      ? 'https://atomm-57b7d9183bae.herokuapp.com/api/users/progress_mw'
      : 'https://atomm-57b7d9183bae.herokuapp.com/api/users/progress_pyq';

    // Ensure seen does not include any attempted
    const filteredSeen = seenIds.filter(id => !attemptedIds.includes(id));
    
    const payload: any = {
      studentId: user.userId,
      subjectId: subjectId,
    };
    payload[chapterId] = [
      {
        seen: filteredSeen,
        attempted: attemptedIds,
        bookmarked: bookmarkedIds,
      },
    ];
    try {
      await axios.post(endpoint, payload);
    } catch (err) {
      console.error(`Failed to send ${type} progress:`, err);
    }
  };

  const handleQuestionSelect = async (question: Question, index: number) => {
    setSelectedQuestion(question);
    setCurrentQuestionIndex(index);
    // Mark question as seen when user opens it
    await updateQuestionState(question.question_id, 'seen');
    if (selectedChapter) {
      const match = question.question_id.match(/(\d+)(?!.*\d)/);
      const idInt = match ? parseInt(match[1], 10) : null;
      if (idInt && !seenIds.includes(idInt)) {
        setSeenIds(prev => [...prev, idInt]);
      }
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      const nextIndex = currentQuestionIndex + 1;
      const nextQuestion = questions[nextIndex];
      setCurrentQuestionIndex(nextIndex);
      setSelectedQuestion(nextQuestion);
      
      // Mark next question as seen
      updateQuestionState(nextQuestion.question_id, 'seen');
      if (selectedChapter) {
        const match = nextQuestion.question_id.match(/(\d+)(?!.*\d)/);
        const idInt = match ? parseInt(match[1], 10) : null;
        if (idInt && !seenIds.includes(idInt) && !attemptedIds.includes(idInt)) {
          setSeenIds(prev => [...prev, idInt]);
        }
      }
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      const prevIndex = currentQuestionIndex - 1;
      const prevQuestion = questions[prevIndex];
      setCurrentQuestionIndex(prevIndex);
      setSelectedQuestion(prevQuestion);
      
      // Mark previous question as seen
      updateQuestionState(prevQuestion.question_id, 'seen');
      if (selectedChapter) {
        const match = prevQuestion.question_id.match(/(\d+)(?!.*\d)/);
        const idInt = match ? parseInt(match[1], 10) : null;
        if (idInt && !seenIds.includes(idInt) && !attemptedIds.includes(idInt)) {
          setSeenIds(prev => [...prev, idInt]);
        }
      }
    }
  };

  const handleQuestionAnswered = async (questionId: string, selectedOption: string, isCorrect: boolean) => {
    await updateQuestionState(questionId, 'attempted', selectedOption, isCorrect);
    if (selectedChapter) {
      const match = questionId.match(/(\d+)(?!.*\d)/);
      const idInt = match ? parseInt(match[1], 10) : null;
      if (idInt && !attemptedIds.includes(idInt)) {
        setAttemptedIds(prev => {
          const updated = [...prev, idInt];
          // Remove from seenIds as well
          setSeenIds(seenPrev => seenPrev.filter(id => id !== idInt));
          return updated;
        });
      }
    }
  };

  const handleBookmarkToggle = async (questionId: string) => {
    if (!selectedChapter) return;
    try {
      const newBookmarkStatus = await QuestionStateService.toggleBookmark(
        type,
        subjectId,
        selectedChapter.chapter_id,
        questionId
      );
      const match = questionId.match(/(\d+)(?!.*\d)/);
      const idInt = match ? parseInt(match[1], 10) : null;
      const newBookmarked = new Set(bookmarkedQuestions);
      if (newBookmarkStatus) {
        newBookmarked.add(questionId);
        if (idInt && !bookmarkedIds.includes(idInt)) {
          setBookmarkedIds(prev => [...prev, idInt]);
        }
      } else {
        newBookmarked.delete(questionId);
        if (idInt && bookmarkedIds.includes(idInt)) {
          setBookmarkedIds(prev => prev.filter(id => id !== idInt));
        }
      }
      setBookmarkedQuestions(newBookmarked);
    } catch (error) {
      console.error('Error toggling bookmark:', error);
    }
  };

  const getStatusIcon = (questionId: string) => {
    const status = questionStates[questionId] || 'new';
    switch (status) {
      case 'attempted':
        return <CheckCircle2 size={16} color={colors.success} />;
      case 'seen':
        return <Eye size={16} color={colors.warning} />;
      default:
        return <CircleDot size={16} color={colors.textSecondary} />;
    }
  };

  const getStatusText = (questionId: string) => {
    const status = questionStates[questionId] || 'new';
    switch (status) {
      case 'attempted':
        return 'Attempted';
      case 'seen':
        return 'Seen';
      default:
        return 'New';
    }
  };

  const getStatusColor = (questionId: string) => {
    const status = questionStates[questionId] || 'new';
    switch (status) {
      case 'attempted':
        return colors.success;
      case 'seen':
        return colors.warning;
      default:
        return colors.textSecondary;
    }
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity 
        style={styles.backButton} 
        onPress={() => {
          if (selectedQuestion) {
            setSelectedQuestion(null);
          } else if (selectedChapter) {
            setSelectedChapter(null);
          } else {
            onBack();
          }
        }}
      >
        <ArrowLeft size={24} color={colors.text} />
        <Text style={[styles.backText, { color: colors.text }]}>
          {selectedQuestion ? 'Back to Questions' : selectedChapter ? 'Back to Chapters' : 'Back'}
        </Text>
      </TouchableOpacity>
      <Text style={[styles.headerTitle, { color: colors.text }]}>
        {selectedChapter ? selectedChapter.chapter_name : subject}
      </Text>
    </View>
  );

  const renderFilters = () => (
    <View style={styles.filtersContainer}>
      {type === 'previous-year' ? (
        <>
          <View style={styles.filterSection}>
            <Text style={[styles.filterLabel, { color: colors.text }]}>Exam Type:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {localExamTypes.map((type: string) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.filterChip,
                    selectedLocalExamType === type && { backgroundColor: colors.primary },
                  ]}
                  onPress={() => setSelectedLocalExamType(type)}
                >
                  <Text style={[
                    styles.filterChipText,
                    { color: selectedLocalExamType === type ? '#fff' : colors.text }
                  ]}>
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
          <View style={styles.filterSection}>
            <Text style={[styles.filterLabel, { color: colors.text }]}>Exam Year:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {yearRanges.map((year: string) => (
                <TouchableOpacity
                  key={year}
                  style={[
                    styles.filterChip,
                    selectedLocalExamYear === year && { backgroundColor: colors.primary },
                  ]}
                  onPress={() => setSelectedLocalExamYear(year)}
                >
                  <Text style={[
                    styles.filterChipText,
                    { color: selectedLocalExamYear === year ? '#fff' : colors.text }
                  ]}>
                    {year}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </>
      ) : (
        <>
          <View style={styles.filterSection}>
            <Text style={[styles.filterLabel, { color: colors.text }]}>Exam Type:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {(['All', 'NEET', 'AIPMT', 'AIIMS'] as ExamType[]).map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.filterChip,
                    selectedExamType === type && { backgroundColor: colors.primary },
                  ]}
                  onPress={() => setSelectedExamType(type)}
                >
                  <Text style={[
                    styles.filterChipText,
                    { color: selectedExamType === type ? '#fff' : colors.text }
                  ]}>
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
          <View style={styles.filterSection}>
            <Text style={[styles.filterLabel, { color: colors.text }]}>Exam Year:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {([
                'All Years',
                '2000 & Before',
                '2001 - 2010',
                '2011 - 2015',
                '2016 - 2020',
                '2021 & Onwards'
              ] as YearRange[]).map((year) => (
                <TouchableOpacity
                  key={year}
                  style={[
                    styles.filterChip,
                    selectedYearRange === year && { backgroundColor: colors.primary },
                  ]}
                  onPress={() => setSelectedYearRange(year)}
                >
                  <Text style={[
                    styles.filterChipText,
                    { color: selectedYearRange === year ? '#fff' : colors.text }
                  ]}>
                    {year}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </>
      )}
    </View>
  );

  const renderStatusFilters = () => (
    <View style={styles.filtersContainer}>
      <View style={styles.filterSection}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {([
            { label: 'All', key: 'all' as 'all' },
            { label: 'Attempted', key: 'attempted' as 'attempted' },
            { label: 'Seen', key: 'seen' as 'seen' },
            { label: 'New', key: 'new' as 'new' },
            { label: 'Bookmarked', key: 'bookmarked' as 'bookmarked' }
          ]).map(filter => (
            <TouchableOpacity
              key={filter.key}
              style={[
                styles.filterChip,
                selectedStatusFilter === filter.key && { backgroundColor: colors.primary },
              ]}
              onPress={() => setSelectedStatusFilter(filter.key)}
            >
              <Text style={[
                styles.filterChipText,
                { color: selectedStatusFilter === filter.key ? '#fff' : colors.text }
              ]}>
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </View>
  );

  const renderStats = () => (
    <View style={styles.statsContainer}>
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: colors.cardBackground }]}>
          <CircleDot size={20} color={colors.primary} />
          <Text style={[styles.statValue, { color: colors.text }]}>{stats.all}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>All</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.cardBackground }]}>
          <CheckCircle2 size={20} color={colors.success} />
          <Text style={[styles.statValue, { color: colors.text }]}>{stats.attempted}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Attempted</Text>
        </View>
      </View>
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: colors.cardBackground }]}>
          <Eye size={20} color={colors.warning} />
          <Text style={[styles.statValue, { color: colors.text }]}>{stats.seen}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Seen</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.cardBackground }]}>
          <Bookmark size={20} color={colors.primary} />
          <Text style={[styles.statValue, { color: colors.text }]}>{stats.bookmarked}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Bookmarked</Text>
        </View>
      </View>
    </View>
  );

  // Local filter for previous-year section
  const locallyFilteredQuestions = type === 'previous-year' ? questions.filter((q: any) => {
    let matchesType = true;
    let matchesYear = true;
    if (selectedLocalExamType && selectedLocalExamType !== 'All') {
      // Check exam_type and keys
      matchesType = false;
      if (q.exam_type && q.exam_type.toLowerCase().includes(selectedLocalExamType.toLowerCase())) {
        matchesType = true;
      }
      ['neet', 'aiims', 'aipmt'].forEach(key => {
        if (q[key] && selectedLocalExamType.toLowerCase() === key) {
          matchesType = true;
        }
      });
    }
    if (selectedLocalExamYear && selectedLocalExamYear !== 'All Years') {
      matchesYear = false;
      // Check in exam_type string
      let foundYear = false;
      if (q.exam_type) {
        const yearMatches = q.exam_type.match(/(19|20)\d{2}/g);
        if (yearMatches && yearMatches.some((y: string) => getYearRange(y) === selectedLocalExamYear)) {
          foundYear = true;
        }
      }
      // Check in neet, aiims, aipmt keys
      ['neet', 'aiims', 'aipmt'].forEach(key => {
        if (q[key]) {
          try {
            const arr = JSON.parse(q[key]);
            if (Array.isArray(arr) && arr.some((y: string) => getYearRange(y) === selectedLocalExamYear)) {
              foundYear = true;
            }
          } catch {
            if (q[key] && getYearRange(q[key].replace(/['\[\]]/g, '')) === selectedLocalExamYear) {
              foundYear = true;
            }
          }
        }
      });
      matchesYear = foundYear;
    }
    // Subtopic filter
    if (selectedSubtopic !== 'all') {
      if (q.sub_topic_no !== selectedSubtopic) return false;
    }

    // Status filter for PYQ
    if (selectedStatusFilter !== 'all') {
      const status = questionStates[q.question_id] || 'new';
      const isBookmarked = bookmarkedQuestions.has(q.question_id);
      
      switch (selectedStatusFilter) {
        case 'attempted':
          if (status !== 'attempted') return false;
          break;
        case 'seen':
          if (status !== 'seen') return false;
          break;
        case 'new':
          if (status !== 'new' && status) return false;
          break;
        case 'bookmarked':
          if (!isBookmarked) return false;
          break;
        default:
          break;
      }
    }

    return matchesType && matchesYear;
  }) : questions.filter((q: any) => {
    // Status filter for most-wanted section
    if (selectedStatusFilter === 'all') return true;
    
    const status = questionStates[q.question_id] || 'new';
    const isBookmarked = bookmarkedQuestions.has(q.question_id);
    
    switch (selectedStatusFilter) {
      case 'attempted':
        return status === 'attempted';
      case 'seen':
        return status === 'seen';
      case 'new':
        return status === 'new' || !status;
      case 'bookmarked':
        return isBookmarked;
      default:
        return true;
    }
  });

  const renderQuestions = () => (
    <View style={styles.questionsContainer}>
      {locallyFilteredQuestions.slice(0, visibleCount).map((question, index) => (
        <Animated.View
          key={question.question_id}
          entering={FadeIn.duration(300).delay(index * 100)}
          style={[
            styles.questionCard,
            {
              backgroundColor: '#fff',
              borderColor: '#e5e7eb',
              borderWidth: 1,
              shadowColor: '#000',
              shadowOpacity: 0.04,
              shadowRadius: 8,
              shadowOffset: { width: 0, height: 2 },
              elevation: 1,
            },
          ]}
        >
          <TouchableOpacity
            style={[styles.questionContent, { padding: 20 }]}
            onPress={() => handleQuestionSelect(question, index)}
            activeOpacity={0.7}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ fontSize: 20, fontWeight: '700', color: '#1e293b', marginRight: 10 }}>
                  {String(index + 1).padStart(2, '0')}.
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'transparent' }}>
                  {getStatusIcon(question.question_id)}
                  <Text style={{ fontWeight: '600', color: getStatusColor(question.question_id), marginLeft: 4, fontSize: 16 }}>
                    {getStatusText(question.question_id)}
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => handleBookmarkToggle(question.question_id)}>
                <Bookmark
                  size={22}
                  color={bookmarkedQuestions.has(question.question_id) ? '#2563eb' : '#94a3b8'}
                  fill={bookmarkedQuestions.has(question.question_id) ? '#2563eb' : 'transparent'}
                />
              </TouchableOpacity>
            </View>

            <View style={{ marginBottom: 12 }}>
              <MathRenderer content={question.question || ''} color={colors.text} subjectId={subjectId} chapterId={selectedChapter?.chapter_id || ''} />
            </View>

            {/* Add extra spacing between question and exam info */}
            <View style={{ height: 15 }} />

            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{
                backgroundColor: '#e8edfd',
                borderRadius: 20,
                paddingHorizontal: 20,
                paddingVertical: 4,
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: 32,
              }}>
                <Text style={{ color: '#2563eb', fontWeight: '700', fontSize: 14, textAlign: 'center' }}>
                  {question.exam_type}{question.exam_year ? `-${question.exam_year}` : ''}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        </Animated.View>
      ))}
      {visibleCount < locallyFilteredQuestions.length && (
        <TouchableOpacity
          style={{ marginVertical: 16, alignItems: 'center' }}
          onPress={() => setVisibleCount(visibleCount + 10)}
        >
          <Text style={{ color: colors.primary, fontSize: 16, fontWeight: 'bold' }}>Load More</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderChapters = () => (
    <View style={styles.chaptersContainer}>
      {chapters.map((chapter, index) => (
        <Animated.View
          key={chapter.ID}
          entering={FadeIn.duration(300).delay(index * 100)}
          style={[styles.chapterCard, { backgroundColor: colors.cardBackground }]}
        >
          <TouchableOpacity
            style={styles.chapterContent}
            onPress={() => handleChapterSelect(chapter)}
          >
            <View style={styles.chapterHeader}>
              <BookOpen size={20} color={colors.primary} />
              <Text style={[styles.chapterTitle, { color: colors.text }]}>
                {chapter.chapter_name}
              </Text>
            </View>
            <Text style={[styles.questionCount, { color: colors.textSecondary }]}>
              {type === 'most-wanted' ? chapter.mw_total_question : chapter.pyq_total_question} Questions
            </Text>
          </TouchableOpacity>
        </Animated.View>
      ))}
    </View>
  );

  useEffect(() => {
    if (selectedChapter && seenIds.length > 0) {
      sendProgress('seen', selectedChapter.chapter_id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seenIds]);

  useEffect(() => {
    if (selectedChapter && attemptedIds.length > 0) {
      sendProgress('attempted', selectedChapter.chapter_id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attemptedIds]);

  useEffect(() => {
    if (selectedChapter) {
      sendProgress('bookmarked', selectedChapter.chapter_id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookmarkedIds]);

  useEffect(() => {
    // For most-wanted, fetch last saved question states from API when chapter changes
    const fetchProgressData = async () => {
      if (user?.userId && selectedChapter) {
        const endpoint = type === 'most-wanted'
          ? 'https://atomm-57b7d9183bae.herokuapp.com/api/users/get_mw_data'
          : 'https://atomm-57b7d9183bae.herokuapp.com/api/users/get_pyq_data';

        try {
          const res = await axios.post(endpoint, {
            studentId: user.userId,
            subjectId: subjectId,
          });

          const data = res.data?.data || {};
          const chapterKey = selectedChapter.chapter_id;
          const chapterState = (data[chapterKey] && Array.isArray(data[chapterKey]) && data[chapterKey][0]) ? data[chapterKey][0] : {};

          const seen = Array.isArray(chapterState.seen) ? chapterState.seen : [];
          const attempted = Array.isArray(chapterState.attempted) ? chapterState.attempted : [];
          const bookmarked = Array.isArray(chapterState.bookmarked) ? chapterState.bookmarked : [];

          setSeenIds(seen);
          setAttemptedIds(attempted);
          setBookmarkedIds(bookmarked);

          const newStateMap: { [questionId: string]: QuestionStatus } = {};
          const newBookmarkedSet = new Set<string>();

          const findQuestionIdByInt = (idInt: number) => {
            const q = questions.find(q => {
              const match = q.question_id.match(/(\d+)$/);
              return match ? parseInt(match[1], 10) === idInt : false;
            });
            return q?.question_id;
          };

          seen.forEach((id: number) => {
            const qId = findQuestionIdByInt(id);
            if (qId) newStateMap[qId] = 'seen';
          });

          attempted.forEach((id: number) => {
            const qId = findQuestionIdByInt(id);
            if (qId) newStateMap[qId] = 'attempted';
          });

          bookmarked.forEach((id: number) => {
            const qId = findQuestionIdByInt(id);
            if (qId) newBookmarkedSet.add(qId);
          });
          
          setQuestionStates(newStateMap);
          setBookmarkedQuestions(newBookmarkedSet);

        } catch (err) {
          console.error(`Failed to fetch ${type} data:`, err);
          setSeenIds([]);
          setAttemptedIds([]);
          setBookmarkedIds([]);
          setQuestionStates({});
          setBookmarkedQuestions(new Set());
        }
      }
    };

    if (questions.length > 0 || type) {
      fetchProgressData();
    }
  }, [type, user?.userId, subjectId, selectedChapter, questions]);

  // Subtopic filter UI for PYQ
  const renderSubtopicFilter = () => {
    if (type !== 'previous-year' || subtopics.length === 0) return null;
    if (Platform.OS === 'web') {
      return (
        <div style={{ marginBottom: 16 }}>
          <select
            value={selectedSubtopic}
            onChange={e => setSelectedSubtopic(e.target.value === 'all' ? 'all' : Number(e.target.value))}
            style={{ padding: 2, borderRadius: 8, borderColor: '#cbd5e1', minWidth: 200 }}
          >
            <option value="all">All Subtopics</option>
            {subtopics.map(st => (
              <option key={st.number} value={st.number}>{st.name}</option>
            ))}
          </select>
        </div>
      );
    } else {
      // Native: use Picker
      const Picker = require('@react-native-picker/picker').Picker;
      return (
        <View style={{ marginBottom: 16 }}>
          <Text style={{ color: '#1e293b', fontWeight: 'bold', marginBottom: 6 }}>Subtopic:</Text>
          <View style={{
            borderWidth: 1,
            borderColor: '#cbd5e1',
            borderRadius: 8,
            backgroundColor: '#fff',
            overflow: 'hidden'
          }}>
            <Picker
              selectedValue={selectedSubtopic}
              onValueChange={v => setSelectedSubtopic(v)}
              style={{ height: 44, borderRadius: 8 }}
            >
              <Picker.Item label="All Subtopics" value="all" />
              {subtopics.map(st => (
                <Picker.Item key={st.number} label={st.name} value={st.number} />
              ))}
            </Picker>
          </View>
        </View>
      );
    }
  };

  useEffect(() => {
    setVisibleCount(10);
  }, [selectedChapter, selectedExamType, selectedYearRange, selectedStatusFilter, selectedLocalExamType, selectedLocalExamYear, selectedSubtopic]);

  if (selectedQuestion) {
    return (
      <QuestionDetail
        question={{
          ...selectedQuestion,
          status: questionStates[selectedQuestion.question_id] || 'new',
          subjectId: subjectId,
          chapterId: selectedChapter?.chapter_id || '',
        }}
        questionNumber={currentQuestionIndex + 1}
        totalQuestions={questions.length}
        onBack={() => setSelectedQuestion(null)}
        onNext={currentQuestionIndex < questions.length - 1 ? handleNextQuestion : undefined}
        onPrevious={currentQuestionIndex > 0 ? handlePreviousQuestion : undefined}
        onQuestionAnswered={handleQuestionAnswered}
        type={type}
      />
    );
  }

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {renderHeader()}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Loading...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {renderHeader()}
      
      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {error ? (
          <View style={[styles.errorContainer, { backgroundColor: colors.danger + '20' }]}>
            <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
            <TouchableOpacity
              style={[styles.retryButton, { backgroundColor: colors.danger }]}
              onPress={() => selectedChapter ? fetchQuestions(selectedChapter) : fetchChapters()}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : selectedChapter ? (
          <>
            {renderStats()}
            {type === 'previous-year' && (
              <>
                {renderSubtopicFilter()}
                {renderFilters()}
              </>
            )}
            {/* Show status filters for both MW and PYQ */}
            {renderStatusFilters()}
            {renderQuestions()}
          </>
        ) : (
          renderChapters()
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 16,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  backText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    marginLeft: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    flex: 1,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontFamily: 'Inter-Medium',
  },
  errorContainer: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginVertical: 16,
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
  chaptersContainer: {
    marginTop: 16,
  },
  chapterCard: {
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
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
    }),
  },
  chapterContent: {
    padding: 16,
  },
  chapterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  chapterTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Medium',
    marginLeft: 12,
  },
  questionCount: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
  },
  filtersContainer: {
    marginBottom: 24,
  },
  filterSection: {
    marginBottom: 16,
  },
  filterLabel: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    marginBottom: 12,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    backgroundColor: '#F3F4F6',
  },
  filterChipText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  statsContainer: {
    marginBottom: 24,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    marginHorizontal: 8,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
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
    }),
  },
  statValue: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    marginVertical: 8,
  },
  statLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  questionsContainer: {
    marginTop: 16,
  },
  questionCard: {
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
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
    }),
  },
  questionContent: {
    padding: 16,
  },
  questionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  questionNumberContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  questionNumber: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    marginRight: 12,
  },
  questionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    marginLeft: 4,
  },
  questionText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    lineHeight: 24,
    marginBottom: 16,
  },
  questionFooter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  examTag: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    marginRight: 12,
  },
  examTagText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  yearText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
});