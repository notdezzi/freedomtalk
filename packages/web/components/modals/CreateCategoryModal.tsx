'use client';

import { useState } from 'react';
import { X, FolderPlus, Loader2 } from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';
import { useChannelStore } from '@/stores/channelStore';
import { apiClient } from '@/lib/api-client';

export default function CreateCategoryModal() {
  const { activeModal, closeModal } = useUIStore();
  const { addCategory } = useChannelStore();
  const isOpen = activeModal.type === 'create-category';
  const createCategoryData = activeModal.createCategoryData;

  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !createCategoryData) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) return;

    setSaving(true);
    setError(null);

    const serverId = createCategoryData.serverId;

    const response = await apiClient.createCategory(serverId, {
      name: name.trim(),
    });

    if (response.success && response.data) {
      addCategory({
        id: response.data.id,
        serverId: response.data.serverId || serverId,
        name: response.data.name,
        position: response.data.position,
        isCollapsed: false,
        channels: [],
      });

      setName('');
      closeModal();
    } else {
      setError(response.error?.message || 'Failed to create category');
    }

    setSaving(false);
  };

  const handleClose = () => {
    setName('');
    setError(null);
    closeModal();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-background-elevated rounded-lg shadow-xl">
        {/* Header */}
        <div className="p-4 flex items-center justify-between border-b border-border">
          <div className="flex items-center gap-2">
            <FolderPlus className="w-5 h-5 text-accent" />
            <h2 className="text-lg font-semibold">Create Category</h2>
          </div>
          <button
            onClick={handleClose}
            className="p-1 rounded hover:bg-background-surface text-foreground-muted hover:text-foreground transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label
              htmlFor="category-name"
              className="block text-xs font-semibold text-foreground-muted uppercase mb-2"
            >
              Category Name
            </label>
            <input
              id="category-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="New Category"
              className="w-full px-3 py-2.5 rounded bg-background-surface border border-border focus:border-accent focus:outline-none transition-colors"
              autoFocus
            />
          </div>

          <div className="p-3 rounded bg-background-surface text-sm text-foreground-muted">
            Categories help organize your channels into sections. You can add channels to this category after creating it.
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 bg-error/10 border border-error/20 rounded text-error text-sm">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={saving}
              className="px-4 py-2 rounded text-sm font-medium text-foreground-muted hover:text-foreground transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim() || saving}
              className="px-4 py-2 rounded text-sm font-medium bg-accent text-background hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Create Category
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
