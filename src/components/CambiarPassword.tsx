import { useState } from 'react';
import { Lock, Eye, EyeOff } from 'lucide-react';
import { apiFetch } from '../lib/apiClient';
import { useLanguage } from '../lib/i18n';
import './CambiarPassword.css';

/**
 * Cambiar la propia contraseña.
 *
 * Sirve para las dos situaciones, que son la misma operación con distinta
 * urgencia:
 *
 *   - Voluntaria, desde el perfil.
 *   - Obligada (`forzado`), cuando se entró con una provisional que puso un
 *     administrador. Ahí no hay botón de volver: la sesión no abre nada más
 *     hasta que se cambie, y eso lo impone el servidor, no esta pantalla.
 *
 * Las reglas se enseñan ANTES de escribir, no como error después. Una regla
 * que solo aparece al fallar convierte cada intento en una adivinanza.
 */

export function CambiarPassword({ forzado = false, alTerminar, alCancelar }: {
  forzado?: boolean;
  alTerminar: (user: any) => void;
  alCancelar?: () => void;
}) {
  const { t } = useLanguage();
  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [repetida, setRepetida] = useState('');
  const [verClaro, setVerClaro] = useState(false);
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  // Se comprueba aquí sin quitarla del servidor: aquí es para no hacerle
  // escribir dos veces algo que ya se sabe que no vale; allí es lo que
  // realmente lo impide.
  const cortas = nueva.length > 0 && nueva.length < 10;
  const noCoinciden = repetida.length > 0 && nueva !== repetida;
  const puedeEnviar = actual && nueva.length >= 10 && nueva === repetida && !enviando;

  const enviar = async (e: any) => {
    e.preventDefault();
    setError('');
    setEnviando(true);
    try {
      const res = await apiFetch('/api/profile/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actual, nueva }),
      });
      const datos = await res.json().catch(() => null);
      if (!res.ok || !datos?.success) {
        setError(datos?.message || t('password.errorGenerico'));
        return;
      }
      alTerminar(datos.user);
    } catch {
      setError(t('password.errorConexion'));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className={`cambiar-pass${forzado ? ' cambiar-pass--forzado' : ''}`}>
      <form className="cambiar-pass__caja" onSubmit={enviar}>
        {/* Campo oculto para accesibilidad de gestores de contraseñas */}
        <input type="text" name="username" autoComplete="username" style={{ display: 'none' }} defaultValue="current-user" readOnly />

        <h2 className="cambiar-pass__titulo">
          <Lock size={18} aria-hidden="true" />
          {forzado ? t('password.tituloForzado') : t('password.titulo')}
        </h2>

        {forzado && <p className="cambiar-pass__aviso">{t('password.avisoForzado')}</p>}

        <label className="input-group">
          <span>{forzado ? t('password.actualProvisional') : t('password.actual')}</span>
          <input
            type={verClaro ? 'text' : 'password'}
            value={actual}
            onChange={(e) => setActual(e.target.value)}
            autoComplete="current-password"
            required
          />
        </label>

        <label className="input-group">
          <span>{t('password.nueva')}</span>
          <input
            type={verClaro ? 'text' : 'password'}
            value={nueva}
            onChange={(e) => setNueva(e.target.value)}
            autoComplete="new-password"
            required
          />
        </label>

        <label className="input-group">
          <span>{t('password.repetir')}</span>
          <input
            type={verClaro ? 'text' : 'password'}
            value={repetida}
            onChange={(e) => setRepetida(e.target.value)}
            autoComplete="new-password"
            required
          />
        </label>

        {/* Un solo interruptor para los tres campos: teclear a ciegas tres
            veces seguidas es de donde salen la mitad de los "no coinciden". */}
        <button type="button" className="cambiar-pass__ver" onClick={() => setVerClaro((v) => !v)}>
          {verClaro ? <EyeOff size={14} aria-hidden="true" /> : <Eye size={14} aria-hidden="true" />}
          {verClaro ? t('password.ocultar') : t('password.ver')}
        </button>

        <ul className="cambiar-pass__reglas">
          <li className={nueva.length >= 10 ? 'ok' : cortas ? 'mal' : ''}>{t('password.regla1')}</li>
          <li className={repetida.length > 0 && !noCoinciden ? 'ok' : noCoinciden ? 'mal' : ''}>{t('password.regla2')}</li>
          <li>{t('password.regla3')}</li>
        </ul>

        {error && <p className="cambiar-pass__error">{error}</p>}

        <div className="cambiar-pass__acciones">
          <button type="submit" className="primary-btn" disabled={!puedeEnviar}>
            {enviando ? t('password.guardando') : t('password.guardar')}
          </button>
          {!forzado && alCancelar && (
            <button type="button" className="back-link" onClick={alCancelar}>
              {t('perfil.cancelarVolver')}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
