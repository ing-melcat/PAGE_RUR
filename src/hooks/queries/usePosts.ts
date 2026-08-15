import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../lib/apiClient';

export const fetchPosts = async () => {
  const res = await apiFetch('/api/posts?full=true');
  if (!res.ok) throw new Error('Failed to fetch posts');
  const data = await res.json();
  if (!Array.isArray(data)) return [];
  return data.sort((a: any, b: any) => {
    if (a.type === 'aviso' && b.type !== 'aviso') return -1;
    if (a.type !== 'aviso' && b.type === 'aviso') return 1;
    return 0;
  });
};

export const usePosts = () => {
  return useQuery({
    queryKey: ['posts'],
    queryFn: fetchPosts,
  });
};

export const useMutatePost = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, method, postData }: { id?: string, method: string, postData?: any }) => {
      const url = id ? `/api/posts/${id}` : '/api/posts';
      const res = await apiFetch(url, {
        method,
        headers: postData ? { 'Content-Type': 'application/json' } : undefined,
        body: postData ? JSON.stringify(postData) : undefined
      });
      if (!res.ok) throw new Error('Error al guardar publicación');
      return res; // We only need to know it succeeded
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    }
  });
};
