'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button, Input } from '@/components/ui';
import { useServer, useUpdateServer } from '@/features/servers';
import { toast } from '@/stores/toast-store';
import { apiClient } from '@/lib/api-client';
import { Image, Upload, Link as LinkIcon, Check, X, Loader2 } from 'lucide-react';

interface OverviewTabProps {
  serverId: string;
}

export function OverviewTab({ serverId }: OverviewTabProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isUploadingIcon, setIsUploadingIcon] = useState(false);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  // Vanity URL state
  const [vanityUrl, setVanityUrl] = useState('');
  const [originalVanityUrl, setOriginalVanityUrl] = useState('');
  const [isCheckingVanity, setIsCheckingVanity] = useState(false);
  const [vanityAvailable, setVanityAvailable] = useState<boolean | null>(null);
  const [isSavingVanity, setIsSavingVanity] = useState(false);

  const { data: server, isLoading } = useServer(serverId);
  const updateServer = useUpdateServer();

  // Initialize form when server loads
  useEffect(() => {
    if (server) {
      setName(server.name || '');
      setDescription(server.description || '');
      const initialVanity = (server as any).vanityUrlCode || (server as any).vanity_url_code || '';
      setVanityUrl(initialVanity);
      setOriginalVanityUrl(initialVanity);
    }
  }, [server]);

  // Check vanity URL availability
  const checkVanityAvailability = useCallback(async (code: string) => {
    if (!code || code.length < 2) {
      setVanityAvailable(null);
      return;
    }

    // Validate format
    if (!/^[a-z0-9-]+$/.test(code)) {
      setVanityAvailable(false);
      return;
    }

    // Skip check if unchanged
    if (code === originalVanityUrl) {
      setVanityAvailable(null);
      return;
    }

    setIsCheckingVanity(true);
    try {
      const response = await apiClient.checkVanityUrlAvailability(serverId, code);
      if (response.success && response.data) {
        setVanityAvailable(response.data.available);
      } else {
        setVanityAvailable(false);
      }
    } catch (error) {
      setVanityAvailable(false);
    } finally {
      setIsCheckingVanity(false);
    }
  }, [serverId, originalVanityUrl]);

  // Debounced vanity URL check
  useEffect(() => {
    const timer = setTimeout(() => {
      if (vanityUrl !== originalVanityUrl) {
        checkVanityAvailability(vanityUrl);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [vanityUrl, originalVanityUrl, checkVanityAvailability]);

  // Save vanity URL
  const handleSaveVanityUrl = async () => {
    if (vanityAvailable === false) return;

    setIsSavingVanity(true);
    try {
      await updateServer.mutateAsync({
        serverId,
        data: { vanityUrlCode: vanityUrl || null },
      });
      setOriginalVanityUrl(vanityUrl);
      setVanityAvailable(null);
      toast.success('Vanity URL updated');
    } catch (error) {
      toast.error('Failed to update vanity URL');
    } finally {
      setIsSavingVanity(false);
    }
  };

  const handleSave = () => {
    updateServer.mutate(
      { serverId, data: { name, description } },
      { onSuccess: () => {
        toast.success('Server settings saved');
      }}
    );
  };

  const handleIconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (max 8MB)
    if (file.size > 8 * 1024 * 1024) {
      toast.error('Image must be less than 8MB');
      return;
    }

    setIsUploadingIcon(true);
    try {
      // Create form data
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'icon');

      // Upload to server icon endpoint
      const response = await apiClient.uploadServerIcon(serverId, formData);

      if (response.success) {
        toast.success('Server icon updated');
        // Refresh server data
        updateServer.mutate({ serverId, data: {} });
      } else {
        toast.error(response.error?.message || 'Failed to upload icon');
      }
    } catch (error) {
      console.error('Icon upload error:', error);
      toast.error('Failed to upload icon');
    } finally {
      setIsUploadingIcon(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (max 8MB)
    if (file.size > 8 * 1024 * 1024) {
      toast.error('Image must be less than 8MB');
      return;
    }

    setIsUploadingBanner(true);
    try {
      // Create form data
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'banner');

      // Upload to server banner endpoint
      const response = await apiClient.uploadServerBanner(serverId, formData);

      if (response.success) {
        toast.success('Server banner updated');
        // Refresh server data
        updateServer.mutate({ serverId, data: {} });
      } else {
        toast.error(response.error?.message || 'Failed to upload banner');
      }
    } catch (error) {
      console.error('Banner upload error:', error);
      toast.error('Failed to upload banner');
    } finally {
      setIsUploadingBanner(false);
      if (bannerInputRef.current) {
        bannerInputRef.current.value = '';
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-xl font-semibold text-foreground mb-6">Server Overview</h3>

      <div className="space-y-6">
        {/* Server Banner */}
        <div>
          <label className="text-xs font-semibold text-foreground-muted uppercase mb-2 block">
            Server Banner
          </label>
          <button
            type="button"
            className="relative h-32 w-full rounded-lg bg-background-surface overflow-hidden cursor-pointer group border-2 border-dashed border-border hover:border-accent transition-colors"
            onClick={() => bannerInputRef.current?.click()}
          >
            {server?.banner ? (
              <img
                src={server.banner}
                alt={server.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center">
                <Image className="h-8 w-8 text-foreground-subtle" />
              </div>
            )}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <div className="text-white text-sm font-medium flex items-center gap-2">
                <Upload className="h-4 w-4" />
                {isUploadingBanner ? 'Uploading...' : 'Upload Banner'}
              </div>
            </div>
          </button>
          <input
            ref={bannerInputRef}
            type="file"
            accept="image/*"
            onChange={handleBannerUpload}
            className="hidden"
          />
        </div>

        {/* Server Icon */}
        <div>
          <label className="text-xs font-semibold text-foreground-muted uppercase mb-2 block">
            Server Icon
          </label>
          <div className="flex items-center gap-4">
            <button
              type="button"
              className="h-20 w-20 rounded-lg bg-background-surface flex items-center justify-center text-3xl cursor-pointer group relative overflow-hidden border-2 border-dashed border-border hover:border-accent transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              {server?.icon ? (
                <img
                  src={server.icon}
                  alt={server.name}
                  className="h-full w-full rounded-lg object-cover"
                />
              ) : (
                <span className="text-foreground-muted">
                  {name.charAt(0).toUpperCase() || '?'}
                </span>
              )}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
                <Upload className="h-5 w-5 text-white" />
              </div>
            </button>
            <div className="flex flex-col gap-1">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                loading={isUploadingIcon}
              >
                {isUploadingIcon ? 'Uploading...' : 'Change Icon'}
              </Button>
              <span className="text-xs text-foreground-subtle">
                Minimum size: 64x64. Recommended: 512x512
              </span>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleIconUpload}
              className="hidden"
            />
          </div>
        </div>

        {/* Server Name */}
        <div>
          <label className="text-xs font-semibold text-foreground-muted uppercase mb-2 block">
            Server Name
          </label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My Awesome Server"
          />
        </div>

        {/* Description */}
        <div>
          <label className="text-xs font-semibold text-foreground-muted uppercase mb-2 block">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="w-full bg-background-surface text-foreground rounded-lg px-3 py-2 border border-border focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/50 resize-none"
            placeholder="Tell the world about your server"
          />
        </div>

        {/* Vanity URL */}
        <div>
          <label className="text-xs font-semibold text-foreground-muted uppercase mb-2 block">
            Vanity URL
          </label>
          <div className="flex items-center gap-2">
            <div className="flex-1 relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center text-foreground-muted text-sm">
                <LinkIcon className="h-4 w-4 mr-1" />
                {window.location.origin}/invite/v/
              </div>
              <input
                type="text"
                value={vanityUrl}
                onChange={(e) => {
                  const value = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
                  setVanityUrl(value);
                  setVanityAvailable(null);
                }}
                placeholder="my-server"
                className="w-full bg-background-surface text-foreground rounded-lg pl-[180px] pr-10 py-2 border border-border focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/50"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {isCheckingVanity && (
                  <Loader2 className="h-4 w-4 animate-spin text-foreground-muted" />
                )}
                {!isCheckingVanity && vanityAvailable === true && (
                  <Check className="h-4 w-4 text-success" />
                )}
                {!isCheckingVanity && vanityAvailable === false && (
                  <X className="h-4 w-4 text-error" />
                )}
              </div>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleSaveVanityUrl}
              disabled={
                isSavingVanity ||
                vanityUrl === originalVanityUrl ||
                vanityAvailable === false
              }
            >
              {isSavingVanity ? 'Saving...' : 'Save'}
            </Button>
          </div>
          <p className="text-xs text-foreground-subtle mt-2">
            Use lowercase letters, numbers, and hyphens only. Minimum 2 characters.
          </p>
          {vanityAvailable === false && (
            <p className="text-xs text-error mt-1">
              This vanity URL is already taken.
            </p>
          )}
          {vanityUrl && vanityAvailable === true && (
            <p className="text-xs text-success mt-1">
              Vanity URL is available!
            </p>
          )}
        </div>
      </div>

      <div className="mt-6 pt-4 border-t border-border flex justify-end">
        <Button
          onClick={handleSave}
          disabled={updateServer.isPending || !name.trim()}
        >
          {updateServer.isPending ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
}
