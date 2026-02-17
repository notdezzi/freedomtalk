'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ArrowRight, Sparkles, Users, Zap, Shield } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export default function OnboardingWelcomePage() {
  const router = useRouter();
  const { user } = useAuth();
  const [isHovered, setIsHovered] = useState(false);

  const handleContinue = () => {
    router.push('/onboarding/profile');
  };

  const handleSkip = () => {
    router.push('/onboarding/servers');
  };

  return (
    <div className="animate-fade-in max-w-2xl mx-auto text-center">
      {/* Badge */}
      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent-muted border border-accent/20 mb-8">
        <Sparkles className="w-4 h-4 text-accent" />
        <span className="text-sm font-medium text-accent">Let&apos;s get you started</span>
      </div>

      {/* Welcome message */}
      <h1 className="text-4xl sm:text-5xl font-bold mb-4">
        Welcome to FreedomTalk
        {user?.username && (
          <span className="gradient-text">, {user.username}</span>
        )}
        !
      </h1>

      <p className="text-lg text-foreground-muted mb-12 max-w-lg mx-auto">
        We&apos;re excited to have you here. Let&apos;s set up your profile and get you connected with your community.
      </p>

      {/* Features preview */}
      <div className="grid sm:grid-cols-3 gap-4 mb-12">
        <div className="card text-center">
          <div className="w-12 h-12 rounded-xl bg-accent-muted flex items-center justify-center mx-auto mb-3">
            <Zap className="w-6 h-6 text-accent" />
          </div>
          <h3 className="font-semibold mb-1">Real-time Chat</h3>
          <p className="text-sm text-foreground-muted">Instant messaging with zero lag</p>
        </div>
        <div className="card text-center">
          <div className="w-12 h-12 rounded-xl bg-secondary-muted flex items-center justify-center mx-auto mb-3">
            <Users className="w-6 h-6 text-secondary" />
          </div>
          <h3 className="font-semibold mb-1">Communities</h3>
          <p className="text-sm text-foreground-muted">Join or create servers</p>
        </div>
        <div className="card text-center">
          <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center mx-auto mb-3">
            <Shield className="w-6 h-6 text-success" />
          </div>
          <h3 className="font-semibold mb-1">Secure</h3>
          <p className="text-sm text-foreground-muted">End-to-end encrypted</p>
        </div>
      </div>

      {/* CTA buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
        <button
          onClick={handleContinue}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          className="btn btn-primary text-base px-8 py-4 group"
        >
          Set Up Profile
          <ArrowRight className={`w-5 h-5 transition-transform ${isHovered ? 'translate-x-1' : ''}`} />
        </button>
        <button onClick={handleSkip} className="btn btn-ghost text-base px-8 py-4">
          Skip for now
        </button>
      </div>

      {/* Progress indicator */}
      <div className="flex items-center justify-center gap-2 mt-12">
        <div className="w-8 h-1.5 rounded-full bg-accent" />
        <div className="w-8 h-1.5 rounded-full bg-border" />
        <div className="w-8 h-1.5 rounded-full bg-border" />
        <div className="w-8 h-1.5 rounded-full bg-border" />
      </div>
    </div>
  );
}
