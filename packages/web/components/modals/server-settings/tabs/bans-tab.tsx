'use client';

interface BansTabProps {
  serverId: string;
}

export function BansTab({ serverId }: BansTabProps) {
  return (
    <div>
      <h3 className="text-xl font-semibold text-white mb-6">Bans</h3>
      <p className="text-gray-400">Ban management coming soon...</p>
    </div>
  );
}
