import { AudioCache } from '../src/core/audio-cache.js';

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
    console.log('\n🧪 Running Audio Cache Tests...\n');

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

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const runner = new TestRunner();

runner.test('LRU cache evicts by usage time correctly', async () => {
  const cache = new AudioCache();

  cache.set(1, 'chunk1');
  await sleep(10);
  cache.set(2, 'chunk2');

  assertEqual(cache.size, 2, 'Should have 2 items (MAX_CACHE_SIZE)');

  await sleep(10);
  cache.get(1);

  await sleep(10);
  cache.set(3, 'chunk3');

  assertEqual(cache.has(1), true, 'Item 1 should still be in cache (recently used)');
  assertEqual(cache.has(2), false, 'Item 2 should be evicted (least recently used)');
  assertEqual(cache.has(3), true, 'Item 3 should be in cache');
});

runner.test('LRU cache handles back-navigation correctly', async () => {
  const cache = new AudioCache();

  cache.set(0, 'audio0');
  await sleep(10);
  cache.set(1, 'audio1');

  await sleep(10);
  cache.set(2, 'audio2');

  await sleep(10);
  cache.get(1);

  await sleep(10);
  cache.set(0, 'audio0-regenerated');

  assertEqual(cache.has(1), true, 'Chunk 1 should remain (recently used)');
  assertEqual(cache.has(2), false, 'Chunk 2 evicted (least recently used)');
  assertEqual(cache.has(0), true, 'Chunk 0 back in cache');
});

runner.test('LRU cache respects multiple accesses', async () => {
  const cache = new AudioCache();

  cache.set('a', 1);
  await sleep(10);
  cache.set('b', 2);

  await sleep(10);
  cache.get('a');
  await sleep(10);
  cache.get('a');
  await sleep(10);
  cache.get('a');

  await sleep(10);
  cache.set('c', 3);

  assertEqual(cache.has('a'), true, 'Hot item a should remain');
  assertEqual(cache.has('b'), false, 'LRU item b should be evicted');
  assertEqual(cache.has('c'), true, 'New item c should be in cache');
});

runner.run();
