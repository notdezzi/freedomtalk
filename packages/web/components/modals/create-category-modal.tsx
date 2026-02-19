'use client';

import { useState } from 'react';
import { Modal, Button } from '@/components/ui';
import { FolderPlus } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-provider';

interface CreateCategoryModalProps {
  serverId: string;
  onClose: () => void;
}

export function CreateCategoryModal({ serverId, onClose }: CreateCategoryModalProps) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const queryClient = useQueryClient();

  const createCategory = useMutation({
    mutationFn: async (data: { name: string }) => {
      if (!serverId) {
        throw new Error('Server ID is required');
      }
      const response = await apiClient.createCategory(serverId, data);
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to create category');
      }
      return response.data;
    },
    onSuccess: () => {
      // Invalidate both the channels query and the channels-with-categories query
      queryClient.invalidateQueries({ queryKey: queryKeys.servers.channels(serverId) });
      onClose();
    },
    onError: (err: Error) => {
      setError(err.message || 'Failed to create category');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!serverId) {
      setError('Server ID is missing. Please try again from a server page.');
      return;
    }

    if (!name.trim()) {
      setError('Category name is required');
      return;
    }

    if (name.length < 2 || name.length > 100) {
      setError('Category name must be between 2 and 100 characters');
      return;
    }

    setError('');
    createCategory.mutate({ name: name.trim() });
  };

  // Don't render if serverId is not provided
  if (!serverId) {
    return (
      <Modal open onClose={onClose} className="max-w-md">
        <div className="p-6">
          <h2 className="text-xl font-semibold text-foreground mb-4">Error</h2>
          <p className="text-error mb-4">Unable to create category: Server ID is missing.</p>
          <div className="flex justify-end">
            <Button onClick={onClose} variant="secondary">Close</Button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal open onClose={onClose} className="max-w-md">
      <form onSubmit={handleSubmit} className="p-6">
        <h2 className="text-xl font-semibold text-foreground mb-4">Create Category</h2>

        {/* Category name */}
        <div className="mb-4">
          <label className="text-xs font-semibold text-foreground-muted uppercase mb-2 block">
            Category Name
          </label>
          <div className="relative">
            <FolderPlus className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground-subtle" />
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError('');
              }}
              placeholder="Category Name"
              className="w-full bg-background-surface text-foreground rounded pl-8 pr-3 py-2 border border-border focus:border-accent focus:outline-none"
            />
          </div>
          {error && <p className="text-error text-sm mt-1">{error}</p>}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 mt-6">
          <Button type="button" onClick={onClose} variant="secondary">
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={createCategory.isPending}>
            {createCategory.isPending ? 'Creating...' : 'Create Category'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
