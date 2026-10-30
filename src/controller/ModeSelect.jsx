import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Glasses, Gamepad2 } from 'lucide-react';
import { useLanguage } from '../lib/i18n';

// Mismos tokens de estilo que RobotSelection.jsx, para que ambas pantallas
// del flujo del operador se vean como una sola pieza.
const S = {
  label: { fontFamily: 'var(--font-ibm-mono)', fontSize: '0.8rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' },
  sectionTitle: { margin: 0, color: 'var(--text)', fontFamily: 'var(--font-ibm-mono)', fontSize: '0.95rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 500, paddingBottom: '12px', borderBottom: '1px solid var(--border)' },
  panel: { background: 'var(--surface)', padding: '32px', borderRadius: '8px', border: '1px solid var(--border)' },
};

export function ModeSelect({ onSelectMode, onBack }) {
  const { t } = useLanguage();
  useEffect(() => {
    const forzarScroll = () => {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
      if (document.scrollingElement) {
        document.scrollingElement.scrollTop = 0;
      }
    };
    forzarScroll();
    const rafId = requestAnimationFrame(forzarScroll);
    const t1 = setTimeout(forzarScroll, 40);
    const t2 = setTimeout(forzarScroll, 120);
    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);
  const handleSelect = (modo) => {
    onSelectMode(modo);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', position: 'relative', minHeight: '600px' }}>
      {/* HEADER */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '36px', borderBottom: '1px solid var(--border)', paddingBottom: '20px' }}>
        <button className="back-link" onClick={onBack} style={{ margin: 0, alignSelf: 'flex-start' }}>
          {t('operador.modo.volver')}
        </button>
        <h2 style={{ margin: 0, fontSize: '3.2rem', fontFamily: 'var(--font-titulo)', color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.05em', lineHeight: '1', fontWeight: 400 }}>
          {t('operador.modo.titulo')}
        </h2>
        <p style={{ ...S.label, textTransform: 'none', margin: 0 }}>{t('operador.modo.subtitulo')}</p>
      </div>

      {/* TARJETAS */}
      <motion.div
        variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } }}
        initial="hidden"
        animate="show"
        style={{ display: 'grid', gap: '24px', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', flex: 1 }}
      >
        {/* Modo VR: la sesión WebXR y el mapeo de los wands ya están escritos,
            pero sin visor a la mano en esta sesión no se pudo probar en
            hardware real -- por eso el aviso se queda fijo en vez de ser un
            tooltip que solo se ve al pasar el mouse (con el visor puesto no
            hay mouse que pasar). */}
        <motion.div
          variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.25, 0.1, 0.25, 1] } } }}
          whileHover={{ y: -4 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => handleSelect('vr')}
          style={{
            ...S.panel, display: 'flex', flexDirection: 'column', gap: '16px',
            cursor: 'pointer', pointerEvents: 'auto', transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(251, 202, 1, 0.08)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none'; }}
        >
          <Glasses size={32} color="var(--accent)" />
          <h3 style={{ margin: 0, fontSize: '1.2rem', fontFamily: 'var(--font-titulo)', color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 400 }}>
            {t('operador.modo.vrTitulo')}
          </h3>
          <p style={{ ...S.label, textTransform: 'none', margin: 0, lineHeight: 1.6 }}>
            {t('operador.modo.vrDescripcion')}
          </p>
          <p style={{ ...S.label, textTransform: 'none', margin: 0, lineHeight: 1.5, color: 'var(--accent)', fontSize: '0.75rem' }}>
            {t('operador.modo.vrAvisoBeta')}
          </p>
        </motion.div>

        {/* Modo Manual: mando/teclado/táctil, con el joystick de cámara en
            pantalla -- lo único listo para usarse hoy. */}
        <motion.div
          variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.25, 0.1, 0.25, 1] } } }}
          whileHover={{ y: -4 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => handleSelect('manual')}
          style={{
            ...S.panel, display: 'flex', flexDirection: 'column', gap: '16px',
            cursor: 'pointer', pointerEvents: 'auto', transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(251, 202, 1, 0.08)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none'; }}
        >
          <Gamepad2 size={32} color="var(--accent)" />
          <h3 style={{ margin: 0, fontSize: '1.2rem', fontFamily: 'var(--font-titulo)', color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 400 }}>
            {t('operador.modo.manualTitulo')}
          </h3>
          <p style={{ ...S.label, textTransform: 'none', margin: 0, lineHeight: 1.6 }}>
            {t('operador.modo.manualDescripcion')}
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}
