'use client';

interface RolesTabProps {
  serverId: string;
}

export function RolesTab({ serverId }: RolesTabProps) {
  return (
    <div>
      <h3 className="text-xl font-semibold text-white mb-6">Roles</h3>
      <p className="text-gray-400">Roles management coming soon...</p>
    </div>
  );
}
