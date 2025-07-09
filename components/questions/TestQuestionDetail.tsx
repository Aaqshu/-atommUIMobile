import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Platform, Image } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { ArrowLeft, ChevronLeft, ChevronRight, Flag } from 'lucide-react-native';
import Animated, { FadeIn, SlideInUp } from 'react-native-reanimated';
import MathRenderer from '@/components/common/MathRenderer';
import SolutionRenderer, { splitIntoImageAndOtherSegments } from '@/components/common/SolutionRenderer';

let MathView: any = null;
if (Platform.OS !== 'web') {
  MathView = require('react-native-math-view').default;
}

type TestQuestion = {
  question_id: string;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: string;
  explanation?: string;
  exam_type: string;
  exam_year: string;
};

type TestQuestionDetailProps = {
  question: TestQuestion;
  questionNumber: number;
  totalQuestions: number;
  onBack: () => void;
  onNext?: () => void;
  onPrevious?: () => void;
  onQuestionAnswered?: (questionId: string, selectedOption: string, isCorrect: boolean) => void;
  selectedAnswer?: string;
  onAnswerSelect: (questionId: string, answer: string) => void;
  isBookmarked?: boolean;
  onToggleBookmark?: (questionId: string) => void;
  subjectId?: string;
  chapterId?: string;
};

