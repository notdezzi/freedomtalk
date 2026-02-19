'use client';

import { useRouter } from 'next/navigation';
import { useState, useRef } from 'react';
import { ArrowRight, ArrowLeft, Camera, User, X, Check } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';

export default function OnboardingProfilePage() {
  const router = useRouter();
  const { user, updateProfile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [username, setUsername] = useState(user?.username || '');
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState(user?.bio || '');
  const [avatar, setAvatar] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [error, setError] = useState('');

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 8 * 1024 * 1024) {
        setError('Image must be less than 8MB');
        return;
      }

      setAvatarFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        setAvatar(event.target?.result as string);
      };
      reader.readAsDataURL(file);
      setError('');
    }
  };

  const handleRemoveAvatar = () => {
    setAvatar(null);
    setAvatarFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username.trim()) {
      setError('Username is required');
      return;
    }

    if (username.length < 2 || username.length > 32) {
      setError('Username must be between 2 and 32 characters');
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      setError('Username can only contain letters, numbers, and underscores');
      return;
    }

    // Update profile (this now calls the API)
    await updateProfile({
      username: username.toLowerCase(),
      bio,
      avatar: avatar || undefined,
      displayName: displayName.trim() || undefined,
    });

    router.push('/onboarding/interests');
  };

  const handleBack = () => {
    router.push('/onboarding');
  };

  return (
    <div className="animate-fade-in max-w-lg mx-auto w-full">
      {/* Progress indicator */}
      <div className="flex items-center justify-center gap-2 mb-8">
        <div className="w-8 h-1.5 rounded-full bg-accent" />
        <div className="w-8 h-1.5 rounded-full bg-accent" />
        <div className="w-8 h-1.5 rounded-full bg-border" />
        <div className="w-8 h-1.5 rounded-full bg-border" />
      </div>

      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Set up your profile</h1>
        <p className="text-foreground-muted">
          Tell us a bit about yourself. You can always change this later.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Avatar */}
        <div className="flex flex-col items-center">
          <div className="relative group">
            <button
              type="button"
              onClick={handleAvatarClick}
              className="w-28 h-28 rounded-full bg-background-surface border-2 border-border hover:border-accent transition-colors overflow-hidden flex items-center justify-center"
            >
              {avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatar}
                  alt="Avatar preview"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center text-foreground-subtle group-hover:text-foreground transition-colors">
                  <Camera className="w-8 h-8 mb-1" />
                  <span className="text-xs">Upload</span>
                </div>
              )}
            </button>
            {avatar && (
              <button
                type="button"
                onClick={handleRemoveAvatar}
                className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-error flex items-center justify-center text-white hover:bg-error/80 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleAvatarChange}
            className="hidden"
          />
          <p className="text-sm text-foreground-subtle mt-3">
            Click to upload an avatar (max 8MB)
          </p>
        </div>

        {/* Username */}
        <div>
          <label htmlFor="username" className="block text-sm font-medium mb-2">
            Username <span className="text-error">*</span>
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground-subtle">@</span>
            <input
              id="username"
              type="text"
              className="input pl-10"
              placeholder="username"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
              maxLength={32}
              required
            />
          </div>
          <p className="text-xs text-foreground-subtle mt-1">
            {username.length}/32 characters
          </p>
        </div>

        {/* Display name (optional) */}
        <div>
          <label htmlFor="displayName" className="block text-sm font-medium mb-2">
            Display Name <span className="text-foreground-subtle">(optional)</span>
          </label>
          <div className="relative">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground-subtle" />
            <input
              id="displayName"
              type="text"
              className="input pl-12"
              placeholder="How you want to be known"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={32}
            />
          </div>
        </div>

        {/* Bio */}
        <div>
          <label htmlFor="bio" className="block text-sm font-medium mb-2">
            About Me <span className="text-foreground-subtle">(optional)</span>
          </label>
          <textarea
            id="bio"
            className="input min-h-[100px] resize-none"
            placeholder="Tell us a bit about yourself..."
            value={bio}
            onChange={(e) => setBio(e.target.value.slice(0, 190))}
            maxLength={190}
          />
          <p className="text-xs text-foreground-subtle mt-1">
            {bio.length}/190 characters
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="p-3 rounded-lg bg-error/10 border border-error/20 text-error text-sm">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          <button type="button" onClick={handleBack} className="btn btn-secondary flex-1">
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>
          <button type="submit" className="btn btn-primary flex-1">
            Continue
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </form>

      {/* Skip option */}
      <button
        onClick={() => router.push('/onboarding/interests')}
        className="btn btn-ghost w-full mt-4"
      >
        Skip this step
      </button>
    </div>
  );
}
