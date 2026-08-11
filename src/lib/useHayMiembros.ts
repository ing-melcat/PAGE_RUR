import { useEffect, useState } from 'react';

/**
 * Si hay alguien con perfil público.
 *
 * La sección de miembros se llena sola: cada persona decide si aparece. Hasta
 * que lo haga la primera, anunciar MIEMBROS en la barra llevaría a una página
 * vacía, que es peor que no tener la sección. En cuanto alguien active su
 * perfil, el enlace aparece sin desplegar nada.
 */
export function useHayMiembros() {
  const [hay, setHay] = useState(false);

  useEffect(() => {
    let cancelado = false;
    fetch('/api/miembros')
      .then((res) => res.json())
      .then((datos) => {
        if (!cancelado) setHay(Array.isArray(datos) && datos.length > 0);
      })
      .catch(() => {});
    return () => { cancelado = true; };
  }, []);

  return hay;
}
