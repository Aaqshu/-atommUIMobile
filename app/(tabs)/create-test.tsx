import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Platform, ActivityIndicator, TextInput, Alert } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/hooks/useAuth';
import Animated, { FadeIn, SlideInUp } from 'react-native-reanimated';
import { Clock, Beaker, Leaf, Fish, ChevronRight, ChevronLeft, BookOpen, SquareCheck as CheckSquare, Square, Play, RotateCcw, Settings, Timer, Target, BookOpenCheck } from 'lucide-react-native';
import axios from 'axios';

type Subject = {
  id: string;
  name: string;
  icon: React.ReactNode;
  color: string;
};

type ClassType = '11' | '12';

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

type Subtopic = {
  id: string;
  name: string;
  questionCount: number;
};

type SelectedChapter = {
  subjectId: string;
  subjectName: string;
  classType: ClassType;
  chapter: Chapter;
  subtopics: string[];
  subtopicIds: number[];
};

type TestConfiguration = {
  testName: string;
  noOfQuestions: number;
  testDuration: number;
  difficultyLevel: 'easy' | 'medium' | 'hard';
  examType: 'neet' | 'aipmt' | 'aiims';
};

type TestQuestion = {
  question_id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: string;
  explanation?: string;
  exam_type: string;
  exam_year: string;
};

