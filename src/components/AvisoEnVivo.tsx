import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../lib/i18n';
import './AvisoEnVivo.css';

type RobotPublico = { id: string; name: string; status: string };

/**
 * Aviso de transmisión en curso para la web pública.
 *
 * Hasta ahora la única forma de llegar al espectador era que alguien te pasara
 * el enlace: la ruta existía, pero no había ni un botón en todo el sitio. Una
 * transmisión pública a la que nadie puede llegar no es pública.
 *
 * DOS DECISIONES:
 *
 * 1. **Solo aparece si hay una unidad realmente encendida.** No basta con que
 *    esté marcada como evento público — el backend comprueba contra LiveKit si
 *    el robot está en la sala. Un botón permanente que la mitad del tiempo
 *    lleva a "no hay transmisión" enseña a la gente a ignorarlo.
 * 2. **Se consulta cada 30 segundos**, no una sola vez al cargar. Alguien que
 *    deje la página abierta debe enterarse de que ha empezado una emisión; y
 *    30s es suficientemente espaciado para que el sondeo no pese (la respuesta
 *    va cacheada 5s en el servidor).
 */
export function AvisoEnVivo() {
  const { t } = useLanguage();
  const [enVivo, setEnVivo] = useState<RobotPublico | null>(null);

  useEffect(() => {
    let cancelado = false;

    const consultar = async () => {
      try {
        const res = await fetch('/api/robots/publicos');
        if (!res.ok) return;
        const datos = await res.json();
        if (cancelado) return;
        // El primero que esté encendido. Con varias unidades a la vez habría
        // que elegir, pero hoy eso no ha pasado nunca y una lista desplegable
        // para un solo elemento sería peor.
        setEnVivo((datos.robots || []).find((r: RobotPublico) => r.status === 'online') ?? null);
      } catch {
        // Sin conexión con la API el aviso simplemente no aparece: es un
        // añadido a la página, no debe romperla ni mostrar un error.
      }
    };

    consultar();
    const id = setInterval(consultar, 30000);
    return () => { cancelado = true; clearInterval(id); };
  }, []);

  if (!enVivo) return null;

  return (
    <Link to={`/espectador/${enVivo.id}`} className="aviso-vivo">
      <span className="aviso-vivo__punto" />
      <span className="aviso-vivo__etiqueta">{t('envivo.etiqueta')}</span>
      <span className="aviso-vivo__nombre">{enVivo.name}</span>
    </Link>
  );
}
