'use client';

import { useState } from 'react';
import { Modal, Button, Input } from '@/components/ui';
import { cn } from '@/lib/utils';

interface JoinServerModalProps {
  onClose: () => void;
  initialCode?: string;
}

export function JoinServerModal({ onClose, initialCode = '' }: JoinServerModalProps) {
  const [code, setCode] = useState(initialCode);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [inviteInfo, setInviteInfo] = useState<{
    serverName: string;
    serverIcon?: string;
    memberCount: number;
  } | null>(null);

  const handleCheckInvite = async () => {
    if (!code.trim()) {
      setError('Please enter an invite code');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // TODO: Call API to check invite
      await new Promise((resolve) => setTimeout(resolve, 500));
      setInviteInfo({
        serverName: 'Awesome Server',
        memberCount: 42,
      });
    } catch (err) {
      setError('Invalid invite code');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    setLoading(true);
    setError('');

    try {
      // TODO: Call API to join server
      await new Promise((resolve) => setTimeout(resolve, 1000));
      onClose();
    } catch (err) {
      setError('Failed to join server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open onClose={onClose} title="Join a Server" size="md">
      <div className="py-4">
        <p className="text-gray-400 text-sm mb-4">
          Enter an invite below to join an existing server
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-300 uppercase mb-2">
              Invite Link <span className="text-red-400">*</span>
            </label>
            <Input
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                setInviteInfo(null);
              }}
              placeholder="https://discord.gg/invite or invite-code"
              error={error}
            />
          </div>

          {inviteInfo ? (
            <div className="flex items-center gap-3 rounded-lg bg-gray-700 p-3">
              <div className="h-12 w-12 rounded-lg bg-gray-600 flex items-center justify-center text-2xl">
                {inviteInfo.serverIcon ? (
                  <img src={inviteInfo.serverIcon} alt="" className="h-full w-full object-cover rounded-lg" />
                ) : (
                  '🎮'
                )}
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-white">{inviteInfo.serverName}</h3>
                <p className="text-sm text-gray-400">{inviteInfo.memberCount} Members</p>
              </div>
            </div>
          ) : (
            <Button
              variant="secondary"
              className="w-full"
              onClick={handleCheckInvite}
              loading={loading && !inviteInfo}
            >
              Check Invite
            </Button>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            {inviteInfo && (
              <Button onClick={handleJoin} loading={loading}>
                Join Server
              </Button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
