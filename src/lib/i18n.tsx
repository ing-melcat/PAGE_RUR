import React, { createContext, useContext, useEffect, useState } from 'react';
import { es } from './locales/es';
import { en } from './locales/en';

export type Lang = 'es' | 'en';

const DICCIONARIOS: Record<Lang, Record<string, unknown>> = { es, en };

// Mismo patrón que src/controller/widgets.js (cargarWidgets/guardarWidgets):
// preferencia local, no de perfil -- tiene que funcionar también para quien
// visita la página pública sin sesión, así que no puede depender de
// /api/profile (eso solo existe para usuarios logueados).
const CLAVE = 'rur.idioma';

function cargarIdioma(): Lang {
  try {
    const guardado = window.localStorage.getItem(CLAVE);
    return guardado === 'en' ? 'en' : 'es';
  } catch {
    // Modo incógnito o almacenamiento bloqueado: se sigue sin guardar.
    return 'es';
  }
}

function guardarIdioma(lang: Lang) {
  try {
    window.localStorage.setItem(CLAVE, lang);
  } catch {
    // Que no se pueda guardar no debe romper la vista.
  }
}

// Busca por ruta de puntos ('seccion.clave') dentro del diccionario activo.
// Si la clave no existe todavía (archivo aún no traducido, o typo), devuelve
// fallback si se proporcionó, o la clave misma en vez de tronar -- nunca debe romper la UI por esto.
function buscar(diccionario: Record<string, unknown>, ruta: string, fallback?: string): string {
  const partes = ruta.split('.');
  let actual: unknown = diccionario;
  for (const parte of partes) {
    if (typeof actual !== 'object' || actual === null || !(parte in actual)) {
      return fallback !== undefined ? fallback : ruta;
    }
    actual = (actual as Record<string, unknown>)[parte];
  }
  return typeof actual === 'string' ? actual : (fallback !== undefined ? fallback : ruta);
}

interface LanguageContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (ruta: string, fallback?: string) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(cargarIdioma);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = (siguiente: Lang) => {
    setLangState(siguiente);
    guardarIdioma(siguiente);
  };

  const t = (ruta: string, fallback?: string) => buscar(DICCIONARIOS[lang], ruta, fallback);

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const contexto = useContext(LanguageContext);
  if (!contexto) {
    throw new Error('useLanguage debe usarse dentro de un LanguageProvider');
  }
  return contexto;
}
