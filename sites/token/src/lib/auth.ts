import {
  GoogleAuthProvider,
  getMultiFactorResolver,
  type MultiFactorError,
  type MultiFactorResolver,
  multiFactor,
  onAuthStateChanged,
  reauthenticateWithPopup,
  signInWithPopup,
  signOut,
  TotpMultiFactorGenerator,
  type TotpSecret,
  type User,
} from 'firebase/auth';
import {
  createContext,
  createElement,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { auth } from './firebase';

const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? '';

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function setCookie(name: string, value: string, maxAgeSec: number): void {
  void cookieStore.set({
    name,
    value: encodeURIComponent(value),
    path: '/',
    expires: Date.now() + maxAgeSec * 1000,
    sameSite: 'lax',
  });
}

function deleteCookie(name: string): void {
  void cookieStore.delete({ name, path: '/' });
}

const SESSION_MAX_AGE = 24 * 60 * 60; // 1 day

export function getSessionToken(): string | null {
  return getCookie('token');
}

export function setSessionToken(token: string | null): void {
  if (token) {
    setCookie('token', token, SESSION_MAX_AGE);
  } else {
    deleteCookie('token');
  }
}

async function createSession(idToken: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/v1/session/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({ error: 'Unknown error' }))) as { error?: string };
    throw new Error(body.error ?? `Session login failed: HTTP ${String(res.status)}`);
  }
  const data = (await res.json()) as { sessionToken: string };
  setSessionToken(data.sessionToken);
}

function destroySession(): void {
  deleteCookie('token');
}

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface AuthState {
  /** Firebase user (null = not signed in, undefined = loading) */
  user: User | undefined | null;
  loading: boolean;
  /** Sign in with Google popup. Throws MfaRequired if MFA is needed. */
  signInWithGoogle: () => Promise<void>;
  /** Complete MFA sign-in with a TOTP code */
  verifyMfaCode: (code: string) => Promise<void>;
  /** Sign out */
  logout: () => Promise<void>;
  /** MFA resolver when MFA is required during login */
  mfaResolver: MultiFactorResolver | null;
  /** Start TOTP enrollment — returns a TotpSecret for QR code */
  startTotpEnrollment: () => Promise<TotpSecret>;
  /** Finalize TOTP enrollment with a verification code */
  finalizeTotpEnrollment: (secret: TotpSecret, code: string) => Promise<void>;
  /** Whether the current user has TOTP MFA enrolled */
  hasTotpMfa: boolean;
}

/* ------------------------------------------------------------------ */
/*  Context                                                            */
/* ------------------------------------------------------------------ */

const AuthContext = createContext<AuthState | null>(null);

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

/* ------------------------------------------------------------------ */
/*  Provider                                                           */
/* ------------------------------------------------------------------ */

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | undefined | null>(undefined);
  const [loading, setLoading] = useState(true);
  const [mfaResolver, setMfaResolver] = useState<MultiFactorResolver | null>(null);
  const [mfaVersion, setMfaVersion] = useState(0);

  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      if (u) {
        try {
          const idToken = await u.getIdToken();
          await createSession(idToken);
        } catch (err) {
          console.error('Failed to create session:', err);
        }
      } else {
        destroySession();
      }
      setUser(u);
      setLoading(false);
    });
  }, []);

  const signInWithGoogle = useCallback(async () => {
    setMfaResolver(null);
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (err: unknown) {
      const e = err as { code?: string };
      if (e.code === 'auth/multi-factor-auth-required') {
        const resolver = getMultiFactorResolver(auth, err as MultiFactorError);
        setMfaResolver(resolver);
        return;
      }
      throw err;
    }
  }, []);

  const verifyMfaCode = useCallback(
    async (code: string) => {
      if (!mfaResolver) throw new Error('No MFA resolver');
      const totpHint = mfaResolver.hints.find((h) => h.factorId === TotpMultiFactorGenerator.FACTOR_ID);
      if (!totpHint) throw new Error('No TOTP hint found');
      const assertion = TotpMultiFactorGenerator.assertionForSignIn(totpHint.uid, code);
      await mfaResolver.resolveSignIn(assertion);
      setMfaResolver(null);
    },
    [mfaResolver],
  );

  const logout = useCallback(async () => {
    setMfaResolver(null);
    destroySession();
    await signOut(auth);
  }, []);

  const startTotpEnrollment = useCallback(async () => {
    if (!auth.currentUser) throw new Error('Not signed in');
    const doEnroll = async () => {
      const session = await multiFactor(auth.currentUser!).getSession();
      return TotpMultiFactorGenerator.generateSecret(session);
    };
    try {
      return await doEnroll();
    } catch (err: unknown) {
      const e = err as { code?: string };
      if (e.code === 'auth/requires-recent-login') {
        await reauthenticateWithPopup(auth.currentUser, new GoogleAuthProvider());
        return await doEnroll();
      }
      throw err;
    }
  }, []);

  const finalizeTotpEnrollment = useCallback(async (secret: TotpSecret, code: string) => {
    if (!auth.currentUser) throw new Error('Not signed in');
    const assertion = TotpMultiFactorGenerator.assertionForEnrollment(secret, code);
    try {
      await multiFactor(auth.currentUser).enroll(assertion, 'TOTP');
    } catch (err: unknown) {
      const e = err as { code?: string };
      if (e.code === 'auth/requires-recent-login') {
        await reauthenticateWithPopup(auth.currentUser, new GoogleAuthProvider());
        await multiFactor(auth.currentUser).enroll(assertion, 'TOTP');
      } else {
        throw err;
      }
    }
    setMfaVersion((v) => v + 1);
  }, []);

  const hasTotpMfa = useMemo(() => {
    void mfaVersion;
    if (!user) return false;
    return multiFactor(user).enrolledFactors.some((f) => f.factorId === TotpMultiFactorGenerator.FACTOR_ID);
  }, [user, mfaVersion]);

  const value = useMemo<AuthState>(
    () => ({
      user,
      loading,
      signInWithGoogle,
      verifyMfaCode,
      logout,
      mfaResolver,
      startTotpEnrollment,
      finalizeTotpEnrollment,
      hasTotpMfa,
    }),
    [
      user,
      loading,
      signInWithGoogle,
      verifyMfaCode,
      logout,
      mfaResolver,
      startTotpEnrollment,
      finalizeTotpEnrollment,
      hasTotpMfa,
    ],
  );

  return createElement(AuthContext.Provider, { value }, children);
}
