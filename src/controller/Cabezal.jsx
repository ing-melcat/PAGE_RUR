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
                <div style={{ width: '40px', display: 'flex', justifyContent: 'flex-start' }}>
                    <button 
                        onClick={onBack}
                        style={{ background: 'transparent', border: 'none', color: 'var(--text)', cursor: 'pointer', padding: '8px' }}
                        aria-label={t('operador.controller.volverMenuAria')}
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="19" y1="12" x2="5" y2="12"></line>
                            <polyline points="12 19 5 12 12 5"></polyline>
                        </svg>
                    </button>
                </div>
                
                {/* Un nombre de robot puede ser largo y el cabezal es fijo:
                    se recorta con puntos suspensivos en vez de empujar al
                    botón de volver o al de configuración. El nombre completo
                    queda en el title. */}
                <div
                    className="topbar-title"
                    title={titulo || 'RASSOR-UI'}
                    style={{
                        margin: 0, flex: 1, textAlign: 'center', color: 'var(--text)',
                        minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}
                >
                    {titulo || 'RASSOR-UI'}
                </div>
                
                {/* ConfigPanel placed inside the header on the right */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', width: 'auto', minWidth: '40px' }}>
                    <ConfigPanel onApply={onConfigApply} />
                </div>

            </nav>
        </header>
    );
}