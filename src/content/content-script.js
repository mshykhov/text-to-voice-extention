console.log('[TTS Content Script] Loaded on:', window.location.href);

let currentHighlight = null;
let pageContext = null;
let contentObserver = null;

injectHighlightStyles();

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[TTS Content Script] Received message:', message.action);

  if (message.action === 'extractText') {
    try {
      clearPageContext();
      const text = extractPageText();
      console.log('[TTS Content Script] Extracted text length:', text.length);
      sendResponse({ success: true, text });
    } catch (error) {
      console.error('[TTS Content Script] Error extracting text:', error);
      sendResponse({ success: false, error: error.message });
    }
    return false;
  }

  if (message.action === 'highlightText') {
    try {
      highlightText(
        message.extractedText,
        message.extractedTextOffset || 0,
        message.start,
        message.end
      );
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
    return false;
  }

  if (message.action === 'getSelectionPosition') {
    try {
      const position = getSelectionPosition();
      sendResponse({ success: true, position });
    } catch (error) {
      console.error('[TTS Content Script] Error getting selection position:', error);
      sendResponse({ success: false, error: error.message });
    }
    return false;
  }

  return false;
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

function findContentElement() {
  const selectors = [
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
    'main'
  ];

  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element && element.innerText.trim().length > 100) {
      console.log('[TTS Content Script] Found content:', selector);
      return element;
    }
  }

  return document.body;
}

function buildPageContext() {
  if (pageContext) {
    return pageContext;
  }

  const contentElement = findContentElement();

  const excludeTags = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'IFRAME', 'NAV', 'HEADER', 'FOOTER', 'ASIDE']);

  const walker = document.createTreeWalker(
    contentElement,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: function(node) {
        if (!node.parentElement) return NodeFilter.FILTER_REJECT;
        if (excludeTags.has(node.parentElement.tagName)) return NodeFilter.FILTER_REJECT;
        if (node.textContent.trim().length === 0) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    }
  );

  const nodeMap = [];
  let text = '';
  let node;

  while ((node = walker.nextNode())) {
    const start = text.length;
    const nodeText = node.textContent;
    text += nodeText;
    nodeMap.push({ node, start, end: start + nodeText.length });
  }

  text = cleanText(text);

  pageContext = { contentElement, nodeMap, text };
  console.log('[TTS Content Script] Built page context:', { textLength: text.length, nodes: nodeMap.length });

  setupContentObserver(contentElement);

  return pageContext;
}

function clearPageContext() {
  if (contentObserver) {
    contentObserver.disconnect();
    contentObserver = null;
  }
  pageContext = null;
}

function setupContentObserver(contentElement) {
  if (contentObserver) {
    contentObserver.disconnect();
  }

  contentObserver = new MutationObserver(() => {
    console.log('[TTS Content Script] DOM changed, invalidating pageContext');
    clearPageContext();
  });

  contentObserver.observe(contentElement, {
    childList: true,
    characterData: true,
    subtree: true
  });
}

function cleanText(text) {
  return text
    .replace(/\n\s*\n\s*\n+/g, '\n\n')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

function extractPageText() {
  const { text } = buildPageContext();
  return text;
}

function clearHighlight() {
  if (currentHighlight) {
    CSS.highlights.delete('tts-current');
    currentHighlight = null;
  }
}

function highlightText(extractedText, extractedTextOffset, startPos, endPos) {
  clearHighlight();

  const { nodeMap } = buildPageContext();

  const absoluteStart = extractedTextOffset + startPos;
  const absoluteEnd = extractedTextOffset + endPos;

  const ranges = createRanges(nodeMap, absoluteStart, absoluteEnd);

  if (ranges.length === 0) {
    console.warn('[TTS] Could not create ranges for positions:', { absoluteStart, absoluteEnd });
    return;
  }

  const highlight = new Highlight(...ranges);
  CSS.highlights.set('tts-current', highlight);
  currentHighlight = { highlight, ranges };

  scrollToRange(ranges[0]);
}

function createRanges(nodeMap, start, end) {
  const ranges = [];

  for (const { node, start: nodeStart, end: nodeEnd } of nodeMap) {
    if (nodeEnd <= start || nodeStart >= end) {
      continue;
    }

    const range = document.createRange();
    const rangeStart = Math.max(0, start - nodeStart);
    const rangeEnd = Math.min(node.textContent.length, end - nodeStart);

    try {
      range.setStart(node, rangeStart);
      range.setEnd(node, rangeEnd);
      ranges.push(range);
    } catch (error) {
      console.error('[TTS] Error creating range:', error);
    }
  }

  return ranges;
}

function scrollToRange(range) {
  try {
    const rect = range.getBoundingClientRect();
    const offset = window.innerHeight / 3;

    window.scrollTo({
      top: window.scrollY + rect.top - offset,
      behavior: 'smooth'
    });
  } catch (error) {
    console.error('[TTS] Error scrolling to range:', error);
  }
}

function getSelectionPosition() {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || selection.toString().trim().length === 0) {
    return null;
  }

  const range = selection.getRangeAt(0);
  const { nodeMap } = buildPageContext();

  for (const { node, start } of nodeMap) {
    if (node === range.startContainer) {
      return start + range.startOffset;
    }

    if (node.contains && node.contains(range.startContainer)) {
      let offset = range.startOffset;
      let currentNode = range.startContainer;

      while (currentNode !== node && currentNode.previousSibling) {
        currentNode = currentNode.previousSibling;
        offset += currentNode.textContent ? currentNode.textContent.length : 0;
      }

      return start + offset;
    }
  }

  return null;
}

console.log('[TTS Content Script] Ready');
