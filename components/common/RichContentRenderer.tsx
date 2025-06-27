import React from 'react';
import { Platform, Text, StyleProp, TextStyle } from 'react-native';
import { processQuestionContent } from './processQuestionContent';

interface RichContentRendererProps {
  content: string;
  subjectId: string;
  chapterId: string;
  color?: string;
  style?: StyleProp<TextStyle>;
}

const RichContentRenderer: React.FC<RichContentRendererProps> = ({ content, subjectId, chapterId, color = '#000', style }) => {
  if (Platform.OS === 'web') {
    const processed = processQuestionContent(content, subjectId, chapterId, 'web') as string;
    return (
      <div
        style={{ color, ...(style as React.CSSProperties) }}
        dangerouslySetInnerHTML={{ __html: processed }}
      />
    );
  } else {
    const processed = processQuestionContent(content, subjectId, chapterId, 'native') as React.ReactNode[];
    return (
      <Text style={[{ color }, style as StyleProp<TextStyle>]}>
        {processed}
      </Text>
    );
  }
};

export default RichContentRenderer; 