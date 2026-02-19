'use client';

import { useState, useEffect } from 'react';
import { Button, Input } from '@/components/ui';
import { useServer, useUpdateServer } from '@/features/servers';

interface OverviewTabProps {
  serverId: string;
}

export function OverviewTab({ serverId }: OverviewTabProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const { data: server, isLoading } = useServer(serverId);
  const updateServer = useUpdateServer();

  // Initialize form when server loads
  useEffect(() => {
    if (server) {
      setName(server.name || '');
      setDescription(server.description || '');
    }
  }, [server]);

  const handleSave = () => {
    updateServer.mutate(
      { serverId, data: { name, description } },
      { onSuccess: () => {
        // Could show a success toast here
      }}
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-xl font-semibold text-white mb-6">Server Overview</h3>

      <div className="space-y-6">
        {/* Server Icon */}
        <div>
          <label className="text-xs font-semibold text-gray-400 uppercase mb-2 block">
            Server Icon
          </label>
          <div className="flex items-center gap-4">
            <div className="h-20 w-20 rounded-lg bg-gray-700 flex items-center justify-center text-3xl">
              {server?.icon ? (
                <img
                  src={server.icon}
                  alt={server.name}
                  className="h-full w-full rounded-lg object-cover"
                />
              ) : (
                <span className="text-gray-400">
                  {name.charAt(0).toUpperCase() || '?'}
                </span>
              )}
            </div>
            <Button variant="secondary" size="sm">
              Change Icon
            </Button>
          </div>
        </div>

        {/* Server Name */}
        <div>
          <label className="text-xs font-semibold text-gray-400 uppercase mb-2 block">
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
          <label className="text-xs font-semibold text-gray-400 uppercase mb-2 block">
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
