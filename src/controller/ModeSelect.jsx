import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Glasses, Gamepad2 } from 'lucide-react';
import { useLanguage } from '../lib/i18n';

// Mismos tokens de estilo que RobotSelection.jsx, para que ambas pantallas
// del flujo del operador se vean como una sola pieza técnica de aviónica.
const S = {
  label: { fontFamily: 'var(--font-codigo), monospace', fontSize: '0.75rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 'var(--tracking-tech)', fontWeight: 500 },
  sectionTitle: { margin: 0, color: 'var(--text)', fontFamily: 'var(--font-etiqueta), sans-serif', fontSize: '0.95rem', textTransform: 'uppercase', letterSpacing: 'var(--tracking-tech)', textIndent: 'calc(var(--tracking-tech) * 0.5)', fontWeight: 700, paddingBottom: '12px', borderBottom: '1px solid var(--border)' },
  panel: { background: 'var(--surface)', padding: '28px', borderRadius: '2px', border: '1px solid var(--border)', position: 'relative' },
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '32px', borderBottom: '1px solid var(--border)', paddingBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontFamily: 'var(--font-codigo)', fontSize: '0.72rem', color: 'var(--accent)', letterSpacing: 'var(--tracking-tech)', background: 'var(--accent-muted)', padding: '3px 8px', border: '1px solid rgba(251, 202, 1, 0.3)' }}>
            GCS // FLIGHT CONTROL LINK
          </span>
        </div>
        <h2 style={{ margin: 0, fontSize: 'clamp(2.2rem, 5vw, 3.2rem)', fontFamily: 'var(--font-titulo)', color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.04em', lineHeight: '1', fontWeight: 400 }}>
          {t('operador.modo.titulo')}
        </h2>
        <p style={{ ...S.label, textTransform: 'none', margin: 0, color: 'var(--muted)', fontSize: '0.85rem' }}>{t('operador.modo.subtitulo')}</p>
      </div>

      {/* CONSOLAS DE PROTOCOLO DE ENLACE */}
      <motion.div
        variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } }}
        initial="hidden"
        animate="show"
        style={{ display: 'grid', gap: '24px', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', flex: 1 }}
      >
        {/* Modo Manual: Estación GCS directa */}
        <motion.div
          variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' } } }}
          whileTap={{ scale: 0.99 }}
          onClick={() => handleSelect('manual')}
          style={{
            ...S.panel, display: 'flex', flexDirection: 'column', gap: '16px',
            cursor: 'pointer', pointerEvents: 'auto', transition: 'border-color 0.15s ease, background 0.15s ease, box-shadow 0.15s ease',
          }}
          onMouseEnter={e => { 
            e.currentTarget.style.borderColor = 'var(--accent)'; 
            e.currentTarget.style.background = 'var(--surface-strong)';
            e.currentTarget.style.boxShadow = '0 0 24px rgba(251, 202, 1, 0.12)'; 
          }}
          onMouseLeave={e => { 
            e.currentTarget.style.borderColor = 'var(--border)'; 
            e.currentTarget.style.background = 'var(--surface)';
            e.currentTarget.style.boxShadow = 'none'; 
          }}
        >
          {/* Muescas tácticas en esquinas */}
          <div style={{ position: 'absolute', top: -1, left: -1, width: 6, height: 6, borderTop: '2px solid var(--accent)', borderLeft: '2px solid var(--accent)' }} />
          <div style={{ position: 'absolute', top: -1, right: -1, width: 6, height: 6, borderTop: '2px solid var(--accent)', borderRight: '2px solid var(--accent)' }} />
          <div style={{ position: 'absolute', bottom: -1, left: -1, width: 6, height: 6, borderBottom: '2px solid var(--accent)', borderLeft: '2px solid var(--accent)' }} />
          <div style={{ position: 'absolute', bottom: -1, right: -1, width: 6, height: 6, borderBottom: '2px solid var(--accent)', borderRight: '2px solid var(--accent)' }} />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontFamily: 'var(--font-codigo)', fontSize: '0.7rem', color: 'var(--accent)', letterSpacing: 'var(--tracking-tech)' }}>
              PROTOCOLO 01 // DIRECT LINK
            </span>
            <Gamepad2 size={26} color="var(--accent)" />
          </div>

          <h3 style={{ margin: 0, fontSize: '1.4rem', fontFamily: 'var(--font-titulo)', color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 400 }}>
            {t('operador.modo.manualTitulo')}
          </h3>

          <p style={{ ...S.label, textTransform: 'none', margin: 0, lineHeight: 1.6, color: 'var(--muted)', fontSize: '0.85rem' }}>
            {t('operador.modo.manualDescripcion')}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderTop: '1px solid var(--border)', paddingTop: '12px', marginTop: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-codigo)', fontSize: '0.7rem' }}>
              <span style={{ color: 'var(--muted)' }}>DISPOSITIVOS:</span>
              <span style={{ color: 'var(--text)' }}>GAMEPAD W3C / TECLADO</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-codigo)', fontSize: '0.7rem' }}>
              <span style={{ color: 'var(--muted)' }}>TASA DE TRANSMISIÓN:</span>
              <span style={{ color: 'var(--text)' }}>60 HZ REAL-TIME</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-codigo)', fontSize: '0.7rem' }}>
              <span style={{ color: 'var(--muted)' }}>LATENCIA ESTIMADA:</span>
              <span style={{ color: '#2ecc71' }}>&lt; 25 MS (WEBRTC P2P)</span>
            </div>
          </div>

          <div style={{ 
            fontFamily: 'var(--font-codigo)', 
            fontSize: '0.78rem', 
            color: 'var(--accent)', 
            letterSpacing: 'var(--tracking-tech)', 
            textTransform: 'uppercase',
            border: '1px solid var(--accent)',
            padding: '10px 16px',
            textAlign: 'center',
            background: 'var(--accent-muted)',
            marginTop: '8px'
          }}>
            ACOPLAR PROTOCOLO DIRECTO →
          </div>
        </motion.div>

        {/* Modo VR: Enlace Háptico Espacial */}
        <motion.div
          variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' } } }}
          whileTap={{ scale: 0.99 }}
          onClick={() => handleSelect('vr')}
          style={{
            ...S.panel, display: 'flex', flexDirection: 'column', gap: '16px',
            cursor: 'pointer', pointerEvents: 'auto', transition: 'border-color 0.15s ease, background 0.15s ease, box-shadow 0.15s ease',
          }}
          onMouseEnter={e => { 
            e.currentTarget.style.borderColor = 'var(--accent)'; 
            e.currentTarget.style.background = 'var(--surface-strong)';
            e.currentTarget.style.boxShadow = '0 0 24px rgba(251, 202, 1, 0.12)'; 
          }}
          onMouseLeave={e => { 
            e.currentTarget.style.borderColor = 'var(--border)'; 
            e.currentTarget.style.background = 'var(--surface)';
            e.currentTarget.style.boxShadow = 'none'; 
          }}
        >
          {/* Muescas tácticas en esquinas */}
          <div style={{ position: 'absolute', top: -1, left: -1, width: 6, height: 6, borderTop: '2px solid var(--accent)', borderLeft: '2px solid var(--accent)' }} />
          <div style={{ position: 'absolute', top: -1, right: -1, width: 6, height: 6, borderTop: '2px solid var(--accent)', borderRight: '2px solid var(--accent)' }} />
          <div style={{ position: 'absolute', bottom: -1, left: -1, width: 6, height: 6, borderBottom: '2px solid var(--accent)', borderLeft: '2px solid var(--accent)' }} />
          <div style={{ position: 'absolute', bottom: -1, right: -1, width: 6, height: 6, borderBottom: '2px solid var(--accent)', borderRight: '2px solid var(--accent)' }} />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontFamily: 'var(--font-codigo)', fontSize: '0.7rem', color: 'var(--accent)', letterSpacing: 'var(--tracking-tech)' }}>
              PROTOCOLO 02 // WEBXR 6DOF
            </span>
            <Glasses size={26} color="var(--accent)" />
          </div>

          <h3 style={{ margin: 0, fontSize: '1.4rem', fontFamily: 'var(--font-titulo)', color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 400 }}>
            {t('operador.modo.vrTitulo')}
          </h3>

          <p style={{ ...S.label, textTransform: 'none', margin: 0, lineHeight: 1.6, color: 'var(--muted)', fontSize: '0.85rem' }}>
            {t('operador.modo.vrDescripcion')}
          </p>

          <p style={{ ...S.label, textTransform: 'none', margin: 0, lineHeight: 1.5, color: 'var(--accent)', fontSize: '0.75rem', background: 'rgba(251, 202, 1, 0.08)', padding: '6px 10px', borderLeft: '2px solid var(--accent)' }}>
            {t('operador.modo.vrAvisoBeta')}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderTop: '1px solid var(--border)', paddingTop: '12px', marginTop: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-codigo)', fontSize: '0.7rem' }}>
              <span style={{ color: 'var(--muted)' }}>DISPOSITIVOS:</span>
              <span style={{ color: 'var(--text)' }}>META QUEST / HTC VIVE</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-codigo)', fontSize: '0.7rem' }}>
              <span style={{ color: 'var(--muted)' }}>TRACKING:</span>
              <span style={{ color: 'var(--text)' }}>6DOF DUAL WANDS</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-codigo)', fontSize: '0.7rem' }}>
              <span style={{ color: 'var(--muted)' }}>MODO DE VISIÓN:</span>
              <span style={{ color: 'var(--accent)' }}>TELEPRESENCIA INMERSIVA</span>
            </div>
          </div>

          <div style={{ 
            fontFamily: 'var(--font-codigo)', 
            fontSize: '0.78rem', 
            color: 'var(--text)', 
            letterSpacing: 'var(--tracking-tech)', 
            textTransform: 'uppercase',
            border: '1px solid var(--border)',
            padding: '10px 16px',
            textAlign: 'center',
            background: 'rgba(245, 243, 233, 0.05)',
            marginTop: '8px'
          }}>
            ACOPLAR PROTOCOLO VR →
          </div>
        </motion.div>
      </motion.div>

      {/* FOOTER */}
      <div style={{ marginTop: 'auto', paddingTop: '32px' }}>
        <button className="back-link" onClick={onBack}>{t('operador.modo.volver')}</button>
      </div>
    </div>
  );
}
