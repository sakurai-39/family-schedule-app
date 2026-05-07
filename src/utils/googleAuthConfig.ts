export type GoogleClientIds = {
  webClientId?: string;
  androidClientId?: string;
  iosClientId?: string;
};

export type GoogleSignInStrategy = 'native' | 'auth-session';

export function getGoogleSignInStrategy(platform: string): GoogleSignInStrategy {
  return platform === 'android' ? 'native' : 'auth-session';
}

export function getGoogleClientIdForPlatform(
  platform: string,
  clientIds: GoogleClientIds
): string | undefined {
  if (platform === 'android') return clientIds.androidClientId ?? clientIds.webClientId;
  if (platform === 'ios') return clientIds.iosClientId ?? clientIds.webClientId;
  return clientIds.webClientId;
}

export function buildGoogleAuthRequestConfig(clientIds: GoogleClientIds) {
  const fallbackClientId = clientIds.webClientId ?? '';

  return {
    webClientId: clientIds.webClientId ?? fallbackClientId,
    androidClientId: clientIds.androidClientId ?? fallbackClientId,
    iosClientId: clientIds.iosClientId ?? fallbackClientId,
  };
}
