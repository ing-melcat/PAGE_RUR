import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../lib/apiClient';

export const fetchUsers = async () => {
  const res = await apiFetch('/api/users');
  if (!res.ok) throw new Error('Failed to fetch users');
  const data = await res.json();
  return data.users || data; // handle possible structure
};

export const fetchRolesDisponibles = async () => {
  const res = await apiFetch('/api/roles');
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data.roles) ? data.roles : [];
};

export const fetchCatalogoPermisos = async () => {
  const res = await apiFetch('/api/permisos');
  if (!res.ok) return {};
  const data = await res.json();
  return data.permisos || {};
};

export const fetchMedallasEspeciales = async () => {
  const res = await apiFetch('/api/medallas');
  if (!res.ok) return [];
  const data = await res.json();
  return (data.medallas || []).filter((m: any) => !m.automatica);
};

export const fetchPersonas = async () => {
  const res = await apiFetch('/api/personas');
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? data : [];
};

export const useUsers = () => {
  return useQuery({
    queryKey: ['users'],
    queryFn: fetchUsers,
  });
};

export const useRolesDisponibles = () => {
  return useQuery({
    queryKey: ['roles'],
    queryFn: fetchRolesDisponibles,
  });
};

export const useCatalogoPermisos = () => {
  return useQuery({
    queryKey: ['permisos'],
    queryFn: fetchCatalogoPermisos,
  });
};

export const useMedallasEspeciales = () => {
  return useQuery({
    queryKey: ['medallasEspeciales'],
    queryFn: fetchMedallasEspeciales,
  });
};

export const usePersonas = (enabled: boolean = true) => {
  return useQuery({
    queryKey: ['personas'],
    queryFn: fetchPersonas,
    enabled,
  });
};

export const useMutateUser = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ matricula, method, userData }: { matricula?: string, method: string, userData?: any }) => {
      const url = matricula && method === 'PUT' ? `/api/users/${matricula}` : '/api/users';
      const requestUrl = method === 'DELETE' && matricula ? `/api/users/${matricula}` : url;
      const res = await apiFetch(requestUrl, {
        method,
        headers: userData ? { 'Content-Type': 'application/json' } : undefined,
        body: userData ? JSON.stringify(userData) : undefined
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Error saving user');
      }
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    }
  });
};

export const useMutateMedalla = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ userId, clave, method, motivo }: { userId: number, clave: string, method: string, motivo?: string }) => {
      const url = `/api/miembros/${userId}/medallas/${clave}`;
      const res = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ motivo: motivo || '' })
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Error updating medalla');
      }
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    }
  });
};
