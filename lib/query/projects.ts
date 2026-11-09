'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api/client';
import { useSessionUserId, userScopedKey } from '@/lib/query/session';
import type {
  Project,
  CreateProjectInput,
  LogHoursInput,
  AddFurnitureInput,
  FurnitureStatus,
  UpdateHourEntryInput,
  UpdateFurnitureInput,
} from '@/lib/types';

export const projectKeys = {
  all: ['projects'] as const,
  lists: () => [...projectKeys.all, 'list'] as const,
  details: () => [...projectKeys.all, 'detail'] as const,
  detail: (id: string) => [...projectKeys.details(), id] as const,
};

function useProjectQueryScope() {
  const userId = useSessionUserId();

  return {
    userId,
    list: userScopedKey(userId, projectKeys.lists()),
    detail: (id: string) => userScopedKey(userId, projectKeys.detail(id)),
  };
}

export function useProjects() {
  const { userId, list } = useProjectQueryScope();

  return useQuery({
    queryKey: list,
    queryFn: async () => (await apiRequest('/api/projects')) as Project[],
    enabled: !!userId,
  });
}

export function useProject(id: string, initialData?: Project) {
  const { userId, detail } = useProjectQueryScope();

  return useQuery({
    queryKey: detail(id),
    queryFn: async () => (await apiRequest(`/api/projects/${id}`)) as Project,
    enabled: !!id && !!userId,
    initialData,
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  const { list } = useProjectQueryScope();

  return useMutation({
    mutationFn: (input: CreateProjectInput) =>
      apiRequest<Project>('/api/projects', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: list });
    },
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();
  const { list, detail } = useProjectQueryScope();

  return useMutation({
    mutationFn: ({
      id,
      patch,
    }: {
      id: string;
      patch: Partial<Project>;
    }) =>
      apiRequest<Project>(`/api/projects/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      }),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: detail(id) });
      queryClient.invalidateQueries({ queryKey: list });
    },
  });
}

export function useLogHours() {
  const queryClient = useQueryClient();
  const { list, detail } = useProjectQueryScope();

  return useMutation({
    mutationFn: ({
      projectId,
      input,
    }: {
      projectId: string;
      input: LogHoursInput;
    }) =>
      apiRequest<Project>(`/api/projects/${projectId}/hours`, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: detail(projectId) });
      queryClient.invalidateQueries({ queryKey: list });
    },
  });
}

export function useAddFurniture() {
  const queryClient = useQueryClient();
  const { list, detail } = useProjectQueryScope();

  return useMutation({
    mutationFn: ({
      projectId,
      input,
    }: {
      projectId: string;
      input: AddFurnitureInput;
    }) =>
      apiRequest<Project>(`/api/projects/${projectId}/furniture`, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: detail(projectId) });
      queryClient.invalidateQueries({ queryKey: list });
    },
  });
}

export function useUpdateFurnitureStatus() {
  const queryClient = useQueryClient();
  const { detail } = useProjectQueryScope();

  return useMutation({
    mutationFn: ({
      projectId,
      furnitureId,
      status,
    }: {
      projectId: string;
      furnitureId: string;
      status: FurnitureStatus;
    }) =>
      apiRequest<Project>(
        `/api/projects/${projectId}/furniture/${furnitureId}`,
        {
          method: 'PATCH',
          body: JSON.stringify({ status }),
        }
      ),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: detail(projectId) });
    },
  });
}

export function useUpdateFurniture() {
  const queryClient = useQueryClient();
  const { list, detail } = useProjectQueryScope();

  return useMutation({
    mutationFn: ({
      projectId,
      furnitureId,
      patch,
    }: {
      projectId: string;
      furnitureId: string;
      patch: UpdateFurnitureInput;
    }) =>
      apiRequest<Project>(
        `/api/projects/${projectId}/furniture/${furnitureId}`,
        {
          method: 'PATCH',
          body: JSON.stringify(patch),
        }
      ),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: detail(projectId) });
      queryClient.invalidateQueries({ queryKey: list });
    },
  });
}

export function useUpdateHourEntry() {
  const queryClient = useQueryClient();
  const { list, detail } = useProjectQueryScope();

  return useMutation({
    mutationFn: ({
      projectId,
      hourId,
      patch,
    }: {
      projectId: string;
      hourId: string;
      patch: UpdateHourEntryInput;
    }) =>
      apiRequest<Project>(`/api/projects/${projectId}/hours/${hourId}`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      }),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: detail(projectId) });
      queryClient.invalidateQueries({ queryKey: list });
    },
  });
}

export function useDeleteHourEntry() {
  const queryClient = useQueryClient();
  const { list, detail } = useProjectQueryScope();

  return useMutation({
    mutationFn: ({
      projectId,
      hourId,
    }: {
      projectId: string;
      hourId: string;
    }) =>
      apiRequest<Project>(`/api/projects/${projectId}/hours/${hourId}`, {
        method: 'DELETE',
      }),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: detail(projectId) });
      queryClient.invalidateQueries({ queryKey: list });
    },
  });
}

export function useDeleteFurniture() {
  const queryClient = useQueryClient();
  const { list, detail } = useProjectQueryScope();

  return useMutation({
    mutationFn: ({
      projectId,
      furnitureId,
    }: {
      projectId: string;
      furnitureId: string;
    }) =>
      apiRequest<Project>(
        `/api/projects/${projectId}/furniture/${furnitureId}`,
        { method: 'DELETE' }
      ),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: detail(projectId) });
      queryClient.invalidateQueries({ queryKey: list });
    },
  });
}
