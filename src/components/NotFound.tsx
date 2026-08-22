import React, { Suspense } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../lib/i18n';
import { lazyConRecarga } from '../lib/lazyConRecarga';

// Vive en su propio archivo, no dentro de App.tsx junto a ComingSoon, porque
// hace falta desde tres sitios que no pueden importarse entre sí sin crear
// un ciclo: App.tsx (la ruta comodín "*"), Landing.tsx (publicación
// inexistente) y PerfilMiembro.tsx (slug inválido o miembro que no existe).
const VisorModelo3D = lazyConRecarga(() => import('../VisorModelo3D'));

/**
 * Página de error 404 -- para cualquier URL que no lleve a ningún sitio: una
 * ruta que no existe, una publicación borrada, un perfil apagado o un slug
 * con el formato equivocado.
 *
 * Mismo formato que ComingSoon (App.tsx): modelo 3D atenuado detrás, tarjeta
 * de cristal encima. BMO y no el DeliveryBot que ya usa ComingSoon, para que
 * las dos páginas "especiales" del sitio no se vean idénticas.
 */
export function NotFound() {
  const { t } = useLanguage();

  return (
    <div style={{
      minHeight: '80vh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      textAlign: 'center',
      padding: '40px',
      position: 'relative',
    }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 0, opacity: 0.5, pointerEvents: 'none' }}>
        <Suspense fallback={null}>
          <VisorModelo3D url="/models/BMO.glb" variante="publicacion" />
        </Suspense>
      </div>

      {/* Superficie plana y sólida, sin blur -- el resto del sitio no usa
          glassmorphism en ningún sitio (ni las tarjetas del archivo, ni las
          de medallas, ni el panel del perfil): son var(--surface) opaco con
          sombra para la elevación, nunca transparencia + blur. */}
      <div style={{
        position: 'relative',
        zIndex: 10,
        background: 'var(--surface)',
        padding: '48px 40px',
        borderRadius: '8px',
        border: '1px solid var(--border)',
        boxShadow: '0 10px 30px rgba(0,0,0,0.35)',
        maxWidth: '560px',
      }}>
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          fontFamily: 'var(--font-etiqueta), sans-serif',
          fontSize: '0.75rem',
          fontWeight: 700,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: '#1a1400',
          background: 'var(--accent)',
          padding: '5px 12px',
          borderRadius: '999px',
        }}>
          {t('notFound.eyebrow')}
        </span>

        <h1 style={{
          fontFamily: 'var(--font-titulo)',
          fontWeight: 400,
          fontSize: 'clamp(4.5rem, 12vw, 7rem)',
          lineHeight: 1,
          letterSpacing: '0.02em',
          color: 'var(--accent)',
          margin: '20px 0 4px',
          textShadow: '0 2px 24px rgba(251,202,1,0.25)',
        }}>
          404
        </h1>

        <h2 style={{
          fontFamily: 'var(--font-titulo)',
          fontWeight: 400,
          fontSize: '1.6rem',
          textTransform: 'uppercase',
          letterSpacing: '0.02em',
          color: 'var(--text)',
          margin: '0 0 16px',
        }}>
          {t('notFound.titulo')}
        </h2>

        <p style={{ color: 'var(--muted)', fontSize: '1.05rem', lineHeight: 1.6, maxWidth: '440px', margin: '0 auto 36px' }}>
          {t('notFound.texto')}
        </p>

        <Link to="/" style={{ display: 'inline-block' }}>
          <button className="action-card" style={{
            background: 'var(--accent)',
            color: '#000',
            border: 'none',
            padding: '12px 32px',
            fontFamily: 'var(--font-ibm-mono)',
            fontWeight: 'bold',
            cursor: 'pointer',
            borderRadius: '4px',
            transition: 'all 0.3s ease',
          }}>
            {t('comingSoon.volver')}
          </button>
        </Link>
      </div>
    </div>
  );
}
