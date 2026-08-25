import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { copiarAlPortapapeles } from '../lib/clipboard';

// Sustituye a alert()/window.confirm() en todo el panel: los diálogos nativos
// del navegador no se pueden estilizar, congelan la pestaña entera mientras
// están abiertos, y son justo lo que hace fallar cualquier automatización de
// navegador (Puppeteer/extensión) al toparse con uno. Notificar() reemplaza
// alert(); confirmar() reemplaza window.confirm() y devuelve una Promise en
// vez de bloquear el hilo -- por eso todo caller de confirmar() pasa a ser
// async.

type TipoNotificacion = 'info' | 'exito' | 'error';

interface Notificacion {
  id: number;
  mensaje: string;
  tipo: TipoNotificacion;
}

interface PeticionConfirmacion {
  mensaje: string;
  textoConfirmar?: string;
  textoCancelar?: string;
  resolver: (valor: boolean) => void;
}

interface PeticionValor {
  mensaje: string;
  valor: string;
  resolver: () => void;
}

interface NotificacionesContexto {
  notificar: (mensaje: string, tipo?: TipoNotificacion) => void;
  confirmar: (mensaje: string, opciones?: { textoConfirmar?: string; textoCancelar?: string }) => Promise<boolean>;
  // Para el único caso que no era ni un aviso ni una pregunta: enseñar un
  // valor generado por el servidor (la contraseña temporal al reiniciarla)
  // que hay que poder copiar antes de cerrar. window.prompt(mensaje, valor)
  // hacía esto mismo, pero de solo lectura real y sin copiar-al-portapapeles
  // funcionando en HTTP (ver lib/clipboard.ts).
  mostrarValor: (mensaje: string, valor: string) => Promise<void>;
}

const Contexto = createContext<NotificacionesContexto | null>(null);

const DURACION_MS = 5000;

const bordePorTipo: Record<TipoNotificacion, string> = {
  info: 'var(--accent)',
  exito: 'var(--success)',
  error: 'var(--error)',
};

export function NotificacionesProvider({ children }: { children: React.ReactNode }) {
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [peticion, setPeticion] = useState<PeticionConfirmacion | null>(null);
  const [peticionValor, setPeticionValor] = useState<PeticionValor | null>(null);
  const [copiado, setCopiado] = useState(false);
  const idRef = useRef(0);

  const notificar = useCallback((mensaje: string, tipo: TipoNotificacion = 'info') => {
    const id = ++idRef.current;
    setNotificaciones((actual) => [...actual, { id, mensaje, tipo }]);
    setTimeout(() => {
      setNotificaciones((actual) => actual.filter((n) => n.id !== id));
    }, DURACION_MS);
  }, []);

  const confirmar = useCallback((mensaje: string, opciones?: { textoConfirmar?: string; textoCancelar?: string }) => {
    return new Promise<boolean>((resolver) => {
      setPeticion({ mensaje, resolver, ...opciones });
    });
  }, []);

  const mostrarValor = useCallback((mensaje: string, valor: string) => {
    return new Promise<void>((resolver) => {
      setPeticionValor({ mensaje, valor, resolver });
    });
  }, []);

  const responder = (valor: boolean) => {
    peticion?.resolver(valor);
    setPeticion(null);
  };

  const cerrarValor = () => {
    peticionValor?.resolver();
    setPeticionValor(null);
    setCopiado(false);
  };

  return (
    <Contexto.Provider value={{ notificar, confirmar, mostrarValor }}>
      {children}

      {/* Pila de notificaciones, esquina inferior derecha. Superficie sólida
          con el borde del tipo a la izquierda -- mismo idioma que las
          tarjetas de medalla, no una ventana translúcida flotando. */}
      <div style={{
        position: 'fixed', bottom: '24px', right: '24px', zIndex: 10000,
        display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '360px',
      }}>
        {notificaciones.map((n) => (
          <div
            key={n.id}
            role="status"
            style={{
              background: 'var(--surface-strong)',
              borderLeft: `4px solid ${bordePorTipo[n.tipo]}`,
              borderRadius: '4px',
              padding: '14px 16px',
              color: 'var(--text)',
              fontSize: '0.9rem',
              boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: '12px',
            }}
          >
            <span>{n.mensaje}</span>
            <button
              onClick={() => setNotificaciones((actual) => actual.filter((x) => x.id !== n.id))}
              aria-label="Cerrar"
              style={{ background: 'transparent', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: 0, lineHeight: 1, fontSize: '1.1rem' }}
            >
              ×
            </button>
          </div>
        ))}
      </div>

      {/* Modal de confirmación -- mismo tratamiento que el modal de edición
          de robots (overlay oscuro + tarjeta con borde ámbar). */}
      {peticion && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10001, backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}
          onKeyDown={(e) => { if (e.key === 'Escape') responder(false); }}
        >
          <div style={{ background: 'var(--background)', border: '1px solid var(--accent)', borderRadius: '8px', padding: '28px', width: '100%', maxWidth: '420px', boxShadow: '0 10px 40px rgba(0,0,0,0.5)' }}>
            <p style={{ margin: '0 0 24px', color: 'var(--text)', fontSize: '0.95rem', lineHeight: 1.5, whiteSpace: 'pre-line' }}>
              {peticion.mensaje}
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button type="button" className="secondary-btn" autoFocus onClick={() => responder(false)}>
                {peticion.textoCancelar ?? 'Cancelar'}
              </button>
              <button type="button" className="primary-btn" onClick={() => responder(true)}>
                {peticion.textoConfirmar ?? 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de "valor a copiar" -- reemplaza al window.prompt(mensaje,
          valor) que se usaba para dictar la contraseña temporal recién
          generada. Campo de solo lectura + botón de copiar de verdad (ver
          lib/clipboard.ts, con respaldo para HTTP sin contexto seguro). */}
      {peticionValor && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10001, backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}>
          <div style={{ background: 'var(--background)', border: '1px solid var(--accent)', borderRadius: '8px', padding: '28px', width: '100%', maxWidth: '420px', boxShadow: '0 10px 40px rgba(0,0,0,0.5)' }}>
            <p style={{ margin: '0 0 16px', color: 'var(--text)', fontSize: '0.95rem', lineHeight: 1.5, whiteSpace: 'pre-line' }}>
              {peticionValor.mensaje}
            </p>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
              <input
                readOnly
                value={peticionValor.valor}
                onFocus={(e) => e.target.select()}
                style={{ flex: 1, fontFamily: 'var(--font-ibm-mono)' }}
              />
              <button
                type="button"
                className="secondary-btn"
                onClick={async () => { if (await copiarAlPortapapeles(peticionValor.valor)) { setCopiado(true); setTimeout(() => setCopiado(false), 2000); } }}
              >
                {copiado ? 'Copiado' : 'Copiar'}
              </button>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="button" className="primary-btn" autoFocus onClick={cerrarValor}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </Contexto.Provider>
  );
}

function useNotificaciones(): NotificacionesContexto {
  const ctx = useContext(Contexto);
  if (!ctx) throw new Error('useNotificar/useConfirmar requieren estar dentro de <NotificacionesProvider>');
  return ctx;
}

export function useNotificar() {
  return useNotificaciones().notificar;
}

export function useConfirmar() {
  return useNotificaciones().confirmar;
}

export function useMostrarValor() {
  return useNotificaciones().mostrarValor;
}
