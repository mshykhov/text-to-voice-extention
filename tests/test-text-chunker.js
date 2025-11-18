import { chunkTextBySentences, findLogicalStart } from '../src/utils/text-chunker.js';

class TestRunner {
  constructor() {
    this.tests = [];
    this.passed = 0;
    this.failed = 0;
  }

  test(name, fn) {
    this.tests.push({ name, fn });
  }

  async run() {
    console.log('\n🧪 Running Text Chunker Tests...\n');

    for (const { name, fn } of this.tests) {
      try {
        await fn();
        console.log(`✅ ${name}`);
        this.passed++;
      } catch (error) {
        console.log(`❌ ${name}`);
        console.log(`   Error: ${error.message}`);
        this.failed++;
      }
    }

    console.log(`\n📊 Results: ${this.passed} passed, ${this.failed} failed\n`);
    process.exit(this.failed > 0 ? 1 : 0);
  }
}

function assertEqual(actual, expected, message) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(message || `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function assertTrue(condition, message) {
  if (!condition) {
    throw new Error(message || 'Expected true, got false');
  }
}

const runner = new TestRunner();

runner.test('chunkTextBySentences - splits into correct chunks (default 3 sentences)', () => {
  const text = 'First sentence here. Second sentence here. Third sentence here. Fourth sentence here. Fifth sentence here. Sixth sentence here.';
  const { chunks } = chunkTextBySentences(text);

  assertEqual(chunks.length, 2, 'Should create 2 chunks with default settings (3 sentences each)');
  assertTrue(chunks[0].includes('First sentence'), 'First chunk should contain first sentence');
  assertTrue(chunks[0].includes('Third sentence'), 'First chunk should contain third sentence');
});

runner.test('chunkTextBySentences - handles minimum length constraint', () => {
  const text = 'Short sentence A. Short sentence B. This is a longer sentence C. Another sentence D.';
  const { chunks } = chunkTextBySentences(text);

  for (const chunk of chunks) {
    assertTrue(chunk.length >= 10 || chunks.length === 1,
               `Chunk "${chunk}" should be at least 10 chars (unless it's the only chunk with short text)`);
  }
});

runner.test('chunkTextBySentences - handles maximum length constraint', () => {
  const longText = 'A '.repeat(300) + 'sentence. ';
  const { chunks } = chunkTextBySentences(longText);

  for (const chunk of chunks) {
    assertTrue(chunk.length <= 500, `Chunk length ${chunk.length} should be at most 500 chars`);
  }
});

runner.test('chunkTextBySentences - does not break words', () => {
  const text = 'Short. ' + 'A '.repeat(50) + 'sentence.';
  const { chunks } = chunkTextBySentences(text);

  for (const chunk of chunks) {
    const words = chunk.split(/\s+/);
    for (const word of words) {
      assertTrue(word.length > 0, 'Should not have empty words from breaking');
    }
  }
});

runner.test('chunkTextBySentences - handles exclamation and question marks', () => {
  const text = 'What is this? This is great! Yes it is. Amazing stuff!';
  const { chunks } = chunkTextBySentences(text);

  assertTrue(chunks.length > 0, 'Should create at least 1 chunk');
  assertTrue(chunks[0].includes('What is this?'), 'Should handle question marks');
  assertTrue(chunks[0].includes('This is great!'), 'Should handle exclamation marks');
});

runner.test('chunkTextBySentences - handles single sentence', () => {
  const text = 'Just one sentence that is long enough to meet the minimum requirement.';
  const { chunks } = chunkTextBySentences(text);

  assertEqual(chunks.length, 1, 'Should create 1 chunk');
  assertTrue(chunks[0].includes('Just one sentence'), 'Should contain the sentence');
});

runner.test('chunkTextBySentences - handles empty text', () => {
  const text = '';
  const { chunks } = chunkTextBySentences(text);

  assertEqual(chunks.length, 1, 'Should create 1 chunk for empty text');
});

runner.test('chunkTextBySentences - custom options', () => {
  const text = 'A sentence here. B sentence here. C sentence here. D sentence here.';
  const { chunks } = chunkTextBySentences(text, { defaultSentences: 1, minLength: 10 });

  assertTrue(chunks.length >= 4, 'Should create multiple chunks with custom options');
});

runner.test('chunkTextBySentences - positions are correct', () => {
  const text = 'First sentence. Second sentence. Third sentence.';
  const { chunks, positions } = chunkTextBySentences(text);

  assertEqual(chunks.length, positions.length, 'Should have same number of positions as chunks');

  for (let i = 0; i < chunks.length; i++) {
    const { start, end } = positions[i];
    assertTrue(start >= 0, 'Start position should be non-negative');
    assertTrue(end > start, 'End position should be after start');
  }
});

runner.test('findLogicalStart - finds sentence start', () => {
  const text = 'First sentence. Second sentence. Third sentence.';
  const position = 25;

  const logicalStart = findLogicalStart(text, position);

  assertTrue(logicalStart <= position, 'Should not go forward');
  assertTrue(text.substring(logicalStart).startsWith('Second') ||
             text.substring(logicalStart).startsWith('Third'),
             'Should start at beginning of sentence');
});

runner.test('findLogicalStart - respects max lookback', () => {
  const text = 'A. '.repeat(100) + 'Target sentence.';
  const position = text.length - 10;

  const logicalStart = findLogicalStart(text, position, 50);

  assertTrue(position - logicalStart <= 50, 'Should not look back more than maxLookback');
});

runner.test('findLogicalStart - handles beginning of text', () => {
  const text = 'First sentence. Second sentence.';
  const position = 5;

  const logicalStart = findLogicalStart(text, position);

  assertTrue(logicalStart >= 0, 'Should not return negative position');
});

runner.run();
