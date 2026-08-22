import React from 'react';

/**
 * Ningún visor de modelo 3D del sitio tenía uno de estos -- ya había un
 * comentario en Robot3DPreview.jsx reconociéndolo como pendiente ("deberíamos
 * capturar errores, pero..."). `useGLTF` (drei) se apoya en Suspense para la
 * ESPERA, pero un fallo real al parsear el archivo (uno corrupto, uno
 * demasiado grande para la memoria del navegador, una extensión de glTF que
 * el decodificador no soporta) no es una promesa pendiente: es una excepción
 * de verdad, y Suspense no atrapa excepciones, solo promesas. Sin un
 * ErrorBoundary en algún punto del árbol, React se queda sin dónde
 * recuperarse y desmonta todo lo que hay encima -- así es como una tarjeta
 * entera terminaba en blanco por un solo modelo roto.
 *
 * Confirmado con un caso real: un modelo "recuperado" de 9,2 millones de
 * vértices hacía justo esto en la tarjeta de selección de robot. El arreglo
 * de fondo es no dejar pasar mallas así de extremas (ver
 * VERTICES_MAXIMOS_SIN_SIMPLIFICAR en comprimirModelo3D.worker.ts y en
 * services/content/server.js), pero esto es la red de seguridad para
 * cualquier otro motivo de fallo que aparezca -- de red, de un archivo
 * corrupto, de lo que sea.
 */
type Props = { fallback: React.ReactNode; children: React.ReactNode };
type State = { tieneError: boolean };

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { tieneError: false };

  static getDerivedStateFromError() {
    return { tieneError: true };
  }

  componentDidCatch(error: unknown) {
    console.error('[ErrorBoundary] no se pudo renderizar:', error);
  }

  render() {
    return this.state.tieneError ? this.props.fallback : this.props.children;
  }
}
