import './Cabezal.css';
import { ConfigPanel } from './ConfigPanel';
import { useLanguage } from '../lib/i18n';

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
        // Simplemente un cabezal con el nombre de la aplicacion, se pueden agregar mas cosas despues
        <header className="cabezal">
            <nav style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between', 
                padding: '0 20px',
                width: '100%',
                boxSizing: 'border-box'
            }}>
                {/* Back button on the left to return to Dashboard */}
                <div style={{ width: '60px', display: 'flex', justifyContent: 'flex-start' }}>
                    <button 
                        onClick={onBack}
                        style={{ 
                            background: 'var(--surface)', 
                            border: '1px solid var(--border)', 
                            borderRadius: '6px',
                            color: 'var(--bone)', 
                            cursor: 'pointer', 
                            padding: '10px',
                            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}
                        aria-label={t('operador.controller.volverMenuAria')}
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="19" y1="12" x2="5" y2="12"></line>
                            <polyline points="12 19 5 12 12 5"></polyline>
                        </svg>
                    </button>
                </div>

                {/* Nombre del robot como NOTCH de la barra amarilla superior */}
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
                            color: 'var(--background)',
                            borderBottomLeftRadius: '8px',
                            borderBottomRightRadius: '8px',
                            borderTopLeftRadius: 0,
                            borderTopRightRadius: 0,
                            padding: '5px 24px',
                            boxShadow: '0 4px 14px rgba(251, 202, 1, 0.35)',
                            fontWeight: 700,
                            fontFamily: 'var(--font-etiqueta), sans-serif',
                            fontSize: '0.85rem',
                            letterSpacing: '0.24em',
                            textIndent: '0.12em',
                            textTransform: 'uppercase',
                            margin: 0, 
                            maxWidth: '60vw', 
                            overflow: 'hidden', 
                            textOverflow: 'ellipsis', 
                            whiteSpace: 'nowrap',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            userSelect: 'none',
                            transition: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s ease',
                            cursor: 'default'
                        }}
                    >
                        {titulo || 'RASSOR-UI'}
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