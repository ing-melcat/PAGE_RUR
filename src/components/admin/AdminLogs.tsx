import React from "react";
import { motion } from "framer-motion";
import { useLanguage } from "../../lib/i18n";

export const AdminLogs = ({ crowdsecMetrics, logsList, setView, pageTransition }: any) => {
  const { t } = useLanguage();
  return (
    <>
            <motion.section key="admin_logs" className="full-container" style={{ maxWidth: '1200px', padding: '0 20px' }} {...pageTransition}>
              <div className="panel-header" style={{ marginBottom: '24px' }}>
              
                <h2 className="titulo-panel">{t('adminLogs.titulo')}</h2>
              </div>

              {crowdsecMetrics ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '32px' }}>
                  <div className="action-card" style={{ padding: '20px', background: 'var(--surface)' }}>
                    <div style={{ color: 'var(--accent)', fontSize: '2rem', fontWeight: 'bold' }}>{crowdsecMetrics.active_decisions}</div>
                    <div style={{ color: 'var(--muted)', fontSize: '0.8rem', textTransform: 'uppercase' }}>{t('adminLogs.amenazasBloqueadas')}</div>
                  </div>
                  <div className="action-card" style={{ padding: '20px', background: 'var(--surface)' }}>
                    <div style={{ color: 'var(--error)', fontSize: '2rem', fontWeight: 'bold' }}>{crowdsecMetrics.banned_ips}</div>
                    <div style={{ color: 'var(--muted)', fontSize: '0.8rem', textTransform: 'uppercase' }}>{t('adminLogs.ipsBaneadas')}</div>
                  </div>
                  <div className="action-card" style={{ padding: '20px', background: 'var(--surface)', gridColumn: 'span 2' }}>
                    <h3 style={{ marginTop: 0, fontSize: '1rem', color: 'var(--text)' }}>{t('adminLogs.topEscenarios')}</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
                      {crowdsecMetrics.top_scenarios?.map((s: any, i: number) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '4px' }}>
                          <span style={{ fontFamily: 'var(--font-ibm-mono)', color: 'var(--muted)', fontSize: '0.8rem' }}>{s.name}</span>
                          <span style={{ color: 'var(--error)', fontWeight: 'bold' }}>{s.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--muted)' }}>{t('adminLogs.cargandoMetricas')}</div>
              )}
    

              <h3 style={{ fontSize: '1.1rem', color: 'var(--text)', marginBottom: '12px', textAlign: 'left' }}>{t('adminLogs.registroSistema')}</h3>
              <div style={{ background: '#0a0a0a', border: '1px solid var(--border)', padding: '16px', fontFamily: 'var(--font-ibm-mono)', fontSize: '0.8rem', height: '350px', overflowY: 'auto', marginBottom: '24px', textAlign: 'left', borderRadius: '4px', boxShadow: 'inset 0 0 10px rgba(0,0,0,0.5)' }}>
                {logsList.length === 0 ? (
                  <div style={{ color: 'var(--muted)' }}>{t('adminLogs.sinLogs')}</div>
                ) : (
                  logsList.map((log, i) => {
                    let color = 'var(--muted)';
                    if (log.type === 'success') color = 'var(--success)';
                    if (log.type === 'error') color = 'var(--error)';
                    if (log.type === 'warning') color = 'var(--warning)';
                    if (log.type === 'info') color = 'var(--accent)';
                    
                    const time = new Date(log.timestamp).toLocaleTimeString();
                    
                    return (
                      <div key={i} style={{ color, marginBottom: '8px', wordBreak: 'break-word', borderBottom: '1px dashed #222', paddingBottom: '4px' }}>
                        <span style={{ color: '#555' }}>[{time}]</span> <strong style={{ color }}>[{log.type.toUpperCase()}]</strong> <span style={{ color: '#ddd' }}>{log.message}</span>
                      </div>
                    );
                  })
                )}
              </div>
              <button className="back-link" onClick={() => setView("dashboard")}>{t('adminLogs.volverPanel')}</button>
            </motion.section>
    </>
  );
};
