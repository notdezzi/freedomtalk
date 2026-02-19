'use client';

import { useState } from 'react';
import { Modal, Button } from '@/components/ui';
import { AlertTriangle } from 'lucide-react';
import { useDeleteServer, useServers } from '@/features/servers';
import { useRouter } from 'next/navigation';

interface DeleteServerModalProps {
  serverId: string;
  onClose: () => void;
}

export function DeleteServerModal({ serverId, onClose }: DeleteServerModalProps) {
  const [confirmName, setConfirmName] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const { data: servers = [] } = useServers();
  const server = servers.find(s => s.id === serverId);
  const deleteServer = useDeleteServer();

  const handleDelete = () => {
    if (!server) {
      setError('Server not found');
      return;
    }

    if (confirmName !== server.name) {
      setError(`Please type "${server.name}" to confirm`);
      return;
    }

    deleteServer.mutate(serverId, {
      onSuccess: () => {
        onClose();
        router.push('/app');
      },
      onError: (err: any) => {
        setError(err.message || 'Failed to delete server');
      },
    });
  };

  if (!server) {
    return (
      <Modal open onClose={onClose} className="max-w-md">
        <div className="p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Error</h2>
          <p className="text-red-400 mb-4">Server not found.</p>
          <div className="flex justify-end">
            <Button onClick={onClose} variant="secondary">Close</Button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal open onClose={onClose} className="max-w-md">
      <div className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-red-500/20 rounded-full">
            <AlertTriangle className="h-6 w-6 text-red-500" />
          </div>
          <h2 className="text-xl font-semibold text-white">Delete Server</h2>
        </div>

        <p className="text-gray-400 mb-4">
          Are you sure you want to delete <span className="text-white font-semibold">{server.name}</span>? This action cannot be undone and will permanently delete all channels, messages, and data.
        </p>

        <div className="mb-4">
          <label className="text-xs font-semibold text-gray-400 uppercase mb-2 block">
            Type "{server.name}" to confirm
          </label>
          <input
            type="text"
            value={confirmName}
            onChange={(e) => {
              setConfirmName(e.target.value);
              setError('');
            }}
            className="w-full bg-gray-700 text-white rounded px-3 py-2 border border-gray-600 focus:border-red-500 focus:outline-none"
            placeholder={server.name}
          />
        </div>

        {error && (
          <p className="text-red-400 text-sm mb-4">{error}</p>
        )}

        <div className="flex justify-end gap-2">
          <Button onClick={onClose} variant="secondary">
            Cancel
          </Button>
          <Button
            onClick={handleDelete}
            disabled={confirmName !== server.name || deleteServer.isPending}
            className="bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {deleteServer.isPending ? 'Deleting...' : 'Delete Server'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
