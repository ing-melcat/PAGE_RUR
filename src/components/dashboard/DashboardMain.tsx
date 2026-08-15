import React from "react";
import { motion } from "framer-motion";
import { useLanguage } from "../../lib/i18n";
import { puede } from "../../lib/authUtils";

const ConsoleIcon = ({ size = 22, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 14c0 3 2 4 4 4h12c2 0 4-1 4-4V9c0-2-1-3-3-3H5C3 6 2 7 2 9v5z" />
    <rect x="7" y="8" width="10" height="4" rx="1" />
    <path d="M5.5 13.5v2m-1-1h2" />
    <circle cx="17" cy="14.5" r="0.5" fill={color} />
    <circle cx="18.5" cy="13" r="0.5" fill={color} />
    <path d="M6 6l-1-2" />
    <path d="M18 6l1-2" />
  </svg>
);

export const DashboardMain = ({ user, loadingAction, setLoadingAction, setView, loadingActionTimerRef }: any) => {
  const { t } = useLanguage();
  return (
    <>
                      <motion.div 
                        className="brand"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                      >
                        <div>
                          <h1>{t('dashboard.panelPrincipal')}</h1>
                        </div>
                      </motion.div>

                      <motion.div className="action-grid" layout style={{ alignItems: 'start' }}>
                        {(() => {
                          // Cada panel pide el permiso que de verdad
                          // necesita para funcionar, el mismo que comprueba
                          // el servidor en sus rutas. Antes esto era una
                          // lista fija para "admin" y otra para el resto:
                          // crear un rol nuevo no cambiaba nada aquí, así
                          // que un rol a medida no servía para nada.
                          const PANELES = [
                            { permiso: 'publicaciones.editar',  title: t('dashboard.gestionPublicaciones'),   view: 'admin_content' },
                            { permiso: 'usuarios.gestionar',    title: t('dashboard.gestionUsuarios'),        view: 'admin_users' },
                            { permiso: 'logs.ver',              title: t('dashboard.logsGenerales'),          view: 'admin_logs' },
                            { permiso: 'robots.gestionar',      title: t('dashboard.administracionRobots'),   view: 'admin_config' },
                            { permiso: 'robots.operar',         title: t('dashboard.consolaOperador'),        view: 'controles' },
                            { permiso: 'transmision.gestionar', title: t('dashboard.transmision'),            view: 'transmision' },
                          ];
                          const actions: any[] = PANELES.filter((p) => puede(user, p.permiso));

                          if (actions.length === 0) {
                            return <p style={{ color: 'var(--muted)', fontSize: '0.9rem', fontStyle: 'italic' }}>{t('dashboard.sinHerramientas')}</p>;
                          }

                          return actions.map((action, idx) => {
                            const isActivating = loadingAction === action.view;
                            return (
                              <motion.div 
                                layout
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 + (idx * 0.1) }}
                                key={idx} 
                                className="action-card"
                                onClick={() => {
                                  if (action.view === "controles") {
                                    setView("robot_selection");
                                  } else if (!isActivating) {
                                    // Cancelar cualquier timer de una tarjeta anterior: sin esto,
                                    // un click en A seguido de otro en B antes de que pasen los
                                    // 1.2s dejaba dos timers corriendo, y el de A navegaba igual
                                    // aunque B fuera el último elegido.
                                    if (loadingActionTimerRef.current) {
                                      clearTimeout(loadingActionTimerRef.current);
                                    }
                                    setLoadingAction(action.view);
                                    loadingActionTimerRef.current = setTimeout(() => {
                                      setLoadingAction(null);
                                      setView(action.view);
                                      loadingActionTimerRef.current = null;
                                    }, 1200);
                                  }
                                }}
                                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden', ...(action.view === "controles" ? { background: 'var(--accent)', color: 'black' } : {}) }}
                              >
                                {isActivating && (
                                  <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: "100%" }}
                                    transition={{ duration: 0.8, ease: "linear" }}
                                    style={{ position: 'absolute', top: 0, left: 0, bottom: 0, background: 'var(--accent)', opacity: 0.2, zIndex: 0 }}
                                  />
                                )}
                                <motion.span layout style={{ fontSize: '1.1rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', zIndex: 1 }}>
                                  {isActivating ? (
                                    <>{t('dashboard.conectando')} <span className="loading-dots">...</span></>
                                  ) : (
                                    <>{action.view === 'controles' ? <><ConsoleIcon /> {action.title}</> : action.title}</>
                                  )}
                                </motion.span>
                              </motion.div>
                            );
                          });
                        })()}
                      </motion.div>
    </>
  );
};
