import React from 'react';
import { Image, Text } from 'react-native';

/**
 * Processes question, option, or solution text to replace LaTeX image commands with Cloudinary image URLs.
 * Supports both web (<img>) and native (<Image>) rendering. Always places images on a new line.
 *
 * @param text - The input text (may contain LaTeX image commands)
 * @param subjectId - The subject ID (e.g., 'physics')
 * @param chapterId - The chapter ID (e.g., 'mechanics')
 * @param platform - 'web' or 'native'
 * @returns Processed string (web) or ReactNode[] (native)
 */
export function processQuestionContent(
  text: string,
  subjectId: string,
  chapterId: string,
  platform: 'web' | 'native'
): string | React.ReactNode[] {
  if (!text) return platform === 'web' ? '' : [];

  const BASE_URL = 'https://res.cloudinary.com/dbnprdefl/image/upload';
  const folder = `${subjectId.toLowerCase()}_${chapterId.toLowerCase()}`;

  // Helper to process image name
  function getImageName(raw: string) {
    let name = raw.trim();
    if (!name.toLowerCase().endsWith('.jpg')) name += '.jpg';
    // Allow a-z, A-Z, 0-9, _, ., -, (, )
    name = name.replace(/[^a-zA-Z0-9_.()\-]/g, '');
    return name;
  }

  // Combined regex for all LaTeX image commands (double-escaped for TS)
  const combinedRegex = /\\\begin\{center\}\\\includegraphics\[.*?\]\{(.*?)\}\\\end\{center\}|\\\includegraphics\[.*?\]\{(.*?)\}|\\\includegraphics\[max width=\\textwidth\]\{(.*?)\}/g;

  let result: (string | React.ReactNode)[] = [];
  let lastIndex = 0;
  let idx = 0;
  let m: RegExpExecArray | null;
  while ((m = combinedRegex.exec(text)) !== null) {
    // Get the image name from the first non-null group
    const imageName = getImageName(m[1] || m[2] || m[3] || '');
    const url = `${BASE_URL}/${folder}/${imageName}`;
    // Push text before the image
    if (m.index > lastIndex) {
      const before = text.slice(lastIndex, m.index);
      if (platform === 'web') {
        result.push(before);
      } else {
        result.push(<Text key={`text-${idx}`}>{before}</Text>);
      }
      idx++;
    }
    // Push the image (always on a new line)
    if (platform === 'web') {
      result.push(`<br/><img src='${url}' class='max-w-full h-auto mt-4 rounded-lg shadow-md' loading='lazy' /><br/>`);
    } else {
      result.push(
        <Image
          key={`img-${idx}`}
          source={{ uri: url }}
          style={{ width: '100%', height: 200, marginTop: 12, borderRadius: 12 }}
          resizeMode="contain"
        />
      );
    }
    lastIndex = m.index + m[0].length;
    idx++;
  }
  // Push any remaining text
  if (lastIndex < text.length) {
    const after = text.slice(lastIndex);
    if (platform === 'web') {
      result.push(after);
    } else {
      result.push(<Text key={`text-end`}>{after}</Text>);
    }
  }

  if (platform === 'web') {
    return result.join('');
  } else {
    return result;
  }
} 