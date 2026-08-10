import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { X } from 'lucide-react';
import { useLanguage } from '../lib/i18n';
import { useEnVivo } from '../lib/useEnVivo';
import './InvitacionEnVivo.css';

const CERRADA = 'rur:invitacion-vivo-cerrada';

/**
 * Invitación a entrar a la transmisión, sobre la página.
 *
 * El chip de la barra de navegación es discreto a propósito, y eso está bien
 * para quien ya conoce el sitio — pero alguien que entra por primera vez a
 * leer una publicación no tiene por qué mirar la barra. Esto aparece encima
 * del contenido y dice que hay algo ocurriendo ahora mismo.
 *
 * TRES REGLAS PARA QUE NO SEA UNA MOLESTIA, que es en lo que se convierten
 * estos avisos cuando se hacen sin cuidado:
 *
 * 1. **Se puede cerrar, y se queda cerrada.** Quien la descarta no vuelve a
 *    verla mientras dure su visita. Se guarda en `sessionStorage` y no en
 *    `localStorage`: al volver otro día es una transmisión distinta y merece
 *    anunciarse otra vez.
 * 2. **Tarda unos segundos en aparecer.** Saltar encima nada más cargar
 *    compite con lo que la persona venía a leer; unos segundos después ya ha
 *    situado la página y el aviso se lee como una sugerencia.
 * 3. **No tapa nada importante.** Va anclada abajo a la derecha, sobre el
 *    hueco que deja el contenido, y no bloquea la página detrás.
 *
 * En la propia página del espectador no aparece: quien ya está viendo la
 * transmisión no necesita que le inviten a verla. De eso se encarga quien la
 * monta, sacándola de LandingLayout.
 */
export function InvitacionEnVivo() {
  const { t } = useLanguage();
  const enVivo = useEnVivo();
  const [visible, setVisible] = useState(false);
  const [cerrada, setCerrada] = useState(
    () => sessionStorage.getItem(CERRADA) === '1'
  );

  useEffect(() => {
    if (!enVivo || cerrada) return;
    const id = setTimeout(() => setVisible(true), 4000);
    return () => clearTimeout(id);
  }, [enVivo, cerrada]);

  const cerrar = () => {
    setVisible(false);
    setCerrada(true);
    sessionStorage.setItem(CERRADA, '1');
  };

  if (!enVivo || cerrada || !visible) return null;

  return (
    <aside className="invitacion" role="complementary" aria-label={t('envivo.etiqueta')}>
      <button className="invitacion__cerrar" onClick={cerrar} aria-label={t('envivo.cerrar')}>
        <X size={15} />
      </button>

      <div className="invitacion__cabecera">
        <span className="invitacion__punto" />
        <span className="invitacion__vivo">{t('envivo.etiqueta')}</span>
      </div>

      <p className="invitacion__unidad">{enVivo.name}</p>
      <p className="invitacion__texto">{t('envivo.invitacion')}</p>

      <Link to={`/espectador/${enVivo.id}`} className="invitacion__boton" onClick={cerrar}>
        {t('envivo.ver')}
      </Link>
    </aside>
  );
}
