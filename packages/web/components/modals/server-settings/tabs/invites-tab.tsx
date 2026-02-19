'use client';

interface InvitesTabProps {
  serverId: string;
}

export function InvitesTab({ serverId }: InvitesTabProps) {
  return (
    <div>
      <h3 className="text-xl font-semibold text-white mb-6">Invites</h3>
      <p className="text-gray-400">Invite management coming soon...</p>
    </div>
  );
}
