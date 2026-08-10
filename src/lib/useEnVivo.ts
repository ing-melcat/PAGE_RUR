import { useEffect, useState } from 'react';

export type RobotEnVivo = { id: string; name: string; status: string };

/**
 * La unidad que está emitiendo ahora mismo, o null si no hay ninguna.
 *
 * Lo usan los dos sitios que anuncian la transmisión —el chip de la barra y la
 * invitación flotante—, y por eso vive aquí: con la consulta duplicada, uno
 * podría estar mostrando el aviso mientras el otro ya lo ha quitado.
 *
 * Se resondea cada 30 segundos porque una emisión puede empezar con la página
 * ya abierta. El servidor cachea el estado 5 segundos, así que el sondeo no le
 * cuesta nada.
 */
export function useEnVivo() {
  const [enVivo, setEnVivo] = useState<RobotEnVivo | null>(null);

  useEffect(() => {
    let cancelado = false;

    const consultar = async () => {
      try {
        const res = await fetch('/api/robots/publicos');
        if (!res.ok) return;
        const datos = await res.json();
        if (cancelado) return;
        setEnVivo((datos.robots || []).find((r: RobotEnVivo) => r.status === 'online') ?? null);
      } catch {
        // Sin respuesta no se anuncia nada. Un fallo de la API no puede
        // romper la página que lo consulta.
      }
    };

    consultar();
    const id = setInterval(consultar, 30000);
    return () => { cancelado = true; clearInterval(id); };
  }, []);

  return enVivo;
}
