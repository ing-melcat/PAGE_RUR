// Componentes que ReactMarkdown usa para ciertas etiquetas, compartidos
// por la página pública (PublicationPage, Landing.tsx) y la vista previa
// del editor (AdminContent.tsx) -- si cada una llevara los suyos, lo que
// ve quien redacta dejaría de coincidir con lo que se publica.
//
// Viven aquí y no en Landing.tsx para que el panel de administración no
// tenga que importar Landing entero: arrastraría con él el visor 3D y el
// resto de la web pública al paquete del panel.

// Se define una sola vez, fuera de todo componente: pasarle un objeto
// nuevo a ReactMarkdown en cada render le haría rehacer el contenido
// completo cada vez.
export const componentesMarkdown = {
  // Una tabla más ancha que la columna de lectura tiene que hacer scroll
  // ella sola. Necesita este contenedor porque una <table> no acepta
  // overflow sin perder el reparto automático de columnas.
  table: ({ node: _node, ...props }: any) => (
    <div className="tabla-scroll"><table {...props} /></div>
  ),
};
