import { Component, type ErrorInfo, type ReactNode } from 'react';

/**
 * Red de seguridad para toda la aplicación.
 *
 * Antes no existía ni un solo ErrorBoundary en el proyecto: un error de
 * render en CUALQUIER componente hacía que React desmontara el árbol entero
 * sin dejar rastro. Para quien lo sufre se ve como "cargó un instante y
 * desapareció" — no es un parpadeo de navegación, es un error real sin
 * nadie que lo atrape ni lo muestre.
 *
 * Envuelve <App/> en main.tsx. Muestra el error en vez de tragárselo, y deja
 * volver al inicio sin tener que cerrar la pestaña.
 */

type Estado = { error: Error | null };

export class ErrorBoundary extends Component<{ children: ReactNode }, Estado> {
  state: Estado = { error: null };

  static getDerivedStateFromError(error: Error): Estado {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Error de render atrapado por ErrorBoundary:', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: '16px',
        background: 'var(--background, #020713)', color: 'var(--text, #EBF0F6)',
        fontFamily: 'var(--font-ibm-mono, monospace)', padding: '40px', textAlign: 'center',
      }}>
        <h1 style={{ color: 'var(--accent, #FBCA01)', fontSize: '1.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Algo falló al mostrar esta pantalla
        </h1>
        <p style={{ color: 'var(--muted, #8c9bb0)', maxWidth: '480px', fontSize: '0.85rem' }}>
          {this.state.error.message}
        </p>
        <button
          onClick={() => { this.setState({ error: null }); window.location.href = '/login'; }}
          style={{
            marginTop: '8px', padding: '10px 24px', background: 'var(--accent, #FBCA01)',
            color: 'black', border: 'none', borderRadius: '4px', cursor: 'pointer',
            fontFamily: 'inherit', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em',
          }}
        >
          Volver al inicio
        </button>
      </div>
    );
  }
}
