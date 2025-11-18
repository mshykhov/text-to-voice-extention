console.log('[TTS Content Script] Loaded on:', window.location.href);

let currentHighlight = null;
let cachedNodeMap = null;
let cachedCombinedText = null;

injectHighlightStyles();

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[TTS Content Script] Received message:', message.action);

  if (message.action === 'extractText') {
    try {
      const text = extractPageText();
      console.log('[TTS Content Script] Extracted text length:', text.length);
      cachedNodeMap = null;
      cachedCombinedText = null;
      sendResponse({ success: true, text });
    } catch (error) {
      console.error('[TTS Content Script] Error extracting text:', error);
      sendResponse({ success: false, error: error.message });
    }
    return false; // sync operation
  }

  if (message.action === 'highlightText') {
    try {
      highlightText(message.extractedText, message.start, message.end);
      sendResponse({ success: true });
    } catch (error) {
      console.error('[TTS Content Script] Error highlighting text:', error);
      sendResponse({ success: false, error: error.message });
    }
    return false;
  }

  if (message.action === 'clearHighlight') {
    try {
      clearHighlight();
      sendResponse({ success: true });
    } catch (error) {
      console.error('[TTS Content Script] Error clearing highlight:', error);
      sendResponse({ success: false, error: error.message });
    }
    return false; // sync operation
  }

  return false; // default
});

function injectHighlightStyles() {
  const style = document.createElement('style');
  style.textContent = `
    ::highlight(tts-current) {
      background-color: rgba(102, 126, 234, 0.3);
      color: inherit;
    }
  `;
  document.head.appendChild(style);
}

function extractPageText() {
  const siteSelectors = [
    '.ReadTextContainerIn',
    '.reader-content',
    '.text-content',
    '#chapter-content',
    '.chapter-text',
    '.reader',
    '.reading-content',
    '[itemprop="articleBody"]',
    'article',
    '[role="main"]',
    'main',
    'body'
  ];

  let contentElement = null;

  for (const selector of siteSelectors) {
    contentElement = document.querySelector(selector);
    if (contentElement) {
      const textLength = contentElement.innerText.trim().length;
      if (textLength > 100) {
        console.log('[TTS Content Script] Found content:', selector);
        break;
      }
      contentElement = null;
    }
  }

  if (!contentElement) {
    contentElement = document.body;
  }

  const text = extractTextFromElement(contentElement);
  return cleanText(text);
}

function extractTextFromElement(element) {
  const excludeTags = ['SCRIPT', 'STYLE', 'NOSCRIPT', 'IFRAME', 'NAV', 'HEADER', 'FOOTER', 'ASIDE'];
  const excludeClasses = ['menu', 'navigation', 'nav', 'sidebar', 'ads', 'advertisement', 'social', 'share', 'comments'];

  let text = '';

  for (const node of element.childNodes) {
    if (node.nodeType === Node.TEXT_NODE) {
      text += node.textContent;
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      if (excludeTags.includes(node.tagName)) continue;

      if (node.className && typeof node.className === 'string') {
        const hasExcludedClass = excludeClasses.some(excludeClass =>
          node.className.toLowerCase().includes(excludeClass)
        );
        if (hasExcludedClass) continue;
      }

      if (node.style && node.style.display === 'none') continue;
      if (node.style && node.style.visibility === 'hidden') continue;

      if (isBlockElement(node)) text += '\n';
      text += extractTextFromElement(node);
      if (isBlockElement(node)) text += '\n';
    }
  }

  return text;
}

function isBlockElement(element) {
  const blockTags = ['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI', 'BLOCKQUOTE', 'PRE'];
  return blockTags.includes(element.tagName);
}

function buildTextNodesMap() {
  if (cachedNodeMap && cachedCombinedText) {
    return { nodeMap: cachedNodeMap, combinedText: cachedCombinedText };
  }

  document.body.normalize();

  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    null,
    false
  );

  let textNodes = [];
  let node;
  while (node = walker.nextNode()) {
    if (node.parentElement && (
      node.parentElement.tagName === 'SCRIPT' ||
      node.parentElement.tagName === 'STYLE' ||
      node.parentElement.tagName === 'NOSCRIPT'
    )) {
      continue;
    }
    textNodes.push(node);
  }

  let combinedText = '';
  let nodeMap = [];

  for (const textNode of textNodes) {
    const start = combinedText.length;
    const text = textNode.textContent;
    combinedText += text;
    nodeMap.push({ node: textNode, start, end: start + text.length });
  }

  cachedNodeMap = nodeMap;
  cachedCombinedText = combinedText;

  return { nodeMap, combinedText };
}

function highlightText(extractedText, startPos, endPos) {
  clearHighlight();

  const { nodeMap, combinedText } = buildTextNodesMap();

  const textToHighlight = extractedText.substring(startPos, endPos);
  const normalizedCombined = normalizeText(combinedText);
  const normalizedTarget = normalizeText(textToHighlight);

  let matchIndex = normalizedCombined.indexOf(normalizedTarget);

  if (matchIndex === -1) {
    console.warn('[TTS] Text not found:', textToHighlight.substring(0, 50));
    return;
  }

  const matchStartNorm = matchIndex;
  const matchEndNorm = matchStartNorm + normalizedTarget.length;

  const matchStart = findOriginalPosition(combinedText, normalizedCombined, matchStartNorm);
  const matchEnd = findOriginalPosition(combinedText, normalizedCombined, matchEndNorm);

  const ranges = createRanges(nodeMap, matchStart, matchEnd);

  if (ranges.length === 0) {
    return;
  }

  const highlight = new Highlight(...ranges);
  CSS.highlights.set('tts-current', highlight);

  currentHighlight = { highlight, ranges };

  scrollToRange(ranges[0]);
}

function createRanges(nodeMap, matchStart, matchEnd) {
  const affectedNodes = nodeMap.filter(item =>
    (item.start < matchEnd && item.end > matchStart)
  );

  const ranges = [];

  for (const item of affectedNodes) {
    const nodeStart = Math.max(0, matchStart - item.start);
    const nodeEnd = Math.min(item.node.textContent.length, matchEnd - item.start);

    if (nodeEnd <= nodeStart) continue;

    const range = new Range();
    range.setStart(item.node, nodeStart);
    range.setEnd(item.node, nodeEnd);
    ranges.push(range);
  }

  return ranges;
}

function scrollToRange(range) {
  const rect = range.getBoundingClientRect();
  const isVisible = rect.top >= 0 && rect.bottom <= window.innerHeight;

  if (!isVisible) {
    range.startContainer.parentElement?.scrollIntoView({
      behavior: 'smooth',
      block: 'center'
    });
  }
}

function clearHighlight() {
  if (!currentHighlight) return;
  CSS.highlights.delete('tts-current');
  currentHighlight = null;
}

function cleanText(text) {
  return text
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

function normalizeText(text) {
  return text
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function findOriginalPosition(original, normalized, normalizedPos) {
  let origPos = 0;
  let normPos = 0;

  while (normPos < normalizedPos && origPos < original.length) {
    const origChar = original[origPos];
    const normChar = origChar.replace(/\s+/g, ' ').toLowerCase();

    if (normChar === normalized[normPos]) {
      normPos++;
    }

    origPos++;
  }

  return origPos;
}

console.log('[TTS Content Script] Ready');
