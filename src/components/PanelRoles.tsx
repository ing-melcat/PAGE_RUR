import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { apiFetch } from '../lib/apiClient';
import { useLanguage } from '../lib/i18n';
import { useConfirmar } from './Notificaciones';
import './PanelRoles.css';

/**
 * Los roles y lo que puede cada uno.
 *
 * Vive dentro del panel de personal, en una pestaña junto a las personas: es
 * donde los roles ya se asignaban, así que es donde toca administrarlos. Una
 * pantalla aparte en el menú los separaría de su único uso.
 *
 * El catálogo de permisos NO se edita aquí: llega del servidor, porque cada
 * permiso corresponde a una comprobación real en alguna ruta. Uno inventado
 * desde el panel sería un botón que promete algo que no ocurre.
 */

type Rol = { nombre: string; color: string; permisos: string[]; del_sistema: boolean };

const COLORES = ['#FBCA01', '#2ecc71', '#8c9bb0', '#fbbf24', '#8b5cf6', '#ef4444', '#38bdf8', '#f472b6'];

export function PanelRoles() {
  const { t } = useLanguage();
  const confirmar = useConfirmar();
  const [roles, setRoles] = useState<Rol[]>([]);
  const [catalogo, setCatalogo] = useState<Record<string, string>>({});
  const [editando, setEditando] = useState<Rol | null>(null);
  const [creando, setCreando] = useState(false);
  const [nombreNuevo, setNombreNuevo] = useState('');
  const [error, setError] = useState('');

  const cargar = () =>
    apiFetch('/api/roles')
      .then((r) => r.json())
      .then((d) => {
        setRoles(d.roles ?? []);
        setCatalogo(d.catalogo ?? {});
      })
      .catch(() => {});

  useEffect(() => { cargar(); }, []);

  const guardar = async (rol: Rol) => {
    setError('');
    const nuevo = creando;
    const res = await apiFetch(nuevo ? '/api/roles' : `/api/roles/${rol.nombre}`, {
      method: nuevo ? 'POST' : 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rol),
    });
    const datos = await res.json().catch(() => null);
    if (!res.ok) return setError(datos?.message || t('roles.errorGuardar'));
    setEditando(null);
    setCreando(false);
    setNombreNuevo('');
    cargar();
  };

  const borrar = async (rol: Rol) => {
    setError('');
    if (!(await confirmar(t('roles.confirmarBorrar').replace('{r}', rol.nombre)))) return;
    const res = await apiFetch(`/api/roles/${rol.nombre}`, { method: 'DELETE' });
    const datos = await res.json().catch(() => null);
    // El servidor dice a quién hay que quitárselo antes; se enseña tal cual,
    // que es más útil que un "no se pudo borrar".
    if (!res.ok) return setError(datos?.message || t('roles.errorBorrar'));
    cargar();
  };

  const enEdicion = editando;

  return (
    <div className="roles">
      {error && <p className="roles__error">{error}</p>}

      {enEdicion ? (
        <div className="roles__editor">
          <div className="roles__editor-cabecera">
            <h3>
              {creando ? t('roles.nuevo') : t('roles.editando').replace('{r}', enEdicion.nombre)}
            </h3>
            <button type="button" onClick={() => { setEditando(null); setCreando(false); setError(''); }} aria-label={t('roles.cancelar')}>
              <X size={16} />
            </button>
          </div>

          {creando && (
            <label className="roles__campo">
              {t('roles.nombre')}
              <input
                value={nombreNuevo}
                onChange={(e) => setNombreNuevo(e.target.value)}
                placeholder="difusion"
                maxLength={40}
              />
              <span className="roles__nota">{t('roles.nombreNota')}</span>
            </label>
          )}

          <div className="roles__campo">
            {t('roles.color')}
            <div className="roles__colores">
              {COLORES.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`roles__color${enEdicion.color === c ? ' roles__color--elegido' : ''}`}
                  style={{ backgroundColor: c }}
                  aria-label={c}
                  aria-pressed={enEdicion.color === c}
                  onClick={() => setEditando({ ...enEdicion, color: c })}
                />
              ))}
            </div>
          </div>

          <div className="roles__campo">
            {t('roles.permisos')}
            <div className="roles__permisos">
              {Object.entries(catalogo).map(([clave, descripcion]) => (
                <label key={clave} className="roles__permiso">
                  <input
                    type="checkbox"
                    checked={enEdicion.permisos.includes(clave)}
                    onChange={(e) =>
                      setEditando({
                        ...enEdicion,
                        permisos: e.target.checked
                          ? [...enEdicion.permisos, clave]
                          : enEdicion.permisos.filter((p) => p !== clave),
                      })
                    }
                  />
                  <span>
                    <span className="roles__permiso-nombre">{descripcion}</span>
                    <code>{clave}</code>
                  </span>
                </label>
              ))}
            </div>
          </div>

          <button
            className="roles__guardar"
            onClick={() => guardar(creando ? { ...enEdicion, nombre: nombreNuevo.trim().toLowerCase() } : enEdicion)}
          >
            {t('roles.guardar')}
          </button>
        </div>
      ) : (
        <>
          <button
            className="roles__crear"
            onClick={() => {
              setCreando(true);
              setNombreNuevo('');
              setEditando({ nombre: '', color: COLORES[4], permisos: [], del_sistema: false });
            }}
          >
            + {t('roles.nuevo')}
          </button>

          <ul className="roles__lista">
            {roles.map((r) => (
              <li key={r.nombre} className="roles__fila">
                <span className="roles__insignia" style={{ borderColor: r.color, color: r.color }}>
                  {r.nombre}
                </span>

                <span className="roles__cuenta">
                  {/* El de administración lo puede todo por definición y no se
                      edita: si alguien le quitara permisos, nadie podría
                      volver a entrar a arreglarlo. */}
                  {r.del_sistema
                    ? t('roles.todosLosPermisos')
                    : t('roles.nPermisos').replace('{n}', String(r.permisos.length))}
                </span>

                <span className="roles__acciones">
                  {!r.del_sistema && (
                    <>
                      <button type="button" onClick={() => { setCreando(false); setEditando(r); }}>
                        {t('roles.editar')}
                      </button>
                      <button type="button" className="roles__borrar" onClick={() => borrar(r)}>
                        {t('roles.borrar')}
                      </button>
                    </>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
