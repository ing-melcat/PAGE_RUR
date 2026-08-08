import React, { useState, useEffect } from 'react';
import { Segment } from '../Segment';
import { useLanguage } from '../../lib/i18n';

export const StatusHUD = ({ isConnected, visible, height }) => {
  const { t } = useLanguage();
  const [coords, setCoords] = useState({ x: "0", y: "0" });

  useEffect(() => {
    const handleJoystickMove = (e) => {
      setCoords({ x: e.detail.x, y: e.detail.y });
    };

    window.addEventListener('joystickMove', handleJoystickMove);
    return () => window.removeEventListener('joystickMove', handleJoystickMove);
  }, []);

  return (
    <Segment id="status" style={{ display: visible ? 'flex' : 'none', height: height }}>
      <div className="status-content">
        <div className="status-section">
          <h3>{t('operador.statusHud.linkStatus')}</h3>
          <p className={isConnected ? "text-ok" : "text-err"}>
            {isConnected ? t('operador.statusHud.online') : t('operador.statusHud.offline')}
          </p>
        </div>
        <div className="status-section">
          <h3>{t('operador.statusHud.telemetria')}</h3>
          <div className="telemetry-grid">
            <span className="label">{t('operador.statusHud.linX')}</span>
            <span className="value">{typeof coords.x === 'number' ? coords.x.toFixed(2) : coords.x}</span>
            <span className="label">{t('operador.statusHud.angZ')}</span>
            <span className="value">{typeof coords.y === 'number' ? coords.y.toFixed(2) : coords.y}</span>
          </div>
        </div>
      </div>
    </Segment>
  );
};
