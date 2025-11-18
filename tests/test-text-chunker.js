import { chunkTextBySentences } from '../src/utils/text-chunker.js';

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

runner.test('chunkTextBySentences - splits into correct chunks', () => {
  const text = 'First sentence. Second sentence. Third sentence. Fourth sentence.';
  const { chunks } = chunkTextBySentences(text, 2);

  assertEqual(chunks.length, 2, 'Should create 2 chunks');
  assertEqual(chunks[0], 'First sentence. Second sentence.', 'First chunk should contain 2 sentences');
  assertEqual(chunks[1], 'Third sentence. Fourth sentence.', 'Second chunk should contain 2 sentences');
});

runner.test('chunkTextBySentences - handles odd number of sentences', () => {
  const text = 'First. Second. Third. Fourth. Fifth.';
  const { chunks } = chunkTextBySentences(text, 2);

  assertEqual(chunks.length, 3, 'Should create 3 chunks');
  assertEqual(chunks[2], 'Fifth.', 'Last chunk should contain remaining sentence');
});

runner.test('chunkTextBySentences - handles exclamation and question marks', () => {
  const text = 'What is this? This is great! Yes it is.';
  const { chunks } = chunkTextBySentences(text, 2);

  assertEqual(chunks.length, 2, 'Should create 2 chunks');
  assertTrue(chunks[0].includes('What is this?'), 'Should handle question marks');
  assertTrue(chunks[0].includes('This is great!'), 'Should handle exclamation marks');
});

runner.test('chunkTextBySentences - handles single sentence', () => {
  const text = 'Just one sentence.';
  const { chunks } = chunkTextBySentences(text, 3);

  assertEqual(chunks.length, 1, 'Should create 1 chunk');
  assertEqual(chunks[0], 'Just one sentence.', 'Should contain the sentence');
});

runner.test('chunkTextBySentences - handles empty text', () => {
  const text = '';
  const { chunks } = chunkTextBySentences(text, 3);

  assertEqual(chunks.length, 1, 'Should create 1 chunk for empty text');
});

runner.test('chunkTextBySentences - custom chunk size', () => {
  const text = 'A. B. C. D. E. F.';
  const { chunks } = chunkTextBySentences(text, 1);

  assertEqual(chunks.length, 6, 'Should create 6 chunks with size 1');

  const { chunks: chunks3 } = chunkTextBySentences(text, 3);
  assertEqual(chunks3.length, 2, 'Should create 2 chunks with size 3');
});

runner.run();
