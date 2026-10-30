import React from "react";
import { motion } from "framer-motion";
import { useLanguage } from "../../lib/i18n";
import { puede } from "../../lib/authUtils";
import { pageMotionVariants, pageMotionTransition } from "../../lib/motionTokens";

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

export const DashboardMain = ({ user, setView }: any) => {
  const { t } = useLanguage();
  return (
    <motion.div key="modules" variants={pageMotionVariants} initial="initial" animate="animate" exit="exit" transition={pageMotionTransition}>
      <motion.div 
        className="brand"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div>
          <h1>{t('dashboard.panelPrincipal')}</h1>
        </div>
      </motion.div>

      <motion.div className="action-grid" layout style={{ alignItems: 'start' }}>
        {(() => {
          // Cada panel pide el permiso que de verdad
          // necesita para funcionar, el mismo que comprueba
          // el servidor en sus rutas.
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
            const activar = () => {
              if (action.view === "controles") {
                setView("robot_selection");
              } else {
                setView(action.view);
              }
            };
            return (
              <motion.div
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04 }}
                key={idx}
                className="action-card"
                role="button"
                tabIndex={0}
                onClick={activar}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activar(); } }}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden', ...(action.view === "controles" ? { background: 'var(--accent)', color: 'black' } : {}) }}
              >
                <motion.span layout style={{ fontSize: '1.1rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', zIndex: 1 }}>
                  {action.view === 'controles' ? <><ConsoleIcon /> {action.title}</> : action.title}
                </motion.span>
              </motion.div>
            );
          });
        })()}
      </motion.div>
    </motion.div>
  );
};
