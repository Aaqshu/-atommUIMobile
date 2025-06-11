import React from 'react';
import { Platform, Text, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

type MathRendererProps = {
  content: string;
  color?: string;
};

export default function MathRenderer({ content, color = '#000' }: MathRendererProps) {
  // For web platform, render as regular text with basic formatting
  if (Platform.OS === 'web') {
    return (
      <Text style={[styles.mathText, { color }]}>
        {content}
      </Text>
    );
  }

  // For mobile platforms, use WebView with MathJax
  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <script src="https://polyfill.io/v3/polyfill.min.js?features=es6"></script>
        <script id="MathJax-script" async src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js"></script>
        <style>
          body {
            margin: 0;
            padding: 8px;
            color: ${color};
            font-size: 16px;
            line-height: 1.5;
            font-family: 'Inter-Regular', -apple-system, BlinkMacSystemFont, sans-serif;
          }
          .math-content {
            word-wrap: break-word;
          }
        </style>
      </head>
      <body>
        <div class="math-content">${content}</div>
      </body>
    </html>
  `;

  return (
    <WebView
      source={{ html: htmlContent }}
      style={styles.webView}
      scrollEnabled={false}
      showsVerticalScrollIndicator={false}
      showsHorizontalScrollIndicator={false}
      onMessage={() => {}}
    />
  );
}

const styles = StyleSheet.create({
  mathText: {
    fontSize: 16,
    lineHeight: 24,
    fontFamily: 'Inter-Regular',
  },
  webView: {
    flex: 1,
    backgroundColor: 'transparent',
    minHeight: 40,
  },
});