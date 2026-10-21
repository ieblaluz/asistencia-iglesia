// Temas de color disponibles. Los colores están en src/index.css
export const TEMAS = [
  { id: 'petroleo', nombre: 'Azul petróleo', descripcion: 'Gris, blanco roto, carbón y azul petróleo', muestras: ['#2b2f33', '#f4f4f1', '#1f5f6b'] },
  { id: 'dorado',   nombre: 'Dorado mate',   descripcion: 'Gris, marfil, carbón y dorado mate',        muestras: ['#2d2b29', '#f7f3ea', '#957844'] },
];

const CLAVE = 'tema_app';
const COLOR_BARRA = { petroleo: '#2b2f33', dorado: '#2d2b29' };

export function temaGuardado() {
  try { return localStorage.getItem(CLAVE) || 'petroleo'; } catch { return 'petroleo'; }
}

export function aplicarTema(id) {
  document.documentElement.dataset.tema = id;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', COLOR_BARRA[id] || COLOR_BARRA.petroleo);
  try { localStorage.setItem(CLAVE, id); } catch { /* sin almacenamiento */ }
}
