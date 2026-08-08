import { useLanguage } from '../lib/i18n';

export function Login() {
    const { t } = useLanguage();
    return (
        <div className="login">
            <h3>{t('operador.controller.loginLegacyTitulo')}</h3>
            <hr></hr>
            <label>{t('operador.controller.loginLegacyIdentidad')}</label>
            <br></br>
            <input type="text" placeholder={t('operador.controller.loginLegacyPlaceholderUsuario')} />
            <br></br>
            <label>{t('operador.controller.loginLegacyPassword')}</label>
            <br></br>
            <input type="password" placeholder={t('operador.controller.loginLegacyPlaceholderPassword')} />
            <br></br>
            <button id="connect-button">{t('operador.controller.conectar')}</button>
        </div>
    )
}