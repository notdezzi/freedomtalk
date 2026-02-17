'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { X, Upload, ArrowRight, Loader2 } from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';
import { useServerStore, Server } from '@/stores/serverStore';
import { apiClient } from '@/lib/api-client';

const templates = [
  {
    id: 'gaming',
    name: 'Gaming',
    description: 'For gaming communities',
    emoji: '🎮',
  },
  {
    id: 'friends',
    name: 'Friends',
    description: 'For hanging out with friends',
    emoji: '👋',
  },
  {
    id: 'creators',
    name: 'Content Creators',
    description: 'For building your community',
    emoji: '🎬',
  },
  {
    id: 'study',
    name: 'Study Group',
    description: 'For learning together',
    emoji: '📚',
  },
];

export default function CreateServerModal() {
  const router = useRouter();
  const { activeModal, closeModal } = useUIStore();
  const { addServer, setCurrentServer, fetchServers } = useServerStore();

  const [step, setStep] = useState<'choose' | 'create'>('choose');
  const [serverName, setServerName] = useState('');
  const [serverIcon, setServerIcon] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const isOpen = activeModal.type === 'create-server';

  const handleClose = () => {
    closeModal();
    setStep('choose');
    setServerName('');
    setServerIcon(null);
    setError('');
  };

  const handleChooseTemplate = (templateId: string) => {
    const template = templates.find((t) => t.id === templateId);
    if (template) {
      setServerName(`My ${template.name} Server`);
    }
    setStep('create');
  };

  const handleCreateMyOwn = () => {
    setStep('create');
  };

  const handleIconChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setServerIcon(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreate = async () => {
    setError('');

    if (!serverName.trim()) {
      setError('Server name is required');
      return;
    }

    if (serverName.length < 2 || serverName.length > 100) {
      setError('Server name must be between 2 and 100 characters');
      return;
    }

    setIsLoading(true);

    try {
      // Call the real API to create the server
      const response = await apiClient.createServer({
        name: serverName.trim(),
        iconUrl: serverIcon || undefined,
      });

      if (response.success && response.data) {
        // Check if data is an array (unexpected)
        if (Array.isArray(response.data)) {
          setError('Unexpected response format from server');
          return;
        }

        // API returns snake_case, map to camelCase
        const data = response.data as unknown as Record<string, unknown>;

        const newServer: Server = {
          id: String(data.id ?? ''),
          name: String(data.name ?? serverName.trim()),
          icon: (data.icon_url ?? data.icon) as string | undefined,
          banner: (data.banner_url ?? data.banner) as string | undefined,
          description: data.description as string | undefined,
          ownerId: String(data.owner_id ?? data.ownerId ?? ''),
          memberCount: Number(data.member_count ?? data.memberCount ?? 1),
          onlineCount: Number(data.online_count ?? data.onlineCount ?? 1),
          createdAt: String(data.created_at ?? data.createdAt ?? ''),
          isOwner: true,
        };

        // Validate server ID before proceeding (snowflake IDs are typically 18-20 characters)
        if (!newServer.id || newServer.id.length < 15) {
          setError('Server created but received invalid ID. Please refresh.');
          return;
        }

        // Add to local store
        addServer(newServer);
        setCurrentServer(newServer.id);

        // Refresh servers from API to get complete data
        await fetchServers();

        handleClose();

        // Navigate to the new server
        router.push(`/app/servers/${newServer.id}`);
      } else {
        setError(response.error?.message || 'Failed to create server');
      }
    } catch (err) {
      setError('An unexpected error occurred');
      console.error('Server creation error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div
        className="card max-w-md w-full animate-fade-in max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {step === 'choose' && (
          <>
            {/* Header */}
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold mb-2">Create a server</h2>
              <p className="text-foreground-muted">
                Your server is where you and your friends hang out. Make yours and start talking.
              </p>
            </div>

            {/* Templates */}
            <div className="space-y-2 mb-6">
              {templates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => handleChooseTemplate(template.id)}
                  className="w-full flex items-center gap-4 p-3 rounded-lg border border-border hover:border-accent hover:bg-accent/5 transition-colors"
                >
                  <span className="text-2xl">{template.emoji}</span>
                  <div className="flex-1 text-left">
                    <h3 className="font-semibold">{template.name}</h3>
                    <p className="text-sm text-foreground-muted">{template.description}</p>
                  </div>
                </button>
              ))}
            </div>

            {/* Create my own */}
            <button
              onClick={handleCreateMyOwn}
              className="w-full flex items-center justify-center gap-2 p-3 rounded-lg border border-border hover:border-accent hover:bg-accent/5 transition-colors mb-6"
            >
              <span className="font-semibold">Create my own</span>
            </button>

            {/* Already have an invite? */}
            <div className="text-center">
              <button
                onClick={() => {
                  closeModal();
                  // Open join server modal
                }}
                className="text-sm text-accent hover:text-accent-hover transition-colors"
              >
                Already have an invite?
              </button>
            </div>

            {/* Close button */}
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 p-2 rounded-lg hover:bg-background-surface transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </>
        )}

        {step === 'create' && (
          <>
            {/* Header */}
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold mb-2">Customize your server</h2>
              <p className="text-foreground-muted">
                Give your new server a personality with a name and an icon. You can always change it later.
              </p>
            </div>

            {/* Form */}
            <div className="space-y-6 mb-6">
              {/* Icon upload */}
              <div className="flex flex-col items-center">
                <label className="relative cursor-pointer group">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleIconChange}
                    className="hidden"
                  />
                  <div className="w-24 h-24 rounded-full border-2 border-dashed border-border hover:border-accent flex items-center justify-center overflow-hidden transition-colors">
                    {serverIcon ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={serverIcon}
                        alt="Server icon"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex flex-col items-center text-foreground-subtle group-hover:text-foreground transition-colors">
                        <Upload className="w-8 h-8 mb-1" />
                        <span className="text-xs">Upload</span>
                      </div>
                    )}
                  </div>
                </label>
                <p className="text-sm text-foreground-subtle mt-2">
                  Minimum size: 64x64, recommended: 512x512
                </p>
              </div>

              {/* Server name */}
              <div>
                <label htmlFor="serverName" className="block text-sm font-medium mb-2">
                  Server Name <span className="text-error">*</span>
                </label>
                <input
                  id="serverName"
                  type="text"
                  className="input"
                  placeholder="My Awesome Server"
                  value={serverName}
                  onChange={(e) => setServerName(e.target.value)}
                  maxLength={100}
                  autoFocus
                />
                <p className="text-xs text-foreground-subtle mt-1">
                  {serverName.length}/100 characters
                </p>
              </div>

              {/* Error */}
              {error && (
                <div className="p-3 rounded-lg bg-error/10 border border-error/20 text-error text-sm">
                  {error}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => setStep('choose')}
                className="btn btn-ghost flex-1"
                disabled={isLoading}
              >
                Back
              </button>
              <button
                onClick={handleCreate}
                disabled={isLoading}
                className="btn btn-primary flex-1"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Create
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>

            {/* Close button */}
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 p-2 rounded-lg hover:bg-background-surface transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
