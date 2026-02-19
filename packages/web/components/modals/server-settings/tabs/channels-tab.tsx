'use client';

interface ChannelsTabProps {
  serverId: string;
}

export function ChannelsTab({ serverId }: ChannelsTabProps) {
  return (
    <div>
      <h3 className="text-xl font-semibold text-white mb-6">Channels</h3>
      <p className="text-gray-400">Channel permissions coming soon...</p>
    </div>
  );
}
