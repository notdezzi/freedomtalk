'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ArrowRight, ArrowLeft, Check } from 'lucide-react';

const interestCategories = [
  {
    id: 'gaming',
    name: 'Gaming',
    emoji: '🎮',
    tags: ['FPS', 'MMORPG', 'Strategy', 'Indie', 'Retro', 'Esports', 'Mobile Games', 'Console'],
  },
  {
    id: 'music',
    name: 'Music',
    emoji: '🎵',
    tags: ['Rock', 'Hip Hop', 'Electronic', 'Jazz', 'Classical', 'Pop', 'Metal', 'Lo-Fi'],
  },
  {
    id: 'tech',
    name: 'Technology',
    emoji: '💻',
    tags: ['Programming', 'AI/ML', 'Web Dev', 'Crypto', 'Hardware', 'Startups', 'Open Source'],
  },
  {
    id: 'art',
    name: 'Art & Design',
    emoji: '🎨',
    tags: ['Digital Art', '3D Modeling', 'Photography', 'UI/UX', 'Animation', 'Drawing'],
  },
  {
    id: 'science',
    name: 'Science',
    emoji: '🔬',
    tags: ['Physics', 'Biology', 'Chemistry', 'Astronomy', 'Mathematics', 'Research'],
  },
  {
    id: 'education',
    name: 'Education',
    emoji: '📚',
    tags: ['Language Learning', 'Study Groups', 'Tutoring', 'Academic', 'Test Prep'],
  },
  {
    id: 'fitness',
    name: 'Fitness',
    emoji: '💪',
    tags: ['Weightlifting', 'Running', 'Yoga', 'Nutrition', 'Sports', 'CrossFit'],
  },
  {
    id: 'entertainment',
    name: 'Entertainment',
    emoji: '🎬',
    tags: ['Movies', 'TV Shows', 'Anime', 'Books', 'Podcasts', 'Streaming'],
  },
  {
    id: 'finance',
    name: 'Finance',
    emoji: '📈',
    tags: ['Investing', 'Trading', 'Personal Finance', 'Crypto', 'Real Estate'],
  },
  {
    id: 'lifestyle',
    name: 'Lifestyle',
    emoji: '✨',
    tags: ['Travel', 'Food', 'Fashion', 'Self-Improvement', 'Meditation', 'DIY'],
  },
  {
    id: 'social',
    name: 'Social',
    emoji: '👋',
    tags: ['Making Friends', 'Dating', 'Community', 'Events', 'Networking'],
  },
  {
    id: 'creator',
    name: 'Content Creator',
    emoji: '📹',
    tags: ['Streaming', 'YouTube', 'Podcasting', 'Writing', 'Music Production'],
  },
];

export default function OnboardingInterestsPage() {
  const router = useRouter();
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const toggleTag = (tag: string) => {
    const newSelected = new Set(selectedTags);
    if (newSelected.has(tag)) {
      newSelected.delete(tag);
    } else {
      newSelected.add(tag);
    }
    setSelectedTags(newSelected);
  };

  const toggleCategory = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  const handleContinue = () => {
    // In a real app, we'd save these interests
    router.push('/onboarding/servers');
  };

  const handleBack = () => {
    router.push('/onboarding/profile');
  };

  const handleSkip = () => {
    router.push('/onboarding/servers');
  };

  return (
    <div className="animate-fade-in max-w-2xl mx-auto w-full">
      {/* Progress indicator */}
      <div className="flex items-center justify-center gap-2 mb-8">
        <div className="w-8 h-1.5 rounded-full bg-accent" />
        <div className="w-8 h-1.5 rounded-full bg-accent" />
        <div className="w-8 h-1.5 rounded-full bg-accent" />
        <div className="w-8 h-1.5 rounded-full bg-border" />
      </div>

      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">What are you interested in?</h1>
        <p className="text-foreground-muted">
          Select topics you&apos;re interested in. We&apos;ll use these to suggest communities for you.
        </p>
      </div>

      {/* Selected count */}
      {selectedTags.size > 0 && (
        <div className="text-center mb-6">
          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent-muted text-accent text-sm font-medium">
            <Check className="w-4 h-4" />
            {selectedTags.size} selected
          </span>
        </div>
      )}

      {/* Categories */}
      <div className="space-y-3 mb-8">
        {interestCategories.map((category) => (
          <div key={category.id} className="card !p-0 overflow-hidden">
            <button
              type="button"
              onClick={() => toggleCategory(category.id)}
              className="w-full flex items-center justify-between p-4 hover:bg-background-surface/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{category.emoji}</span>
                <span className="font-semibold">{category.name}</span>
              </div>
              <svg
                className={`w-5 h-5 text-foreground-subtle transition-transform ${
                  expandedCategories.has(category.id) ? 'rotate-180' : ''
                }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {expandedCategories.has(category.id) && (
              <div className="px-4 pb-4 flex flex-wrap gap-2 animate-fade-in">
                {category.tags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                      selectedTags.has(tag)
                        ? 'bg-accent text-background'
                        : 'bg-background-surface text-foreground-muted hover:text-foreground hover:bg-background-surface/80'
                    }`}
                  >
                    {selectedTags.has(tag) && <Check className="w-3 h-3 inline mr-1" />}
                    {tag}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button onClick={handleBack} className="btn btn-secondary flex-1">
          <ArrowLeft className="w-5 h-5" />
          Back
        </button>
        <button onClick={handleContinue} className="btn btn-primary flex-1">
          Continue
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>

      {/* Skip option */}
      <button onClick={handleSkip} className="btn btn-ghost w-full mt-4">
        Skip this step
      </button>
    </div>
  );
}
