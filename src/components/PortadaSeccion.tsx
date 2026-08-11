/* --------------------------------------------------------------------
   Portada de las secciones de la barra de navegación
   --------------------------------------------------------------------
   Explora, Descubre, Conecta y Miembros comparten portada: la misma que la
   página principal, solo que en el marco más bajo de sección.

   Antes cada una la escribía por su cuenta y habían derivado en cuatro
   cosas distintas -- dos llevaban un antetítulo encima del titular, todas
   un filete ámbar al costado, y el tamaño del titular iba fijo y distinto
   en cada una (4.2rem aquí, 3.5rem allá), que en un móvil se desbordaba.
   Ahora el titular manda solo, como en la principal.

   El tope del titular es más bajo que el de la principal (4.2 frente a
   5.4rem) porque el marco de sección también lo es: mide 520px contra los
   760px de la portada de inicio.
   ================================================================== */

export const PortadaSeccion = ({
  imagen,
  claseFoto,
  titulo,
  texto,
  fotoAnimada = false,
  tituloRevelado = false,
}: {
  /** Foto de fondo. Si no hay, se usa `claseFoto` (un fondo del CSS). */
  imagen?: string;
  claseFoto?: string;
  titulo: string;
  texto?: string;
  fotoAnimada?: boolean;
  /** Envuelve el titular en la máscara de revelado al entrar. */
  tituloRevelado?: boolean;
}) => (
  <section className="portada">
    <div className="portada__marco portada__marco--seccion">
      <div
        className={`portada__foto${claseFoto ? ` ${claseFoto}` : ''}`}
        style={{
          // El oscurecido solo tiene sentido sobre una foto: aplicado a un
          // fondo de color plano lo dejaría casi negro.
          ...(imagen
            ? {
                backgroundImage: `url(${imagen})`,
                filter: 'brightness(0.26) contrast(1.1) grayscale(0.35)',
              }
            : {}),
          ...(fotoAnimada ? { animation: 'kenBurns 20s infinite alternate ease-in-out' } : {}),
        }}
      />
      <div className="portada__velo" />

      <div className="portada__texto">
        <h1 style={{
          fontSize: 'clamp(2.5rem, 7vw, 4.2rem)',
          lineHeight: '1.1',
          fontFamily: 'var(--font-titulo)',
          textTransform: 'uppercase',
          letterSpacing: '0.02em',
          fontWeight: '400',
          margin: texto ? '0 0 24px 0' : '0',
          textShadow: '0 4px 20px rgba(0,0,0,0.8)',
        }}>
          {tituloRevelado ? (
            <span className="text-reveal-mask"><span>{titulo}</span></span>
          ) : titulo}
        </h1>

        {texto && (
          <p style={{
            fontSize: 'clamp(1rem, 3vw, 1.25rem)',
            color: 'var(--bone)',
            opacity: 0.9,
            maxWidth: '600px',
            lineHeight: '1.6',
            textShadow: '0 2px 10px rgba(0,0,0,0.8)',
          }}>
            {texto}
          </p>
        )}
      </div>
    </div>
  </section>
);
