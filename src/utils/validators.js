const VALID_VOICES = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'];
const MIN_SPEED = 0.25;
const MAX_SPEED = 4.0;

export function validateVoice(voice) {
  if (!voice || typeof voice !== 'string') {
    return { valid: false, error: 'Voice must be a string' };
  }

  if (!VALID_VOICES.includes(voice)) {
    return { valid: false, error: `Voice must be one of: ${VALID_VOICES.join(', ')}` };
  }

  return { valid: true };
}

export function validateSpeed(speed) {
  const numSpeed = Number(speed);

  if (isNaN(numSpeed)) {
    return { valid: false, error: 'Speed must be a number' };
  }

  if (numSpeed < MIN_SPEED || numSpeed > MAX_SPEED) {
    return { valid: false, error: `Speed must be between ${MIN_SPEED} and ${MAX_SPEED}` };
  }

  return { valid: true };
}

export function validateSettings(settings) {
  const errors = [];

  if (settings.voice !== undefined) {
    const voiceValidation = validateVoice(settings.voice);
    if (!voiceValidation.valid) {
      errors.push(voiceValidation.error);
    }
  }

  if (settings.speed !== undefined) {
    const speedValidation = validateSpeed(settings.speed);
    if (!speedValidation.valid) {
      errors.push(speedValidation.error);
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
