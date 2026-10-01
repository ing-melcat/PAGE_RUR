const fs = require('fs');
const file = 'src/controller/components/BarraTelemetria.jsx';
let content = fs.readFileSync(file, 'utf8');

const component = `
function CalidadEnlace({ conectado, enlace, t }) {
  let quality = 0;
  if (conectado) {
    quality = 4;
    if (enlace) {
      const p = enlace.perdidaPct ?? 0;
      const j = enlace.jitterMs ?? 0;
      if (p > 5 || j > 100) quality = 3;
      if (p > 15 || j > 250) quality = 2;
      if (p > 30 || j > 500) quality = 1;
    }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }} title={conectado ? t('telemetria.enVivo') : t('telemetria.sinRobotConectado')}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: '14px' }}>
        {[0, 1, 2, 3].map(i => {
          const height = 5 + (i * 3);
          const active = quality > i;
          let color = 'var(--accent)';
          if (!active) {
            color = conectado ? 'var(--border)' : 'var(--error)';
          } else if (quality <= 1) {
            color = 'var(--error)';
          }
          return (
            <div key={i} style={{
              width: '4px',
              height: \`\${height}px\`,
              background: color,
              borderRadius: '1px',
              transition: 'background 0.3s, opacity 0.3s',
              opacity: active ? 1 : 0.3,
              boxShadow: active && quality > 1 ? '0 0 5px var(--accent)' : 'none'
            }} />
          )
        })}
      </div>
      {!conectado && (
        <span style={{ color: 'var(--error)', fontSize: '1rem', fontWeight: 'bold', lineHeight: 1 }}>×</span>
      )}
    </div>
  );
}
`;

content = content.replace("const TARJETA = {", component + "\nconst TARJETA = {");

// Replace in esencial = false (large HUD)
content = content.replace(
  /<div className="hud__subtitulo" style={{ marginTop: '4px' }}>[\s\S]*?<\/div>/,
  `<div className="hud__subtitulo" style={{ marginTop: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.2em', color: 'var(--text)' }}>RUR</span>
            <CalidadEnlace conectado={isRobotConnected} enlace={enlace} t={t} />
          </div>`
);

// Replace in esencial = true (OSD mode)
content = content.replace(
  /{\s*enVivo\s*&&\s*!telemetria\.robot\s*&&\s*\([\s\S]*?telemetria\.sinRobotConectado[\s\S]*?\)\s*}/,
  `{enVivo && (
            <>
              <span className="telemetria__osd-sep">·</span>
              <CalidadEnlace conectado={isRobotConnected} enlace={enlace} t={t} />
            </>
          )}`
);

fs.writeFileSync(file, content);
