import React from 'react';
import { Platform, Text, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

type MathRendererProps = {
  content: string;
  color?: string;
};

function hasMathDelimiters(str: string) {
  return /\$[^$]+\$|\$\$[\s\S]+\$\$|\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\)/.test(str);
}

export default function MathRenderer({ content, color = '#000' }: MathRendererProps) {
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
    fontSize: 16,
    lineHeight: 24,
    fontFamily: 'Inter-Regular',
  },
  webView: {
    minHeight: 40,
    flexShrink: 1,
    backgroundColor: 'transparent',
  },
});