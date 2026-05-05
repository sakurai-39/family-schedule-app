import * as AppleAuthentication from 'expo-apple-authentication';
import { AuthSessionResult } from 'expo-auth-session';
import { Auth } from 'firebase/auth';
import { createAppleNoncePair } from '../utils/oauthNonce';
import { signInWithAppleIdentityToken, signInWithGoogleIdToken } from './auth';

export async function handleGoogleAuthSessionResult(
  auth: Auth,
  response: AuthSessionResult | null
): Promise<void> {
  if (!response || response.type !== 'success') {
    return;
  }

  const idToken = response.params.id_token;
  if (!idToken) {
    throw new Error('Google ID token was not returned');
  }

  await signInWithGoogleIdToken(auth, idToken);
}

export async function signInWithAppleAsync(auth: Auth): Promise<void> {
  const isAvailable = await AppleAuthentication.isAvailableAsync();
  if (!isAvailable) {
    throw new Error('Apple Sign-In is not available on this device');
  }

  const { rawNonce, hashedNonce } = await createAppleNoncePair();
  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
    nonce: hashedNonce,
  });

  if (!credential.identityToken) {
    throw new Error('Apple identity token was not returned');
  }

  await signInWithAppleIdentityToken(auth, credential.identityToken, rawNonce);
}
