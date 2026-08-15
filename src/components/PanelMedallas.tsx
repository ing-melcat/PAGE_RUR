import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { apiFetch } from '../lib/apiClient';
import { useLanguage } from '../lib/i18n';
import './PanelRoles.css';

/**
 * Las medallas que existen.
 *
 * Comparte pestaña y estilo con los roles porque es el mismo tipo de trabajo:
 * definir algo una vez para luego repartirlo desde la ficha de cada persona.
 * Reutiliza `PanelRoles.css` en lugar de copiarlo — dos hojas casi iguales
 * acaban divergiendo en el primer retoque.
 *
 * Las automáticas salen en la lista pero no se pueden crear ni borrar: su
 * regla ("cinco proyectos o tres facetas") vive en el código, porque es una
 * condición que hay que evaluar y no un texto que se pueda escribir en un
 * formulario. Su nombre, icono y color sí se editan.
 */

type Medalla = {
  clave: string;
  nombre: string;
  descripcion: string;
  icono: string;
  color: string;
  automatica: boolean;
  del_sistema: boolean;
  orden: number;
};

const COLORES = ['#FBCA01', '#fbbf24', '#2ecc71', '#38bdf8', '#8b5cf6', '#f472b6', '#ef4444', '#8c9bb0'];

// El mismo puñado que acepta el servidor. Son símbolos de una sola casilla:
// van dentro de un círculo de 22px en la tarjeta, donde un emoji a color se
// sale y rompe la fila.
const ICONOS = ['▲', '◆', '★', '✦', '◈', '❖', '◉', '●', '■', '⬟', '✚', '⚑', '☗', '◐', '✱', '⬤'];

const VACIA: Medalla = {
  clave: '', nombre: '', descripcion: '', icono: '✦', color: '#fbbf24',
  automatica: false, del_sistema: false, orden: 100,
};

export function PanelMedallas() {
  const { t } = useLanguage();
  const [medallas, setMedallas] = useState<Medalla[]>([]);
  const [editando, setEditando] = useState<Medalla | null>(null);
  const [creando, setCreando] = useState(false);
  const [error, setError] = useState('');

  const cargar = () =>
    apiFetch('/api/medallas')
      .then((r) => r.json())
      .then((d) => setMedallas(d.medallas ?? []))
      .catch(() => {});

  useEffect(() => { cargar(); }, []);

  const guardar = async (m: Medalla) => {
    setError('');
    const res = await apiFetch(creando ? '/api/medallas' : `/api/medallas/${m.clave}`, {
      method: creando ? 'POST' : 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(m),
    });
    const datos = await res.json().catch(() => null);
    if (!res.ok) return setError(datos?.message || t('medallasPanel.errorGuardar'));
    setEditando(null);
    setCreando(false);
    cargar();
  };

  const borrar = async (m: Medalla) => {
    setError('');
    if (!window.confirm(t('medallasPanel.confirmarBorrar').replace('{m}', m.nombre))) return;
    const res = await apiFetch(`/api/medallas/${m.clave}`, { method: 'DELETE' });
    const datos = await res.json().catch(() => null);
    // El servidor dice a cuánta gente hay que retirársela antes; se enseña tal
    // cual, que es más útil que un "no se pudo borrar".
    if (!res.ok) return setError(datos?.message || t('medallasPanel.errorBorrar'));
    cargar();
  };

  if (editando) {
    const m = editando;
    // La clave se escribe una vez y no se vuelve a tocar: va guardada en cada
    // medalla concedida, así que cambiarla las dejaría todas huérfanas.
    return (
      <div className="roles">
        {error && <p className="roles__error">{error}</p>}
        <div className="roles__editor">
          <div className="roles__editor-cabecera">
            <h3>{creando ? t('medallasPanel.nueva') : t('medallasPanel.editando').replace('{m}', m.nombre)}</h3>
            <button type="button" onClick={() => { setEditando(null); setCreando(false); setError(''); }} aria-label={t('medallasPanel.cerrar')}>
              <X size={16} />
            </button>
          </div>

          {creando && (
            <label className="roles__campo">
              {t('medallasPanel.clave')}
              <input
                type="text"
                value={m.clave}
                onChange={(e) => setEditando({ ...m, clave: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '') })}
                maxLength={40}
              />
              <span className="roles__nota">{t('medallasPanel.claveNota')}</span>
            </label>
          )}

          <label className="roles__campo">
            {t('medallasPanel.nombre')}
            <input type="text" value={m.nombre} onChange={(e) => setEditando({ ...m, nombre: e.target.value })} maxLength={80} />
          </label>

          <label className="roles__campo">
            {t('medallasPanel.criterio')}
            <input type="text" value={m.descripcion} onChange={(e) => setEditando({ ...m, descripcion: e.target.value })} maxLength={300} />
            <span className="roles__nota">{t('medallasPanel.criterioNota')}</span>
          </label>

          <div className="roles__campo">
            {t('medallasPanel.icono')}
            <div className="medallas-panel__iconos">
              {ICONOS.map((i) => (
                <button
                  key={i}
                  type="button"
                  className={`medallas-panel__icono${m.icono === i ? ' medallas-panel__icono--elegido' : ''}`}
                  style={{ color: m.color }}
                  onClick={() => setEditando({ ...m, icono: i })}
                  aria-label={i}
                >
                  {i}
                </button>
              ))}
            </div>
            <span className="roles__nota">{t('medallasPanel.iconoNota')}</span>
          </div>

          <div className="roles__campo">
            {t('medallasPanel.color')}
            <div className="roles__colores">
              {COLORES.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`roles__color${m.color === c ? ' roles__color--elegido' : ''}`}
                  style={{ background: c }}
                  onClick={() => setEditando({ ...m, color: c })}
                  aria-label={c}
                />
              ))}
            </div>
          </div>

          {m.automatica && <p className="roles__nota">{t('medallasPanel.esAutomatica')}</p>}

          <button className="roles__guardar" type="button" onClick={() => guardar(m)}>
            {t('medallasPanel.guardar')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="roles">
      {error && <p className="roles__error">{error}</p>}

      <button className="roles__crear" type="button" onClick={() => { setEditando({ ...VACIA }); setCreando(true); }}>
        {t('medallasPanel.crear')}
      </button>

      <ul className="roles__lista">
        {medallas.map((m) => (
          <li key={m.clave} className="roles__fila">
            {/* La insignia con su propio icono y color: es exactamente como se
                verá en la tarjeta de quien la reciba, así que se elige mirando
                el resultado y no una lista de nombres. */}
            <span className="roles__insignia" style={{ borderColor: m.color, color: m.color }}>
              {m.icono} {m.nombre}
            </span>
            <span className="roles__cuenta">
              {m.descripcion}
              {m.automatica && <> · {t('medallasPanel.automatica')}</>}
            </span>
            <div className="roles__acciones">
              <button type="button" onClick={() => { setEditando({ ...m }); setCreando(false); }}>
                {t('medallasPanel.editar')}
              </button>
              {!m.del_sistema && (
                <button type="button" className="roles__borrar" onClick={() => borrar(m)}>
                  {t('medallasPanel.borrar')}
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
