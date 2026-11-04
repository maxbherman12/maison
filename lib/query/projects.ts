'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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

async function request(path: string, options: RequestInit = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error ?? `Request failed: ${res.status}`);
  }
  return res.json();
}

export function useProjects() {
  return useQuery({
    queryKey: projectKeys.lists(),
    queryFn: async () => (await request('/api/projects')) as Project[],
  });
}

export function useProject(id: string, initialData?: Project) {
  return useQuery({
    queryKey: projectKeys.detail(id),
    queryFn: async () => (await request(`/api/projects/${id}`)) as Project,
    enabled: !!id,
    initialData,
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateProjectInput) =>
      request('/api/projects', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
    },
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      patch,
    }: {
      id: string;
      patch: Partial<Project>;
    }) =>
      request(`/api/projects/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      }),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
    },
  });
}

export function useLogHours() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      projectId,
      input,
    }: {
      projectId: string;
      input: LogHoursInput;
    }) =>
      request(`/api/projects/${projectId}/hours`, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) });
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
    },
  });
}

export function useAddFurniture() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      projectId,
      input,
    }: {
      projectId: string;
      input: AddFurnitureInput;
    }) =>
      request(`/api/projects/${projectId}/furniture`, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) });
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
    },
  });
}

export function useUpdateFurnitureStatus() {
  const queryClient = useQueryClient();
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
      request(
        `/api/projects/${projectId}/furniture/${furnitureId}`,
        {
          method: 'PATCH',
          body: JSON.stringify({ status }),
        }
      ),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) });
    },
  });
}

export function useUpdateFurniture() {
  const queryClient = useQueryClient();
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
      request(
        `/api/projects/${projectId}/furniture/${furnitureId}`,
        {
          method: 'PATCH',
          body: JSON.stringify(patch),
        }
      ),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) });
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
    },
  });
}

export function useUpdateHourEntry() {
  const queryClient = useQueryClient();
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
      request(`/api/projects/${projectId}/hours/${hourId}`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      }),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) });
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
    },
  });
}

export function useDeleteHourEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      projectId,
      hourId,
    }: {
      projectId: string;
      hourId: string;
    }) =>
      request(`/api/projects/${projectId}/hours/${hourId}`, {
        method: 'DELETE',
      }),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) });
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
    },
  });
}

export function useDeleteFurniture() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      projectId,
      furnitureId,
    }: {
      projectId: string;
      furnitureId: string;
    }) =>
      request(
        `/api/projects/${projectId}/furniture/${furnitureId}`,
        { method: 'DELETE' }
      ),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) });
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
    },
  });
}
