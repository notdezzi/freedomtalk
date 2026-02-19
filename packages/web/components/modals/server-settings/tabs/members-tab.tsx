'use client';

interface MembersTabProps {
  serverId: string;
}

export function MembersTab({ serverId }: MembersTabProps) {
  return (
    <div>
      <h3 className="text-xl font-semibold text-white mb-6">Members</h3>
      <p className="text-gray-400">Member management coming soon...</p>
    </div>
  );
}
