import React, { useState } from 'react';
import { Mail, Send, CheckCircle } from 'lucide-react';
import { useLanguage } from './lib/i18n';
import { apiFetch } from './lib/apiClient';
import { useTitulo } from './lib/useTitulo';

export default function ContactPage() {
  const { t } = useLanguage();
  useTitulo('Contacto');
  const [formData, setFormData] = useState({ name: '', email: '', subject: '', message: '' });
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    
    try {
      const res = await apiFetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      // Si el servidor responde sin cuerpo JSON (un 405 de Caddy si la ruta
      // no está enrutada, un 502 si el servicio está caído...), res.json()
      // lanza y el mensaje real se perdía detrás de un "Unexpected end of
      // JSON input".
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || `Error de conexión (${res.status})`);

      setStatus('success');
      setFormData({ name: '', email: '', subject: '', message: '' });
    } catch (err: any) {
      setErrorMsg(err.message);
      setStatus('error');
    }
  };

  return (
    <div style={{ minHeight: '80vh', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '40px 20px' }}>
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: '16px',
        padding: '40px',
        maxWidth: '600px',
        width: '100%',
        boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
      }}>
        
        {status === 'success' ? (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <CheckCircle size={64} style={{ color: 'var(--accent)', margin: '0 auto 20px' }} />
            <h2 style={{ fontFamily: 'var(--font-titulo)', fontSize: '2rem', color: 'var(--accent)', marginBottom: '10px' }}>¡Mensaje Enviado!</h2>
            <p style={{ color: 'var(--text-muted)' }}>Gracias por contactarnos. Hemos recibido tu mensaje y nuestro equipo se pondrá en contacto contigo pronto.</p>
            <button 
              onClick={() => setStatus('idle')}
              style={{
                marginTop: '30px', background: 'transparent', color: 'var(--accent)', 
                border: '1px solid var(--accent)', padding: '10px 20px', borderRadius: '4px', cursor: 'pointer'
              }}
            >
              Enviar otro mensaje
            </button>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '30px' }}>
              <div style={{ padding: '15px', background: 'rgba(251, 202, 1, 0.1)', borderRadius: '12px', color: 'var(--accent)' }}>
                <Mail size={32} />
              </div>
              <div>
                <h1 style={{ fontFamily: 'var(--font-titulo)', fontSize: '2.5rem', color: 'var(--text)', margin: 0 }}>Contacto</h1>
                <p style={{ color: 'var(--muted)', margin: '5px 0 0 0' }}>Escríbenos y nos pondremos en contacto contigo.</p>
              </div>
            </div>

            {status === 'error' && (
              <div style={{ background: 'rgba(255, 0, 0, 0.1)', border: '1px solid var(--error)', padding: '15px', borderRadius: '8px', color: 'var(--error)', marginBottom: '20px' }}>
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label htmlFor="contacto-nombre" style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Nombre</label>
                  <input id="contacto-nombre" name="name" autoComplete="name" required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} style={{ background: 'var(--background)', border: '1px solid var(--border)', padding: '12px', color: 'var(--text)', borderRadius: '8px' }} placeholder="Tu nombre" />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label htmlFor="contacto-email" style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Correo Electrónico</label>
                  <input id="contacto-email" name="email" autoComplete="email" required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} style={{ background: 'var(--background)', border: '1px solid var(--border)', padding: '12px', color: 'var(--text)', borderRadius: '8px' }} placeholder="tu@email.com" />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label htmlFor="contacto-asunto" style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Asunto</label>
                <input id="contacto-asunto" name="subject" autoComplete="off" required type="text" value={formData.subject} onChange={e => setFormData({...formData, subject: e.target.value})} style={{ background: 'var(--background)', border: '1px solid var(--border)', padding: '12px', color: 'var(--text)', borderRadius: '8px' }} placeholder="¿De qué trata tu mensaje?" />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label htmlFor="contacto-mensaje" style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Mensaje</label>
                <textarea id="contacto-mensaje" name="message" required rows={5} value={formData.message} onChange={e => setFormData({...formData, message: e.target.value})} style={{ background: 'var(--background)', border: '1px solid var(--border)', padding: '12px', color: 'var(--text)', borderRadius: '8px', resize: 'vertical' }} placeholder="Escribe tu mensaje aquí..." />
              </div>

              <button disabled={status === 'loading'} className="action-card" style={{
                marginTop: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                background: 'var(--accent)', color: '#000', border: 'none', padding: '15px', borderRadius: '8px', fontWeight: 'bold', cursor: status === 'loading' ? 'not-allowed' : 'pointer'
              }}>
                {status === 'loading' ? 'Enviando...' : <><Send size={18} /> Enviar Mensaje</>}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
