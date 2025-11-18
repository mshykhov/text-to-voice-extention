export const MAX_CACHE_SIZE = 3;
export const DEFAULT_MODEL = 'tts-1';
export const DEFAULT_SENTENCES_PER_CHUNK = 2;

export const PREFETCH_STRATEGIES = {
  CONSERVATIVE: {
    id: 'conservative',
    label: 'Conservative (1-2 chunks)',
    description: 'Minimal prefetch - saves API usage',
    prefetchCount: 2
  },
  BALANCED: {
    id: 'balanced',
    label: 'Balanced (5 chunks)',
    description: 'Good for most use cases',
    prefetchCount: 5
  },
  AGGRESSIVE: {
    id: 'aggressive',
    label: 'Aggressive (15 chunks)',
    description: 'Best for mobile/iOS - works longer in background',
    prefetchCount: 15
  },
  ALL: {
    id: 'all',
    label: 'All (entire page)',
    description: 'Load everything at start - maximum API usage',
    prefetchCount: Infinity
  }
};

export const DEFAULT_PREFETCH_STRATEGY = 'balanced';
