import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../../lib/apiClient';

export type Modelo3D = { url: string; etiqueta: string; origen: 'robot' | 'publicacion' };

// Un modelo se sube desde el panel de robots o desde el editor de
// publicaciones, pero sirve igual en cualquiera de los dos -- es el mismo
// archivo .glb en /api/uploads/, solo que asignado a cosas distintas. Sin
// esto, reutilizar un modelo ya subido en el otro formulario exigía
// conocerse la ruta de memoria y pegarla a mano, o subir el mismo archivo
// otra vez.
//
// Cada servicio expone solo los modelos que él mismo tiene asignados
// (services/content: posts.model_url: services/robots: robots.model_url) --
// ninguno lee la tabla del otro, así que aquí es donde se juntan las dos
// listas. Por eso son dos peticiones y no una: no existe un endpoint único
// que pueda contestar por los dos a la vez sin que un servicio empiece a
// leer datos que no son suyos.
export function useModelos3D() {
  return useQuery({
    queryKey: ['modelos3d'],
    queryFn: async (): Promise<Modelo3D[]> => {
      const [posts, robots] = await Promise.all([
        apiFetch('/api/posts/modelos').then((r) => (r.ok ? r.json() : [])),
        apiFetch('/api/robots/modelos').then((r) => (r.ok ? r.json() : [])),
      ]);

      // Un mismo archivo puede estar asignado a un robot Y a una
      // publicación a la vez -- se queda una sola entrada, no dos idénticas
      // en el selector.
      const porUrl = new Map<string, Modelo3D>();
      for (const p of posts) porUrl.set(p.url, { url: p.url, etiqueta: p.etiqueta, origen: 'publicacion' });
      for (const r of robots) if (!porUrl.has(r.url)) porUrl.set(r.url, { url: r.url, etiqueta: r.etiqueta, origen: 'robot' });

      return [...porUrl.values()].sort((a, b) => a.etiqueta.localeCompare(b.etiqueta));
    },
  });
}
