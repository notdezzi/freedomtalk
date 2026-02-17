'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { MessageCircle, ArrowLeft, Shield, Smartphone, Copy, Check, RefreshCw } from 'lucide-react';

export default function TwoFASetupPage() {
  const router = useRouter();
  const [step, setStep] = useState<'setup' | 'verify' | 'backup'>('setup');
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [error, setError] = useState('');

  // Mock 2FA data
  const [secret] = useState('JBSWY3DPEHPK3PXP');
  const [qrCodeUrl] = useState('https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=otpauth://totp/FreedomTalk:user@example.com?secret=JBSWY3DPEHPK3PXP&issuer=FreedomTalk');
  const [backupCodes] = useState([
    'ABCD-EFGH-IJKL',
    'MNOP-QRST-UVWX',
    'YZ12-3456-7890',
    'ABCD-EFGH-IJKL',
    'MNOP-QRST-UVWX',
    'YZ12-3456-7890',
  ]);

  const handleCopySecret = () => {
    navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // For demo, accept any 6-digit code
    if (verificationCode.length === 6 && /^\d+$/.test(verificationCode)) {
      setStep('backup');
    } else {
      setError('Invalid verification code. Please try again.');
    }

    setIsLoading(false);
  };

  const handleComplete = () => {
    router.push('/app');
  };

  return (
    <div className="animate-fade-in">
      {/* Back link */}
      <Link
        href="/app"
        className="inline-flex items-center gap-2 text-sm text-foreground-muted hover:text-foreground transition-colors mb-8"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to app
      </Link>

      {/* Logo */}
      <div className="flex items-center gap-2 mb-8">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-secondary flex items-center justify-center">
          <MessageCircle className="w-5 h-5 text-background" />
        </div>
        <span className="text-xl font-bold">
          Freedom<span className="gradient-text">Talk</span>
        </span>
      </div>

      {step === 'setup' && (
        <>
          {/* Header */}
          <div className="mb-8">
            <div className="w-12 h-12 rounded-xl bg-accent-muted flex items-center justify-center mb-4">
              <Shield className="w-6 h-6 text-accent" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Set up Two-Factor Authentication</h1>
            <p className="text-foreground-muted">
              Secure your account with an authenticator app like Google Authenticator or Authy.
            </p>
          </div>

          {/* Steps */}
          <div className="space-y-6 mb-8">
            <div className="card">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-background font-bold text-sm flex-shrink-0">
                  1
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Download an authenticator app</h3>
                  <p className="text-sm text-foreground-muted">
                    Google Authenticator, Authy, or any TOTP-compatible app.
                  </p>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-background font-bold text-sm flex-shrink-0">
                  2
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold mb-3">Scan this QR code</h3>
                  <div className="flex flex-col sm:flex-row items-center gap-4">
                    <div className="p-4 bg-white rounded-xl">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={qrCodeUrl} alt="2FA QR Code" className="w-32 h-32" />
                    </div>
                    <div className="text-center sm:text-left">
                      <p className="text-sm text-foreground-muted mb-2">
                        Or enter this code manually:
                      </p>
                      <div className="flex items-center gap-2">
                        <code className="px-3 py-2 bg-background-surface rounded-lg font-mono text-sm">
                          {secret}
                        </code>
                        <button
                          onClick={handleCopySecret}
                          className="p-2 rounded-lg bg-background-surface hover:bg-accent-muted transition-colors"
                        >
                          {copied ? (
                            <Check className="w-4 h-4 text-accent" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={() => setStep('verify')}
            className="btn btn-primary w-full"
          >
            Continue
          </button>
        </>
      )}

      {step === 'verify' && (
        <>
          {/* Header */}
          <div className="mb-8">
            <div className="w-12 h-12 rounded-xl bg-secondary-muted flex items-center justify-center mb-4">
              <Smartphone className="w-6 h-6 text-secondary" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Verify 2FA Setup</h1>
            <p className="text-foreground-muted">
              Enter the 6-digit code from your authenticator app to verify setup.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleVerify} className="space-y-6">
            <div>
              <label htmlFor="code" className="block text-sm font-medium mb-2">
                Verification Code
              </label>
              <input
                id="code"
                type="text"
                className="input text-center text-2xl tracking-[0.5em] font-mono"
                placeholder="000000"
                maxLength={6}
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                required
              />
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-error/10 border border-error/20 text-error text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary w-full"
              disabled={isLoading || verificationCode.length !== 6}
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-background border-t-transparent rounded-full animate-spin" />
              ) : (
                'Verify & Continue'
              )}
            </button>
          </form>

          <button
            onClick={() => setStep('setup')}
            className="btn btn-ghost w-full mt-4"
          >
            Back to Setup
          </button>
        </>
      )}

      {step === 'backup' && (
        <>
          {/* Header */}
          <div className="mb-8">
            <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center mb-4">
              <Check className="w-6 h-6 text-success" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Save Backup Codes</h1>
            <p className="text-foreground-muted">
              Store these codes securely. You can use them to access your account if you lose your authenticator.
            </p>
          </div>

          {/* Backup codes */}
          <div className="card mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Backup Codes</h3>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(backupCodes.join('\n'));
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="btn btn-ghost text-sm"
              >
                {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                {copied ? 'Copied!' : 'Copy All'}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {backupCodes.map((code, index) => (
                <code
                  key={index}
                  className="px-3 py-2 bg-background-surface rounded-lg font-mono text-sm text-center"
                >
                  {code}
                </code>
              ))}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-warning/10 border border-warning/20 mb-6">
            <p className="text-sm text-warning">
              <strong>Important:</strong> Each code can only be used once. Store them in a safe place.
            </p>
          </div>

          <button onClick={handleComplete} className="btn btn-primary w-full">
            Complete Setup
          </button>
        </>
      )}
    </div>
  );
}
