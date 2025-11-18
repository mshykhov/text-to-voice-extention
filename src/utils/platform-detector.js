/**
 * Platform Detection Utility
 * Detects the user's platform (iOS/Android/Desktop) and browser
 */

export function detectPlatform() {
  const userAgent = navigator.userAgent.toLowerCase();

  const isIOS = /iphone|ipad|ipod/.test(userAgent) ||
                (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  const isAndroid = /android/.test(userAgent);

  const isMobile = isIOS || isAndroid ||
                   /mobile|tablet/.test(userAgent);

  return {
    isIOS,
    isAndroid,
    isMobile,
    isDesktop: !isMobile
  };
}

export function getRecommendedPrefetchStrategy() {
  const platform = detectPlatform();

  if (platform.isIOS || platform.isAndroid) {
    return 'aggressive';
  }

  return 'balanced';
}
