'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Hash, Loader2 } from 'lucide-react';
import { useChannelStore } from '@/stores/channelStore';
import { useServerStore } from '@/stores/serverStore';

export default function ServerPage() {
  const params = useParams();
  const router = useRouter();
  const serverId = params.serverId as string;

  const { setCurrentServer, servers } = useServerStore();
  const { getChannelsByServer, setCurrentChannel } = useChannelStore();

  useEffect(() => {
    if (serverId) {
      setCurrentServer(serverId);

      // Find first text channel and redirect
      const { channels } = getChannelsByServer(serverId);
      const firstTextChannel = channels.find((ch) => ch.type === 'text');

      if (firstTextChannel) {
        setCurrentChannel(firstTextChannel.id);
        router.replace(`/app/servers/${serverId}/channels/${firstTextChannel.id}`);
      }
    }
  }, [serverId, setCurrentServer, getChannelsByServer, setCurrentChannel, router]);

  const server = servers.find((s) => s.id === serverId);

  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 rounded-full bg-background-surface flex items-center justify-center mx-auto mb-4">
          {server?.icon ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={server.icon} alt="" className="w-full h-full rounded-full object-cover" />
          ) : (
            <Hash className="w-8 h-8 text-foreground-subtle" />
          )}
        </div>
        <h2 className="text-xl font-semibold mb-2">{server?.name || 'Server'}</h2>
        <div className="flex items-center justify-center gap-2 text-foreground-muted">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Loading channels...</span>
        </div>
      </div>
    </div>
  );
}
