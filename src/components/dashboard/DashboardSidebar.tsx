import React from "react";
import { motion } from "framer-motion";
import { useLanguage } from "../../lib/i18n";
import { getRoles } from "../../lib/authUtils";

const GithubIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path>
  </svg>
);

const InstagramIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
  </svg>
);

const RedditIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <path d="M16 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0z"></path>
    <path d="M8 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0z"></path>
    <path d="M12 15s1.5 2 4 2"></path>
  </svg>
);

const FacebookIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
  </svg>
);

const BlueprintUserIcon = ({ size = 42, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.2" strokeLinejoin="bevel">
    <path d="M7 8l5-3 5 3v6l-5 3-5-3V8z" />
    <path d="M9 10h6v2H9z" />
    <path d="M4 22v-3l4-4h8l4 4v3" />
    <path d="M12 17v5" strokeDasharray="2 2" />
    <circle cx="12" cy="5" r="1" fill={color} />
  </svg>
);

export const DashboardSidebar = ({ user, openProfileEditor, setMainContext }: any) => {
  const { t } = useLanguage();
  return (
    <>
              <aside className="sidebar" style={{ display: 'flex', flexDirection: 'column' }}>
                <motion.div 
                  className="user-card" 
                  style={{ display: 'flex', flexDirection: 'column', gap: '24px', alignItems: 'flex-start', position: 'sticky', top: '24px' }}
                  initial={{ x: -150, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ type: 'spring', damping: 20, stiffness: 100, delay: 0.1 }}
                >
                  <div style={{ 
                    width: '200px', 
                    height: '200px', 
                    borderRadius: '12px', 
                    backgroundColor: 'var(--background)', 
                    border: '1px solid var(--border)',
                    display: 'grid', 
                    placeItems: 'center', 
                    color: 'var(--bone)', 
                    boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.2)',
                    overflow: 'hidden',
                    flexShrink: 0
                  }}>
                    {user.foto ? (
                      <img 
                        src={user.foto.startsWith('http') || user.foto.startsWith('/api/') ? user.foto : `${import.meta.env.BASE_URL}${user.foto.startsWith('/') ? user.foto.substring(1) : user.foto}`} 
                        alt={`Foto de ${user.nombre}`} 
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          e.currentTarget.parentElement.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-user"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';
                        }}
                      />
                    ) : (
                      <BlueprintUserIcon />
                    )}
                  </div>
                  <div style={{ flex: 1, width: '100%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                      <p className="user-label">{t('dashboard.usuarioConectado')}</p>
                      <h2 style={{ margin: '4px 0 0 0', letterSpacing: '-0.5px' }}>{user.nombre}</h2>
                      {user.alias && (
                        <p style={{ margin: '4px 0 0 0', color: 'var(--accent)', fontSize: '0.95rem', fontStyle: 'italic' }}>"{user.alias}"</p>
                      )}
                      {user.bio && (
                        <p style={{ margin: '8px 0 0 0', color: 'var(--muted)', fontSize: '0.85rem', lineHeight: '1.4' }}>{user.bio}</p>
                      )}
                    </div>
                    <div className="user-meta" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <p>{t('dashboard.matricula')}: <br/><strong style={{fontSize: '1rem', color: 'var(--text)'}}>{user.matricula}</strong></p>
                      <p>{t('dashboard.grupo')}: <br/><strong style={{fontSize: '1rem', color: 'var(--text)'}}>{user.grupo}</strong></p>
                      <p>{t('dashboard.telefono')}: <br/><strong style={{fontSize: '1rem', color: 'var(--text)'}}>{user.telefono}</strong></p>
                      <div>{t('dashboard.roles')}: <br/>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '6px' }}>
                          {(() => {
                            return getRoles(user).map((r: string) => {
                              let color = 'var(--text)';
                              let bg = 'var(--surface-strong)';
                              if (r === 'admin') { color = 'black'; bg = 'var(--accent)'; }
                              else if (r === 'redactor' || r === 'editor') { color = 'white'; bg = '#9b59b6'; }
                              else if (r === 'operador') { color = 'white'; bg = '#3498db'; }
                              else if (r === 'hardware') { color = 'white'; bg = '#2c3e50'; }
                              else if (r === 'software') { color = 'white'; bg = '#e67e22'; }
                              else if (r === 'miembro') { color = 'white'; bg = '#444'; }
                              return <span key={r} style={{ padding: '4px 8px', background: bg, color: color, borderRadius: '4px', fontSize: '0.8rem', fontFamily: 'var(--font-ibm-mono)', fontWeight: 'bold', textTransform: 'uppercase' }}>{r}</span>
                            });
                          })()}
                        </div>
                      </div>
                      <p>{t('dashboard.estado')}: <strong style={{ color: "var(--success)" }}>{t('dashboard.online')}</strong></p>
                      {(user.github || user.instagram || user.reddit || user.facebook) && (
                        <div style={{ display: 'flex', gap: '12px', marginTop: '8px', flexWrap: 'wrap' }}>
                          {user.github && (
                            <a href={`https://github.com/${user.github}`} target="_blank" rel="noreferrer" style={{ color: 'var(--text)' }}>
                              <GithubIcon />
                            </a>
                          )}
                          {user.instagram && (
                            <a href={`https://instagram.com/${user.instagram}`} target="_blank" rel="noreferrer" style={{ color: 'var(--text)' }}>
                              <InstagramIcon />
                            </a>
                          )}
                          {user.reddit && (
                            <a href={user.reddit.startsWith('http') ? user.reddit : `https://reddit.com/user/${user.reddit}`} target="_blank" rel="noreferrer" style={{ color: 'var(--text)' }}>
                              <RedditIcon />
                            </a>
                          )}
                          {user.facebook && (
                            <a href={user.facebook.startsWith('http') ? user.facebook : `https://facebook.com/${user.facebook}`} target="_blank" rel="noreferrer" style={{ color: 'var(--text)' }}>
                              <FacebookIcon />
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <button 
                    className="logout-btn-small" 
                    style={{ width: '100%', marginTop: 'auto' }}
                    onClick={openProfileEditor}
                  >
                    {t('dashboard.personalizarPerfil')}
                  </button>

                  {/* Junto a personalizar el perfil, no escondido en Ajustes:
                      es la razón por la que hoy se le pide la contraseña nueva
                      a un administrador — porque no había dónde cambiarla. */}
                  <button
                    className="logout-btn-small"
                    style={{ width: '100%', marginTop: '8px' }}
                    onClick={() => setMainContext("cambiar_password")}
                  >
                    {t('password.titulo')}
                  </button>
                </motion.div>
              </aside>
    </>
  );
};
