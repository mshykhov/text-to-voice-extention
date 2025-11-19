/**
 * Platform Detection Utility
 * Detects the user's platform (iOS/Android/Desktop) and browser
 * Works in both content scripts and service workers
 */

export function detectPlatform() {
  try {
    // Use self.navigator for service worker compatibility
    const nav = typeof self !== 'undefined' && self.navigator ? self.navigator :
                typeof navigator !== 'undefined' ? navigator : null;

    if (!nav) {
      console.warn('[Platform Detector] Navigator not available');
      return { isIOS: false, isAndroid: false, isMobile: false, isDesktop: true };
    }

    const userAgent = nav.userAgent ? nav.userAgent.toLowerCase() : '';
    const platform = nav.platform ? nav.platform : '';
    const maxTouchPoints = nav.maxTouchPoints || 0;

    const isIOS = /iphone|ipad|ipod/.test(userAgent) ||
                  (platform === 'MacIntel' && maxTouchPoints > 1);

    const isAndroid = /android/.test(userAgent);

    const isMobile = isIOS || isAndroid ||
                     /mobile|tablet/.test(userAgent);

    return {
      isIOS,
      isAndroid,
      isMobile,
      isDesktop: !isMobile
    };
  } catch (error) {
    console.error('[Platform Detector] Error:', error);
    return { isIOS: false, isAndroid: false, isMobile: false, isDesktop: true };
  }
}

export function getRecommendedPrefetchStrategy() {
  const platform = detectPlatform();

  if (platform.isIOS || platform.isAndroid) {
    return 'aggressive';
  }

  return 'balanced';
}
