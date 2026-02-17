'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { MessageCircle, ArrowLeft, Key, Copy, Check, Download } from 'lucide-react';

export default function BackupCodesPage() {
  const router = useRouter();
  const [copied, setCopied] = useState(false);

  // Mock backup codes - in production these would come from the API
  const [backupCodes] = useState([
    'ABCD-EFGH-IJKL',
    'MNOP-QRST-UVWX',
    'YZ12-3456-7890',
    'ABCD-EFGH-IJKL',
    'MNOP-QRST-UVWX',
    'YZ12-3456-7890',
    'ABCD-EFGH-IJKL',
    'MNOP-QRST-UVWX',
  ]);

  const handleCopy = () => {
    navigator.clipboard.writeText(backupCodes.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const content = `FreedomTalk Backup Codes
Generated: ${new Date().toLocaleString()}
IMPORTANT: Keep these codes safe. Each code can only be used once.

${backupCodes.join('\n')}`;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'freedomtalk-backup-codes.txt';
    a.click();
    URL.revokeObjectURL(url);
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

      {/* Header */}
      <div className="mb-8">
        <div className="w-12 h-12 rounded-xl bg-secondary-muted flex items-center justify-center mb-4">
          <Key className="w-6 h-6 text-secondary" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Your Backup Codes</h1>
        <p className="text-foreground-muted">
          These codes can be used to access your account if you lose your authenticator device.
        </p>
      </div>

      {/* Backup codes */}
      <div className="card mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Backup Codes</h3>
          <div className="flex gap-2">
            <button onClick={handleCopy} className="btn btn-ghost text-sm">
              {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
            <button onClick={handleDownload} className="btn btn-ghost text-sm">
              <Download className="w-4 h-4 mr-2" />
              Download
            </button>
          </div>
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
        <h4 className="font-medium text-warning mb-2">Important Security Information</h4>
        <ul className="text-sm text-warning/80 space-y-1">
          <li>• Each backup code can only be used once</li>
          <li>• Store these codes in a secure location</li>
          <li>• Never share these codes with anyone</li>
          <li>• Consider printing them and storing in a safe</li>
        </ul>
      </div>

      <button onClick={() => router.push('/app')} className="btn btn-primary w-full">
        Done
      </button>
    </div>
  );
}
