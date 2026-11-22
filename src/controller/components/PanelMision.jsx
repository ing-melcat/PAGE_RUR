import { useState, useEffect } from 'react';
import { Flag, Trash2, Check, Radio } from 'lucide-react';
import { useLanguage } from '../../lib/i18n';

export function PanelMision({ robotId, mission, onMissionUpdate, isPublicEvent, onTransmissionToggle }) {
  const { t } = useLanguage();
  const [objectives, setObjectives] = useState(mission?.objectives || []);
  const [newObjective, setNewObjective] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (mission?.objectives) {
      setObjectives(mission.objectives);
    }
  }, [mission]);

  const handleAdd = () => {
    if (!newObjective.trim()) return;
    const updated = [...objectives, { id: Date.now().toString(), text: newObjective, completed_at: null }];
    setObjectives(updated);
    setNewObjective('');
    saveMission(updated);
  };

  const handleRemove = (id) => {
    const updated = objectives.filter(o => o.id !== id);
    setObjectives(updated);
    saveMission(updated);
  };

  const handleToggle = (id) => {
    const updated = objectives.map(o => 
      o.id === id ? { ...o, completed_at: o.completed_at ? null : Date.now() } : o
    );
    setObjectives(updated);
    saveMission(updated);
  };

  const saveMission = async (newObjectives, startedAt = mission?.started_at) => {
    const newMission = { ...mission, objectives: newObjectives, started_at: startedAt };
    try {
      const res = await fetch(`/api/robots/${robotId}/mision`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMission)
      });
      if (res.ok) {
        onMissionUpdate(newMission);
      }
    } catch (err) {
      console.error('Failed to save mission', err);
    }
  };

  const toggleTransmission = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/robots/${robotId}/transmision`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPublicEvent: !isPublicEvent })
      });
      if (res.ok) {
        onTransmissionToggle(!isPublicEvent);
      }
    } catch (err) {
      console.error('Failed to toggle transmission', err);
    }
    setLoading(false);
  };

  const getTxt = (key, fallback) => {
    const val = t(key, fallback);
    if (!val || val === key || val.startsWith('mision.')) {
      return fallback;
    }
    return val;
  };

  const txtTitulo = getTxt('mision.panelTitulo', 'Misión');
  const txtNuevoObj = getTxt('mision.nuevoObjetivo', 'Nuevo objetivo...');
  const txtIniciar = getTxt('mision.iniciar', 'Iniciar Misión');
  const txtDetener = getTxt('mision.detener', 'Detener Misión');
  const txtAbrirTx = getTxt('mision.abrirTransmision', 'Abrir Transmisión');
  const txtCerrarTx = getTxt('mision.cerrarTransmision', 'Cerrar Transmisión');
  const txtAbrirGrabador = getTxt('mision.abrirGrabador', 'Abrir Grabador');

  return (
    <div 
      className="cabezal-terminal-window"
      style={{
        pointerEvents: 'auto',
        minWidth: '320px',
        padding: '16px',
        display: 'flex', flexDirection: 'column', gap: '12px',
        zIndex: 1000
      }}
    >
      <div className="cabezal-terminal-window-header">
        <span className="cabezal-terminal-window-title">
          <Flag size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
          [ // {txtTitulo} ]
        </span>
      </div>
      
      <div style={{ display: 'flex', gap: '8px' }}>
        <input 
          type="text" 
          value={newObjective}
          onChange={(e) => setNewObjective(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          placeholder={txtNuevoObj}
          style={{
            flex: 1, background: 'rgba(7, 14, 22, 0.7)', border: '1px solid rgba(251, 202, 1, 0.35)',
            color: 'var(--bone)', padding: '6px 10px', borderRadius: '2px',
            fontFamily: 'var(--font-codigo), monospace', fontSize: '0.78rem',
            outline: 'none'
          }}
          onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
          onBlur={(e) => e.target.style.borderColor = 'rgba(251, 202, 1, 0.35)'}
        />
        <button 
          onClick={handleAdd}
          className="cabezal-terminal-btn"
          style={{ padding: '0 10px' }}
        >
          <span className="cabezal-terminal-btn-bracket">[</span>+<span className="cabezal-terminal-btn-bracket">]</span>
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '200px', overflowY: 'auto' }}>
        {objectives.map(obj => (
          <div key={obj.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px', background: 'rgba(251, 202, 1, 0.03)', borderRadius: '2px', border: '1px solid rgba(251, 202, 1, 0.15)' }}>
            <button 
              onClick={() => handleToggle(obj.id)}
              style={{
                width: '18px', height: '18px', borderRadius: '2px',
                border: `1px solid ${obj.completed_at ? 'var(--accent)' : 'var(--muted)'}`,
                background: obj.completed_at ? 'var(--accent)' : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', padding: 0
              }}
            >
              {obj.completed_at && <Check size={12} color="#000" />}
            </button>
            <span style={{ 
              flex: 1, 
              color: obj.completed_at ? 'var(--muted)' : 'var(--bone)', 
              textDecoration: obj.completed_at ? 'line-through' : 'none', 
              fontSize: '0.78rem',
              fontFamily: 'var(--font-codigo), monospace'
            }}>
              {obj.text}
            </span>
            <button onClick={() => handleRemove(obj.id)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--error)'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--muted)'}
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>

      <div style={{ marginTop: '8px', paddingTop: '12px', borderTop: '1px solid rgba(251, 202, 1, 0.25)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <button
          onClick={() => saveMission(objectives, mission?.started_at ? null : Date.now())}
          disabled={loading}
          className={`cabezal-terminal-btn ${mission?.started_at ? 'cabezal-terminal-btn--active' : ''}`}
          style={{
            borderColor: mission?.started_at ? 'var(--error)' : 'rgba(251, 202, 1, 0.45)',
            color: mission?.started_at ? 'var(--error)' : 'var(--accent)',
            justifyContent: 'center', width: '100%',
            opacity: loading ? 0.5 : 1
          }}
        >
          <span className="cabezal-terminal-btn-bracket">[</span>
          <span className="cabezal-terminal-btn-label">{mission?.started_at ? txtDetener : txtIniciar}</span>
          <span className="cabezal-terminal-btn-bracket">]</span>
        </button>

        <button
          onClick={toggleTransmission}
          disabled={loading}
          className={`cabezal-terminal-btn ${isPublicEvent ? 'cabezal-terminal-btn--active' : ''}`}
          style={{
            borderColor: isPublicEvent ? 'var(--error)' : 'rgba(251, 202, 1, 0.45)',
            color: isPublicEvent ? 'var(--error)' : 'var(--bone)',
            justifyContent: 'center', width: '100%',
            opacity: loading ? 0.5 : 1
          }}
        >
          <span className="cabezal-terminal-btn-bracket">[</span>
          <Radio size={14} />
          <span className="cabezal-terminal-btn-label">{isPublicEvent ? txtCerrarTx : txtAbrirTx}</span>
          <span className="cabezal-terminal-btn-bracket">]</span>
        </button>

        <a
          href={`/recorder/${robotId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="cabezal-terminal-btn"
          style={{
            justifyContent: 'center', width: '100%',
            textDecoration: 'none'
          }}
        >
          <span className="cabezal-terminal-btn-bracket">[</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="3"></circle></svg>
          <span className="cabezal-terminal-btn-label">{txtAbrirGrabador}</span>
          <span className="cabezal-terminal-btn-bracket">]</span>
        </a>
      </div>
    </div>
  );
}
