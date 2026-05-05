import * as AppleAuthentication from 'expo-apple-authentication';
import { AuthSessionResult } from 'expo-auth-session';
import { signInWithAppleIdentityToken, signInWithGoogleIdToken } from '../services/auth';
import { handleGoogleAuthSessionResult, signInWithAppleAsync } from '../services/oauthSignIn';
import { createAppleNoncePair } from '../utils/oauthNonce';

jest.mock('expo-apple-authentication', () => ({
  AppleAuthenticationScope: {
    FULL_NAME: 0,
    EMAIL: 1,
  },
  isAvailableAsync: jest.fn(() => Promise.resolve(true)),
  signInAsync: jest.fn(() =>
    Promise.resolve({
      identityToken: 'apple-id-token',
    })
  ),
}));

jest.mock('../services/auth', () => ({
  signInWithAppleIdentityToken: jest.fn(() => Promise.resolve()),
  signInWithGoogleIdToken: jest.fn(() => Promise.resolve()),
}));

jest.mock('../utils/oauthNonce', () => ({
  createAppleNoncePair: jest.fn(() =>
    Promise.resolve({
      rawNonce: 'raw-nonce',
      hashedNonce: 'hashed-nonce',
    })
  ),
}));

const mockedAppleAuthentication = jest.mocked(AppleAuthentication);
const mockedSignInWithAppleIdentityToken = jest.mocked(signInWithAppleIdentityToken);
const mockedSignInWithGoogleIdToken = jest.mocked(signInWithGoogleIdToken);
const mockedCreateAppleNoncePair = jest.mocked(createAppleNoncePair);

beforeEach(() => {
  jest.clearAllMocks();
  mockedAppleAuthentication.isAvailableAsync.mockResolvedValue(true);
  mockedAppleAuthentication.signInAsync.mockResolvedValue({
    identityToken: 'apple-id-token',
  } as never);
  mockedCreateAppleNoncePair.mockResolvedValue({
    rawNonce: 'raw-nonce',
    hashedNonce: 'hashed-nonce',
  });
});

describe('handleGoogleAuthSessionResult', () => {
  it('signs in with a Google id_token from a successful AuthSession response', async () => {
    const auth = { name: 'auth' } as never;
    const response = {
      type: 'success',
      params: { id_token: 'google-id-token' },
      authentication: null,
      errorCode: null,
      url: 'family-schedule-app://auth',
    } satisfies AuthSessionResult;

    await handleGoogleAuthSessionResult(auth, response);

    expect(mockedSignInWithGoogleIdToken).toHaveBeenCalledWith(auth, 'google-id-token');
  });

  it('does nothing for a cancelled Google AuthSession response', async () => {
    await handleGoogleAuthSessionResult({} as never, { type: 'cancel' });

    expect(mockedSignInWithGoogleIdToken).not.toHaveBeenCalled();
  });

  it('rejects a successful Google response without id_token', async () => {
    const response = {
      type: 'success',
      params: {},
      authentication: null,
      errorCode: null,
      url: 'family-schedule-app://auth',
    } satisfies AuthSessionResult;

    await expect(handleGoogleAuthSessionResult({} as never, response)).rejects.toThrow(
      'Google ID token was not returned'
    );
  });
});

describe('signInWithAppleAsync', () => {
  it('rejects when Apple Sign-In is unavailable', async () => {
    mockedAppleAuthentication.isAvailableAsync.mockResolvedValueOnce(false);

    await expect(signInWithAppleAsync({} as never)).rejects.toThrow(
      'Apple Sign-In is not available on this device'
    );

    expect(mockedAppleAuthentication.signInAsync).not.toHaveBeenCalled();
    expect(mockedSignInWithAppleIdentityToken).not.toHaveBeenCalled();
  });

  it('signs in with Apple identity token and raw nonce', async () => {
    const auth = { name: 'auth' } as never;

    await signInWithAppleAsync(auth);

    expect(mockedCreateAppleNoncePair).toHaveBeenCalledTimes(1);
    expect(mockedAppleAuthentication.signInAsync).toHaveBeenCalledWith({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
      nonce: 'hashed-nonce',
    });
    expect(mockedSignInWithAppleIdentityToken).toHaveBeenCalledWith(
      auth,
      'apple-id-token',
      'raw-nonce'
    );
  });

  it('rejects when Apple does not return an identity token', async () => {
    mockedAppleAuthentication.signInAsync.mockResolvedValueOnce({
      identityToken: null,
    } as never);

    await expect(signInWithAppleAsync({} as never)).rejects.toThrow(
      'Apple identity token was not returned'
    );

    expect(mockedSignInWithAppleIdentityToken).not.toHaveBeenCalled();
  });
});
