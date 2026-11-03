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
        <header className="cabezal">
            <nav style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between', 
                padding: '10px 20px',
                width: '100%',
                boxSizing: 'border-box'
            }}>
                {/* Zona izquierda: botón de volver estilo terminal */}
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <button 
                        onClick={onBack}
                        className="cabezal-terminal-btn"
                        aria-label={t('operador.controller.volverMenuAria')}
                        title="Volver al menú de selección"
                    >
                        <span className="cabezal-terminal-btn-bracket">[</span>
                        <span className="cabezal-terminal-btn-arrow">&lt;</span>
                        <span className="cabezal-terminal-btn-label">SALIR</span>
                        <span className="cabezal-terminal-btn-bracket">]</span>
                    </button>
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
                    >
                        <span className="cabezal-notch-sub">
                            SYS // ACTIVE UNIT
                        </span>
                        <span className="cabezal-notch-title">
                            {titulo || 'RASSOR-01'}
                        </span>
                    </div>
                </div>
                
                {/* ConfigPanel en el extremo derecho */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                    <ConfigPanel onApply={onConfigApply} controlMappings={controlMappings} onUpdateMappings={onUpdateMappings} />
                </div>

            </nav>
        </header>
    );
}