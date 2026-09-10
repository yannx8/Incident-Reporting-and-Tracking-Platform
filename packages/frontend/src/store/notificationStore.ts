import { create } from 'zustand';
import { api } from '../api/client';

interface N {
  id: string;
  title: string;
  body: string;
  readAt: string | null;
  incidentId: string | null;
}

interface S {
  items: N[];
  load: () => Promise<void>;
  read: (id: string) => Promise<void>;
}

export const useNotifications = create<S>((set) => ({
  items: [],
  load: async () => set({ items: await api<N[]>('/notifications') }),
  read: async (id) => {
    await api(`/notifications/${id}/read`, { method: 'PATCH' });
    set((s) => ({
      items: s.items.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n))
    }));
  }
}));