export default function TestQuestionDetail({
  question,
  questionNumber,
  totalQuestions,
  onBack,
  onNext,
  onPrevious,
  onQuestionAnswered,
  selectedAnswer,
  onAnswerSelect,
  isBookmarked = false,
  onToggleBookmark,
  subjectId,
  chapterId,
}: TestQuestionDetailProps) {
  const { colors } = useTheme();
  const [showAnswer, setShowAnswer] = useState(false);
  const [isAnswered, setIsAnswered] = useState(false);

  const optionLabels = ['A', 'B', 'C', 'D'];
  const questionText = question.question || '';

  const getOptions = (): string[] => {
    return [
      question.option_a || '',
      question.option_b || '',
      question.option_c || '',
      question.option_d || ''
    ].filter(option => option.trim() !== '').map(opt => opt.trim());
  };

  const options = getOptions();

  // Helper function to render question content properly
  const renderQuestionContent = (questionToRender: string) => {
    if (!questionToRender) return null;
    questionToRender = questionToRender.replace(/\n/g, ' ');

    // Split by LaTeX delimiters and other patterns
    const parts = questionToRender.split(/(\$[^$]*\$|\\\[[^\\]*\\\]|\\\([^\\]*\\\))/g);

    return parts.map((part, idx) => {
      // LaTeX part (display math)
      if (part.startsWith('\\[') && part.endsWith('\\]')) {
        return <MathRenderer key={idx} content={part} color={colors.text} />;
      }
      // LaTeX part (inline math)
      if (part.startsWith('\\(') && part.endsWith('\\)')) {
        return <MathRenderer key={idx} content={part} color={colors.text} />;
      }
      // Dollar math part
      if (part.startsWith('$') && part.endsWith('$')) {
        return <MathRenderer key={idx} content={part} color={colors.text} />;
      }
      // Plain text part
      return <Text key={idx} style={{ flexWrap: 'wrap', color: colors.text, fontSize: 16, lineHeight: 24 }}>{part}</Text>;
    });
  };

  useEffect(() => {
    // Reset state when question changes
    setShowAnswer(false);
    setIsAnswered(false);
  }, [question.question_id]);

  const handleOptionSelect = (option: string) => {
    onAnswerSelect(question.question_id, option);
  };

  const isCorrectOption = (optionValue: string, optionIndex: number) => {
    const correctAnswer = question.correct_answer;
    const optionLabel = String.fromCharCode(65 + optionIndex); // A, B, C, D
    
    // Check if correctAnswer exists
    if (!correctAnswer || !optionValue) {
      return false;
    }
    
    // Try to match by label first (A/B/C/D)
    if (['A', 'B', 'C', 'D', 'a', 'b', 'c', 'd'].includes(correctAnswer.trim().toUpperCase())) {
      return optionLabel.toUpperCase() === correctAnswer.trim().toUpperCase();
    }
    
    // Fallback to value match
    return optionValue.trim() === correctAnswer.trim();
  };

  const isCorrectAnswer = (option: string) => {
    if (!selectedAnswer || !question.correct_answer) return false;
    
    // Try to match by label (A/B/C/D or a/b/c/d)
    const correctLabel = question.correct_answer.trim().toUpperCase();
    const selectedIdx = options.findIndex(opt => opt === selectedAnswer);
    const selectedLabel = optionLabels[selectedIdx];
    if (selectedLabel && selectedLabel.toUpperCase() === correctLabel) return true;
    
    // Fallback: match by value
    return selectedAnswer.trim() === question.correct_answer.trim();
  };

  const getOptionStyle = (option: string, optionIndex: number) => {
    const baseStyle = [styles.optionCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }];
    const isSelected = selectedAnswer === option;
    const isCorrect = isCorrectOption(option, optionIndex);
    
    if (!showAnswer) {
      if (isSelected) {
        return [...baseStyle, { borderColor: colors.primary, backgroundColor: colors.primary + '10' }];
      }
      return baseStyle;
    }

    // After answer is shown
    if (isCorrect) {
      return [...baseStyle, { borderColor: colors.success, backgroundColor: colors.success + '10' }];
    }
    
    if (isSelected && !isCorrect) {
      return [...baseStyle, { borderColor: colors.danger, backgroundColor: colors.danger + '10' }];
    }
    
    return [...baseStyle, { opacity: 0.6 }];
  };

  const getOptionTextColor = (option: string, optionIndex: number) => {
    const isSelected = selectedAnswer === option;
    const isCorrect = isCorrectOption(option, optionIndex);
    
    if (!showAnswer) {
      if (isSelected) {
        return colors.primary;
      }
      return colors.text;
    }
    
    if (isCorrect) {
      return colors.success;
    }
    
    if (isSelected && !isCorrect) {
      return colors.danger;
    }
    
    return colors.text;
  };

  const getCorrectOptionLabel = () => {
    let correct = (question.correct_answer || '').trim();

    // If correct is a letter (A/B/C/D), map to index
    const letterIndex = ['A', 'B', 'C', 'D'].indexOf(correct.toUpperCase());
    if (letterIndex !== -1 && options[letterIndex]) {
      return optionLabels[letterIndex];
    }

    // Otherwise, try to match by value
    const correctIndex = options.findIndex(opt => opt.trim() === correct);
    return correctIndex !== -1 ? optionLabels[correctIndex] : 'Unknown';
  };

  // Get solution text from either field
  const solutionText = question.explanation || '';

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
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
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
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
    questionContent: {
      paddingHorizontal: 20,
      paddingVertical: 16,
      minHeight: 120,
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
      marginBottom: 14,
    },
    optionCard: {
      borderRadius: 12,
      borderWidth: 2,
      marginBottom: 12,
      overflow: 'hidden',
    },
    optionLabel: {
      fontSize: 16,
      fontFamily: 'Inter-Medium',
      marginRight: 12,
    },
    optionText: {
      fontSize: 16,
      fontFamily: 'Inter-Regular',
      flex: 1,
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
      marginRight: 4,
    },
    solutionSubtitle: {
      fontSize: 14,
      fontFamily: 'Inter-Medium',
      marginBottom: 16,
    },
    separator: {
      height: 1,
      backgroundColor: colors.border,
      marginVertical: 16,
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
    optionContent: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
    },
    optionTextContainer: {
      flex: 1,
    },
    checkAnswerButton: {
      padding: 16,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkAnswerText: {
      fontSize: 16,
      fontFamily: 'Inter-Medium',
      color: colors.background,
    },
  });

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.cardBackground, borderBottomColor: colors.border }]}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <ArrowLeft size={24} color={colors.text} />
          <Text style={[styles.backText, { color: colors.text }]}>Back to Test</Text>
        </TouchableOpacity>
        <View style={styles.headerActions}>
          {onToggleBookmark && (
            <TouchableOpacity onPress={() => onToggleBookmark(question.question_id)} style={styles.bookmarkButton}>
              <Flag size={24} color={isBookmarked ? colors.primary : colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
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
            </View>
          </View>

          <View style={styles.questionContent}>
            {renderQuestionContent(questionText)}
          </View>

          {/* <View style={styles.examInfo}>
            <View style={[styles.examTag, { backgroundColor: colors.primary + '20' }]}>
              <Text style={[styles.examTagText, { color: colors.primary }]}>
                {question.exam_type}
              </Text>
            </View>
            <Text style={[styles.examYear, { color: colors.textSecondary }]}>
              {question.exam_year}
            </Text>
          </View> */}
        </Animated.View>

        {/* Options */}
        <View style={styles.optionsContainer}>
          {options.map((option, index) => (
            <TouchableOpacity
              key={index}
              style={getOptionStyle(option, index)}
              onPress={() => handleOptionSelect(option)}
              disabled={false}
              activeOpacity={0.7}
            >
              <View style={styles.optionContent}>
                <Text style={[styles.optionLabel, { color: getOptionTextColor(option, index) }]}>
                  {optionLabels[index]}.
                </Text>
                <View style={styles.optionTextContainer}>
                  <MathRenderer 
                    content={option} 
                    color={getOptionTextColor(option, index)} 
                  />
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>



        {/* Solution */}
        {showAnswer && solutionText && (
          <View style={[styles.solutionContainer, { backgroundColor: colors.cardBackground, padding: 24, marginBottom: 32 }]}> 
            <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginBottom: 8 }}>
              <Text style={[styles.solutionTitle, { color: selectedAnswer && isCorrectAnswer(selectedAnswer) ? colors.success : colors.danger }]}> 
                {selectedAnswer && isCorrectAnswer(selectedAnswer) ? 'Correct!' : `Correct Answer: ${getCorrectOptionLabel()}. `}
              </Text>
              {(() => {
                const correct = (question.correct_answer || '').trim();
                return !['A', 'B', 'C', 'D'].includes(correct.toUpperCase()) && !!correct ? (
                  <MathRenderer
                    content={correct}
                    color={selectedAnswer && isCorrectAnswer(selectedAnswer) ? colors.success : colors.danger}
                  />
                ) : null;
              })()}
            </View>
            <Text style={[styles.solutionSubtitle, { color: colors.textSecondary, marginBottom: 8 }]}> 
              {selectedAnswer && isCorrectAnswer(selectedAnswer) ? "Great job! Here's the explanation." : "Here's the correct answer and explanation."}
            </Text>
            <View style={styles.separator} />
            <SolutionRenderer
              content={solutionText}
              color={colors.text}
              subjectId={subjectId}
              chapterId={chapterId}
              maxHeight={500}
            />
          </View>
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