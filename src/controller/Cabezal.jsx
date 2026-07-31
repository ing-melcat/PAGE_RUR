import './Cabezal.css';
import { ConfigPanel } from './ConfigPanel';

export function Cabezal({ onCambio, onConfigApply, onBack }) {
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
                        style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', cursor: 'pointer', padding: '8px' }}
                        aria-label="Volver al Menú"
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="19" y1="12" x2="5" y2="12"></line>
                            <polyline points="12 19 5 12 12 5"></polyline>
                        </svg>
                    </button>
                </div>
                
                <div className="topbar-title" style={{ margin: 0, flex: 1, textAlign: 'center', color: 'var(--text-main)' }}>RASSOR-UI</div>
                
                {/* ConfigPanel placed inside the header on the right */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', width: 'auto', minWidth: '40px' }}>
                    <ConfigPanel onApply={onConfigApply} />
                </div>

            </nav>
        </header>
    );
}