// Copiar al portapapeles sin dar por hecho que hay contexto seguro.
//
// `navigator.clipboard` solo existe en HTTPS, localhost o 127.0.0.1. El stack
// de dev se navega por http://100.126.20.52:8080 -- Tailscale, sin TLS --, así
// que ahí la API sencillamente no está definida y un
// `navigator.clipboard.writeText(...)` suelto revienta con TypeError antes de
// llegar a la línea siguiente: el botón se queda sin hacer nada, sin copiar y
// sin decir por qué. Así se atascó la prueba del flujo de alta: el modal de la
// contraseña provisional no soltaba la clave y no había nada que pegar.
//
// El respaldo es el truco viejo del textarea invisible + execCommand. Está
// obsoleto y algún día dejará de funcionar, pero es lo único que copia sobre
// HTTP, y sin él el panel de dev no se puede usar para probar justo los flujos
// que dependen de copiar algo.
//
// Devuelve si copió de verdad, para que quien llame pueda decir la verdad en
// pantalla en vez de anunciar un éxito que no ocurrió.
export async function copiarAlPortapapeles(texto: string): Promise<boolean> {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(texto);
      return true;
    } catch {
      // Existe pero el permiso está denegado: aún queda el respaldo.
    }
  }

  try {
    const area = document.createElement('textarea');
    area.value = texto;
    // Fuera de la vista y sin foco visible, pero dentro del documento: si no
    // está en el DOM, select() no selecciona nada y execCommand no copia.
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.top = '-9999px';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    const copiado = document.execCommand('copy');
    document.body.removeChild(area);
    return copiado;
  } catch {
    return false;
  }
}
