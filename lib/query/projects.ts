'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Project, CreateProjectInput, LogHoursInput, AddFurnitureInput, FurnitureStatus } from '@/lib/types';
import { projectService } from '@/lib/services/container';

export const projectKeys = {
  all: ['projects'] as const,
  lists: () => [...projectKeys.all, 'list'] as const,
  details: () => [...projectKeys.all, 'detail'] as const,
  detail: (id: string) => [...projectKeys.details(), id] as const,
};

export function useProjects() {
  return useQuery({
    queryKey: projectKeys.lists(),
    queryFn: () => projectService.listProjects(),
  });
}

export function useProject(id: string) {
  return useQuery({
    queryKey: projectKeys.detail(id),
    queryFn: () => projectService.getProject(id),
    enabled: !!id,
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateProjectInput) => projectService.createProject(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
    },
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Project> }) =>
      projectService.updateProject(id, patch),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
    },
  });
}

export function useLogHours() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, input }: { projectId: string; input: LogHoursInput }) =>
      projectService.logHours(projectId, input),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) });
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
    },
  });
}

export function useAddFurniture() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, input }: { projectId: string; input: AddFurnitureInput }) =>
      projectService.addFurniture(projectId, input),
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
    }) => projectService.updateFurnitureStatus(projectId, furnitureId, status),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) });
    },
  });
}

export function useDeleteFurniture() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, furnitureId }: { projectId: string; furnitureId: string }) =>
      projectService.deleteFurniture(projectId, furnitureId),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) });
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
    },
  });
}
