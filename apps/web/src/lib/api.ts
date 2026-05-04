import axios from 'axios';

const api = axios.create({ baseURL: '/api', withCredentials: true });

let isRefreshing = false;
let failQueue: Array<{ resolve: (v: any) => void; reject: (e: any) => void }> = [];

const processQueue = (error: any) => {
  failQueue.forEach(p => error ? p.reject(error) : p.resolve(undefined));
  failQueue = [];
};

api.interceptors.response.use(
  res => res,
  async err => {
    const original = err.config;
    if (err.response?.status === 401 && !original._retry && !original.url?.includes('/auth/')) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => failQueue.push({ resolve, reject }))
          .then(() => api(original))
          .catch(e => Promise.reject(e));
      }
      original._retry = true;
      isRefreshing = true;
      try {
        await api.post('/auth/refresh');
        processQueue(null);
        return api(original);
      } catch (e) {
        processQueue(e);
        window.location.href = '/login';
        return Promise.reject(e);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(err);
  },
);

export const authApi = {
  login:   (email: string, password: string) => api.post('/auth/login', { email, password }),
  logout:  ()                                => api.post('/auth/logout'),
  me:      ()                                => api.get('/auth/me'),
};

export const projectsApi = {
  listSlim: (params?: Record<string, any>) =>
    api.get('/projects', { params: { fields: 'slim', limit: 5000, ...params } }),
  list:     (params?: Record<string, any>) => api.get('/projects', { params }),
  get:      (id: string)                   => api.get(`/projects/${id}`),
  create:   (data: any)                    => api.post('/projects', data),
  update:   (id: string, data: any)        => api.put(`/projects/${id}`, data),
  remove:   (id: string)                   => api.delete(`/projects/${id}`),
  importPreview: (file: File) => {
    const fd = new FormData(); fd.append('file', file);
    return api.post('/projects/import/preview', fd);
  },
  importCommit: (file: File) => {
    const fd = new FormData(); fd.append('file', file);
    return api.post('/projects/import/commit', fd);
  },
  getProgress:    (id: string)              => api.get(`/projects/${id}/progress`),
  upsertProgress: (id: string, rows: any[]) => api.put(`/projects/${id}/progress`, { rows }),
};

export const analyticsApi = { summary: () => api.get('/analytics/summary') };

export const usersApi = {
  list:   ()                              => api.get('/users'),
  create: (data: any)                    => api.post('/users', data),
  update: (id: string, data: any)        => api.put(`/users/${id}`, data),
  remove: (id: string)                   => api.delete(`/users/${id}`),
};

export const auditApi = {
  list: (params?: Record<string, any>) => api.get('/audit-log', { params }),
};

export default api;
