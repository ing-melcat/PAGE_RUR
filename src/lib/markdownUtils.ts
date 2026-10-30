import React from 'react';

/**
 * Convierte un texto en un slug URL-safe sin diacríticos ni caracteres extraños.
 */
export function slugify(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Elimina tildes y marcas diacríticas
    .replace(/[^a-z0-9\s-]/g, '') // Conserva solo alfanuméricos, guiones y espacios
    .trim()
    .replace(/\s+/g, '-'); // Convierte espacios a guiones
}

/**
 * Extrae recursivamente el texto legible de un árbol de nodos React.
 */
export function extraerTexto(node: React.ReactNode): string {
  if (typeof node === 'string') return node;
  if (typeof node === 'number') return String(node);
  if (!node) return '';
  if (Array.isArray(node)) return node.map(extraerTexto).join('');
  if (React.isValidElement(node) && (node.props as { children?: React.ReactNode })?.children) {
    return extraerTexto((node.props as { children?: React.ReactNode }).children);
  }
  return '';
}

export interface TocItem {
  id: string;
  text: string;
  level: 2 | 3;
}

/**
 * Extrae la lista de encabezados (H2 y H3) de un contenido markdown para
 * la generación de la Tabla de Contenidos (TOC). Ignora bloques de código.
 */
export function extraerEncabezadosMarkdown(md: string): TocItem[] {
  if (!md) return [];
  // Ignorar bloques de código multilínea ```...``` para evitar falsos positivos
  const sinBloquesCodigo = md.replace(/```[\s\S]*?```/g, '');
  const lineas = sinBloquesCodigo.split(/\r?\n/);
  const items: TocItem[] = [];
  const conteoSlugs = new Map<string, number>();

  for (const linea of lineas) {
    const match = linea.match(/^(#{2,3})\s+(.+)$/);
    if (!match) continue;

    const level = match[1].length as 2 | 3;
    const textoLimpio = match[2]
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Enlaces markdown
      .replace(/[*_`~]/g, '') // Marcadores de énfasis / formato
      .trim();

    if (!textoLimpio) continue;

    const baseSlug = slugify(textoLimpio) || `seccion-${items.length + 1}`;
    const cantidad = conteoSlugs.get(baseSlug) || 0;
    const finalSlug = cantidad > 0 ? `${baseSlug}-${cantidad}` : baseSlug;
    conteoSlugs.set(baseSlug, cantidad + 1);

    items.push({
      id: finalSlug,
      text: textoLimpio,
      level,
    });
  }

  return items;
}
