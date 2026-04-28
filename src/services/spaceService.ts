import { apiClient } from './api';

export interface SpaceConfig {
  username: string;
  displayName: string;
  institution?: string;
  researchField?: string;
  avatar?: string;
  bio?: string;
  isPublic: boolean;
  paperCount: number;
  projectCount: number;
  viewCount: number;
  popularity: number;
  lastActiveAt: string;
  createdAt: string;
  theme?: {
    primaryColor?: string;
    layout?: string;
    showPapers?: boolean;
    showProjects?: boolean;
    showStats?: boolean;
  };
}

export const spaceService = {
  list: (params?: { search?: string; field?: string; sort?: string; page?: number }) => {
    const query = new URLSearchParams();
    if (params?.search) query.set('search', params.search);
    if (params?.field) query.set('field', params.field);
    if (params?.sort) query.set('sort', params.sort);
    if (params?.page) query.set('page', String(params.page));
    return apiClient.get<{ spaces: SpaceConfig[]; total: number }>(`/spaces?${query}`);
  },

  getProfile: (username: string) => apiClient.get<SpaceConfig>(`/spaces/${username}`),

  getTheme: (username: string) => apiClient.get<any>(`/spaces/${username}/theme`),

  updateConfig: (config: Partial<SpaceConfig>) =>
    apiClient.put<SpaceConfig>('/spaces/me', config),

  recordView: (username: string) =>
    apiClient.post<null>(`/spaces/${username}/view`),
};
