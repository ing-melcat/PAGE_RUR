import React, { useState } from "react";
import { motion } from "framer-motion";
import { useLanguage } from "../../lib/i18n";
import { CheckCircle, Upload } from "lucide-react";
import { apiFetch } from "../../lib/apiClient";
import { AREAS } from "../../lib/authUtils";
import { Configurar2FA } from "./Configurar2FA";
import { useNotificar } from "../Notificaciones";
import { pageMotionVariants, pageMotionTransition } from "../../lib/motionTokens";
import "./ProfileEditor.css";

export const ProfileEditor = ({
  user, setUser, setMainContext,
  profileForm, setProfileForm,
  showAlias, setShowAlias,
  pushNotifications, setPushNotifications,
  reduceAnimations, setReduceAnimations
}: any) => {
  const { t } = useLanguage();
  const notificar = useNotificar();
  const [subiendoFoto, setSubiendoFoto] = useState(false);
  return (
    <motion.div key="edit_profile" variants={pageMotionVariants} initial="initial" animate="animate" exit="exit" transition={pageMotionTransition}>
      <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button className="back-link" onClick={() => setMainContext("modules")} style={{ margin: 0 }}>
            {t('perfil.cancelarVolver')}
          </button>
          <h2 className="titulo-panel titulo-panel--acento" style={{ margin: 0 }}>{t('perfil.titulo')}</h2>
        </div>
      </div>

      <div className="perfil-editor">
        <div className="perfil-editor__secciones">

          {/* 01 -- Identidad */}
          <section className="perfil-editor__seccion">
            <div className="perfil-editor__cabecera">
              <span className="perfil-editor__numero">01</span>
              <h3 className="perfil-editor__titulo">{t('perfil.identidad')}</h3>
            </div>
            <div className="perfil-editor__grid-2">
              <div className="input-group">
                <label>{t('perfil.alias')}</label>
                <input type="text" placeholder={t('perfil.aliasPlaceholder')} value={profileForm.alias} onChange={e => setProfileForm({...profileForm, alias: e.target.value})} />
              </div>
              <div className="input-group">
                <label>{t('perfil.bio')}</label>
                <input type="text" placeholder={t('perfil.bioPlaceholder')} value={profileForm.bio} onChange={e => setProfileForm({...profileForm, bio: e.target.value})} />
              </div>
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
                    notificar(t('perfil.imagenPesada'), 'error');
                    e.target.value = '';
                    return;
                  }

                  const formData = new FormData();
                  formData.append('file', file);

                  setSubiendoFoto(true);
                  try {
                    const res = await apiFetch('/api/upload', {
                      method: 'POST',
                      body: formData
                    });
                    const contentType = res.headers.get('content-type');
                    if (!contentType || !contentType.includes('application/json')) {
                      notificar('Error del servidor: Posiblemente la imagen es demasiado grande o hubo un error de red.', 'error');
                      return;
                    }
                    const data = await res.json();
                    if (res.ok && data.url) {
                      setProfileForm({...profileForm, foto: data.url});
                      notificar(t('perfil.fotoSubidaTemporal'), 'exito');
                    } else {
                      notificar(data.error || data.message || t('perfil.errorSubirFoto'), 'error');
                    }
                  } catch (err) {
                    notificar(t('perfil.errorConexionFoto'), 'error');
                  } finally {
                    setSubiendoFoto(false);
                    e.target.value = '';
                  }
                }}
                style={{ display: 'none' }}
                id="upload-foto-perfil"
              />
              <label
                htmlFor="upload-foto-perfil"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '12px', background: 'var(--surface-strong)', color: 'white', border: '1px solid var(--border)', borderRadius: '4px', textAlign: 'center', cursor: 'pointer', fontFamily: 'var(--font-ibm-mono)', fontSize: '0.8rem' }}
              >
                {subiendoFoto ? t('adminPublicaciones.subiendo') : <><Upload size={14} /> {t('adminPublicaciones.subirLocal')}</>}
              </label>
              {profileForm.foto && profileForm.foto.includes('/api/uploads/') && (
                <div style={{ marginTop: '8px', fontSize: 'var(--t-xs)', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <CheckCircle size={14} /> {t('perfil.fotoSubida')}
                </div>
              )}
            </div>
          </section>

          {/* 02 -- Redes */}
          <section className="perfil-editor__seccion">
            <div className="perfil-editor__cabecera">
              <span className="perfil-editor__numero">02</span>
              <h3 className="perfil-editor__titulo">{t('perfil.redes')}</h3>
            </div>
            <div className="perfil-editor__grid-2">
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
              {/* Con 5 campos en una rejilla de 2 columnas, este último cae
                  solo en la segunda: aprobado así en la maqueta. */}
              <div className="input-group">
                <label>{t('perfil.facebook')}</label>
                <input type="text" placeholder="https://facebook.com/..." value={profileForm.facebook} onChange={e => setProfileForm({...profileForm, facebook: e.target.value})} />
              </div>
            </div>
          </section>

          {/* 03 -- Perfil público. Aparecer o no en MIEMBROS lo decide quien
              administra, así que aquí es un estado que se lee, no un
              interruptor: los datos se escriben igual, publicados o no,
              para que estén listos el día que se publiquen. */}
          <section className="perfil-editor__seccion">
            <div className="perfil-editor__cabecera">
              <span className="perfil-editor__numero">03</span>
              <h3 className="perfil-editor__titulo">{t('perfil.perfilPublicoTitulo')}</h3>
            </div>
            <div className={`perfil-editor__publico perfil-publico${profileForm.perfil_publico ? '' : ' perfil-publico--oculto'}`}>
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
          </section>

          {/* 04 -- Preferencias */}
          <section className="perfil-editor__seccion">
            <div className="perfil-editor__cabecera">
              <span className="perfil-editor__numero">04</span>
              <h3 className="perfil-editor__titulo">{t('perfil.preferencias')}</h3>
            </div>
            <div className="perfil-editor__toggles">
              <label className="perfil-editor__interruptor">
                <span>{t('perfil.mostrarAlias')}</span>
                <input type="checkbox" checked={showAlias} onChange={(e) => setShowAlias(e.target.checked)} />
              </label>
              <label className="perfil-editor__interruptor">
                <span>{t('perfil.recibirPush')}</span>
                <input type="checkbox" checked={pushNotifications} onChange={(e) => setPushNotifications(e.target.checked)} />
              </label>
              <label className="perfil-editor__interruptor">
                <span>{t('perfil.reducirAnimaciones')}</span>
                <input type="checkbox" checked={reduceAnimations} onChange={(e) => setReduceAnimations(e.target.checked)} />
              </label>
            </div>
          </section>

          {/* 05 -- Seguridad */}
          <section className="perfil-editor__seccion">
            <div className="perfil-editor__cabecera">
              <span className="perfil-editor__numero">05</span>
              <h3 className="perfil-editor__titulo">{t('perfil.seguridad')}</h3>
            </div>
            <Configurar2FA user={user} setUser={setUser} />
          </section>

        </div>

        <div className="perfil-editor__acciones">
          <button className="primary-btn" onClick={async () => {
            try {
              // que se puede cambiar desde aquí.
              const { perfil_publico: _visible, ...datosPerfil } = profileForm;
              const res = await apiFetch('/api/profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  ...datosPerfil,
                  show_alias: showAlias,
                  push_notifications: pushNotifications,
                  reduce_animations: reduceAnimations
                })
              });
              const data = await res.json().catch(() => null);
              if (res.ok && data?.success) {
                setUser(data.user);
                notificar(t('perfil.perfilActualizado'), 'exito');
                setMainContext("modules");
              } else {
                notificar(data?.message || t('perfil.errorGuardarPerfil'), 'error');
              }
            } catch (e) {
              notificar(t('perfil.errorConexion'), 'error');
            }
          }}>
            {t('perfil.guardarCambios')}
          </button>
        </div>
      </div>
    </motion.div>
  );
};
