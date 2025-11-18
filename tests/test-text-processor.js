import { cleanText, normalizeText } from '../src/utils/text-processor.js';

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
    console.log('\n🧪 Running Text Processor Tests...\n');

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

const runner = new TestRunner();

runner.test('normalizeText - removes extra whitespace', () => {
  const text = '  Multiple   spaces   here  ';
  const normalized = normalizeText(text);

  assertEqual(normalized, 'multiple spaces here', 'Should normalize whitespace');
});

runner.test('normalizeText - handles newlines', () => {
  const text = 'Line one\nLine two\n\nLine three';
  const normalized = normalizeText(text);

  assertEqual(normalized, 'line one line two line three', 'Should replace newlines with spaces');
});

runner.test('normalizeText - converts to lowercase', () => {
  const text = 'UPPERCASE and MiXeD CaSe';
  const normalized = normalizeText(text);

  assertEqual(normalized, 'uppercase and mixed case', 'Should convert to lowercase');
});

runner.test('cleanText - removes excessive newlines', () => {
  const text = 'Paragraph 1\n\n\n\nParagraph 2';
  const cleaned = cleanText(text);

  assertEqual(cleaned, 'Paragraph 1\n\nParagraph 2', 'Should reduce to max 2 newlines');
});

runner.test('cleanText - normalizes spaces', () => {
  const text = 'Multiple    spaces     here';
  const cleaned = cleanText(text);

  assertEqual(cleaned, 'Multiple spaces here', 'Should normalize to single spaces');
});

runner.test('cleanText - trims whitespace', () => {
  const text = '   Text with spaces   ';
  const cleaned = cleanText(text);

  assertEqual(cleaned, 'Text with spaces', 'Should trim leading and trailing whitespace');
});

runner.run();
