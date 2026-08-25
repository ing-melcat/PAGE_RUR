import React, { useState } from "react";
import { motion } from "framer-motion";
import { useLanguage } from "../../lib/i18n";
import { apiFetch } from "../../lib/apiClient";
import { Ayuda } from "../Ayuda";
import { PanelRoles } from "../PanelRoles";
import { PanelMedallas } from "../PanelMedallas";
import { puede, AREAS } from "../../lib/authUtils";
import { copiarAlPortapapeles } from "../../lib/clipboard";
import { useNotificar, useConfirmar } from "../Notificaciones";

import { useUsers, useRolesDisponibles, useCatalogoPermisos, useMedallasEspeciales, useMutateUser, useMutateMedalla } from "../../hooks/queries/useUsers";

export const AdminUsers = ({ user, setView }: any) => {
  const { t } = useLanguage();
  const notificar = useNotificar();
  const confirmar = useConfirmar();

  const [pestanaPersonal, setPestanaPersonal] = useState<'personas'|'roles'|'medallas'>('personas');
  const [motivosMedallas, setMotivosMedallas] = useState<Record<string,string>>({});
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [perfilPublicoEdit, setPerfilPublicoEdit] = useState(false);
  const [fichaEdit, setFichaEdit] = useState({ rol_publico: '', area: '', generacion: '' });
  const [resetModal, setResetModal] = useState<{ show: boolean, password: '', userNombre: '', action: '2fa' | 'password' } | null>(null);
  // Editando a alguien, el campo de contraseña no existe hasta que se pide.
  //
  // Cuando estaba siempre puesto, cualquier gestor de contraseñas lo
  // autorrellenaba —ni `autoComplete="new-password"` ni `data-lpignore` lo
  // impiden en todos— y guardar un rol acababa reiniciándole la contraseña a
  // esa persona sin que nadie la hubiera escrito. El síntoma no señalaba a la
  // causa: el rol se guardaba bien y era el dueño quien, al día siguiente, no
  // podía entrar. Un campo que no está en el DOM no se autorrellena.
  const [cambiarPassword, setCambiarPassword] = useState(false);

  const { data: usersList = [] } = useUsers();
  const { data: rolesDisponibles = [] } = useRolesDisponibles();
  const { data: catalogoPermisos = {} } = useCatalogoPermisos();
  const { data: medallasEspeciales = [] } = useMedallasEspeciales();
  const mutateUser = useMutateUser();
  const mutateMedalla = useMutateMedalla();

  const isSubmitting = mutateUser.isPending;

  const handleCreateUser = async (e: any) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const rolesArr = formData.getAll('roles') as string[];
    if (rolesArr.length === 0 && !(await confirmar(t('adminUsuarios.sinRolConfirmar')))) return;
    const permisosExtra = formData.getAll('permisos_extra') as string[];
    const userData = {
      matricula: formData.get('matricula'),
      password: formData.get('user_password_provisional'),
      nombre: formData.get('nombre'),
      roles: rolesArr,
      permisos_extra: permisosExtra,
      grupo: formData.get('grupo'),
      alias: formData.get('alias')
    };

    try {
      await mutateUser.mutateAsync({ method: 'POST', userData });
      setIsCreatingUser(false);
    } catch(err: any) { notificar(err.message || t('alertas.errorConexionGenerico'), 'error'); }
  };

  const handleUpdateUser = async (e: any) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const rolesArr = formData.getAll('roles') as string[];
    if (rolesArr.length === 0 && !(await confirmar(t('adminUsuarios.sinRolConfirmar')))) return;
    const permisosExtra = formData.getAll('permisos_extra') as string[];
    const userData = {
      password: formData.get('user_password_provisional'),
      nombre: formData.get('nombre'),
      roles: rolesArr,
      permisos_extra: permisosExtra,
      alias: formData.get('alias'),
      perfil_publico: perfilPublicoEdit,
      ...fichaEdit
    };

    try {
      await mutateUser.mutateAsync({ matricula: editingUser.matricula, method: 'PUT', userData });
      setEditingUser(null); setCambiarPassword(false);
    } catch(err: any) { notificar(err.message || t('alertas.errorConexionGenerico'), 'error'); }
  };

  const reiniciarPassword = async (u: any) => {
    const isSelf = u.matricula === user?.matricula;
    const warningMsg = isSelf
      ? t('adminUsuarios.reiniciarConfirmarPropio') || '¡CUIDADO! Vas a restablecer TU PROPIA contraseña. Te quedarás sin permisos hasta que inicies sesión con la nueva contraseña temporal y la cambies. ¿Estás seguro?'
      : t('adminUsuarios.reiniciarConfirmar').replace('{quien}', u.nombre);

    if (!(await confirmar(warningMsg))) return;
    try {
      const res = await apiFetch(`/api/users/${u.matricula}/password-temporal`, { method: 'POST' });
      const datos = await res.json().catch(() => null);
      if (!res.ok || !datos?.success) return notificar(datos?.message || t('adminUsuarios.reiniciarError'), 'error');
      setResetModal({ show: true, password: datos.password, userNombre: u.nombre, action: 'password' });
    } catch {
      notificar(t('alertas.errorConexionGenerico'), 'error');
    }
  };

  const desvincular2FA = async (u: any) => {
    const isSelf = u.matricula === user?.matricula;
    const warningMsg = isSelf
      ? '¡CUIDADO! Vas a desvincular tu propio Google Authenticator. Perderás el acceso y requerirás una contraseña temporal. ¿Estás seguro?'
      : `¿Estás seguro de que quieres desvincular el Google Authenticator de ${u.nombre}? Se generará una contraseña temporal para que vuelva a entrar.`;

    if (!(await confirmar(warningMsg))) return;
    try {
      const res = await apiFetch(`/api/users/${u.matricula}/2fa`, { method: 'DELETE' });
      const datos = await res.json().catch(() => null);
      if (!res.ok || !datos?.success) return notificar(datos?.message || 'Error al desvincular 2FA.', 'error');
      setResetModal({ show: true, password: datos.password, userNombre: u.nombre, action: '2fa' });
    } catch {
      notificar(t('alertas.errorConexionGenerico'), 'error');
    }
  };

  const handleDeleteUser = async (matricula: string) => {
    if (!(await confirmar(t('adminUsuarios.confirmarEliminar')))) return;
    try {
      await mutateUser.mutateAsync({ matricula, method: 'DELETE' });
    } catch(err: any) { notificar(err.message, 'error'); }
  };

  const otorgarMedalla = async (userId: number, clave: string, otorgar: boolean) => {
    const motivo = motivosMedallas[clave] || '';
    if (otorgar && !motivo) {
      notificar(t('alertas.errorMotivoMedalla'), 'error');
      return;
    }
    try {
      await mutateMedalla.mutateAsync({ userId, clave, method: otorgar ? 'PUT' : 'DELETE', motivo });
      if (!otorgar) {
        setMotivosMedallas(prev => { const n = { ...prev }; delete n[clave]; return n; });
      }
    } catch(err: any) { notificar(err.message, 'error'); }
  };

  const pageTransition = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
    transition: { duration: 0.2 }
  };
  return (
    <>
            <motion.section key="admin_users" className="dashboard-card" {...pageTransition} style={{ marginTop: '120px', marginBottom: '60px' }}>
              <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                  <h2 className="titulo-panel">{t('adminUsuarios.titulo')}</h2>
                  <div className="pestanas">
                    <button
                      className={`pestanas__boton${pestanaPersonal === 'personas' ? ' pestanas__boton--activa' : ''}`}
                      onClick={() => setPestanaPersonal('personas')}
                    >
                      {t('adminUsuarios.pestanaPersonas')}
                    </button>
                    <button
                      className={`pestanas__boton${pestanaPersonal === 'roles' ? ' pestanas__boton--activa' : ''}`}
                      onClick={() => { setPestanaPersonal('roles'); setIsCreatingUser(false); setEditingUser(null); setCambiarPassword(false); }}
                    >
                      {t('adminUsuarios.pestanaRoles')}
                    </button>
                    <button
                      className={`pestanas__boton${pestanaPersonal === 'medallas' ? ' pestanas__boton--activa' : ''}`}
                      onClick={() => { setPestanaPersonal('medallas'); setIsCreatingUser(false); setEditingUser(null); setCambiarPassword(false); }}
                    >
                      {t('adminUsuarios.pestanaMedallas')}
                    </button>
                  </div>
                </div>
                {pestanaPersonal === 'personas' && !isCreatingUser && (
                  <button onClick={() => setIsCreatingUser(true)} style={{ background: 'var(--accent)', color: 'black', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontFamily: 'var(--font-ibm-mono)' }}>{t('adminUsuarios.crearUsuario')}</button>
                )}
      
              </div>

              {pestanaPersonal === 'roles' ? (
                <PanelRoles />
              ) : pestanaPersonal === 'medallas' ? (
                <PanelMedallas />
              ) : (isCreatingUser || editingUser) ? (
                <div style={{ textAlign: 'left', marginBottom: '16px', padding: '20px', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: '8px' }}>
                  <form onSubmit={editingUser ? handleUpdateUser : handleCreateUser} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                      <div className="input-group">
                        <label>{t('adminUsuarios.matriculaId')}</label>
                        <input name="matricula" defaultValue={editingUser?.matricula} readOnly={!!editingUser} required style={{ opacity: editingUser ? 0.5 : 1 }} />
                      </div>
                      <div className="input-group">
                        <label>{t('adminUsuarios.contrasena')}</label>
                        {(!editingUser || cambiarPassword) ? (
                          <input name="user_password_provisional" type="password" required={!editingUser} autoComplete="new-password" data-lpignore="true" />
                        ) : (
                          <button type="button" className="logout-btn-small" onClick={() => setCambiarPassword(true)}
                            style={{ width: '100%', padding: '10px' }}>
                            {t('adminUsuarios.ponerContrasenaProvisional')}
                          </button>
                        )}
                      </div>
                      <div className="input-group">
                        <label>{t('adminUsuarios.nombreCompleto')}</label>
                        <input name="nombre" defaultValue={editingUser?.nombre} required />
                      </div>
                      <div className="input-group">
                        <label>{t('adminUsuarios.aliasNickname')}</label>
                        <input name="alias" defaultValue={editingUser?.alias} />
                      </div>
                      <div className="input-group" style={{ gridColumn: '1 / -1' }}>
                        <label>{t('adminUsuarios.rolesAsignados')}</label>
                        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', padding: '12px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '4px' }}>
                          {/* Primero los roles que esta persona tiene pero que
                              YA NO EXISTEN en la tabla. Sin esto no salía su
                              casilla, y como el formulario manda solo lo
                              marcado, abrir la ficha y guardar se lo quitaba
                              en silencio. Aparece marcado y en rojo: quitarlo
                              tiene que ser una decisión, no un descuido. */}
                          {(editingUser?.roles ?? [])
                            .filter((n: string) => !rolesDisponibles.some(r => r.nombre === n))
                            .map((nombre: string) => (
                              <label key={nombre} title={t('adminUsuarios.rolInvalidoAyuda')} style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--error)', cursor: 'pointer', flexDirection: 'row' }}>
                                <input type="checkbox" name="roles" value={nombre} defaultChecked style={{ width: 'auto', margin: 0, cursor: 'pointer' }} />
                                <span style={{ textTransform: 'uppercase', fontFamily: 'var(--font-ibm-mono)', fontSize: '0.78rem', letterSpacing: '0.08em' }}>
                                  {nombre} ⚠
                                </span>
                              </label>
                            ))}
                          {rolesDisponibles.map(rol => (
                            <label key={rol.nombre} style={{ display: 'flex', alignItems: 'center', gap: '6px', color: rol.color, cursor: 'pointer', flexDirection: 'row' }}>
                              <input
                                type="checkbox"
                                name="roles"
                                value={rol.nombre}
                                defaultChecked={editingUser ? editingUser.roles?.includes(rol.nombre) : rol.nombre === 'operador'}
                                style={{ width: 'auto', margin: 0, cursor: 'pointer' }}
                              />
                              <span style={{ textTransform: 'uppercase', fontFamily: 'var(--font-ibm-mono)', fontSize: '0.78rem', letterSpacing: '0.08em' }}>{rol.nombre}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* Permisos sueltos de esta persona, además de los que le
                          den sus roles. Es lo que evita inventar un rol entero
                          para una excepción de una sola persona. */}
                      <div className="input-group" style={{ gridColumn: '1 / -1' }}>
                        <label>{t('adminUsuarios.permisosExtra')}</label>
                        <div className="permisos-extra">
                          {Object.entries(catalogoPermisos).map(([clave, descripcion]) => (
                            <label key={clave} className="permisos-extra__uno">
                              <input
                                type="checkbox"
                                name="permisos_extra"
                                value={clave}
                                defaultChecked={editingUser?.permisos_extra?.includes(clave)}
                              />
                              <span>
                                <span className="permisos-extra__nombre">{descripcion}</span>
                                <code>{clave}</code>
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                    {/* Si esta persona sale en MIEMBROS. Antes lo decidía cada
                        quien desde su propio perfil; se movió aquí porque
                        publicar a alguien en la web del laboratorio es una
                        decisión de la unidad. Lo que se publica —a qué se
                        dedica, área, generación, foto— lo sigue escribiendo la
                        persona. Solo al editar: en un alta no hay todavía nada
                        que publicar. */}
                    {editingUser && (
                      <div className="visibilidad">
                        <label className="visibilidad__interruptor">
                          <span>
                            <span className="visibilidad__titulo">{t('adminUsuarios.perfilPublico')}</span>
                            <span className="visibilidad__nota">{t('adminUsuarios.perfilPublicoAyuda')}</span>
                          </span>
                          <input
                            type="checkbox"
                            checked={perfilPublicoEdit}
                            onChange={(e) => setPerfilPublicoEdit(e.target.checked)}
                            style={{ width: 'auto', cursor: 'pointer' }}
                          />
                        </label>
                        {/* Publicar a alguien que no ha rellenado su perfil deja
                            una ficha con el nombre y nada más. Antes esto solo
                            se avisaba, y el aviso era un callejón sin salida:
                            señalaba el hueco desde la única pantalla que no
                            podía taparlo. Ahora se escribe aquí mismo. */}
                        {perfilPublicoEdit && !fichaEdit.rol_publico.trim() && (
                          <p className="visibilidad__aviso">{t('adminUsuarios.perfilPublicoVacio')}</p>
                        )}
              

                        <div className="visibilidad__ficha">
                          <p className="visibilidad__nota">{t('adminUsuarios.fichaAyuda')}</p>
                          <div className="input-group">
                            <label>{t('perfil.rolPublico')}</label>
                            <input
                              type="text"
                              maxLength={80}
                              placeholder={t('perfil.rolPublicoPlaceholder')}
                              value={fichaEdit.rol_publico}
                              onChange={(e) => setFichaEdit({ ...fichaEdit, rol_publico: e.target.value })}
                            />
                          </div>
                          <div className="input-group">
                            <label>{t('perfil.area')}</label>
                            <select
                              value={fichaEdit.area}
                              onChange={(e) => setFichaEdit({ ...fichaEdit, area: e.target.value })}
                            >
                              <option value="">{t('perfil.areaSinElegir')}</option>
                              {AREAS.map((a) => <option key={a} value={a}>{a}</option>)}
                              {/* Un área que no esté en la lista —escrita antes
                                  de que existiera, o desde otra pantalla— se
                                  conserva como opción propia. Sin esto el
                                  desplegable se abre en blanco y guardar el
                                  formulario le borra el área a esa persona sin
                                  que nadie la haya tocado. */}
                              {fichaEdit.area && !AREAS.includes(fichaEdit.area) && (
                                <option value={fichaEdit.area}>{fichaEdit.area}</option>
                              )}
                            </select>
                          </div>
                          <div className="input-group">
                            <label>{t('perfil.generacion')}</label>
                            <input
                              type="text"
                              inputMode="numeric"
                              maxLength={20}
                              placeholder="2024"
                              value={fichaEdit.generacion}
                              onChange={(e) => setFichaEdit({ ...fichaEdit, generacion: e.target.value })}
                            />
                          </div>
                        </div>
                      </div>
                    )}
          

                    {/* Las medallas que no salen de los datos. Se pide el
                        motivo a propósito: sin él no se puede leer por qué la
                        tiene, y una medalla que no se explica es un adorno.
                        Queda registrado quién la dio.

                        Las otras tres —proyecto terminado, grandes aportes,
                        líder— no están aquí porque no se conceden: se cumplen
                        solas con los proyectos firmados. */}
                    {editingUser && (
                      <div className="excelencia">
                        <label className="excelencia__titulo">
                          {t('adminUsuarios.medallas')}
                          <Ayuda texto={t('adminUsuarios.medallasAyuda')} />
                        </label>
                        {medallasEspeciales.map((medalla: any) => {
                          const clave = medalla.clave;
                          const tiene = editingUser.medallas?.[clave] !== undefined;
                          return (
                            <div key={clave} className={`medalla-otorgar${tiene ? ' medalla-otorgar--puesta' : ''}`}>
                              <p className="medalla-otorgar__nombre">
                                <span style={{ color: medalla.color }}>{medalla.icono}</span>
                                {medalla.nombre}
                                {tiene && <span className="medalla-otorgar__puesta">{t('adminUsuarios.medallaPuesta')}</span>}
                              </p>
                              <p className="medalla-otorgar__criterio">{medalla.descripcion}</p>
                              <textarea
                                value={motivosMedallas[clave] ?? ''}
                                onChange={(e) => setMotivosMedallas({ ...motivosMedallas, [clave]: e.target.value })}
                                placeholder={t('adminUsuarios.excelenciaMotivo')}
                                maxLength={500}
                                rows={2}
                              />
                              <div className="excelencia__acciones">
                                <button type="button" onClick={() => otorgarMedalla(editingUser.id, clave, true)}>
                                  {tiene ? t('adminUsuarios.medallaActualizar') : t('adminUsuarios.excelenciaOtorgar')}
                                </button>
                                {tiene && (
                                  <button type="button" className="excelencia__retirar" onClick={() => otorgarMedalla(editingUser.id, clave, false)}>
                                    {t('adminUsuarios.excelenciaRetirar')}
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
          

                    <div style={{ display: 'flex', gap: '16px', marginTop: '16px' }}>
                      <button type="submit" style={{ flex: 1 }}>{editingUser ? t('adminUsuarios.actualizarUsuario') : t('adminUsuarios.guardarUsuario')}</button>
                      <button type="button" className="logout-btn" onClick={() => { setIsCreatingUser(false); setEditingUser(null); setCambiarPassword(false); }} style={{ flex: 1, padding: '16px', height: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{t('adminUsuarios.cancelar')}</button>
                    </div>
                  </form>
                </div>
              ) : (
                <div style={{ textAlign: 'left', marginBottom: '16px', overflowX: 'auto', border: '1px solid var(--border)', borderRadius: '8px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font-ibm-mono)', fontSize: '0.8rem' }}>
                    <thead style={{ background: 'var(--background)' }}>
                      <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--muted)' }}>
                        <th style={{ padding: '12px', textAlign: 'left' }}>{t('adminUsuarios.colMatricula')}</th>
                        <th style={{ padding: '12px', textAlign: 'left' }}>{t('adminUsuarios.colNombre')}</th>
                        <th style={{ padding: '12px', textAlign: 'left' }}>{t('adminUsuarios.colRoles')}</th>
                        <th style={{ padding: '12px', textAlign: 'right' }}>{t('adminUsuarios.colAccion')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {usersList.map(u => (
                        <tr key={u.matricula} style={{ borderBottom: '1px dashed var(--border)' }}>
                          <td style={{ padding: '12px', color: 'var(--text)' }}>{u.matricula}</td>
                          <td style={{ padding: '12px', color: 'var(--text)' }}>{u.nombre}</td>
                          {/* Insignias con el color de cada rol, no texto con
                              comas: el color se elige al crear el rol
                              precisamente para reconocerlo de un vistazo, y
                              aquí se estaba desperdiciando. Y una lista vacía
                              deja de ser una celda en blanco —que se lee como
                              un fallo de carga— para decir lo que es. */}
                          <td style={{ padding: '12px' }}>
                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                              {(u.roles ?? []).length === 0 && (
                                <span className="roles__insignia roles__insignia--sin" title={t('adminUsuarios.sinRolAyuda')}>
                                  {t('adminUsuarios.sinRol')}
                                </span>
                              )}
                    
                              {(u.roles ?? []).map((nombre: string) => {
                                const rol = rolesDisponibles.find((r) => r.nombre === nombre);
                                // Un rol que ya no existe en la tabla: se
                                // enseña en rojo en lugar de desaparecer sin
                                // más, que es lo que pasaba antes.
                                return rol ? (
                                  <span key={nombre} className="roles__insignia" style={{ borderColor: rol.color, color: rol.color }}>
                                    {nombre}
                                  </span>
                                ) : (
                                  <span key={nombre} className="roles__insignia roles__insignia--invalido" title={t('adminUsuarios.rolInvalidoAyuda')}>
                                    {nombre}
                                  </span>
                                );
                              })}
                            </div>
                          </td>
                          <td style={{ padding: '12px', textAlign: 'right' }}>
                            {/* Editar sí, también la propia cuenta: antes se
                                ocultaban los dos botones y eso dejaba sin poder
                                cambiarse ni el nombre. Lo que no se puede es
                                borrarse —ni quitarse la gestión de usuarios,
                                que lo impide el servidor—. */}
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                              <button className="logout-btn-small" style={{borderColor: 'var(--accent)', color: 'var(--accent)'}} onClick={() => { setEditingUser(u); setCambiarPassword(false); setMotivosMedallas({ ...(u.medallas ?? {}) }); setPerfilPublicoEdit(!!u.perfil_publico); setFichaEdit({ rol_publico: u.rol_publico ?? '', area: u.area ?? '', generacion: u.generacion ?? '' }); }}>{t('adminUsuarios.editar')}</button>
                              <button className="logout-btn-small" onClick={() => reiniciarPassword(u)}>{t('adminUsuarios.reiniciar')}</button>
                              {u.totp_enabled && (
                                <button className="logout-btn-small" style={{borderColor: '#eab308', color: '#eab308'}} onClick={() => desvincular2FA(u)}>Quitar 2FA</button>
                              )}
                              {u.matricula !== user?.matricula && (
                                <button className="logout-btn-small" style={{borderColor: 'var(--muted)', color: 'var(--muted)'}} onClick={() => handleDeleteUser(u.matricula)}>{t('adminUsuarios.revocar')}</button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
    
              <button className="back-link" onClick={() => {
                if (isCreatingUser || editingUser) {
                  setIsCreatingUser(false);
                  setEditingUser(null); setCambiarPassword(false);
                } else {
                  setView("dashboard");
                }
              }}>{t('adminUsuarios.volver')}</button>
            </motion.section>

            {resetModal && (
              <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }}>
                <div className="dashboard-card" style={{ maxWidth: '500px', width: '90%', textAlign: 'center', padding: '40px 32px' }}>
                  <h2 style={{ color: 'var(--accent)', marginBottom: '16px', fontFamily: 'var(--font-titulo)' }}>
                    {resetModal.action === '2fa' ? '2FA Desvinculado' : 'Contraseña Reiniciada'}
                  </h2>
                  <p style={{ color: 'var(--text)', marginBottom: '32px', fontSize: 'var(--t-base)', lineHeight: '1.5' }}>
                    {resetModal.action === '2fa' ? (
                      <>
                        <strong>{resetModal.userNombre}</strong> vuelve a entrar con contraseña. Al iniciar sesión con esta, tendrá que vincular otra vez su autenticador.
                      </>
                    ) : (
                      <>
                        Se ha generado una nueva contraseña temporal para <strong>{resetModal.userNombre}</strong>.
                        Pídele que inicie sesión con ella para poder configurar su cuenta de nuevo.
                      </>
                    )}
                  </p>
                  <div style={{ padding: '24px', background: 'var(--background)', border: '2px solid var(--accent)', borderRadius: '8px', marginBottom: '12px' }}>
                    <span style={{ fontSize: 'var(--t-2xl)', fontFamily: 'var(--font-ibm-mono)', letterSpacing: '4px', userSelect: 'all', color: 'var(--text)' }}>
                      {resetModal.password}
                    </span>
                  </div>
                  <p style={{ margin: '0 0 32px 0', fontFamily: 'var(--font-ibm-mono)', fontSize: 'var(--t-xs)', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--warning)' }}>
                    Caduca en 72 horas
                  </p>
                  <div style={{ display: 'flex', gap: '16px', flexDirection: 'column' }}>
                    <button
                      className="primary-btn"
                      style={{ padding: '16px', fontSize: 'var(--t-base)' }}
                      onClick={async () => {
                        const copiado = await copiarAlPortapapeles(resetModal.password);
                        notificar(copiado
                          ? '¡Contraseña copiada al portapapeles!'
                          : 'No se pudo copiar. Selecciona la contraseña con un clic y cópiala a mano.', copiado ? 'exito' : 'error');
                      }}
                    >
                      Copiar al Portapapeles
                    </button>
                    <button
                      className="secondary-btn"
                      style={{ padding: '16px', fontSize: 'var(--t-base)' }}
                      onClick={() => setResetModal(null)}
                    >
                      Cerrar (Ya la guardé)
                    </button>
                  </div>
                </div>
              </div>
            )}
    </>
  );
};
