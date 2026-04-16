import { type SubmitEvent, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { useI18n } from '@/i18n';
import { useAuth } from '@/lib/auth';

export function LoginPage() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const { user, loading, signInWithGoogle, mfaResolver, verifyMfaCode } = useAuth();
  const [error, setError] = useState('');
  const [signingIn, setSigningIn] = useState(false);
  const [mfaCode, setMfaCode] = useState('');
  const [mfaLoading, setMfaLoading] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!loading && user) void navigate('/', { replace: true });
  }, [user, loading, navigate]);

  async function handleGoogleLogin() {
    setError('');
    setSigningIn(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('login.error'));
    } finally {
      setSigningIn(false);
    }
  }

  async function handleMfaSubmit(e: SubmitEvent) {
    e.preventDefault();
    if (!mfaCode.trim()) return;
    setError('');
    setMfaLoading(true);
    try {
      await verifyMfaCode(mfaCode.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : t('login.mfaError'));
    } finally {
      setMfaLoading(false);
    }
  }

  return (
    <div className="from-primary/5 flex min-h-svh flex-col bg-gradient-to-b to-gray-50">
      <Header />

      <main className="flex flex-1 items-center justify-center px-4">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <img src="/logo-full.svg" alt="NexBridge" className="mx-auto mb-2 h-10" />
            <CardTitle className="text-xl">{t('login.title')}</CardTitle>
          </CardHeader>
          <CardContent className="flex min-h-[160px] flex-col items-stretch justify-center space-y-4">
            {mfaResolver ? (
              <form ref={formRef} onSubmit={handleMfaSubmit} className="space-y-4">
                <p className="text-muted-foreground text-center text-sm">{t('login.mfaPrompt')}</p>
                <InputOTP
                  maxLength={6}
                  value={mfaCode}
                  onChange={(v) => {
                    setMfaCode(v);
                    if (v.length === 6) requestAnimationFrame(() => formRef.current?.requestSubmit());
                  }}
                  autoFocus
                  containerClassName="justify-center"
                >
                  <InputOTPGroup>
                    {Array.from({ length: 6 }, (_, i) => (
                      <InputOTPSlot key={i} index={i} />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
                <Button type="submit" className="w-full" disabled={mfaLoading || mfaCode.length !== 6}>
                  {mfaLoading ? t('login.mfaVerifying') : t('login.mfaVerify')}
                </Button>
              </form>
            ) : (
              <>
                <p className="text-muted-foreground text-center text-sm">{t('login.description')}</p>
                <Button onClick={handleGoogleLogin} disabled={signingIn} className="w-full" variant="outline">
                  <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24" role="img" aria-label="Google">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                  {signingIn ? t('login.signingIn') : t('login.googleButton')}
                </Button>
              </>
            )}
            {error && <p className="text-destructive text-center text-sm">{error}</p>}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
