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
                
                {/* Demo interactivo de 3 estilos visuales para la marca de agua */}
                <div style={{ flex: 1, display: 'flex', justifyContent: 'center', minWidth: 0 }}>
                    <div
                        className="topbar-title"
                        title="Haz clic para cambiar de estilo"
                        onClick={() => {
                            // Este es un hack temporal para que el usuario cicle entre los 3 estilos
                            window.__styleIndex = ((window.__styleIndex || 0) + 1) % 3;
                            document.getElementById('rassor-ui-title').setAttribute('data-style', window.__styleIndex);
                            
                            const el = document.getElementById('rassor-ui-title');
                            const s = window.__styleIndex;
                            if (s === 0) { // TAB (Pestaña)
                                el.style.background = 'var(--surface)';
                                el.style.color = 'var(--bone)';
                                el.style.border = '1px solid var(--border)';
                                el.style.borderTop = 'none';
                                el.style.borderRadius = '0 0 12px 12px';
                                el.style.padding = '8px 32px';
                                el.style.fontFamily = 'var(--font-ibm-sans), sans-serif';
                                el.style.textShadow = 'none';
                                el.style.boxShadow = '0 8px 16px rgba(0,0,0,0.5)';
                                el.innerText = titulo || 'RASSOR-UI';
                            } else if (s === 1) { // CCTV 
                                el.style.background = 'transparent';
                                el.style.color = 'var(--bone)';
                                el.style.border = 'none';
                                el.style.borderRadius = '0';
                                el.style.padding = '10px 16px';
                                el.style.fontFamily = 'var(--font-ibm-mono), monospace';
                                el.style.textShadow = '2px 2px 0px #000, -1px -1px 0px #000, 1px -1px 0px #000, -1px 1px 0px #000, 1px 1px 0px #000';
                                el.style.boxShadow = 'none';
                                el.innerText = `> UNIT: ${titulo || 'RASSOR_PROD'} _`;
                            } else if (s === 2) { // CAUTION TAPE
                                el.style.background = 'var(--accent)';
                                el.style.color = '#000';
                                el.style.border = 'none';
                                el.style.borderRadius = '2px';
                                el.style.padding = '4px 16px';
                                el.style.fontFamily = 'var(--font-ibm-sans), sans-serif';
                                el.style.textShadow = 'none';
                                el.style.boxShadow = '0 4px 12px rgba(239, 184, 24, 0.5)';
                                el.innerText = titulo || 'RASSOR-UI';
                            }
                        }}
                        id="rassor-ui-title"
                        style={{
                            /* Default Style: Pestaña (Tab) */
                            background: 'var(--surface)', 
                            border: '1px solid var(--border)', 
                            borderTop: 'none',
                            borderRadius: '0 0 12px 12px',
                            padding: '8px 32px',
                            boxShadow: '0 8px 16px rgba(0, 0, 0, 0.5)',
                            color: 'var(--bone)',
                            fontWeight: '900',
                            fontSize: '1.1rem',
                            letterSpacing: '0.1em',
                            textTransform: 'uppercase',
                            margin: 0, 
                            maxWidth: '100%', 
                            overflow: 'hidden', 
                            textOverflow: 'ellipsis', 
                            whiteSpace: 'nowrap',
                            cursor: 'pointer',
                            userSelect: 'none',
                            transition: 'all 0.2s ease-in-out'
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