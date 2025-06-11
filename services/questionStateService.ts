import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

export type QuestionStatus = 'new' | 'seen' | 'attempted';

export type QuestionState = {
  questionId: string;
  status: QuestionStatus;
  selectedOption?: string;
  isCorrect?: boolean;
  isBookmarked?: boolean;
  timestamp: number;
};

export type QuestionStateData = {
  [questionId: string]: QuestionState;
};

// Storage keys for different sections
const getStorageKey = (type: 'most-wanted' | 'previous-year', subjectId: string, chapterId: string) => {
  return `question_states_${type}_${subjectId}_${chapterId}`;
};

// Platform-specific storage functions
const storeData = async (key: string, value: string) => {
  if (Platform.OS === 'web') {
    localStorage.setItem(key, value);
  } else {
    await AsyncStorage.setItem(key, value);
  }
};

const getData = async (key: string): Promise<string | null> => {
  if (Platform.OS === 'web') {
    return localStorage.getItem(key);
  } else {
    return await AsyncStorage.getItem(key);
  }
};

export class QuestionStateService {
  // Get all question states for a specific section/subject/chapter
  static async getQuestionStates(
    type: 'most-wanted' | 'previous-year',
    subjectId: string,
    chapterId: string
  ): Promise<QuestionStateData> {
    try {
      const key = getStorageKey(type, subjectId, chapterId);
      const data = await getData(key);
      
      if (data) {
        return JSON.parse(data);
      }
      
      return {};
    } catch (error) {
      console.error('Error getting question states:', error);
      return {};
    }
  }

  // Update a single question's state
  static async updateQuestionState(
    type: 'most-wanted' | 'previous-year',
    subjectId: string,
    chapterId: string,
    questionId: string,
    status: QuestionStatus,
    selectedOption?: string,
    isCorrect?: boolean
  ): Promise<void> {
    try {
      const key = getStorageKey(type, subjectId, chapterId);
      const existingStates = await this.getQuestionStates(type, subjectId, chapterId);
      
      const currentState = existingStates[questionId];
      
      const questionState: QuestionState = {
        questionId,
        status,
        selectedOption,
        isCorrect,
        isBookmarked: currentState?.isBookmarked || false, // Preserve bookmark status
        timestamp: Date.now()
      };
      
      const updatedStates = {
        ...existingStates,
        [questionId]: questionState
      };
      
      await storeData(key, JSON.stringify(updatedStates));
    } catch (error) {
      console.error('Error updating question state:', error);
    }
  }

  // Toggle bookmark status for a question
  static async toggleBookmark(
    type: 'most-wanted' | 'previous-year',
    subjectId: string,
    chapterId: string,
    questionId: string
  ): Promise<boolean> {
    try {
      const key = getStorageKey(type, subjectId, chapterId);
      const existingStates = await this.getQuestionStates(type, subjectId, chapterId);
      
      const currentState = existingStates[questionId];
      const newBookmarkStatus = !currentState?.isBookmarked;
      
      const questionState: QuestionState = {
        questionId,
        status: currentState?.status || 'new',
        selectedOption: currentState?.selectedOption,
        isCorrect: currentState?.isCorrect,
        isBookmarked: newBookmarkStatus,
        timestamp: Date.now()
      };
      
      const updatedStates = {
        ...existingStates,
        [questionId]: questionState
      };
      
      await storeData(key, JSON.stringify(updatedStates));
      return newBookmarkStatus;
    } catch (error) {
      console.error('Error toggling bookmark:', error);
      return false;
    }
  }

  // Get all bookmarked questions for a specific section/subject/chapter
  static async getBookmarkedQuestions(
    type: 'most-wanted' | 'previous-year',
    subjectId: string,
    chapterId: string
  ): Promise<string[]> {
    try {
      const states = await this.getQuestionStates(type, subjectId, chapterId);
      return Object.values(states)
        .filter(state => state.isBookmarked)
        .map(state => state.questionId);
    } catch (error) {
      console.error('Error getting bookmarked questions:', error);
      return [];
    }
  }

  // Get a specific question's state
  static async getQuestionState(
    type: 'most-wanted' | 'previous-year',
    subjectId: string,
    chapterId: string,
    questionId: string
  ): Promise<QuestionState | null> {
    try {
      const states = await this.getQuestionStates(type, subjectId, chapterId);
      return states[questionId] || null;
    } catch (error) {
      console.error('Error getting question state:', error);
      return null;
    }
  }

  // Check if a question is bookmarked
  static async isQuestionBookmarked(
    type: 'most-wanted' | 'previous-year',
    subjectId: string,
    chapterId: string,
    questionId: string
  ): Promise<boolean> {
    try {
      const state = await this.getQuestionState(type, subjectId, chapterId, questionId);
      return state?.isBookmarked || false;
    } catch (error) {
      console.error('Error checking bookmark status:', error);
      return false;
    }
  }

