'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ArrowRight, ArrowLeft, Plus, Users, Hash, Search, Compass } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';

const suggestedServers = [
  {
    id: '1',
    name: 'FreedomTalk Official',
    icon: 'FT',
    color: 'from-accent to-secondary',
    members: 15234,
    description: 'The official FreedomTalk community. Get help, share feedback, and connect with the team.',
    tags: ['Official', 'Community', 'Support'],
  },
  {
    id: '2',
    name: 'Gaming Hub',
    icon: 'GH',
    color: 'from-purple-500 to-pink-500',
    members: 8923,
    description: 'Find gaming buddies, join tournaments, and discuss your favorite games.',
    tags: ['Gaming', 'Esports', 'Community'],
  },
  {
    id: '3',
    name: 'Developer Den',
    icon: 'DD',
    color: 'from-green-500 to-teal-500',
    members: 12456,
    description: 'A community for developers of all skill levels. Share code, get help, and learn together.',
    tags: ['Programming', 'Tech', 'Learning'],
  },
  {
    id: '4',
    name: 'Music Lovers',
    icon: 'ML',
    color: 'from-orange-500 to-red-500',
    members: 6789,
    description: 'Share and discover music, discuss artists, and find people with similar taste.',
    tags: ['Music', 'Community', 'Social'],
  },
  {
    id: '5',
    name: 'Art & Creativity',
    icon: 'AC',
    color: 'from-blue-500 to-indigo-500',
    members: 5432,
    description: 'Share your art, get feedback, and participate in weekly art challenges.',
    tags: ['Art', 'Creative', 'Community'],
  },
  {
    id: '6',
    name: 'Anime Central',
    icon: 'AC',
    color: 'from-pink-500 to-rose-500',
    members: 9876,
    description: 'Discuss anime, manga, and Japanese culture with fellow fans.',
    tags: ['Anime', 'Entertainment', 'Social'],
  },
];

export default function OnboardingServersPage() {
  const router = useRouter();
  const { completeOnboarding } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [joinedServers, setJoinedServers] = useState<Set<string>>(new Set());
  const [showCreateModal, setShowCreateModal] = useState(false);

  const filteredServers = suggestedServers.filter((server) =>
    server.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    server.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleJoinServer = (serverId: string) => {
    const newJoined = new Set(joinedServers);
    if (newJoined.has(serverId)) {
      newJoined.delete(serverId);
    } else {
      newJoined.add(serverId);
    }
    setJoinedServers(newJoined);
  };

  const handleCreateServer = () => {
    setShowCreateModal(true);
  };

  const handleFinish = () => {
    // In a real app, we'd save the joined servers
    completeOnboarding();
  };

  const handleBack = () => {
    router.push('/onboarding/interests');
  };

  return (
    <div className="animate-fade-in max-w-3xl mx-auto w-full">
      {/* Progress indicator */}
      <div className="flex items-center justify-center gap-2 mb-8">
        <div className="w-8 h-1.5 rounded-full bg-accent" />
        <div className="w-8 h-1.5 rounded-full bg-accent" />
        <div className="w-8 h-1.5 rounded-full bg-accent" />
        <div className="w-8 h-1.5 rounded-full bg-accent" />
      </div>

      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Join some servers</h1>
        <p className="text-foreground-muted">
          Discover communities that match your interests, or create your own.
        </p>
      </div>

      {/* Search and actions */}
      <div className="flex gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground-subtle" />
          <input
            type="text"
            className="input pl-12"
            placeholder="Search servers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <button onClick={handleCreateServer} className="btn btn-primary">
          <Plus className="w-5 h-5" />
          Create Server
        </button>
      </div>

      {/* Joined count */}
      {joinedServers.size > 0 && (
        <div className="text-center mb-6">
          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent-muted text-accent text-sm font-medium">
            <Hash className="w-4 h-4" />
            Joining {joinedServers.size} server{joinedServers.size !== 1 ? 's' : ''}
          </span>
        </div>
      )}

      {/* Server grid */}
      <div className="grid sm:grid-cols-2 gap-4 mb-8">
        {filteredServers.map((server) => (
          <div
            key={server.id}
            className={`card cursor-pointer transition-all ${
              joinedServers.has(server.id) ? 'border-accent bg-accent/5' : ''
            }`}
            onClick={() => handleJoinServer(server.id)}
          >
            <div className="flex items-start gap-4">
              <div
                className={`w-14 h-14 rounded-xl bg-gradient-to-br ${server.color} flex items-center justify-center text-white font-bold text-lg flex-shrink-0`}
              >
                {server.icon}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold mb-1 truncate">{server.name}</h3>
                <div className="flex items-center gap-2 text-sm text-foreground-muted mb-2">
                  <Users className="w-4 h-4" />
                  {server.members.toLocaleString()} members
                </div>
                <p className="text-sm text-foreground-subtle line-clamp-2">
                  {server.description}
                </p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {server.tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 rounded-full bg-background-surface text-xs text-foreground-muted"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Discovery link */}
      <div className="text-center mb-8">
        <button
          onClick={() => router.push('/discover')}
          className="inline-flex items-center gap-2 text-accent hover:text-accent-hover transition-colors"
        >
          <Compass className="w-5 h-5" />
          Explore more servers in Discovery
        </button>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button onClick={handleBack} className="btn btn-secondary flex-1">
          <ArrowLeft className="w-5 h-5" />
          Back
        </button>
        <button onClick={handleFinish} className="btn btn-primary flex-1">
          Finish Setup
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>

      {/* Create server modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="card max-w-md w-full animate-fade-in">
            <h2 className="text-xl font-bold mb-4">Create Your Server</h2>
            <p className="text-foreground-muted mb-6">
              Create a space for your community. You can customize everything later.
            </p>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium mb-2">Server Name</label>
                <input
                  type="text"
                  className="input"
                  placeholder="My Awesome Server"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="btn btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  completeOnboarding();
                }}
                className="btn btn-primary flex-1"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
