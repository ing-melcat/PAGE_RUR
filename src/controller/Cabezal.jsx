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
export function Cabezal({ onCambio, onConfigApply, onBack, titulo }) {
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
                
                {/* Nombre del robot colgando directamente del borde superior (Etiqueta Amarilla) */}
                <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)' }}>
                    <div
                        className="topbar-title"
                        title={titulo || 'RASSOR-UI'}
                        style={{
                            background: 'var(--accent)', 
                            color: '#051025',
                            border: 'none',
                            borderRadius: '0 0 6px 6px',
                            padding: '6px 24px',
                            boxShadow: '0 6px 16px rgba(239, 184, 24, 0.2)',
                            fontWeight: '900',
                            fontSize: '1rem',
                            letterSpacing: '0.1em',
                            textTransform: 'uppercase',
                            margin: 0, 
                            maxWidth: '400px', 
                            overflow: 'hidden', 
                            textOverflow: 'ellipsis', 
                            whiteSpace: 'nowrap',
                            userSelect: 'none',
                        }}
                    >
                        {titulo || 'RASSOR-UI'}
                    </div>
                </div>
                
                {/* ConfigPanel placed inside the header on the right */}
                <div style={{ width: '60px', display: 'flex', justifyContent: 'flex-end' }}>
                    <ConfigPanel onApply={onConfigApply} />
                </div>

            </nav>
        </header>
    );
}