'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useQueryClient } from '@tanstack/react-query';
import { Modal, Button, Input } from '@/components/ui';
import { apiClient } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-provider';
import { toast } from '@/stores/toast-store';

interface JoinServerModalProps {
  onClose: () => void;
  initialCode?: string;
}

// Accept both raw invite codes and full invite links
function extractInviteCode(input: string): string {
  const trimmed = input.trim();
  const match = trimmed.match(/(?:invite|invite\/v)\/([A-Za-z0-9-_]+)/);
  return match ? match[1] : trimmed;
}

export function JoinServerModal({ onClose, initialCode = '' }: JoinServerModalProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [code, setCode] = useState(initialCode);
  const [loading, setLoading] = useState(false);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');
  const [inviteInfo, setInviteInfo] = useState<{
    code: string;
    serverName: string;
    serverIcon?: string | null;
    memberCount: number;
  } | null>(null);

  const handleCheckInvite = async () => {
    const inviteCode = extractInviteCode(code);
    if (!inviteCode) {
      setError('Please enter an invite code');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await apiClient.previewInvite(inviteCode);
      if (!response.success || !response.data) {
        setError('Invalid or expired invite');
        setInviteInfo(null);
        return;
      }

      setInviteInfo({
        code: inviteCode,
        serverName: response.data.server?.name || 'Unknown Server',
        serverIcon: response.data.server?.icon,
        memberCount: response.data.server?.memberCount ?? 0,
      });
    } catch (err) {
      console.error('Failed to preview invite:', err);
      setError('Invalid or expired invite');
      setInviteInfo(null);
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!inviteInfo) return;

    setJoining(true);
    setError('');

    try {
      const response = await apiClient.joinServer(inviteInfo.code);
      if (!response.success || !response.data) {
        setError('Failed to join server');
        return;
      }

      // Refresh the server list, close, and navigate to the new server
      queryClient.invalidateQueries({ queryKey: queryKeys.servers.list() });
      toast.success(`Joined ${response.data.server?.name || 'server'}`);
      onClose();
      router.push(`/app/servers/${response.data.server.id}/channels/first`);
    } catch (err: any) {
      console.error('Failed to join server:', err);
      setError(err?.message || 'Invalid or expired invite');
    } finally {
      setJoining(false);
    }
  };

  return (
    <Modal open onClose={onClose} title="Join a Server" size="md">
      <div className="py-4">
        <p className="text-foreground-muted text-sm mb-4">
          Enter an invite below to join an existing server
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-foreground uppercase mb-2">
              Invite Link <span className="text-error">*</span>
            </label>
            <Input
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                setInviteInfo(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !inviteInfo && !loading) {
                  handleCheckInvite();
                }
              }}
              placeholder="https://discord.gg/invite or invite-code"
              error={error}
            />
          </div>

          {inviteInfo ? (
            <div className="flex items-center gap-3 rounded-lg bg-background-surface p-3">
              <div className="h-12 w-12 rounded-lg bg-background-surface/80 flex items-center justify-center text-2xl">
                {inviteInfo.serverIcon ? (
                  <Image src={inviteInfo.serverIcon} alt="" width={48} height={48} loading="lazy" className="h-full w-full object-cover rounded-lg" />
                ) : (
                  '🎮'
                )}
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-foreground">{inviteInfo.serverName}</h3>
                <p className="text-sm text-foreground-muted">{inviteInfo.memberCount} Members</p>
              </div>
            </div>
          ) : (
            <Button
              variant="secondary"
              className="w-full"
              onClick={handleCheckInvite}
              loading={loading}
            >
              Check Invite
            </Button>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            {inviteInfo && (
              <Button onClick={handleJoin} loading={joining}>
                Join Server
              </Button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
