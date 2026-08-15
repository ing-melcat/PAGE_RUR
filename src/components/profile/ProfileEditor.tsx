import React from "react";
import { motion } from "framer-motion";
import { useLanguage } from "../../lib/i18n";
import { CheckCircle } from "lucide-react";
import { apiFetch } from "../../lib/apiClient";
import { AREAS } from "../../lib/authUtils";

export const ProfileEditor = ({
  user, setUser, setMainContext,
  profileForm, setProfileForm,
  showAlias, setShowAlias,
  pushNotifications, setPushNotifications
}: any) => {
  const { t } = useLanguage();
  return (
    <motion.div key="edit_profile" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                      <div className="panel-header" style={{ marginBottom: '32px' }}>
                        <h2 className="titulo-panel titulo-panel--acento">{t('perfil.titulo')}</h2>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', maxWidth: '800px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                          <div className="input-group">
                            <label>{t('perfil.alias')}</label>
                            <input type="text" placeholder={t('perfil.aliasPlaceholder')} value={profileForm.alias} onChange={e => setProfileForm({...profileForm, alias: e.target.value})} />
                          </div>
                          <div className="input-group">
                            <label>{t('perfil.bio')}</label>
                            <input type="text" placeholder={t('perfil.bioPlaceholder')} value={profileForm.bio} onChange={e => setProfileForm({...profileForm, bio: e.target.value})} />
                          </div>
                          <div className="input-group">
                            <label>{t('perfil.fotoLabel')}</label>
                            <input
                              type="file"
                              accept="image/png, image/jpeg, image/webp"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;

                                if (file.size > 2 * 1024 * 1024) {
                                  alert(t('perfil.imagenPesada'));
                                  e.target.value = '';
                                  return;
                                }

                                const formData = new FormData();
                                formData.append('file', file);

                                try {
                                  const res = await apiFetch('/api/upload', {
                                    method: 'POST',
                                    body: formData
                                  });
                                  const data = await res.json();
                                  if (res.ok && data.url) {
                                    setProfileForm({...profileForm, foto: data.url});
                                    alert(t('perfil.fotoSubidaTemporal'));
                                  } else {
                                    alert(data.error || data.message || t('perfil.errorSubirFoto'));
                                  }
                                } catch (err) {
                                  alert(t('perfil.errorConexionFoto'));
                                }
                              }}
                              style={{
                                padding: '8px',
                                background: 'var(--surface-strong)',
                                border: '1px solid var(--border)',
                                borderRadius: '4px',
                                color: 'var(--text)',
                                width: '100%',
                                fontFamily: 'var(--font-ibm-mono)'
                              }}
                            />
                            {profileForm.foto && profileForm.foto.includes('/api/uploads/') && (
                              <div style={{ marginTop: '8px', fontSize: '0.8rem', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <CheckCircle size={14} /> {t('perfil.fotoSubida')}
                              </div>
                            )}
                          </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                          <div className="input-group">
                            <label>{t('perfil.github')}</label>
                            <input type="text" placeholder="https://github.com/..." value={profileForm.github} onChange={e => setProfileForm({...profileForm, github: e.target.value})} />
                          </div>
                          <div className="input-group">
                            <label>{t('perfil.linkedin')}</label>
                            <input type="text" placeholder="https://linkedin.com/in/..." value={profileForm.linkedin} onChange={e => setProfileForm({...profileForm, linkedin: e.target.value})} />
                          </div>
                          <div className="input-group">
                            <label>{t('perfil.instagram')}</label>
                            <input type="text" placeholder="https://instagram.com/..." value={profileForm.instagram} onChange={e => setProfileForm({...profileForm, instagram: e.target.value})} />
                          </div>
                          <div className="input-group">
                            <label>{t('perfil.reddit')}</label>
                            <input type="text" placeholder={t('perfil.redditPlaceholder')} value={profileForm.reddit} onChange={e => setProfileForm({...profileForm, reddit: e.target.value})} />
                          </div>
                          <div className="input-group">
                            <label>{t('perfil.facebook')}</label>
                            <input type="text" placeholder="https://facebook.com/..." value={profileForm.facebook} onChange={e => setProfileForm({...profileForm, facebook: e.target.value})} />
                          </div>
                          {/* Perfil público. Aparecer o no en MIEMBROS lo
                              decide quien administra, así que aquí es un
                              estado que se lee, no un interruptor: los datos
                              se escriben igual, publicados o no, para que
                              estén listos el día que se publiquen. */}
                          <div className={`perfil-publico${profileForm.perfil_publico ? '' : ' perfil-publico--oculto'}`}>
                            <p className="perfil-publico__estado">
                              <span className="perfil-publico__titulo">
                                {profileForm.perfil_publico ? t('perfil.visible') : t('perfil.noVisible')}
                              </span>
                              <span className="perfil-publico__nota">
                                {profileForm.perfil_publico ? t('perfil.aparecerNota') : t('perfil.noVisibleNota')}
                              </span>
                            </p>

                            <div className="perfil-publico__campos">
                              <div className="input-group">
                                <label>{t('perfil.rolPublico')}</label>
                                <input type="text" maxLength={80} placeholder={t('perfil.rolPublicoPlaceholder')} value={profileForm.rol_publico} onChange={e => setProfileForm({...profileForm, rol_publico: e.target.value})} />
                              </div>
                              <div className="input-group">
                                <label>{t('perfil.area')}</label>
                                <select value={profileForm.area} onChange={e => setProfileForm({...profileForm, area: e.target.value})}>
                                  <option value="">{t('perfil.areaSinElegir')}</option>
                                  {AREAS.map((a) => <option key={a} value={a}>{a}</option>)}
                                </select>
                              </div>
                              <div className="input-group">
                                <label>{t('perfil.generacion')}</label>
                                <input type="text" inputMode="numeric" maxLength={20} placeholder="2024" value={profileForm.generacion} onChange={e => setProfileForm({...profileForm, generacion: e.target.value})} />
                              </div>
                            </div>
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '8px' }}>
                            <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px', border: '1px solid var(--border)', background: 'var(--background)', cursor: 'pointer' }}>
                              <span style={{ fontFamily: 'var(--font-ibm-mono)', fontSize: '0.8rem', color: 'var(--text)' }}>{t('perfil.mostrarAlias')}</span>
                              <input type="checkbox" checked={showAlias} onChange={(e) => setShowAlias(e.target.checked)} style={{width: 'auto', cursor: 'pointer'}} />
                            </label>
                            <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px', border: '1px solid var(--border)', background: 'var(--background)', cursor: 'pointer' }}>
                              <span style={{ fontFamily: 'var(--font-ibm-mono)', fontSize: '0.8rem', color: 'var(--text)' }}>{t('perfil.recibirPush')}</span>
                              <input type="checkbox" checked={pushNotifications} onChange={(e) => setPushNotifications(e.target.checked)} style={{width: 'auto', cursor: 'pointer'}} />
                            </label>
                          </div>

                          <button className="primary-btn" style={{ marginTop: 'auto' }} onClick={async () => {
                            try {
                              // Un solo guardado para todo el perfil: los datos
                              // públicos del formulario y las dos preferencias,
                              // que antes vivían en una pantalla aparte.
                              // perfil_publico se queda fuera: el servidor lo
                              // ignora en esta ruta y mandarlo daría a entender
                              // que se puede cambiar desde aquí.
                              const { perfil_publico: _visible, ...datosPerfil } = profileForm;
                              const res = await apiFetch('/api/profile', {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  ...datosPerfil,
                                  show_alias: showAlias,
                                  push_notifications: pushNotifications
                                })
                              });
                              const data = await res.json().catch(() => null);
                              if (res.ok && data?.success) {
                                setUser(data.user);
                                alert(t('perfil.perfilActualizado'));
                                setMainContext("modules");
                              } else {
                                alert(data?.message || t('perfil.errorGuardarPerfil'));
                              }
                            } catch (e) {
                              alert(t('perfil.errorConexion'));
                            }
                          }}>
                            {t('perfil.guardarCambios')}
                          </button>
                        </div>
                      </div>

                      <button className="back-link" style={{ marginTop: '32px' }} onClick={() => setMainContext("modules")}>{t('perfil.cancelarVolver')}</button>
                    </motion.div>
  );
};
