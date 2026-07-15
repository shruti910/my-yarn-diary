import api from './api';
import { Project, Yarn, Hook, Pattern, JournalLog, PhotoResponse } from '../types';

export const projectApi = {
  getAll: (params?: any) => api.get('/projects', { params }),
  get: (projectId: string) => api.get(`/projects/${projectId}`),
  getFull: (projectId: string) => api.get(`/projects/${projectId}/full`),
  create: (data: any) => api.post('/projects', data),
  update: (projectId: string, data: any) => api.put(`/projects/${projectId}`, data),
  delete: (projectId: string) => api.delete(`/projects/${projectId}`),
  duplicate: (projectId: string) => api.post(`/projects/${projectId}/duplicates`),
};

export const yarnApi = {
  getByProject: (projectId: string) => api.get(`/projects/${projectId}/yarns`),
  create: (projectId: string, data: Partial<Yarn>) => api.post(`/projects/${projectId}/yarns`, data),
  update: (yarnId: number, data: Partial<Yarn>) => api.put(`/yarns/${yarnId}`, data),
  delete: (yarnId: number) => api.delete(`/yarns/${yarnId}`),
};

export const hookApi = {
  getByProject: (projectId: string) => api.get(`/projects/${projectId}/hooks`),
  create: (projectId: string, data: Partial<Hook>) => api.post(`/projects/${projectId}/hooks`, data),
  update: (hookId: number, data: Partial<Hook>) => api.put(`/hooks/${hookId}`, data),
  delete: (hookId: number) => api.delete(`/hooks/${hookId}`),
};

export const patternApi = {
  getByProject: (projectId: string) => api.get(`/projects/${projectId}/patterns`),
  create: (projectId: string, data: Partial<Pattern>) => api.post(`/projects/${projectId}/patterns`, data),
  update: (patternId: string, data: Partial<Pattern>) => api.put(`/patterns/${patternId}`, data),
  delete: (patternId: string) => api.delete(`/patterns/${patternId}`),
};

export const photoApi = {
  getByProject: (projectId: string) => api.get(`/projects/${projectId}/photos`),
  create: (projectId: string, photoBase64: string) => api.post(`/projects/${projectId}/photos`, photoBase64, { headers: { 'Content-Type': 'text/plain' } }),
  update: (projectId: string, data: { id: number; isCover: boolean }) => api.put(`/projects/${projectId}/photos`, data),
  delete: (photoId: number) => api.delete(`/photos/${photoId}`),
};

export const journalApi = {
  getByProject: (projectId: string, params?: any) => api.get(`/projects/${projectId}/logs`, { params }),
  create: (projectId: string, data: Partial<JournalLog>) => api.post(`/projects/${projectId}/logs`, data),
  get: (logId: string) => api.get(`/logs/${logId}`),
  update: (logId: string, data: Partial<JournalLog>) => api.put(`/logs/${logId}`, data),
  delete: (logId: string) => api.delete(`/logs/${logId}`),
};
