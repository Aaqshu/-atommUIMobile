import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { ArrowLeft, Bookmark, TriangleAlert as AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react-native';
import Animated, { FadeIn, SlideInUp } from 'react-native-reanimated';
import MathRenderer from '@/components/common/MathRenderer';
import { QuestionStateService } from '@/services/questionStateService';

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
  status?: 'new' | 'seen' | 'attempted';
};

type QuestionDetailProps = {
  question: Question;
  questionNumber: number;
  totalQuestions: number;
  onBack: () => void;
  onNext?: () => void;
  onPrevious?: () => void;
  onQuestionAnswered?: (questionId: string, selectedOption: string, isCorrect: boolean) => void;
  type: 'most-wanted' | 'previous-year';
  subjectId: string;
  chapterId: string;
};

export default function QuestionDetail({
  question,
  questionNumber,
  totalQuestions,
  onBack,
  onNext,
  onPrevious,
  onQuestionAnswered,
  type,
  subjectId,
  chapterId
}: QuestionDetailProps) {
  const { colors } = useTheme();
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [isAnswered, setIsAnswered] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);

  const optionLabels = ['A', 'B', 'C', 'D'];

  // Get question text from either field
  const questionText = question.question_text || question.question || '';

  // Get options from either the options array or individual option fields
  const getOptions = (): string[] => {
    if (question.options && question.options.length > 0) {
      return question.options;
    }
    
    // Fallback to individual option fields
    const options = [
      question.option_a || '',
      question.option_b || '',
      question.option_c || '',
      question.option_d || ''
    ].filter(option => option.trim() !== '');
    
    return options;
  };

  const options = getOptions();

  useEffect(() => {
    // Reset state when question changes
    setSelectedOption(null);
    setShowAnswer(false);
    setIsAnswered(false);
    loadBookmarkStatus();
  }, [question.question_id]);

  const loadBookmarkStatus = async () => {
    try {
      const bookmarkStatus = await QuestionStateService.isQuestionBookmarked(
        type,
        subjectId,
        chapterId,
        question.question_id
      );
      setIsBookmarked(bookmarkStatus);
    } catch (error) {
      console.error('Error loading bookmark status:', error);
    }
  };

  const handleOptionSelect = (option: string) => {
    if (!isAnswered) {
      setSelectedOption(option);
    }
  };

  const handleCheckAnswer = () => {
    if (selectedOption) {
      setShowAnswer(true);
      setIsAnswered(true);
      
      // Check if answer is correct
      const correctAnswer = question.correct_answer || question.correct_option;
      const isCorrect = selectedOption === correctAnswer;
      
      // Call the callback to update question state
      if (onQuestionAnswered) {
        onQuestionAnswered(question.question_id, selectedOption, isCorrect);
      }
    }
  };

  const handleBookmark = async () => {
    try {
      const newBookmarkStatus = await QuestionStateService.toggleBookmark(
        type,
        subjectId,
        chapterId,
        question.question_id
      );
      setIsBookmarked(newBookmarkStatus);
    } catch (error) {
      console.error('Error toggling bookmark:', error);
    }
  };

  const getOptionStyle = (option: string) => {
    const baseStyle = [styles.optionCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }];
    
    if (!isAnswered) {
      if (selectedOption === option) {
        return [...baseStyle, { borderColor: colors.primary, backgroundColor: colors.primary + '10' }];
      }
      return baseStyle;
    }

    // After answer is shown
    if (option === question.correct_answer || option === question.correct_option) {
      return [...baseStyle, { borderColor: colors.success, backgroundColor: colors.success + '10' }];
    }
    
    if (selectedOption === option && option !== question.correct_answer && option !== question.correct_option) {
      return [...baseStyle, { borderColor: colors.danger, backgroundColor: colors.danger + '10' }];
    }
    
    return [...baseStyle, { opacity: 0.6 }];
  };

  const getOptionTextStyle = (option: string) => {
    const baseStyle = [styles.optionText, { color: colors.text }];
    
    if (!isAnswered) {
      if (selectedOption === option) {
        return [...baseStyle, { color: colors.primary, fontFamily: 'Inter-Medium' }];
      }
      return baseStyle;
    }

    // After answer is shown
    if (option === question.correct_answer || option === question.correct_option) {
      return [...baseStyle, { color: colors.success, fontFamily: 'Inter-Medium' }];
    }
    
    if (selectedOption === option && option !== question.correct_answer && option !== question.correct_option) {
      return [...baseStyle, { color: colors.danger, fontFamily: 'Inter-Medium' }];
    }
    
    return baseStyle;
  };

  const getStatusColor = () => {
    if (showAnswer) {
      return colors.success; // Show as "Attempted" when answered
    }
    switch (question.status) {
      case 'seen':
        return colors.warning;
      case 'attempted':
        return colors.success;
      default:
        return colors.textSecondary;
    }
  };

  const getStatusText = () => {
    if (showAnswer) {
      return 'Attempted';
    }
    switch (question.status) {
      case 'seen':
        return 'Seen';
      case 'attempted':
        return 'Attempted';
      default:
        return 'New';
    }
  };

  const getCorrectOptionLabel = () => {
    const correctAnswer = question.correct_answer || question.correct_option;
    const correctIndex = options.indexOf(correctAnswer);
    return correctIndex !== -1 ? optionLabels[correctIndex] : 'Unknown';
  };

  const isCorrectAnswer = () => {
    const correctAnswer = question.correct_answer || question.correct_option;
    return selectedOption === correctAnswer;
  };

  // Get solution text from either field
  const solutionText = question.solution || question.explanation || '';

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.cardBackground, borderBottomColor: colors.border }]}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <ArrowLeft size={24} color={colors.text} />
          <Text style={[styles.backText, { color: colors.text }]}>Back to Questions</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleBookmark} style={styles.bookmarkButton}>
          <Bookmark 
            size={24} 
            color={isBookmarked ? colors.primary : colors.textSecondary}
            fill={isBookmarked ? colors.primary : 'transparent'}
          />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Question Card */}
        <Animated.View 
          entering={FadeIn.duration(600)}
          style={[styles.questionCard, { backgroundColor: colors.cardBackground }]}
        >
          <View style={styles.questionHeader}>
            <View style={styles.questionNumberContainer}>
              <Text style={[styles.questionNumber, { color: colors.text }]}>
                {String(questionNumber).padStart(2, '0')}.
              </Text>
              <View style={styles.questionStatus}>
                <View style={[styles.statusDot, { backgroundColor: getStatusColor() }]} />
                <Text style={[styles.statusText, { color: getStatusColor() }]}>
                  {getStatusText()}
                </Text>
              </View>
            </View>
            <View style={styles.warningContainer}>
              <AlertTriangle size={20} color={colors.warning} />
            </View>
          </View>

          <View style={styles.questionTextContainer}>
            <MathRenderer content={questionText} color={colors.text} />
          </View>

          <View style={styles.examInfo}>
            <View style={[styles.examTag, { backgroundColor: colors.primary + '20' }]}>
              <Text style={[styles.examTagText, { color: colors.primary }]}>
                {question.exam_type}
              </Text>
            </View>
            <Text style={[styles.examYear, { color: colors.textSecondary }]}>
              ({question.exam_year})
            </Text>
          </View>
        </Animated.View>

        {/* Options */}
        <View style={styles.optionsContainer}>
          {options.map((option, index) => (
            <Animated.View
              key={index}
              entering={FadeIn.duration(400).delay(index * 100)}
            >
              <TouchableOpacity
                style={getOptionStyle(option)}
                onPress={() => handleOptionSelect(option)}
                disabled={isAnswered}
                activeOpacity={0.7}
              >
                <View style={styles.optionContent}>
                  <Text style={[styles.optionLabel, getOptionTextStyle(option)]}>
                    {optionLabels[index]}.
                  </Text>
                  <View style={styles.optionTextContainer}>
                    <MathRenderer content={option} color={getOptionTextStyle(option)[1]?.color || colors.text} />
                  </View>
                </View>
              </TouchableOpacity>
            </Animated.View>
          ))}
        </View>

        {/* Check Answer Button */}
        {selectedOption && !showAnswer && (
          <Animated.View entering={SlideInUp.duration(300)}>
            <TouchableOpacity
              style={[styles.checkAnswerButton, { backgroundColor: colors.primary }]}
              onPress={handleCheckAnswer}
              activeOpacity={0.8}
            >
              <Text style={styles.checkAnswerText}>Check Answer</Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Solution */}
        {showAnswer && solutionText && (
          <Animated.View 
            entering={SlideInUp.duration(400)}
            style={[styles.solutionContainer, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
          >
            <Text style={[styles.solutionTitle, { color: colors.text }]}>Solution:</Text>
            <View style={styles.solutionContent}>
              <MathRenderer content={solutionText} color={colors.text} />
            </View>
          </Animated.View>
        )}
      </ScrollView>

      {/* Navigation Footer */}
      <View style={[styles.footer, { backgroundColor: colors.cardBackground, borderTopColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.navButton, !onPrevious && { opacity: 0.5 }]}
          onPress={onPrevious}
          disabled={!onPrevious}
        >
          <ChevronLeft size={20} color={colors.text} />
          <Text style={[styles.navButtonText, { color: colors.text }]}>Previous</Text>
        </TouchableOpacity>

        <View style={styles.questionCounter}>
          <Text style={[styles.counterText, { color: colors.textSecondary }]}>
            {questionNumber} of {totalQuestions}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.navButton, !onNext && { opacity: 0.5 }]}
          onPress={onNext}
          disabled={!onNext}
        >
          <Text style={[styles.navButtonText, { color: colors.text }]}>Next</Text>
          <ChevronRight size={20} color={colors.text} />
        </TouchableOpacity>
      </View>
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: Platform.OS === 'ios' ? 60 : 16,
    borderBottomWidth: 1,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    marginLeft: 8,
  },
  bookmarkButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  questionCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
      web: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
    }),
  },
  questionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  questionNumberContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  questionNumber: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    marginRight: 12,
  },
  questionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  warningContainer: {
    padding: 4,
  },
  questionTextContainer: {
    marginBottom: 16,
    minHeight: 60,
  },
  examInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  examTag: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  examTagText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
  },
  examYear: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  optionsContainer: {
    marginBottom: 24,
  },
  optionCard: {
    borderRadius: 12,
    borderWidth: 2,
    marginBottom: 12,
    overflow: 'hidden',
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  optionLabel: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    marginRight: 12,
    minWidth: 24,
  },
  optionTextContainer: {
    flex: 1,
    minHeight: 40,
  },
  optionText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    lineHeight: 24,
  },
  checkAnswerButton: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 24,
    minWidth: 200,
  },
  checkAnswerText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Inter-Medium',
  },
  solutionContainer: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    marginBottom: 24,
  },
  solutionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    marginBottom: 16,
  },
  solutionContent: {
    minHeight: 80,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    minWidth: 80,
  },
  navButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    marginHorizontal: 4,
  },
  questionCounter: {
    flex: 1,
    alignItems: 'center',
  },
  counterText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
});