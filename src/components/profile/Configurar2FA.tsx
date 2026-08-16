import React, { useState } from 'react';
import { apiFetch } from '../../lib/apiClient';
import { Smartphone, CheckCircle } from 'lucide-react';
import { useLanguage } from '../../lib/i18n';

export const Configurar2FA = ({ user, setUser }: { user: any, setUser: any }) => {
  const { t } = useLanguage();
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const iniciarSetup = async () => {
    try {
      const res = await apiFetch('/api/profile/2fa/generate');
      const data = await res.json();
      if (data.success) {
        setSecret(data.secret);
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

  if (user.totp_enabled || success) {
    return (
      <div style={{ padding: '24px', border: '1px solid var(--success)', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', gap: '16px', width: '100%' }}>
        <CheckCircle color="var(--success)" size={32} />
        <div>
          <h4 style={{ color: 'var(--success)', margin: '0 0 8px 0', fontSize: '1.2rem', fontFamily: 'var(--font-heading)' }}>Passwordless Activo</h4>
          <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text)' }}>Tu cuenta está altamente protegida. Ahora iniciarás sesión usando los códigos de Google Authenticator de tu celular en lugar de escribir una contraseña.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '32px', border: '1px solid var(--border)', borderRadius: '4px', background: 'var(--background)', width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
        <Smartphone color="var(--accent)" size={32} />
        <h3 style={{ margin: 0, color: 'var(--text)', fontFamily: 'var(--font-heading)' }}>Activar Inicio sin Contraseña (2FA)</h3>
      </div>
      <p style={{ fontSize: '1rem', color: 'var(--text-muted)', marginBottom: '32px', lineHeight: '1.6' }}>
        Vincula tu cuenta con Google Authenticator para dejar de usar contraseñas inseguras. Al activar esta opción, usarás tu celular como tu única llave de acceso.
      </p>

      {!qrCode ? (
        <button className="primary-btn" style={{ width: '100%', padding: '16px', fontSize: '1.1rem' }} onClick={iniciarSetup}>
          Comenzar Vinculación
        </button>
      ) : (
        <div style={{ display: 'flex', gap: '32px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 auto', display: 'flex', justifyContent: 'center', padding: '16px', background: '#fff', borderRadius: '8px' }}>
            <img src={qrCode} alt="Código QR 2FA" style={{ maxWidth: '100%', height: 'auto', display: 'block' }} />
          </div>
          <div style={{ flex: '2 1 300px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <label style={{ display: 'block', fontSize: '1.1rem', color: 'var(--text)', fontWeight: 600 }}>
              1. Escanea el código QR con tu app de Autenticador.<br/><br/>
              2. Escribe aquí el código temporal de 6 dígitos que te da la app:
            </label>
            <div style={{ display: 'flex', gap: '16px', marginTop: '8px' }}>
              <input
                type="text"
                placeholder="000000"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                style={{ 
                  flex: 1,
                  padding: '16px', 
                  border: '1px solid var(--accent)', 
                  borderRadius: '4px', 
                  background: 'var(--surface)', 
                  color: 'var(--text)', 
                  letterSpacing: '8px', 
                  textAlign: 'center', 
                  fontSize: '1.5rem',
                  fontFamily: 'var(--font-ibm-mono)'
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: '16px', marginTop: '8px' }}>
              <button 
                className="secondary-btn" 
                style={{ flex: '1', padding: '16px', fontSize: '1.1rem' }} 
                onClick={() => { setQrCode(''); setCode(''); setError(''); }}
              >
                Cancelar
              </button>
              <button 
                className="primary-btn" 
                style={{ flex: '2', padding: '16px', fontSize: '1.1rem' }} 
                onClick={verificarYActivar} 
                disabled={code.length !== 6}
              >
                Verificar y Activar Passwordless
              </button>
            </div>
            {error && <div style={{ color: 'var(--danger)', fontSize: '1rem', marginTop: '8px', padding: '12px', background: 'rgba(239, 68, 68, 0.1)', borderLeft: '4px solid var(--danger)' }}>{error}</div>}
          </div>
        </div>
      )}
    </div>
  );
};
