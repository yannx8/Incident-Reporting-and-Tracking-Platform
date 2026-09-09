import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Incident } from '../types';
import { initialIncidents } from '../lib/mockData';

// Fallback logic for when backend is unavailable or missing data
let localFallback = [...initialIncidents];

const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('token');
  const headers = new Headers(options.headers || {});
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  headers.set('Content-Type', 'application/json');
  
  const res = await fetch(url, { ...options, headers });
  if (!res.ok) {
    const errorBody = await res.text().catch(() => '');
    throw new Error(`API error: ${res.status} ${errorBody}`);
  }
  return res.json();
};

export function useIncidents() {
  return useQuery({
    queryKey: ['incidents'],
    queryFn: async () => {
      try {
        const data = await fetchWithAuth('/api/incidents');
        // Map backend response if necessary, or fallback
        if (data && data.incidents) {
          // If the backend returns stripped incidents without map coordinates, map them or return as is.
          return data.incidents as Incident[];
        }
        return localFallback;
      } catch (err) {
        console.warn('Failed to fetch from backend, using fallback', err);
        return localFallback;
      }
    }
  });
}

export function useIncident(id: string) {
  return useQuery({
    queryKey: ['incidents', id],
    queryFn: async () => {
      // Backend does not have a GET /api/incidents/:id currently implemented in controller exports.
      // We fetch all and find, or use fallback
      try {
        const data = await fetchWithAuth('/api/incidents');
        if (data && data.incidents) {
          const inc = data.incidents.find((i: any) => i.id === id);
          if (inc) return inc as Incident;
        }
      } catch (err) {
        console.warn('Failed to fetch incident from backend, using fallback', err);
      }
      
      const inc = localFallback.find(i => i.id === id);
      if (!inc) throw new Error('Not found');
      return inc;
    },
    enabled: !!id
  });
}

export function useCreateIncident() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (newIncident: Omit<Incident, 'id' | 'createdAt' | 'updatedAt' | 'comments' | 'audit' | 'reporter'>) => {
      try {
        const data = await fetchWithAuth('/api/incidents', {
          method: 'POST',
          body: JSON.stringify(newIncident)
        });
        if (data && data.incident) {
          return data.incident as Incident;
        }
      } catch (err) {
        console.warn('Failed to create incident on backend, using fallback', err);
      }

      // Fallback
      await new Promise(resolve => setTimeout(resolve, 500));
      const timestamp = new Date().toISOString();
      const inc: Incident = {
        ...newIncident,
        id: `INC-${2410 + localFallback.length}`,
        reporter: 'Camille Dupont',
        createdAt: timestamp,
        updatedAt: timestamp,
        comments: [],
        audit: [{ id: crypto.randomUUID(), label: 'Signalement crǸǸ', actor: 'Camille Dupont', at: timestamp, kind: 'created' }]
      };
      localFallback = [inc, ...localFallback];
      return inc;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
    }
  });
}
