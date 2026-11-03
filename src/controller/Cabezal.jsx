import './Cabezal.css';
import { ConfigPanel } from './ConfigPanel';
import { useLanguage } from '../lib/i18n';
import { Link } from 'react-router-dom';
import { FlaskConical } from 'lucide-react';

/**
 * @param titulo  nombre del robot que se está operando (`robots.name`). Es más
 *                útil ahí que el nombre de la aplicación: el operador ya sabe
 *                en qué app está, lo que necesita confirmar de un vistazo es
 *                QUÉ unidad tiene en las manos —sobre todo con varias dadas de
 *                alta—. Si no llega ninguno, se cae al nombre de la aplicación.
 */
export function Cabezal({ onCambio, onConfigApply, onBack, titulo, controlMappings, onUpdateMappings }) {
    const { t } = useLanguage();
    return (
        <header className="cabezal">
            <nav style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between', 
                padding: '0 20px',
                width: '100%',
                boxSizing: 'border-box'
            }}>
                {/* Zona izquierda: botón de volver y acceso al laboratorio de pruebas */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <button 
                        onClick={onBack}
                        style={{ 
                            background: 'var(--surface)', 
                            border: '1px solid var(--border)', 
                            borderRadius: '2px',
                            color: 'var(--bone)', 
                            cursor: 'pointer', 
                            padding: '8px 12px',
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            transition: 'all 0.15s ease',
                        }}
                        onMouseEnter={e => {
                            e.currentTarget.style.borderColor = 'var(--bone)';
                            e.currentTarget.style.boxShadow = '0 0 12px rgba(245, 243, 233, 0.2)';
                        }}
                        onMouseLeave={e => {
                            e.currentTarget.style.borderColor = 'var(--border)';
                            e.currentTarget.style.boxShadow = 'none';
                        }}
                        aria-label={t('operador.controller.volverMenuAria')}
                        title="Volver al menú de selección"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="19" y1="12" x2="5" y2="12"></line>
                            <polyline points="12 19 5 12 12 5"></polyline>
                        </svg>
                    </button>

                    <Link
                        to="/pruebas"
                        target="_blank"
                        style={{
                            background: 'rgba(5, 16, 37, 0.8)',
                            border: '1px solid var(--accent)',
                            borderRadius: '2px',
                            color: 'var(--accent)',
                            textDecoration: 'none',
                            padding: '6px 12px',
                            fontFamily: 'var(--font-codigo)',
                            fontSize: '0.72rem',
                            letterSpacing: 'var(--tracking-tech)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            textTransform: 'uppercase',
                            pointerEvents: 'auto',
                            transition: 'all 0.15s ease',
                        }}
                        onMouseEnter={e => {
                            e.currentTarget.style.background = 'var(--accent)';
                            e.currentTarget.style.color = '#020713';
                            e.currentTarget.style.boxShadow = '0 0 16px rgba(251, 202, 1, 0.4)';
                        }}
                        onMouseLeave={e => {
                            e.currentTarget.style.background = 'rgba(5, 16, 37, 0.8)';
                            e.currentTarget.style.color = 'var(--accent)';
                            e.currentTarget.style.boxShadow = 'none';
                        }}
                        title="Abrir Laboratorio de Pruebas de Diseño"
                    >
                        <FlaskConical size={14} /> LAB DE PRUEBAS ↗
                    </Link>
                </div>

                {/* Nombre del robot como NOTCH Biselado de cabina GCS */}
                <div style={{ 
                    position: 'absolute', 
                    top: 0, 
                    left: '50%', 
                    transform: 'translateX(-50%)', 
                    zIndex: 110,
                    pointerEvents: 'auto'
                }}>
                    <div
                        className="cabezal-notch-robot"
                        title={titulo || 'RASSOR-UI'}
                        style={{
                            background: 'var(--accent)', 
                            color: '#020713',
                            clipPath: 'polygon(0 0, 100% 0, 88% 100%, 12% 100%)',
                            padding: '6px 36px 8px',
                            fontWeight: 700,
                            fontFamily: 'var(--font-codigo)',
                            fontSize: '0.85rem',
                            letterSpacing: '0.22em',
                            textIndent: '0.11em',
                            textTransform: 'uppercase',
                            margin: 0, 
                            maxWidth: '60vw', 
                            overflow: 'hidden', 
                            textOverflow: 'ellipsis', 
                            whiteSpace: 'nowrap',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            userSelect: 'none',
                            cursor: 'default',
                            boxShadow: '0 4px 16px rgba(251, 202, 1, 0.3)',
                        }}
                    >
                        <span style={{ fontSize: '0.55rem', opacity: 0.85, letterSpacing: '0.25em', lineHeight: 1 }}>
                            SYS // ACTIVE UNIT
                        </span>
                        <span style={{ fontWeight: 800, fontSize: '0.92rem', lineHeight: 1.1 }}>
                            {titulo || 'RASSOR-01'}
                        </span>
                    </div>
                </div>
                
                {/* ConfigPanel placed inside the header on the right */}
                <div style={{ width: '60px', display: 'flex', justifyContent: 'flex-end' }}>
                    <ConfigPanel onApply={onConfigApply} controlMappings={controlMappings} onUpdateMappings={onUpdateMappings} />
                </div>

            </nav>
        </header>
    );
}