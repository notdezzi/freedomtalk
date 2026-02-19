'use client';

import { useState } from 'react';
import { Modal, Button, Input } from '@/components/ui';
import { cn } from '@/lib/utils';
import { JoinServerModal } from './join-server-modal';
import { useCreateServer } from '@/features/servers';
import { useRouter } from 'next/navigation';

interface CreateServerModalProps {
  onClose: () => void;
}

export function CreateServerModal({ onClose }: CreateServerModalProps) {
  const router = useRouter();
  const [step, setStep] = useState<'choose' | 'create' | 'join'>('choose');
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const createServer = useCreateServer();

  const handleCreate = async () => {
    if (!name.trim()) {
      setError('Server name is required');
      return;
    }

    setError('');

    createServer.mutate(
      { name: name.trim() },
      {
        onSuccess: (data) => {
          // Navigate to the new server
          if (data && 'id' in data) {
            router.push(`/app/servers/${data.id}/channels/first`);
          }
          onClose();
        },
        onError: (err: any) => {
          setError(err.message || 'Failed to create server');
        },
      }
    );
  };

  if (step === 'choose') {
    return (
      <Modal open onClose={onClose} title="Create a Server" size="lg">
        <div className="py-4">
          <p className="text-gray-400 text-center mb-6">
            Your server is where you and your friends hang out. Make yours and start talking.
          </p>

          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setStep('create')}
              className={cn(
                'flex flex-col items-center gap-3 rounded-lg border-2 border-gray-600 p-4',
                'hover:border-blue-500 hover:bg-blue-500/10 transition-colors'
              )}
            >
              <div className="text-4xl">🎮</div>
              <span className="font-medium text-white">Create My Own</span>
            </button>

            <button
              onClick={() => setStep('join')}
              className={cn(
                'flex flex-col items-center gap-3 rounded-lg border-2 border-gray-600 p-4',
                'hover:border-blue-500 hover:bg-blue-500/10 transition-colors'
              )}
            >
              <div className="text-4xl">👥</div>
              <span className="font-medium text-white">Join a Server</span>
            </button>
          </div>
        </div>
      </Modal>
    );
  }

  if (step === 'join') {
    return (
      <JoinServerModal onClose={onClose} />
    );
  }

  return (
    <Modal open onClose={onClose} title="Create a Server" size="md">
      <div className="py-4">
        <p className="text-gray-400 text-sm mb-4">
          Give your new server a personality with a name and an icon. You can always change it later.
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-300 uppercase mb-2">
              Server Name
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Awesome Server"
              error={error}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={() => setStep('choose')}>
              Back
            </Button>
            <Button onClick={handleCreate} loading={createServer.isPending}>
              Create
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
