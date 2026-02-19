import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, type CreateRoleInput, type UpdateRoleInput, type RoleResponse } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-provider';

// Get all roles for a server
export function useServerRoles(serverId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.roles.list(serverId || ''),
    queryFn: async (): Promise<RoleResponse[]> => {
      if (!serverId) return [];
      const response = await apiClient.getRoles(serverId);
      if (response.success && response.data) {
        if ('roles' in response.data) {
          return response.data.roles;
        }
        if (Array.isArray(response.data)) {
          return response.data;
        }
      }
      return [];
    },
    enabled: !!serverId,
  });
}

// Create a new role
export function useCreateRole(serverId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateRoleInput) => {
      const response = await apiClient.createRole(serverId, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.roles.list(serverId) });
    },
  });
}

// Update an existing role
export function useUpdateRole(serverId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ roleId, data }: { roleId: string; data: UpdateRoleInput }) => {
      const response = await apiClient.updateRole(serverId, roleId, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.roles.list(serverId) });
    },
  });
}

// Delete a role
export function useDeleteRole(serverId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (roleId: string) => {
      const response = await apiClient.deleteRole(serverId, roleId);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.roles.list(serverId) });
    },
  });
}

// Update role positions (reorder)
export function useUpdateRolePositions(serverId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (positions: { id: string; position: number }[]) => {
      const response = await apiClient.updateRolePositions(serverId, positions);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.roles.list(serverId) });
    },
  });
}
