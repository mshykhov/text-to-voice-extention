import { validateVoice, validateSpeed, validateSettings } from '../src/utils/validators.js';

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
    console.log('\n🧪 Running Validators Tests...\n');

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

function assertTrue(condition, message) {
  if (!condition) {
    throw new Error(message || 'Expected true, got false');
  }
}

function assertFalse(condition, message) {
  if (condition) {
    throw new Error(message || 'Expected false, got true');
  }
}

const runner = new TestRunner();

runner.test('validateVoice - accepts valid voices', () => {
  const validVoices = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'];
  for (const voice of validVoices) {
    const result = validateVoice(voice);
    assertTrue(result.valid, `Voice ${voice} should be valid`);
  }
});

runner.test('validateVoice - rejects invalid voices', () => {
  const invalidVoices = ['invalid', 'test', '', null, undefined, 123];
  for (const voice of invalidVoices) {
    const result = validateVoice(voice);
    assertFalse(result.valid, `Voice ${voice} should be invalid`);
  }
});

runner.test('validateSpeed - accepts valid speeds', () => {
  const validSpeeds = [0.25, 0.5, 1.0, 1.5, 2.0, 3.0, 4.0];
  for (const speed of validSpeeds) {
    const result = validateSpeed(speed);
    assertTrue(result.valid, `Speed ${speed} should be valid`);
  }
});

runner.test('validateSpeed - rejects speeds below minimum', () => {
  const result = validateSpeed(0.1);
  assertFalse(result.valid, 'Speed 0.1 should be invalid');
});

runner.test('validateSpeed - rejects speeds above maximum', () => {
  const result = validateSpeed(5.0);
  assertFalse(result.valid, 'Speed 5.0 should be invalid');
});

runner.test('validateSpeed - rejects non-numeric speeds', () => {
  const invalidSpeeds = ['fast', null, undefined, NaN];
  for (const speed of invalidSpeeds) {
    const result = validateSpeed(speed);
    assertFalse(result.valid, `Speed ${speed} should be invalid`);
  }
});

runner.test('validateSettings - accepts valid settings', () => {
  const result = validateSettings({ voice: 'alloy', speed: 1.0 });
  assertTrue(result.valid, 'Valid settings should pass');
  assertTrue(result.errors.length === 0, 'Should have no errors');
});

runner.test('validateSettings - rejects invalid voice', () => {
  const result = validateSettings({ voice: 'invalid' });
  assertFalse(result.valid, 'Invalid voice should fail');
  assertTrue(result.errors.length > 0, 'Should have errors');
});

runner.test('validateSettings - rejects invalid speed', () => {
  const result = validateSettings({ speed: 10 });
  assertFalse(result.valid, 'Invalid speed should fail');
  assertTrue(result.errors.length > 0, 'Should have errors');
});

runner.test('validateSettings - collects multiple errors', () => {
  const result = validateSettings({ voice: 'invalid', speed: 10 });
  assertFalse(result.valid, 'Multiple invalid settings should fail');
  assertTrue(result.errors.length === 2, 'Should have 2 errors');
});

runner.test('validateSettings - allows partial settings', () => {
  const voiceOnly = validateSettings({ voice: 'alloy' });
  assertTrue(voiceOnly.valid, 'Voice-only settings should be valid');

  const speedOnly = validateSettings({ speed: 1.0 });
  assertTrue(speedOnly.valid, 'Speed-only settings should be valid');
});

runner.run();
