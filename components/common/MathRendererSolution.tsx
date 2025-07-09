import React from 'react';
import { Platform, Text } from 'react-native';
import { WebView } from 'react-native-webview';

type MathRendererSolutionProps = {
  content: string;
  color?: string;
  fontSize?: number;
  minHeight?: number;
  maxHeight?: number;
};

function cleanLatex(str: string) {
  if (!str) return '';
  // Remove all $ symbols and trim whitespace
  let cleaned = str.replace(/\$/g, '').trim();
  // Replace all quadruple backslashes (\\\\) with double backslash (\\)
  cleaned = cleaned.replace(/\\\\/g, '\\');
  // Replace all double backslashes (\\) with double backslash (\\) (idempotent, for clarity)
  cleaned = cleaned.replace(/\\/g, '\\');
  return cleaned;
}

const MathRendererSolution: React.FC<MathRendererSolutionProps> = ({
  content,
  color = '#334155',
  fontSize = 22,
  minHeight = 100,
  maxHeight = 300,
}) => {
  if (!content) return null;

  let mathContent = content.trim();
  // If content contains '\begin', wrap with $...$
  if (mathContent.includes('\\begin{array')) {
    // Only wrap if not already wrapped with $...$
    if (!(mathContent.startsWith('$') && mathContent.endsWith('$'))) {
      mathContent = `$${mathContent}$`;
    }
  } else {
    // Otherwise, use the original delimiter logic
    const hasDelimiters =
      (mathContent.startsWith('$$') && mathContent.endsWith('$$')) ||
      (mathContent.startsWith('\\[') && mathContent.endsWith('\\]')) ||
      (mathContent.startsWith('$') && mathContent.endsWith('$')) ||
      (mathContent.startsWith('\\(') && mathContent.endsWith('\\)'));
    if (!hasDelimiters) {
      mathContent = `${mathContent}`;
    }
  }
  console.log('MathRendererSolution mathContent:', mathContent);

  if (Platform.OS === 'web') {
    return (
      <Text style={{ color, fontSize, lineHeight: fontSize * 1.4, minHeight }}>
        {mathContent}
      </Text>
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
             "HTML-CSS": {
            linebreaks: { automatic: true },
            scale: 100
            },
             SVG: {
            linebreaks: { automatic: true }
            },
            showMathMenu: false,
            messageStyle: 'none'
          });
        </script>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/mathjax/2.7.9/MathJax.js?config=TeX-AMS_HTML"></script>
        <style>
          body {
            margin: 0;
            padding: 0;
            color: ${color};
            font-size: ${fontSize}px;
            line-height: ${fontSize * 1.5}px;
            background: transparent;
          }
          .math-content {
            word-wrap: break-word;
          }
        </style>
      </head>
      <body>
        <div class="math-content">${(mathContent)}</div>
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
      source={{ html: htmlContent }}
      style={{
        minHeight,
        maxHeight,
        backgroundColor: 'transparent',
        width: '100%',
      }}
      scrollEnabled={true}
      showsVerticalScrollIndicator={false}
      showsHorizontalScrollIndicator={false}
      originWhitelist={['*']}
      javaScriptEnabled={true}
      domStorageEnabled={true}
      automaticallyAdjustContentInsets={false}
      useWebKit={true}
      startInLoadingState={true}
    />
  );
};

export default MathRendererSolution; 