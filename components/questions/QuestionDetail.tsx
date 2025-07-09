import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Platform, Image, Modal } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { ArrowLeft, Bookmark, TriangleAlert as AlertTriangle, ChevronLeft, ChevronRight, X, Maximize2 } from 'lucide-react-native';
import Animated, { FadeIn, SlideInUp } from 'react-native-reanimated';
import MathRenderer from '@/components/common/MathRenderer';
import RichContentRenderer from '@/components/common/RichContentRenderer';
import { QuestionStateService } from '@/services/questionStateService';
import axios from 'axios';
import { useAuth } from '@/hooks/useAuth';
import ReportIssueModal from './ReportIssueModal';
import SolutionRenderer, { splitIntoImageAndOtherSegments } from '../common/SolutionRenderer';

let MathView: any = null;
if (Platform.OS !== 'web') {
  MathView = require('react-native-math-view').default;
}

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
  subjectId: string;
  chapterId: string;
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
}: QuestionDetailProps) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [isAnswered, setIsAnswered] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isReportModalVisible, setReportModalVisible] = useState(false);
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [showSolutionModal, setShowSolutionModal] = useState(false);

  // Helper functions are now inside the component
  const sanitizeLatex = (content: string) => {
    if (!content) return '';
    return content
      .replace(/\\begin{array}{([^}]*)}/g, '\\begin{array}{$1} ')
      .replace(/\\end{array}/g, ' \\end{array}')
      .replace(/\\begin{([^}]*)}/g, ' \\begin{$1} ')
      .replace(/\\end{([^}]*)}/g, ' \\end{$1} ')
      .replace(/\\\\/g, ' \\\\ ')
      .replace(/&/g, ' & ')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const cleanLatex = (str: string) => {
    if (!str) return '';
    const cleaned = str.replace(/\$/g, '').trim();
    return sanitizeLatex(cleaned);
  };

  const renderQuestionContent = (questionToRender: string) => {
    if (!questionToRender) return null;
    questionToRender = questionToRender.replace(/\n/g, ' ');

    // Enhanced to handle images, similar to Markdown ![alt](src)
    const parts = questionToRender.split(/(\!\[.*?\]\(.*?\)|`[^`]*`|\$[^$]*\$)/g);

    return parts.map((part, idx) => {
      // Image part
      if (part.startsWith('![') && part.includes('](')) {
        const match = part.match(/\!\[(.*?)\]\((.*?)\)/);
        if (match) {
          const imageUrl = match[2];
          return (
            <Image
              key={idx}
              source={{ uri: imageUrl }}
              style={{ width: '100%', height: 200, resizeMode: 'contain', marginVertical: 8 }}
            />
          );
        }
      }
      // LaTeX part
      if (part.startsWith('$') && part.endsWith('$')) {
        // Use MathRenderer for consistent math rendering across platforms
        return <MathRenderer key={idx} content={part} color={colors.text} />;
      }
      // Plain text part
      return <Text key={idx} style={{ flexWrap: 'wrap', color: colors.text, fontSize: 16 }}>{part}</Text>;
    });
  };

  // Styles are also now inside the component
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background, // Now 'colors' is available
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
    reportButton: {
      padding: 8,
    },
    bookmarkButton: {
      padding: 8,
      marginLeft: 8,
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
    questionContent: {
      paddingHorizontal: 20,
      paddingVertical: 16,
      minHeight: 150,
      maxHeight: 360,
      height: 150,
      overflow: 'scroll',
    },
    questionText: {
      fontSize: 18,
      fontFamily: 'Inter-Regular',
      lineHeight: 28,
      
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
      marginBottom: 15
      
    },
    examYear: {
      fontSize: 14,
      fontFamily: 'Inter-Medium',
    },
    optionsContainer: {
      marginBottom: 10,
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
      height: 350
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
  });

  const optionLabels = ['A', 'B', 'C', 'D'];
  const questionText = question.question_text || question.question || '';

  const getOptions = (): string[] => {
    if (question.options && question.options.length > 0) {
      return question.options.map(opt => opt.trim());
    }
    // Fallback to individual option fields
    const options = [
      question.option_a || '',
      question.option_b || '',
      question.option_c || '',
      question.option_d || ''
    ].filter(option => option.trim() !== '').map(opt => opt.trim());
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
        question.subjectId,
        question.chapterId,
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

  const handleCheckAnswer = async () => {
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
      // Call questions_attempted API
      if (user?.userId) {
        try {
          await axios.post(`https://atomm-57b7d9183bae.herokuapp.com/api/users/questions_attempted/${user.userId}`, { today_attempt: 1 });
        } catch (err) {
          console.error('Failed to record question attempt:', err);
        }
      }
    }
  };

  const handleBookmark = async () => {
    try {
      const newBookmarkStatus = await QuestionStateService.toggleBookmark(
        type,
        question.subjectId,
        question.chapterId,
        question.question_id
      );
      setIsBookmarked(newBookmarkStatus);
    } catch (error) {
      console.error('Error toggling bookmark:', error);
    }
  };

  const getOptionStyle = (option: string, idx: number) => {
    const baseStyle = [styles.optionCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }];
    let isCorrect = false;
    // Check if correct_option is a letter and matches this index
    if (question.correct_option && ['A','B','C','D'].includes(question.correct_option.trim().toUpperCase())) {
      const correctIdx = ['A','B','C','D'].indexOf(question.correct_option.trim().toUpperCase());
      isCorrect = idx === correctIdx;
    } else if (option === question.correct_answer || option === question.correct_option) {
      isCorrect = true;
    }
    if (!isAnswered) {
      if (selectedOption === option) {
        return [...baseStyle, { borderColor: colors.primary, backgroundColor: colors.primary + '10' }];
      }
      return baseStyle;
    }
    if (isCorrect) {
      // Green for correct
      return [...baseStyle, { borderColor: colors.success, backgroundColor: colors.success + '20' }];
    }
    if (selectedOption === option) {
      // Red for incorrect
      return [...baseStyle, { borderColor: colors.danger, backgroundColor: colors.danger + '20' }];
    }
    return [...baseStyle, { opacity: 0.6 }];
  };

  const getOptionTextStyle = (option: string, idx: number) => {
    const baseStyle = [styles.optionText, { color: colors.text }];
    let isCorrect = false;
    if (question.correct_option && ['A','B','C','D'].includes(question.correct_option.trim().toUpperCase())) {
      const correctIdx = ['A','B','C','D'].indexOf(question.correct_option.trim().toUpperCase());
      isCorrect = idx === correctIdx;
    } else if (option === question.correct_answer || option === question.correct_option) {
      isCorrect = true;
    }
    if (!isAnswered) {
      if (selectedOption === option) {
        return [...baseStyle, { color: colors.primary, fontFamily: 'Inter-Medium' }];
      }
      return baseStyle;
    }
    if (isCorrect) {
      return [...baseStyle, { color: colors.success, fontFamily: 'Inter-Medium' }];
    }
    if (selectedOption === option) {
      return [...baseStyle, { color: colors.danger, fontFamily: 'Inter-Medium' }];
    }
    return baseStyle;
  };

  const getOptionTextColor = (option: string, idx: number) => {
    let isCorrect = false;
    if (question.correct_option && ['A','B','C','D'].includes(question.correct_option.trim().toUpperCase())) {
      const correctIdx = ['A','B','C','D'].indexOf(question.correct_option.trim().toUpperCase());
      isCorrect = idx === correctIdx;
    } else if (option === question.correct_answer || option === question.correct_option) {
      isCorrect = true;
    }
    if (!isAnswered) {
      if (selectedOption === option) {
        return colors.primary;
      }
      return colors.text;
    }
    if (isCorrect) {
      return colors.success;
    }
    if (selectedOption === option) {
      return colors.danger;
    }
    return colors.text;
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
    let correct = (question.correct_option || question.correct_answer || '').trim();

    // If correct is a letter (A/B/C/D), map to index
    const letterIndex = ['A', 'B', 'C', 'D'].indexOf(correct.toUpperCase());
    if (letterIndex !== -1 && options[letterIndex]) {
      return optionLabels[letterIndex];
    }

    // Otherwise, try to match by value
    const correctIndex = options.findIndex(opt => opt.trim() === correct);
    return correctIndex !== -1 ? optionLabels[correctIndex] : 'Unknown';
  };

  const isCorrectAnswer = () => {
    // Try to match by label (A/B/C/D or a/b/c/d)
    if (question.correct_option) {
      const correctLabel = question.correct_option.trim().toUpperCase();
      const selectedIdx = options.findIndex(opt => opt === selectedOption);
      const selectedLabel = optionLabels[selectedIdx];
      if (selectedLabel && selectedLabel.toUpperCase() === correctLabel) return true;
    }
    // Fallback: match by value
    if (question.correct_answer && selectedOption) {
      return selectedOption.trim() === question.correct_answer.trim();
    }
    return false;
  };

  // Get solution text from either field
  const solutionText = question.solution || question.explanation || '';

  const handleReportSubmit = (issues: string[], otherDetails: string) => {
    console.log('Reporting issue for question:', question.question_id);
    console.log('Issues:', issues);
    if (otherDetails) {
      console.log('Details:', otherDetails);
    }
    // TODO: Implement API call to submit the report
    setReportModalVisible(false);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.cardBackground, borderBottomColor: colors.border }]}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <ArrowLeft size={24} color={colors.text} />
          <Text style={[styles.backText, { color: colors.text }]}>Back to Questions</Text>
        </TouchableOpacity>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => setReportModalVisible(true)} style={styles.reportButton}>
            <AlertTriangle size={24} color={colors.warning} />
          </TouchableOpacity>
          {/* <TouchableOpacity onPress={handleBookmark} style={styles.bookmarkButton}>
            <Bookmark 
              size={24} 
              color={isBookmarked ? colors.primary : colors.textSecondary}
              fill={isBookmarked ? colors.primary : 'transparent'}
            />
          </TouchableOpacity> */}
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
              <View style={styles.questionStatus}>
                <View style={[styles.statusDot, { backgroundColor: getStatusColor() }]} />
                <Text style={[styles.statusText, { color: getStatusColor() }]}>
                  {getStatusText()}
                </Text>
              </View>
            </View>
            {/* Expand icon at right top corner */}
            <TouchableOpacity onPress={() => setShowQuestionModal(true)} style={{ marginLeft: 8 }}>
              <Maximize2 size={22} color={colors.primary} />
            </TouchableOpacity>
            {/* <View style={styles.warningContainer}>
              <AlertTriangle size={20} color={colors.warning} />
            </View> */}
          </View>

          <View style={styles.questionContent}>
            <View style={{ minHeight: 100 }}>
              <View style={{ flex: 1 }}>
                {splitIntoImageAndOtherSegments(questionText, question.subjectId, question.chapterId).map((seg, idx) =>
                  seg.type === 'image' ? (
                    <Image
                      key={`img-${idx}`}
                      source={{ uri: seg.content }}
                      style={{ width: '100%', height: 150, marginVertical: 12, borderRadius: 12 }}
                      resizeMode="contain"
                    />
                  ) : (
                    <ScrollView style={{ height: 100, maxHeight: 350, overflow: 'scroll' }} showsVerticalScrollIndicator={true} >
                      <MathRenderer
                        key={`math-${idx}`}
                        content={seg.content}
                        color={colors.text}
                        subjectId={question.subjectId}
                        chapterId={question.chapterId}
                        skipImageParse={true}
                      />
                    </ScrollView>
                  )
                )}
              </View>
            </View>
            {/* Question Expand Modal */}
            <Modal
              visible={showQuestionModal}
              animationType="slide"
              transparent={true}
              onRequestClose={() => setShowQuestionModal(false)}
            >
              <View style={{
                flex: 1,
                backgroundColor: 'rgba(0,0,0,0.5)',
                justifyContent: 'center',
                alignItems: 'center'
              }}>
                <View style={{
                  backgroundColor: '#fff',
                  borderRadius: 16,
                  padding: 16,
                  width: '90%',
                  maxHeight: '60%',
                }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <Text style={{ color: colors.primary, fontWeight: 'bold', fontSize: 16 }}>Full Question</Text>
                    <TouchableOpacity onPress={() => setShowQuestionModal(false)}>
                      <X size={24} color={colors.primary} />
                    </TouchableOpacity>
                  </View>
                  <ScrollView style={{ maxHeight: 300, minHeight: 120 }}>
                    {splitIntoImageAndOtherSegments(questionText, question.subjectId, question.chapterId).map((seg, idx) =>
                      seg.type === 'image' ? (
                        <Image
                          key={`img-modal-${idx}`}
                          source={{ uri: seg.content }}
                          style={{ width: '100%', height: 120, marginVertical: 8, borderRadius: 12 }}
                          resizeMode="contain"
                        />
                      ) : (
                        <MathRenderer
                          key={`math-modal-${idx}`}
                          content={seg.content}
                          color={colors.text}
                          subjectId={question.subjectId}
                          chapterId={question.chapterId}
                          skipImageParse={true}
                        />
                      )
                    )}
                  </ScrollView>
                </View>
              </View>
            </Modal>
          </View>

          <View style={styles.examInfo}>
            <View style={[styles.examTag, { backgroundColor: colors.primary + '20' }]}>
              <Text style={[styles.examTagText, { color: colors.primary }]}>
                {question.exam_type}
              </Text>
            </View>
            <Text style={[styles.examYear, { color: colors.textSecondary }]}>
              {question.exam_year}
            </Text>
          </View>
        </Animated.View>

        {/* Options */}
        <View style={styles.optionsContainer}>
          {options.map((option, index) => (
            <TouchableOpacity
              key={index}
              style={getOptionStyle(option, index)}
              onPress={() => handleOptionSelect(option)}
              disabled={isAnswered}
              activeOpacity={0.7}
            >
              <View style={styles.optionContent}>
                <Text style={[styles.optionLabel, getOptionTextStyle(option, index)]}>{optionLabels[index]}.</Text>
                <View style={styles.optionTextContainer}>
                  <MathRenderer content={option} color={getOptionTextColor(option, index)} />
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Check Answer Button */}
        {!isAnswered && selectedOption && (
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
          <View style={[styles.solutionContainer, { backgroundColor: colors.cardBackground, padding: 24, marginBottom: 32 }]}> 
            <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginBottom: 8 }}>
              <Text style={[styles.solutionTitle, { color: isCorrectAnswer() ? colors.success : colors.danger }]}> 
                {isCorrectAnswer() ? 'Correct!' : `Correct Answer: ${getCorrectOptionLabel()}. `}
              </Text>
              {(() => {
                const correct = (question.correct_option || question.correct_answer || '').trim();
                return !['A', 'B', 'C', 'D'].includes(correct.toUpperCase()) && !!correct ? (
                  <MathRenderer
                    content={correct}
                    color={isCorrectAnswer() ? colors.success : colors.danger}
                  />
                ) : null;
              })()}
              <TouchableOpacity onPress={() => setShowSolutionModal(true)} style={{ marginLeft: 8 }}>
                <Maximize2 size={20} color={colors.primary} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.solutionSubtitle, { color: colors.textSecondary, marginBottom: 8 }]}> 
              {isCorrectAnswer() ? "Great job! Here's the explanation." : "Here's the correct answer and explanation."}
            </Text>
            <View style={styles.separator} />
            <SolutionRenderer
              content={solutionText}
              color={colors.text}
              subjectId={question.subjectId}
              chapterId={question.chapterId}
              maxHeight={500}
            />
            {/* Solution Expand Modal */}
            <Modal
              visible={showSolutionModal}
              animationType="slide"
              transparent={true}
              onRequestClose={() => setShowSolutionModal(false)}
            >
              <View style={{
                flex: 1,
                backgroundColor: 'rgba(0,0,0,0.5)',
                justifyContent: 'center',
                alignItems: 'center'
              }}>
                <View style={{
                  backgroundColor: '#fff',
                  borderRadius: 16,
                  padding: 16,
                  width: '90%',
                  maxHeight: '60%',
                }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <Text style={{ color: colors.primary, fontWeight: 'bold', fontSize: 16 }}>Full Solution</Text>
                    <TouchableOpacity onPress={() => setShowSolutionModal(false)}>
                      <X size={24} color={colors.primary} />
                    </TouchableOpacity>
                  </View>
                  <ScrollView style={{ maxHeight: 300, minHeight: 120 }}>
                    <SolutionRenderer
                      content={solutionText}
                      color={colors.text}
                      subjectId={question.subjectId}
                      chapterId={question.chapterId}
                      maxHeight={350}
                    />
                  </ScrollView>
                </View>
              </View>
            </Modal>
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

      <ReportIssueModal
        visible={isReportModalVisible}
        onClose={() => setReportModalVisible(false)}
        onSubmit={handleReportSubmit}
        questionId={question.question_id}
      />
    </View>
  );
}