import React, { useState } from 'react';
import { apiFetch } from '../../lib/apiClient';
import { Smartphone, CheckCircle, AlertTriangle, Copy, ExternalLink } from 'lucide-react';
import { useLanguage } from '../../lib/i18n';
import { copiarAlPortapapeles } from '../../lib/clipboard';
import './Configurar2FA.css';

export const Configurar2FA = ({ user, setUser }: { user: any, setUser: any }) => {
  const { t } = useLanguage();
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [otpauth, setOtpauth] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [copiado, setCopiado] = useState(false);

  const iniciarSetup = async () => {
    try {
      const res = await apiFetch('/api/profile/2fa/generate');
      const data = await res.json();
      if (data.success) {
        setSecret(data.secret);
        setOtpauth(data.otpauth);
        setQrCode(data.qrCodeDataUrl);
      } else {
        setError('Error al generar el QR');
      }
    } catch (e) {
      setError('Error de conexión');
    }
  };

  const verificarYActivar = async () => {
    setError('');
    try {
      const res = await apiFetch('/api/profile/2fa/enable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, secret }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(true);
        setUser({ ...user, totp_enabled: true });
      } else {
        setError(data.message || 'Código inválido');
      }
    } catch (e) {
      setError('Error de conexión');
    }
  };

  // El secreto se copia sin espacios -- los grupos de cuatro son solo
  // para que se lea a mano, la app autenticadora quiere la cadena base32
  // tal cual.
  const copiarClave = async () => {
    // Si no se pudo copiar no se finge que sí: la clave queda a la vista y
    // seleccionable, que es el respaldo real.
    if (!await copiarAlPortapapeles(secret)) return;
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  if (user.totp_enabled || success) {
    return (
      <div className="bloque-2fa__listo">
        <CheckCircle color="var(--success)" size={32} className="bloque-2fa__listo-icono" />
        <div>
          <h4 className="bloque-2fa__listo-titulo">Passwordless Activo</h4>
          <p className="bloque-2fa__listo-texto">
            Entras con los códigos de tu autenticador en lugar de escribir una contraseña. Para desvincularlo hace falta un administrador.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bloque-2fa">
      <div className="bloque-2fa__caja">
        {!qrCode ? (
          <>
            <div className="bloque-2fa__cabecera">
              <Smartphone color="var(--accent)" size={32} />
              <h3>Activar Inicio sin Contraseña (2FA)</h3>
            </div>
            <p className="bloque-2fa__intro">
              Vincula tu cuenta con Google Authenticator para dejar de usar contraseñas inseguras. Al activar esta opción, usarás tu celular como tu única llave de acceso.
            </p>
            <div className="bloque-2fa__aviso">
              <AlertTriangle size={18} className="bloque-2fa__aviso-icono" />
              <p>
                Al activarlo se borra tu contraseña: el celular pasa a ser la única forma de entrar. Todavía no hay códigos de respaldo, así que si lo pierdes tendrás que pedirle a un administrador que te desvincule.
              </p>
            </div>
            <button className="primary-btn bloque-2fa__cta" onClick={iniciarSetup}>
              Comenzar Vinculación
            </button>
          </>
        ) : (
          <>
            <div className="bloque-2fa__fila">
              <div className="bloque-2fa__qr">
                <img src={qrCode} alt="Código QR 2FA" />
              </div>
              <div className="bloque-2fa__instrucciones">
                <label className="bloque-2fa__pasos">
                  1. Escanea el código QR con tu app de Autenticador.<br/><br/>
                  2. Escribe aquí el código temporal de 6 dígitos que te da la app:
                </label>
                <input
                  type="text"
                  placeholder="000000"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  className="bloque-2fa__codigo"
                />
                <div className="bloque-2fa__botones">
                  <button
                    className="secondary-btn"
                    onClick={() => { setQrCode(''); setCode(''); setError(''); }}
                  >
                    Cancelar
                  </button>
                  <button
                    className="primary-btn"
                    onClick={verificarYActivar}
                    disabled={code.length !== 6}
                  >
                    Verificar y Activar Passwordless
                  </button>
                </div>
                {error && <div className="bloque-2fa__error">{error}</div>}
              </div>
            </div>

            <div className="bloque-2fa__manual">
              <p className="bloque-2fa__manual-rotulo">¿No puedes escanear? Vincula a mano</p>
              <div className="bloque-2fa__manual-fila">
                <div className="bloque-2fa__clave">
                  <span>{secret.match(/.{1,4}/g)?.join(' ')}</span>
                  <button type="button" onClick={copiarClave} aria-label="Copiar clave de configuración">
                    <Copy size={16} />
                  </button>
                </div>
                <a href={otpauth} className="secondary-btn bloque-2fa__abrir-app">
                  <ExternalLink size={16} />
                  Abrir en la app
                </a>
              </div>
              {copiado && <span className="bloque-2fa__copiado">Clave copiada al portapapeles</span>}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
