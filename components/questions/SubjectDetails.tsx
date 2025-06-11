import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Platform, ActivityIndicator } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import Animated, { FadeIn } from 'react-native-reanimated';
import { ArrowLeft, BookOpen, Eye, CircleDot, CircleCheck as CheckCircle2, Bookmark } from 'lucide-react-native';
import QuestionDetail from './QuestionDetail';
import { QuestionStateService, QuestionStatus } from '@/services/questionStateService';
import axios from 'axios';

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
  correct_answer?: string;
  correct_option?: string;
  explanation?: string;
  solution?: string;
  exam_type: string;
  exam_year: string;
  status?: QuestionStatus;
};

export default function SubjectDetails({ subject, subjectId, onBack, type, token }: SubjectDetailsProps) {
  const { colors } = useTheme();
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

      const response = await axios.post(
        'https://atomm-57b7d9183bae.herokuapp.com/api/admin/data/getPYQsQuestions',
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
          // Normalize correct answer field
          correct_answer: q.correct_answer || q.correct_option || '',
          // Normalize solution field
          solution: q.solution || q.explanation || ''
        };
      });

      setQuestions(questionsWithStatus);
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
  };

  const handleQuestionSelect = async (question: Question, index: number) => {
    setSelectedQuestion(question);
    setCurrentQuestionIndex(index);
    
    // Mark question as seen when user opens it
    await updateQuestionState(question.question_id, 'seen');
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      const nextIndex = currentQuestionIndex + 1;
      setCurrentQuestionIndex(nextIndex);
      setSelectedQuestion(questions[nextIndex]);
      
      // Mark next question as seen
      updateQuestionState(questions[nextIndex].question_id, 'seen');
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      const prevIndex = currentQuestionIndex - 1;
      setCurrentQuestionIndex(prevIndex);
      setSelectedQuestion(questions[prevIndex]);
      
      // Mark previous question as seen
      updateQuestionState(questions[prevIndex].question_id, 'seen');
    }
  };

  const handleQuestionAnswered = async (questionId: string, selectedOption: string, isCorrect: boolean) => {
    await updateQuestionState(questionId, 'attempted', selectedOption, isCorrect);
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
      
      const newBookmarked = new Set(bookmarkedQuestions);
      if (newBookmarkStatus) {
        newBookmarked.add(questionId);
      } else {
        newBookmarked.delete(questionId);
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

  const renderQuestions = () => (
    <View style={styles.questionsContainer}>
      {questions.map((question, index) => (
        <Animated.View
          key={question.question_id}
          entering={FadeIn.duration(300).delay(index * 100)}
          style={[styles.questionCard, { backgroundColor: colors.cardBackground }]}
        >
          <TouchableOpacity
            style={styles.questionContent}
            onPress={() => handleQuestionSelect(question, index)}
            activeOpacity={0.7}
          >
            <View style={styles.questionHeader}>
              <View style={styles.questionNumberContainer}>
                <Text style={[styles.questionNumber, { color: colors.text }]}>
                  {String(index + 1).padStart(2, '0')}.
                </Text>
                <View style={styles.questionStatus}>
                  {getStatusIcon(question.question_id)}
                  <Text style={[styles.statusText, { color: getStatusColor(question.question_id) }]}>
                    {getStatusText(question.question_id)}
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => handleBookmarkToggle(question.question_id)}>
                <Bookmark 
                  size={20} 
                  color={bookmarkedQuestions.has(question.question_id) ? colors.primary : colors.textSecondary}
                  fill={bookmarkedQuestions.has(question.question_id) ? colors.primary : 'transparent'}
                />
              </TouchableOpacity>
            </View>
            
            <Text 
              style={[styles.questionText, { color: colors.text }]}
              numberOfLines={3}
              ellipsizeMode="tail"
            >
              {question.question}
            </Text>

            <View style={styles.questionFooter}>
              <View style={[styles.examTag, { backgroundColor: colors.primary + '20' }]}>
                <Text style={[styles.examTagText, { color: colors.primary }]}>
                  {question.exam_type}
                </Text>
              </View>
              <Text style={[styles.yearText, { color: colors.textSecondary }]}>
                {question.exam_year}
              </Text>
            </View>
          </TouchableOpacity>
        </Animated.View>
      ))}
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

  if (selectedQuestion) {
    return (
      <QuestionDetail
        question={{
          ...selectedQuestion,
          status: questionStates[selectedQuestion.question_id] || 'new'
        }}
        questionNumber={currentQuestionIndex + 1}
        totalQuestions={questions.length}
        onBack={() => setSelectedQuestion(null)}
        onNext={currentQuestionIndex < questions.length - 1 ? handleNextQuestion : undefined}
        onPrevious={currentQuestionIndex > 0 ? handlePreviousQuestion : undefined}
        onQuestionAnswered={handleQuestionAnswered}
        type={type}
        subjectId={subjectId}
        chapterId={selectedChapter?.chapter_id || ''}
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
            {renderFilters()}
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