export default function CreateTestScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState<'subject' | 'class' | 'chapters' | 'subtopics' | 'configure' | 'test'>('subject');
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [selectedClass, setSelectedClass] = useState<ClassType>('11');
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);
  const [subtopics, setSubtopics] = useState<Subtopic[]>([]);
  const [selectedSubtopics, setSelectedSubtopics] = useState<Set<string>>(new Set());
  const [selectedChapters, setSelectedChapters] = useState<SelectedChapter[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testConfig, setTestConfig] = useState<TestConfiguration>({
    testName: '',
    noOfQuestions: 30,
    testDuration: 60,
    difficultyLevel: 'medium',
    examType: 'neet'
  });
  const [testQuestions, setTestQuestions] = useState<TestQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<{ [questionId: string]: string }>({});
  const [showResults, setShowResults] = useState(false);

  const subjects: Subject[] = [
    {
      id: 'physics',
      name: 'Physics',
      icon: <Clock size={24} color="#2563EB" />,
      color: '#2563EB'
    },
    {
      id: 'chemistry',
      name: 'Chemistry',
      icon: <Beaker size={24} color="#8B5CF6" />,
      color: '#8B5CF6'
    },
    {
      id: 'botany',
      name: 'Botany',
      icon: <Leaf size={24} color="#10B981" />,
      color: '#10B981'
    },
    {
      id: 'zoology',
      name: 'Zoology',
      icon: <Fish size={24} color="#F59E0B" />,
      color: '#F59E0B'
    }
  ];

  const parseSubtopics = (subtopicString: string): Subtopic[] => {
    try {
      // Parse the string that looks like: "['1.Physical Quantities', '2.Units', ...]"
      const cleanString = subtopicString.replace(/'/g, '"'); // Replace single quotes with double quotes
      const subtopicArray = JSON.parse(cleanString);
      
      return subtopicArray.map((subtopic: string, index: number) => ({
        id: (index + 1).toString(),
        name: subtopic,
        questionCount: Math.floor(Math.random() * 20) + 5 // Random count for demo, replace with actual data
      }));
    } catch (error) {
      console.error('Error parsing subtopics:', error);
      // Fallback: split by comma and clean up
      const fallbackArray = subtopicString
        .replace(/[\[\]']/g, '') // Remove brackets and quotes
        .split(',')
        .map(item => item.trim())
        .filter(item => item.length > 0);
      
      return fallbackArray.map((subtopic: string, index: number) => ({
        id: (index + 1).toString(),
        name: subtopic,
        questionCount: Math.floor(Math.random() * 20) + 5
      }));
    }
  };

  const fetchChapters = async (subject: Subject, classType: ClassType) => {
    try {
      setLoading(true);
      setError(null);
      
      if (!user?.token) {
        throw new Error('Authentication token is required');
      }

      const requestBody = {
        subjectName_class: `${subject.id}_${classType}`
      };

      const response = await axios.post(
        'https://atomm-57b7d9183bae.herokuapp.com/api/admin/data/getChaptersBySubjects',
        requestBody,
        {
          headers: {
            'Authorization': `Bearer ${user.token}`,
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

  const createTest = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!user?.token) {
        throw new Error('Authentication token is required');
      }

      // Group selected chapters by grade and subject
      const gradeGroups: { [grade: string]: { [subject: string]: SelectedChapter[] } } = {};
      
      selectedChapters.forEach(chapter => {
        const grade = chapter.classType;
        const subject = chapter.subjectId;
        
        if (!gradeGroups[grade]) {
          gradeGroups[grade] = {};
        }
        if (!gradeGroups[grade][subject]) {
          gradeGroups[grade][subject] = [];
        }
        gradeGroups[grade][subject].push(chapter);
      });

      // Build the subjects array for the API
      const subjects = Object.entries(gradeGroups).map(([grade, subjectGroups]) => ({
        grade: parseInt(grade),
        subjects: ['physics', 'chemistry', 'botany', 'zoology'].map(subjectName => ({
          name: subjectName,
          chapterIds: subjectGroups[subjectName]?.map(chapter => ({
            id: chapter.chapter.chapter_id,
            subTopicIds: chapter.subtopicIds
          })) || []
        }))
      }));

      const requestBody = {
        testName: testConfig.testName,
        noOfQuestions: testConfig.noOfQuestions,
        testDuration: testConfig.testDuration,
        difficultyLevel: testConfig.difficultyLevel,
        examType: testConfig.examType,
        subjects: subjects
      };

      console.log('Creating test with request:', JSON.stringify(requestBody, null, 2));

      const response = await axios.post(
        'https://atomm-57b7d9183bae.herokuapp.com/api/admin/data/createTest',
        requestBody,
        {
          headers: {
            'Authorization': `Bearer ${user.token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      setTestQuestions(response.data.questions || []);
      setCurrentStep('test');
    } catch (err) {
      console.error('Error creating test:', err);
      setError('Failed to create test. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubjectSelect = (subject: Subject) => {
    setSelectedSubject(subject);
    setCurrentStep('class');
  };

  const handleClassSelect = (classType: ClassType) => {
    setSelectedClass(classType);
    if (selectedSubject) {
      fetchChapters(selectedSubject, classType);
      setCurrentStep('chapters');
    }
  };

  const handleChapterSelect = (chapter: Chapter) => {
    setSelectedChapter(chapter);
    
    // Parse subtopics from the API response
    const parsedSubtopics = parseSubtopics(chapter.subtopic_name);
    setSubtopics(parsedSubtopics);
    setSelectedSubtopics(new Set());
    setCurrentStep('subtopics');
  };

  const handleSubtopicToggle = (subtopicId: string) => {
    const newSelected = new Set(selectedSubtopics);
    if (newSelected.has(subtopicId)) {
      newSelected.delete(subtopicId);
    } else {
      newSelected.add(subtopicId);
    }
    setSelectedSubtopics(newSelected);
  };

  const handleSelectAllSubtopics = () => {
    if (selectedSubtopics.size === subtopics.length) {
      // Deselect all
      setSelectedSubtopics(new Set());
    } else {
      // Select all
      setSelectedSubtopics(new Set(subtopics.map(st => st.id)));
    }
  };

  const handleAddToTest = () => {
    if (selectedSubject && selectedChapter && selectedSubtopics.size > 0) {
      const selectedSubtopicNames = subtopics
        .filter(st => selectedSubtopics.has(st.id))
        .map(st => st.name);

      const selectedSubtopicIds = Array.from(selectedSubtopics).map(id => parseInt(id));

      const newSelection: SelectedChapter = {
        subjectId: selectedSubject.id,
        subjectName: selectedSubject.name,
        classType: selectedClass,
        chapter: selectedChapter,
        subtopics: selectedSubtopicNames,
        subtopicIds: selectedSubtopicIds
      };

      setSelectedChapters(prev => [...prev, newSelection]);
      
      // Reset to allow adding more chapters
      setCurrentStep('subject');
      setSelectedSubject(null);
      setSelectedChapter(null);
      setSelectedSubtopics(new Set());
      setSubtopics([]);
      setChapters([]);
    }
  };

  const handleRemoveChapter = (index: number) => {
    setSelectedChapters(prev => prev.filter((_, i) => i !== index));
  };

  const handleConfigureTest = () => {
    if (selectedChapters.length === 0) {
      setError('Please select at least one chapter before configuring the test');
      return;
    }
    setCurrentStep('configure');
  };

  const handleAnswerSelect = (questionId: string, answer: string) => {
    setSelectedAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < testQuestions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const handleSubmitTest = () => {
    setShowResults(true);
  };

  const calculateResults = () => {
    let correct = 0;
    let attempted = 0;

    testQuestions.forEach(question => {
      const userAnswer = selectedAnswers[question.question_id];
      if (userAnswer) {
        attempted++;
        if (userAnswer === question.correct_answer) {
          correct++;
        }
      }
    });

    return {
      total: testQuestions.length,
      attempted,
      correct,
      incorrect: attempted - correct,
      unattempted: testQuestions.length - attempted,
      percentage: attempted > 0 ? Math.round((correct / attempted) * 100) : 0
    };
  };

  const handleReset = () => {
    setCurrentStep('subject');
    setSelectedSubject(null);
    setSelectedClass('11');
    setSelectedChapter(null);
    setSelectedSubtopics(new Set());
    setSelectedChapters([]);
    setSubtopics([]);
    setChapters([]);
    setError(null);
    setTestQuestions([]);
    setCurrentQuestionIndex(0);
    setSelectedAnswers({});
    setShowResults(false);
    setTestConfig({
      testName: '',
      noOfQuestions: 30,
      testDuration: 60,
      difficultyLevel: 'medium',
      examType: 'neet'
    });
  };

  const renderTestConfiguration = () => (
    <Animated.View entering={SlideInUp.duration(400)} style={styles.stepContainer}>
      <TouchableOpacity style={styles.backButton} onPress={() => setCurrentStep('subject')}>
        <ChevronLeft size={20} color={colors.primary} />
        <Text style={[styles.backText, { color: colors.primary }]}>Back to Selection</Text>
      </TouchableOpacity>
      
      <Text style={[styles.stepTitle, { color: colors.text }]}>Configure Your Test</Text>
      <Text style={[styles.stepSubtitle, { color: colors.textSecondary }]}>
        Set up test parameters and preferences
      </Text>

      <ScrollView style={styles.configForm} showsVerticalScrollIndicator={false}>
        {/* Test Name */}
        <View style={styles.configSection}>
          <Text style={[styles.configLabel, { color: colors.text }]}>Test Name</Text>
          <TextInput
            style={[styles.textInput, { backgroundColor: colors.cardBackground, borderColor: colors.border, color: colors.text }]}
            value={testConfig.testName}
            onChangeText={(text) => setTestConfig(prev => ({ ...prev, testName: text }))}
            placeholder="Enter test name"
            placeholderTextColor={colors.textSecondary}
          />
        </View>

        {/* Number of Questions */}
        <View style={styles.configSection}>
          <Text style={[styles.configLabel, { color: colors.text }]}>Number of Questions</Text>
          <View style={styles.numberInputContainer}>
            {[15, 30, 45, 60].map(num => (
              <TouchableOpacity
                key={num}
                style={[
                  styles.numberOption,
                  { 
                    backgroundColor: testConfig.noOfQuestions === num ? colors.primary : colors.cardBackground,
                    borderColor: testConfig.noOfQuestions === num ? colors.primary : colors.border
                  }
                ]}
                onPress={() => setTestConfig(prev => ({ ...prev, noOfQuestions: num }))}
              >
                <Text style={[
                  styles.numberOptionText,
                  { color: testConfig.noOfQuestions === num ? '#fff' : colors.text }
                ]}>
                  {num}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Test Duration */}
        <View style={styles.configSection}>
          <Text style={[styles.configLabel, { color: colors.text }]}>Test Duration (minutes)</Text>
          <View style={styles.numberInputContainer}>
            {[30, 60, 90, 120].map(duration => (
              <TouchableOpacity
                key={duration}
                style={[
                  styles.numberOption,
                  { 
                    backgroundColor: testConfig.testDuration === duration ? colors.primary : colors.cardBackground,
                    borderColor: testConfig.testDuration === duration ? colors.primary : colors.border
                  }
                ]}
                onPress={() => setTestConfig(prev => ({ ...prev, testDuration: duration }))}
              >
                <Text style={[
                  styles.numberOptionText,
                  { color: testConfig.testDuration === duration ? '#fff' : colors.text }
                ]}>
                  {duration}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Difficulty Level */}
        <View style={styles.configSection}>
          <Text style={[styles.configLabel, { color: colors.text }]}>Difficulty Level</Text>
          <View style={styles.optionContainer}>
            {(['easy', 'medium', 'hard'] as const).map(level => (
              <TouchableOpacity
                key={level}
                style={[
                  styles.optionButton,
                  { 
                    backgroundColor: testConfig.difficultyLevel === level ? colors.primary : colors.cardBackground,
                    borderColor: testConfig.difficultyLevel === level ? colors.primary : colors.border
                  }
                ]}
                onPress={() => setTestConfig(prev => ({ ...prev, difficultyLevel: level }))}
              >
                <Text style={[
                  styles.optionButtonText,
                  { color: testConfig.difficultyLevel === level ? '#fff' : colors.text }
                ]}>
                  {level.charAt(0).toUpperCase() + level.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Exam Type */}
        <View style={styles.configSection}>
          <Text style={[styles.configLabel, { color: colors.text }]}>Exam Type</Text>
          <View style={styles.optionContainer}>
            {(['neet', 'aipmt', 'aiims'] as const).map(exam => (
              <TouchableOpacity
                key={exam}
                style={[
                  styles.optionButton,
                  { 
                    backgroundColor: testConfig.examType === exam ? colors.primary : colors.cardBackground,
                    borderColor: testConfig.examType === exam ? colors.primary : colors.border
                  }
                ]}
                onPress={() => setTestConfig(prev => ({ ...prev, examType: exam }))}
              >
                <Text style={[
                  styles.optionButtonText,
                  { color: testConfig.examType === exam ? '#fff' : colors.text }
                ]}>
                  {exam.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>

      <TouchableOpacity
        style={[
          styles.createTestButton,
          { 
            backgroundColor: testConfig.testName.trim() ? colors.success : colors.textSecondary,
            opacity: testConfig.testName.trim() ? 1 : 0.6
          }
        ]}
        onPress={createTest}
        disabled={!testConfig.testName.trim() || loading}
        activeOpacity={0.8}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <BookOpenCheck size={20} color="#fff" />
            <Text style={styles.createTestButtonText}>Create Test</Text>
          </>
        )}
      </TouchableOpacity>
    </Animated.View>
  );

  const renderTestInterface = () => {
    if (testQuestions.length === 0) {
      return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          <View style={styles.emptyTestContainer}>
            <Text style={[styles.emptyTestText, { color: colors.textSecondary }]}>
              No questions available for this test configuration.
            </Text>
            <TouchableOpacity
              style={[styles.backToConfigButton, { backgroundColor: colors.primary }]}
              onPress={() => setCurrentStep('configure')}
            >
              <Text style={styles.backToConfigButtonText}>Back to Configuration</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    if (showResults) {
      const results = calculateResults();
      return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          <ScrollView style={styles.resultsContainer} contentContainerStyle={styles.resultsContent}>
            <Text style={[styles.resultsTitle, { color: colors.text }]}>Test Results</Text>
            
            <View style={[styles.resultsCard, { backgroundColor: colors.cardBackground }]}>
              <View style={styles.resultRow}>
                <Text style={[styles.resultLabel, { color: colors.textSecondary }]}>Score:</Text>
                <Text style={[styles.resultValue, { color: colors.success }]}>
                  {results.correct}/{results.total} ({results.percentage}%)
                </Text>
              </View>
              <View style={styles.resultRow}>
                <Text style={[styles.resultLabel, { color: colors.textSecondary }]}>Attempted:</Text>
                <Text style={[styles.resultValue, { color: colors.text }]}>{results.attempted}</Text>
              </View>
              <View style={styles.resultRow}>
                <Text style={[styles.resultLabel, { color: colors.textSecondary }]}>Correct:</Text>
                <Text style={[styles.resultValue, { color: colors.success }]}>{results.correct}</Text>
              </View>
              <View style={styles.resultRow}>
                <Text style={[styles.resultLabel, { color: colors.textSecondary }]}>Incorrect:</Text>
                <Text style={[styles.resultValue, { color: colors.danger }]}>{results.incorrect}</Text>
              </View>
              <View style={styles.resultRow}>
                <Text style={[styles.resultLabel, { color: colors.textSecondary }]}>Unattempted:</Text>
                <Text style={[styles.resultValue, { color: colors.warning }]}>{results.unattempted}</Text>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.newTestButton, { backgroundColor: colors.primary }]}
              onPress={handleReset}
            >
              <Text style={styles.newTestButtonText}>Create New Test</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      );
    }

    const currentQuestion = testQuestions[currentQuestionIndex];
    const userAnswer = selectedAnswers[currentQuestion.question_id];

    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Test Header */}
        <View style={[styles.testHeader, { backgroundColor: colors.cardBackground, borderBottomColor: colors.border }]}>
          <Text style={[styles.testTitle, { color: colors.text }]}>{testConfig.testName}</Text>
          <View style={styles.testProgress}>
            <Text style={[styles.progressText, { color: colors.textSecondary }]}>
              {currentQuestionIndex + 1} of {testQuestions.length}
            </Text>
            <Timer size={16} color={colors.textSecondary} />
          </View>
        </View>

        <ScrollView style={styles.questionContainer} contentContainerStyle={styles.questionContent}>
          {/* Question */}
          <View style={[styles.questionCard, { backgroundColor: colors.cardBackground }]}>
            <Text style={[styles.questionNumber, { color: colors.primary }]}>
              Question {currentQuestionIndex + 1}
            </Text>
            <Text style={[styles.questionText, { color: colors.text }]}>
              {currentQuestion.question_text}
            </Text>
          </View>

          {/* Options */}
          <View style={styles.optionsContainer}>
            {['option_a', 'option_b', 'option_c', 'option_d'].map((optionKey, index) => {
              const optionValue = currentQuestion[optionKey as keyof TestQuestion] as string;
              const optionLabel = String.fromCharCode(65 + index); // A, B, C, D
              const isSelected = userAnswer === optionValue;

              return (
                <TouchableOpacity
                  key={optionKey}
                  style={[
                    styles.optionCard,
                    { 
                      backgroundColor: isSelected ? colors.primary + '10' : colors.cardBackground,
                      borderColor: isSelected ? colors.primary : colors.border
                    }
                  ]}
                  onPress={() => handleAnswerSelect(currentQuestion.question_id, optionValue)}
                >
                  <Text style={[
                    styles.optionLabel,
                    { color: isSelected ? colors.primary : colors.text }
                  ]}>
                    {optionLabel}.
                  </Text>
                  <Text style={[
                    styles.optionText,
                    { color: isSelected ? colors.primary : colors.text }
                  ]}>
                    {optionValue}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        {/* Navigation Footer */}
        <View style={[styles.testFooter, { backgroundColor: colors.cardBackground, borderTopColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.navButton, currentQuestionIndex === 0 && { opacity: 0.5 }]}
            onPress={handlePreviousQuestion}
            disabled={currentQuestionIndex === 0}
          >
            <ChevronLeft size={20} color={colors.text} />
            <Text style={[styles.navButtonText, { color: colors.text }]}>Previous</Text>
          </TouchableOpacity>

          {currentQuestionIndex === testQuestions.length - 1 ? (
            <TouchableOpacity
              style={[styles.submitButton, { backgroundColor: colors.success }]}
              onPress={handleSubmitTest}
            >
              <Text style={styles.submitButtonText}>Submit Test</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.navButton]}
              onPress={handleNextQuestion}
            >
              <Text style={[styles.navButtonText, { color: colors.text }]}>Next</Text>
              <ChevronRight size={20} color={colors.text} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const renderSubjectSelection = () => (
    <Animated.View entering={FadeIn.duration(600)} style={styles.stepContainer}>
      <Text style={[styles.stepTitle, { color: colors.text }]}>Select a Subject</Text>
      <View style={styles.subjectsGrid}>
        {subjects.map((subject, index) => (
          <Animated.View
            key={subject.id}
            entering={FadeIn.duration(400).delay(index * 100)}
          >
            <TouchableOpacity
              style={[styles.subjectCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
              onPress={() => handleSubjectSelect(subject)}
              activeOpacity={0.8}
            >
              <View style={styles.subjectContent}>
                <View style={[styles.subjectIcon, { backgroundColor: subject.color + '20' }]}>
                  {subject.icon}
                </View>
                <Text style={[styles.subjectName, { color: colors.text }]}>{subject.name}</Text>
                <ChevronRight size={20} color={subject.color} />
              </View>
            </TouchableOpacity>
          </Animated.View>
        ))}
      </View>
    </Animated.View>
  );

  const renderClassSelection = () => (
    <Animated.View entering={SlideInUp.duration(400)} style={styles.stepContainer}>
      <TouchableOpacity style={styles.backButton} onPress={() => setCurrentStep('subject')}>
        <ChevronLeft size={20} color={colors.primary} />
        <Text style={[styles.backText, { color: colors.primary }]}>Back to Subjects</Text>
      </TouchableOpacity>
      
      <Text style={[styles.stepTitle, { color: colors.text }]}>
        Select Class for {selectedSubject?.name}
      </Text>
      
      <View style={styles.classContainer}>
        {(['11', '12'] as ClassType[]).map((classType) => (
          <TouchableOpacity
            key={classType}
            style={[
              styles.classCard,
              { 
                backgroundColor: selectedClass === classType ? colors.primary : colors.cardBackground,
                borderColor: selectedClass === classType ? colors.primary : colors.border
              }
            ]}
            onPress={() => handleClassSelect(classType)}
            activeOpacity={0.8}
          >
            <Text style={[
              styles.classText,
              { color: selectedClass === classType ? '#fff' : colors.text }
            ]}>
              Class {classType}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </Animated.View>
  );

  const renderChapterSelection = () => (
    <Animated.View entering={SlideInUp.duration(400)} style={styles.stepContainer}>
      <TouchableOpacity style={styles.backButton} onPress={() => setCurrentStep('class')}>
        <ChevronLeft size={20} color={colors.primary} />
        <Text style={[styles.backText, { color: colors.primary }]}>Back to Class Selection</Text>
      </TouchableOpacity>
      
      <Text style={[styles.stepTitle, { color: colors.text }]}>
        {selectedSubject?.name} - Class {selectedClass}
      </Text>
      <Text style={[styles.stepSubtitle, { color: colors.textSecondary }]}>
        {chapters.length} chapters available
      </Text>
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading chapters...</Text>
        </View>
      ) : error ? (
        <View style={[styles.errorContainer, { backgroundColor: colors.danger + '20' }]}>
          <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.danger }]}
            onPress={() => selectedSubject && fetchChapters(selectedSubject, selectedClass)}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.chaptersContainer}>
          {chapters.map((chapter, index) => (
            <Animated.View
              key={chapter.ID}
              entering={FadeIn.duration(300).delay(index * 50)}
            >
              <TouchableOpacity
                style={[styles.chapterCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
                onPress={() => handleChapterSelect(chapter)}
                activeOpacity={0.8}
              >
                <View style={styles.chapterContent}>
                  <BookOpen size={20} color={colors.primary} />
                  <View style={styles.chapterInfo}>
                    <Text style={[styles.chapterName, { color: colors.text }]}>{chapter.chapter_name}</Text>
                    <Text style={[styles.questionCount, { color: colors.textSecondary }]}>
                      {chapter.mw_total_question + chapter.pyq_total_question} Questions
                    </Text>
                  </View>
                  <ChevronRight size={20} color={colors.textSecondary} />
                </View>
              </TouchableOpacity>
            </Animated.View>
          ))}
        </View>
      )}
    </Animated.View>
  );

  const renderSubtopicSelection = () => (
    <Animated.View entering={SlideInUp.duration(400)} style={styles.stepContainer}>
      <TouchableOpacity style={styles.backButton} onPress={() => setCurrentStep('chapters')}>
        <ChevronLeft size={20} color={colors.primary} />
        <Text style={[styles.backText, { color: colors.primary }]}>Back to Chapters</Text>
      </TouchableOpacity>
      
      <Text style={[styles.stepTitle, { color: colors.text }]}>
        {selectedChapter?.chapter_name}
      </Text>
      <View style={styles.subtopicHeader}>
        <Text style={[styles.stepSubtitle, { color: colors.textSecondary }]}>
          {selectedSubtopics.size} of {subtopics.length} subtopics selected
        </Text>
        <TouchableOpacity onPress={handleSelectAllSubtopics} style={styles.selectAllButton}>
          <Text style={[styles.selectAllText, { color: colors.primary }]}>
            {selectedSubtopics.size === subtopics.length ? 'Deselect All' : 'Select All'}
          </Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.subtopicsContainer}>
        {subtopics.map((subtopic, index) => (
          <Animated.View
            key={subtopic.id}
            entering={FadeIn.duration(300).delay(index * 50)}
          >
            <TouchableOpacity
              style={[
                styles.subtopicCard,
                { 
                  backgroundColor: selectedSubtopics.has(subtopic.id) ? colors.primary + '10' : colors.cardBackground,
                  borderColor: selectedSubtopics.has(subtopic.id) ? colors.primary : colors.border
                }
              ]}
              onPress={() => handleSubtopicToggle(subtopic.id)}
              activeOpacity={0.8}
            >
              <View style={styles.subtopicContent}>
                {selectedSubtopics.has(subtopic.id) ? (
                  <CheckSquare size={20} color={colors.primary} />
                ) : (
                  <Square size={20} color={colors.textSecondary} />
                )}
                <View style={styles.subtopicInfo}>
                  <Text style={[
                    styles.subtopicName,
                    { 
                      color: selectedSubtopics.has(subtopic.id) ? colors.primary : colors.text,
                      fontFamily: selectedSubtopics.has(subtopic.id) ? 'Inter-Medium' : 'Inter-Regular'
                    }
                  ]}>
                    {subtopic.name}
                  </Text>
                  <Text style={[styles.subtopicQuestionCount, { color: colors.textSecondary }]}>
                    {subtopic.questionCount} questions
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          </Animated.View>
        ))}
      </View>
      
      {selectedSubtopics.size > 0 && (
        <Animated.View entering={SlideInUp.duration(300)} style={styles.actionContainer}>
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: colors.primary }]}
            onPress={handleAddToTest}
            activeOpacity={0.8}
          >
            <Text style={styles.addButtonText}>Add to Test ({selectedSubtopics.size} subtopics)</Text>
          </TouchableOpacity>
        </Animated.View>
      )}
    </Animated.View>
  );

  const renderSelectedChapters = () => {
    if (selectedChapters.length === 0) return null;

    const totalQuestions = selectedChapters.reduce((sum, selection) => 
      sum + selection.chapter.mw_total_question + selection.chapter.pyq_total_question, 0
    );

    return (
      <Animated.View entering={FadeIn.duration(600)} style={styles.selectedContainer}>
        <View style={styles.selectedHeader}>
          <View>
            <Text style={[styles.selectedTitle, { color: colors.text }]}>Selected for Test</Text>
            <Text style={[styles.selectedStats, { color: colors.textSecondary }]}>
              {selectedChapters.length} chapters • ~{totalQuestions} questions
            </Text>
          </View>
          <TouchableOpacity onPress={handleReset} style={styles.resetButton}>
            <RotateCcw size={16} color={colors.textSecondary} />
            <Text style={[styles.resetText, { color: colors.textSecondary }]}>Reset</Text>
          </TouchableOpacity>
        </View>
        
        {selectedChapters.map((selection, index) => (
          <Animated.View
            key={index}
            entering={FadeIn.duration(300).delay(index * 100)}
            style={[styles.selectedChapterCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
          >
            <View style={styles.selectedChapterContent}>
              <View style={styles.selectedChapterInfo}>
                <Text style={[styles.selectedSubject, { color: colors.text }]}>
                  {selection.subjectName} - Class {selection.classType}
                </Text>
                <Text style={[styles.selectedChapterName, { color: colors.textSecondary }]}>
                  {selection.chapter.chapter_name}
                </Text>
                <Text style={[styles.selectedSubtopics, { color: colors.textSecondary }]}>
                  {selection.subtopics.length} subtopics selected
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => handleRemoveChapter(index)}
                style={styles.removeButton}
              >
                <Text style={[styles.removeButtonText, { color: colors.danger }]}>Remove</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        ))}
        
        <TouchableOpacity
          style={[styles.configureTestButton, { backgroundColor: colors.primary }]}
          onPress={handleConfigureTest}
          activeOpacity={0.8}
        >
          <Settings size={20} color="#fff" />
          <Text style={styles.configureTestButtonText}>Configure Test</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  if (currentStep === 'test') {
    return renderTestInterface();
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {renderSelectedChapters()}
        
        {currentStep === 'subject' && renderSubjectSelection()}
        {currentStep === 'class' && renderClassSelection()}
        {currentStep === 'chapters' && renderChapterSelection()}
        {currentStep === 'subtopics' && renderSubtopicSelection()}
        {currentStep === 'configure' && renderTestConfiguration()}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  stepContainer: {
    marginBottom: 24,
  },
  stepTitle: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  stepSubtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    marginBottom: 24,
  },
  subtopicHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  selectAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  selectAllText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    alignSelf: 'flex-start',
  },
  backText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    marginLeft: 8,
  },
  subjectsGrid: {
    gap: 16,
  },
  subjectCard: {
    borderRadius: 16,
    borderWidth: 1,
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
      web: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
    }),
  },
  subjectContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  subjectIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  subjectName: {
    flex: 1,
    fontSize: 18,
    fontFamily: 'Inter-Medium',
  },
  classContainer: {
    flexDirection: 'row',
    gap: 16,
  },
  classCard: {
    flex: 1,
    paddingVertical: 20,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  classText: {
    fontSize: 18,
    fontFamily: 'Inter-Medium',
  },
  loadingContainer: {
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
    gap: 12,
  },
  chapterCard: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  chapterContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  chapterInfo: {
    flex: 1,
    marginLeft: 12,
  },
  chapterName: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    marginBottom: 4,
  },
  questionCount: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
  },
  subtopicsContainer: {
    gap: 12,
    marginBottom: 24,
  },
  subtopicCard: {
    borderRadius: 12,
    borderWidth: 2,
    overflow: 'hidden',
  },
  subtopicContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  subtopicInfo: {
    flex: 1,
    marginLeft: 12,
  },
  subtopicName: {
    fontSize: 16,
    marginBottom: 4,
  },
  subtopicQuestionCount: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
  },
  actionContainer: {
    marginTop: 16,
  },
  addButton: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Inter-Medium',
  },
  selectedContainer: {
    marginBottom: 32,
  },
  selectedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  selectedTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    marginBottom: 4,
  },
  selectedStats: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  resetText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    marginLeft: 4,
  },
  selectedChapterCard: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    overflow: 'hidden',
  },
  selectedChapterContent: {
    flexDirection: 'row',
    padding: 16,
  },
  selectedChapterInfo: {
    flex: 1,
  },
  selectedSubject: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    marginBottom: 4,
  },
  selectedChapterName: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    marginBottom: 4,
  },
  selectedSubtopics: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    lineHeight: 16,
  },
  removeButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  removeButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  configureTestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 16,
  },
  configureTestButtonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    marginLeft: 8,
  },
  configForm: {
    flex: 1,
    marginBottom: 24,
  },
  configSection: {
    marginBottom: 24,
  },
  configLabel: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    marginBottom: 12,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
  },
  numberInputContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  numberOption: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  numberOptionText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
  },
  optionContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  optionButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  optionButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  createTestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  createTestButtonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Inter-Medium',
  },
  testHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  testTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
  },
  testProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  questionContainer: {
    flex: 1,
  },
  questionContent: {
    padding: 16,
  },
  questionCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  questionNumber: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    marginBottom: 12,
  },
  questionText: {
    fontSize: 18,
    fontFamily: 'Inter-Regular',
    lineHeight: 26,
  },
  optionsContainer: {
    gap: 12,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
  },
  optionLabel: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    marginRight: 12,
    minWidth: 24,
  },
  optionText: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    lineHeight: 22,
  },
  testFooter: {
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
    gap: 4,
  },
  navButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
  },
  submitButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Inter-Medium',
  },
  resultsContainer: {
    flex: 1,
  },
  resultsContent: {
    padding: 16,
    alignItems: 'center',
  },
  resultsTitle: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    marginBottom: 32,
    textAlign: 'center',
  },
  resultsCard: {
    width: '100%',
    borderRadius: 16,
    padding: 24,
    marginBottom: 32,
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  resultLabel: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
  },
  resultValue: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
  },
  newTestButton: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  newTestButtonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Inter-Medium',
  },
  emptyTestContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTestText: {
    fontSize: 18,
    fontFamily: 'Inter-Medium',
    textAlign: 'center',
    marginBottom: 24,
  },
  backToConfigButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  backToConfigButtonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Inter-Medium',
  },
});