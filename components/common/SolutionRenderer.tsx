import React from 'react';
import { ScrollView, View, Image, Text, StyleSheet } from 'react-native';
import MathRenderer from './MathRenderer';

interface SolutionRendererProps {
  content: string;
  color?: string;
  subjectId?: string;
  chapterId?: string;
  maxHeight?: number;
}

// Helper to split into image and non-image segments (same as in MathRenderer)
export function splitIntoImageAndOtherSegments(text: string, subjectId?: string, chapterId?: string) {
  if (!text || !subjectId || !chapterId) return [{ type: 'other', content: text }];
  const BASE_URL = 'https://res.cloudinary.com/dbnprdefl/image/upload';
  const folder = `${subjectId.toLowerCase()}_${chapterId.toLowerCase()}`;
  const combinedRegex = /\\begin\{center\}\\includegraphics(?:\[.*?\])?\{(.*?)\}\\end\{center\}|\\includegraphics(?:\[.*?\])?\{(.*?)\}/g;
  let segments: { type: 'image' | 'other'; content: string }[] = [];
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = combinedRegex.exec(text)) !== null) {
    // Text before image
    if (m.index > lastIndex) {
      segments.push({ type: 'other', content: text.slice(lastIndex, m.index) });
    }
    // Image segment
    const imageNameRaw = m[1] || m[2] || '';
    let name = imageNameRaw.trim();
    if (!name.toLowerCase().endsWith('.jpg')) name += '.jpg';
    name = name.replace(/[^a-zA-Z0-9_.()\-]/g, '');
    const url = `${BASE_URL}/${folder}/${name}`;
    segments.push({ type: 'image', content: url });
    lastIndex = m.index + m[0].length;
  }
  // Remaining text
  if (lastIndex < text.length) {
    segments.push({ type: 'other', content: text.slice(lastIndex) });
  }
  return segments;
}

const styles = StyleSheet.create({
  scroll: {
    // maxHeight: 500,
    paddingBottom: 8,
  },
  image: {
    width: '100%',
    height: 220,
    marginVertical: 16,
    borderRadius: 12,
  },
  mathBlock: {
    marginBottom: 8,
    //  maxHeight: 800,
    height: 500,
    // backgroundColor: 'red',
    // overflow: 'scroll',
  },
});

const SolutionRenderer: React.FC<SolutionRendererProps> = ({ content, color = '#000', subjectId, chapterId, maxHeight = 500 }) => {
  const segments = splitIntoImageAndOtherSegments(content, subjectId, chapterId);
  return (
    <ScrollView style={[styles.scroll, { maxHeight }]} contentContainerStyle={{ paddingBottom: 8 }}>
      {segments.map((seg, idx) =>
        seg.type === 'image' ? (
          <Image key={`img-${idx}`} source={{ uri: seg.content }} style={styles.image} resizeMode="contain" />
        ) : (
          <View key={`math-${idx}`} style={styles.mathBlock}>
            <MathRenderer content={seg.content} color={color} subjectId={subjectId} chapterId={chapterId} skipImageParse={true} />
          </View>
        )
      )}
    </ScrollView>
  );
};

export default SolutionRenderer; 