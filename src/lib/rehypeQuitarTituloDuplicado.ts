import type { Root, RootContent, Element } from 'hast';

// Casi toda publicación repite su propio título como primer `#` del
// contenido -- es el hábito natural al escribir Markdown. Pero ahora ese
// título ya se pinta grande en la portada (PublicationPage, Landing.tsx), así
// que dejarlo también como primer <h1> del cuerpo lo duplica visualmente.
//
// En vez de pedirle a quien redacta que se acuerde de omitirlo (o editar a
// mano las publicaciones que ya existen), este plugin rehype detecta el
// primer encabezado del árbol y lo quita si repite el título. Va DESPUÉS de
// rehypeRaw en la cadena de plugins, para que también vea los <h1> escritos
// como HTML crudo, no solo los `#` de remark.

function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // quita acentos, ya separados por NFD (marcas diacríticas combinantes)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, '') // fuera emojis, puntuación, símbolos
    .replace(/\s+/g, ' ')
    .trim();
}

function textoDe(nodo: RootContent): string {
  if (nodo.type === 'text') return nodo.value;
  if (nodo.type === 'element') return nodo.children.map(textoDe).join('');
  return '';
}

// Los dos casos reales que fijaron este umbral (ver commit que introduce este
// archivo): "Presentación Oficial: Rover Explorer RUR-9" (título) contiene a
// "Rover Explorer RUR-9" (H1) con ratio 0.49 -> debe quitarse. "BMO" (título)
// frente a un H1 real como "Cómo construimos a BMO" tiene ratio 0.14 -> debe
// conservarse, porque ahí el encabezado dice algo que el título no dice.
const RATIO_MINIMO = 0.45;

function esMismoTitulo(tituloPost: string, tituloH1: string): boolean {
  const a = normalizar(tituloPost);
  const b = normalizar(tituloH1);
  if (!a || !b) return false;
  if (!a.includes(b) && !b.includes(a)) return false;
  const ratio = Math.min(a.length, b.length) / Math.max(a.length, b.length);
  return ratio >= RATIO_MINIMO;
}

export function rehypeQuitarTituloDuplicado(tituloPost: string | undefined) {
  return (tree: Root) => {
    if (!tituloPost) return;

    // Salta nodos de texto en blanco (huecos entre bloques) para encontrar el
    // primer elemento real del árbol -- si ese primer elemento no es un h1,
    // no hay nada que hacer.
    const primeroIdx = tree.children.findIndex(
      (n) => !(n.type === 'text' && n.value.trim() === '')
    );
    if (primeroIdx === -1) return;

    const primero = tree.children[primeroIdx];
    if (primero.type !== 'element' || (primero as Element).tagName !== 'h1') return;

    const tituloH1 = textoDe(primero);
    if (!esMismoTitulo(tituloPost, tituloH1)) return;

    tree.children.splice(primeroIdx, 1);
  };
}