  // Mark question as seen (when user views the question)
  static async markQuestionAsSeen(
    type: 'most-wanted' | 'previous-year',
    subjectId: string,
    chapterId: string,
    questionId: string
  ): Promise<void> {
    const existingState = await this.getQuestionState(type, subjectId, chapterId, questionId);
    
    // Only update to 'seen' if it's currently 'new'
    if (!existingState || existingState.status === 'new') {
      await this.updateQuestionState(type, subjectId, chapterId, questionId, 'seen');
    }
  }

  // Mark question as attempted (when user checks answer)
  static async markQuestionAsAttempted(
    type: 'most-wanted' | 'previous-year',
    subjectId: string,
    chapterId: string,
    questionId: string,
    selectedOption: string,
    isCorrect: boolean
  ): Promise<void> {
    await this.updateQuestionState(
      type, 
      subjectId, 
      chapterId, 
      questionId, 
      'attempted', 
      selectedOption, 
      isCorrect
    );
  }

  // Get statistics for a chapter
  static async getChapterStats(
    type: 'most-wanted' | 'previous-year',
    subjectId: string,
    chapterId: string
  ): Promise<{
    total: number;
    new: number;
    seen: number;
    attempted: number;
    correct: number;
    incorrect: number;
    bookmarked: number;
  }> {
    try {
      const states = await this.getQuestionStates(type, subjectId, chapterId);
      const stateValues = Object.values(states);
      
      const stats = {
        total: 0, // Will be set from actual questions count
        new: 0,
        seen: 0,
        attempted: 0,
        correct: 0,
        incorrect: 0,
        bookmarked: 0
      };
      
      stateValues.forEach(state => {
        if (state.isBookmarked) {
          stats.bookmarked++;
        }
        
        switch (state.status) {
          case 'new':
            stats.new++;
            break;
          case 'seen':
            stats.seen++;
            break;
          case 'attempted':
            stats.attempted++;
            if (state.isCorrect === true) {
              stats.correct++;
            } else if (state.isCorrect === false) {
              stats.incorrect++;
            }
            break;
        }
      });
      
      return stats;
    } catch (error) {
      console.error('Error getting chapter stats:', error);
      return {
        total: 0,
        new: 0,
        seen: 0,
        attempted: 0,
        correct: 0,
        incorrect: 0,
        bookmarked: 0
      };
    }
  }

  // Clear all states for a specific section (useful for testing or reset)
  static async clearQuestionStates(
    type: 'most-wanted' | 'previous-year',
    subjectId: string,
    chapterId: string
  ): Promise<void> {
    try {
      const key = getStorageKey(type, subjectId, chapterId);
      if (Platform.OS === 'web') {
        localStorage.removeItem(key);
      } else {
        await AsyncStorage.removeItem(key);
      }
    } catch (error) {
      console.error('Error clearing question states:', error);
    }
  }

  // Get all stored question states (for debugging or analytics)
  static async getAllStoredStates(): Promise<{ [key: string]: QuestionStateData }> {
    try {
      const allStates: { [key: string]: QuestionStateData } = {};
      
      if (Platform.OS === 'web') {
        // For web, iterate through localStorage
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('question_states_')) {
            const data = localStorage.getItem(key);
            if (data) {
              allStates[key] = JSON.parse(data);
            }
          }
        }
      } else {
        // For mobile, get all AsyncStorage keys
        const keys = await AsyncStorage.getAllKeys();
        const questionStateKeys = keys.filter(key => key.startsWith('question_states_'));
        
        for (const key of questionStateKeys) {
          const data = await AsyncStorage.getItem(key);
          if (data) {
            allStates[key] = JSON.parse(data);
          }
        }
      }
      
      return allStates;
    } catch (error) {
      console.error('Error getting all stored states:', error);
      return {};
    }
  }

  // Get all bookmarked questions across all subjects and chapters
  static async getAllBookmarkedQuestions(): Promise<{
    [key: string]: {
      type: 'most-wanted' | 'previous-year';
      subjectId: string;
      chapterId: string;
      questionIds: string[];
    }
  }> {
    try {
      const allStates = await this.getAllStoredStates();
      const bookmarkedBySection: { [key: string]: any } = {};
      
      Object.entries(allStates).forEach(([storageKey, states]) => {
        const bookmarkedQuestions = Object.values(states)
          .filter(state => state.isBookmarked)
          .map(state => state.questionId);
          
        if (bookmarkedQuestions.length > 0) {
          // Parse storage key to extract type, subjectId, chapterId
          const keyParts = storageKey.replace('question_states_', '').split('_');
          const type = keyParts[0] as 'most-wanted' | 'previous-year';
          const subjectId = keyParts[1];
          const chapterId = keyParts[2];
          
          bookmarkedBySection[storageKey] = {
            type,
            subjectId,
            chapterId,
            questionIds: bookmarkedQuestions
          };
        }
      });
      
      return bookmarkedBySection;
    } catch (error) {
      console.error('Error getting all bookmarked questions:', error);
      return {};
    }
  }
}