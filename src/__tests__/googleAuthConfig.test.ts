import {
  buildGoogleAuthRequestConfig,
  getGoogleClientIdForPlatform,
} from '../utils/googleAuthConfig';

describe('getGoogleClientIdForPlatform', () => {
  it('uses platform-specific Google client IDs', () => {
    const ids = {
      webClientId: 'web-client',
      androidClientId: 'android-client',
      iosClientId: 'ios-client',
    };

    expect(getGoogleClientIdForPlatform('android', ids)).toBe('android-client');
    expect(getGoogleClientIdForPlatform('ios', ids)).toBe('ios-client');
    expect(getGoogleClientIdForPlatform('web', ids)).toBe('web-client');
  });

  it('falls back to the web client ID when a native platform client ID is not configured', () => {
    expect(getGoogleClientIdForPlatform('android', { webClientId: 'web-client' })).toBe(
      'web-client'
    );
    expect(getGoogleClientIdForPlatform('ios', { webClientId: 'web-client' })).toBe('web-client');
  });
});

describe('buildGoogleAuthRequestConfig', () => {
  it('fills missing native client IDs with the web client ID to avoid provider render errors', () => {
    expect(buildGoogleAuthRequestConfig({ webClientId: 'web-client' })).toEqual({
      webClientId: 'web-client',
      androidClientId: 'web-client',
      iosClientId: 'web-client',
    });
  });
});
