import React from 'react';
import { Platform, Text, StyleSheet, Image, View } from 'react-native';
import { WebView } from 'react-native-webview';

type MathRendererProps = {
  content: string;
  color?: string;
  subjectId?: string;
  chapterId?: string;
  skipImageParse?: boolean;
};

function hasMathDelimiters(str: string) {
  return /\$[^$]+\$|\$\$[\s\S]+\$\$|\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\)/.test(str);
}

// Helper to split into image and non-image segments
function splitIntoImageAndOtherSegments(text: string, subjectId?: string, chapterId?: string) {
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

function MathRenderer({ content, color = '#000', subjectId, chapterId, skipImageParse }: MathRendererProps) {
  // Only split for images if not skipping (prevents infinite recursion)
console.log("content",content)
  if (!skipImageParse) {
    const segments = splitIntoImageAndOtherSegments(content, subjectId, chapterId);
    if (segments.length > 1 || (segments.length === 1 && segments[0].type === 'image')) {
      return (
        <View>
          {segments.map((seg, idx) =>
            seg.type === 'image'
              ? (
                  <React.Fragment key={`imgfrag-${idx}`}>
                    <Image source={{ uri: seg.content }} style={{ width: '100%', height: 220, marginVertical: 12, borderRadius: 12 }} resizeMode="contain" />
                    <View style={{ minHeight: 1, marginBottom: 16 }} />
                  </React.Fragment>
                )
              : <MathRenderer key={`math-${idx}`} content={seg.content} color={color} subjectId={subjectId} chapterId={chapterId} skipImageParse={true} />
          )}
        </View>
      );
    }
  }

  let mathContent = content || '';
  if (!hasMathDelimiters(mathContent)) {
    mathContent = `\\[${mathContent}\\]`;
  }

  if (Platform.OS === 'web') {
    return (
      <Text style={[styles.mathText, { color }]}>{content}</Text>
    );
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <script type="text/x-mathjax-config">
          MathJax.Hub.Config({
            tex2jax: {
              inlineMath: [['$','$'], ['\\(','\\)']],
              displayMath: [['$$','$$'], ['\\[','\\]']],
              processEscapes: true
            },
            showMathMenu: false,
            messageStyle: 'none'
          });
        </script>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/mathjax/2.7.9/MathJax.js?config=TeX-AMS_HTML"></script>
        <style>
          body {
            margin: 0;
            padding: 8px;
            color: ${color};
            font-size: 15px;
            line-height: 1.1;
            font-family: 'Inter-Regular', -apple-system, BlinkMacSystemFont, sans-serif;
          }
          .math-content {
            word-wrap: break-word;
          }
        </style>
      </head>
      <body>
        <div class="math-content">${mathContent}</div>
        <script type="text/javascript">
          if (window.MathJax) {
            MathJax.Hub.Queue(['Typeset', MathJax.Hub]);
          }
        </script>
      </body>
    </html>
  `;

  return (
    <WebView
      key={mathContent}
      source={{ html: htmlContent }}
      style={styles.webView}
      scrollEnabled={false}
      showsVerticalScrollIndicator={false}
      showsHorizontalScrollIndicator={false}
      originWhitelist={['*']}
      javaScriptEnabled={true}
      domStorageEnabled={true}
      automaticallyAdjustContentInsets={false}
      useWebKit={true}
      startInLoadingState={true}
      onMessage={() => {}}
    />
  );
}

const styles = StyleSheet.create({
  mathText: {
    fontSize: 18,
    lineHeight: 24,
    fontFamily: 'Inter-Regular',
  },
  webView: {
    minHeight: 40,
    maxHeight: 250,
    overflow: 'scroll',
    height: 60,
    flexShrink: 1,
    backgroundColor: 'transparent',
  },
});

function areEqual(prevProps: MathRendererProps, nextProps: MathRendererProps) {
  return (
    prevProps.content === nextProps.content &&
    prevProps.color === nextProps.color &&
    prevProps.subjectId === nextProps.subjectId &&
    prevProps.chapterId === nextProps.chapterId &&
    prevProps.skipImageParse === nextProps.skipImageParse
  );
}

const MemoizedMathRenderer = React.memo(MathRenderer, areEqual);

export default MemoizedMathRenderer;