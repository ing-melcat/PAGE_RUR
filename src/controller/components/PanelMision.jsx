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
    <div style={{
      pointerEvents: 'auto',
      minWidth: '300px',
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: '6px',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
      padding: '16px',
      display: 'flex', flexDirection: 'column', gap: '12px',
      zIndex: 1000
    }}>
      <h3 style={{ margin: 0, fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--accent)', letterSpacing: '0.08em', fontFamily: 'var(--font-ibm-mono), monospace', fontWeight: 600 }}>
        <Flag size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
        {txtTitulo}
      </h3>
      
      <div style={{ display: 'flex', gap: '8px' }}>
        <input 
          type="text" 
          value={newObjective}
          onChange={(e) => setNewObjective(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          placeholder={txtNuevoObj}
          style={{
            flex: 1, background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border)',
            color: 'var(--bone)', padding: '6px 10px', borderRadius: '4px',
            fontFamily: 'var(--font-ibm-mono), monospace', fontSize: '0.78rem',
            outline: 'none'
          }}
          onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
          onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
        />
        <button 
          onClick={handleAdd}
          className="telemetria-btn"
          style={{ padding: '0 10px' }}
        >
          +
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '200px', overflowY: 'auto' }}>
        {objectives.map(obj => (
          <div key={obj.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px', background: 'rgba(255,255,255,0.02)', borderRadius: '4px', border: '1px solid transparent' }}>
            <button 
              onClick={() => handleToggle(obj.id)}
              style={{
                width: '18px', height: '18px', borderRadius: '3px',
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
              fontFamily: 'var(--font-ibm-mono), monospace'
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

      <div style={{ marginTop: '8px', paddingTop: '12px', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <button
          onClick={() => saveMission(objectives, mission?.started_at ? null : Date.now())}
          disabled={loading}
          className="telemetria-btn"
          style={{
            borderColor: mission?.started_at ? 'var(--error)' : 'var(--accent)',
            color: mission?.started_at ? 'var(--error)' : 'var(--accent)',
            justifyContent: 'center', width: '100%',
            opacity: loading ? 0.5 : 1
          }}
        >
          {mission?.started_at ? txtDetener : txtIniciar}
        </button>

        <button
          onClick={toggleTransmission}
          disabled={loading}
          className="telemetria-btn"
          style={{
            borderColor: isPublicEvent ? 'var(--error)' : 'var(--border)',
            color: isPublicEvent ? 'var(--error)' : 'var(--bone)',
            justifyContent: 'center', width: '100%',
            opacity: loading ? 0.5 : 1
          }}
        >
          <Radio size={14} />
          {isPublicEvent ? txtCerrarTx : txtAbrirTx}
        </button>

        <a
          href={`/recorder/${robotId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="telemetria-btn"
          style={{
            justifyContent: 'center', width: '100%',
            textDecoration: 'none'
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="3"></circle></svg>
          {txtAbrirGrabador}
        </a>
      </div>
    </div>
  );
}
