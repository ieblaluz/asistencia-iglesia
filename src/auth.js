import { createClient } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';

// Cliente secundario, solo para que el administrador cree cuentas nuevas
// sin que se cierre su propia sesión.
export const supabaseRegistro = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      storageKey: 'sb-registro-temporal'
    }
  }
);

// Los usuarios entran con un nombre de usuario sencillo (ej. "karen").
// Supabase necesita un correo real, así que internamente se usa el correo de la
// iglesia con un "+": ieblaluz+karen@gmail.com. Gmail lo acepta como válido y,
// si algún día llegara un correo, iría a la bandeja de la iglesia.
// El usuario nunca ve esto: solo escribe "karen".
const CORREO_BASE = 'ieblaluz';
const DOMINIO = 'gmail.com';

export function normalizarUsuario(texto) {
  return (texto || '')
    .trim()
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // quita tildes
    .replace(/ñ/g, 'n')
    .replace(/\s+/g, '.')
    .replace(/[^a-z0-9._-]/g, '');
}

// Si escriben un correo completo (como el del administrador), se usa tal cual
export function usuarioAEmail(texto) {
  const t = (texto || '').trim().toLowerCase();
  if (t.includes('@')) return t;
  const usuario = normalizarUsuario(t);
  // La cuenta principal entra simplemente con "ieblaluz"
  if (usuario === CORREO_BASE) return `${CORREO_BASE}@${DOMINIO}`;
  return `${CORREO_BASE}+${usuario}@${DOMINIO}`;
}

export function emailAUsuario(email) {
  if (!email) return '';
  if (email === `${CORREO_BASE}@${DOMINIO}`) return CORREO_BASE;
  const prefijo = `${CORREO_BASE}+`;
  if (email.startsWith(prefijo) && email.endsWith('@' + DOMINIO)) {
    return email.slice(prefijo.length, email.length - DOMINIO.length - 1);
  }
  return email;
}

let perfilActual = null;
export const establecerPerfilActual = (p) => { perfilActual = p; };

// Anota una acción en la bitácora. Nunca bloquea la app si falla.
export async function registrarBitacora(accion, detalle = '') {
  if (!perfilActual) return;
  try {
    await supabase.from('bitacora').insert({
      usuario_id: perfilActual.id,
      usuario_nombre: perfilActual.nombre || perfilActual.email,
      accion,
      detalle
    });
  } catch (err) {
    console.warn('No se pudo anotar en la bitácora:', err);
  }
}

// Traduce los errores de Supabase al español
export function traducirErrorAuth(err) {
  const m = (err?.message || '').toLowerCase();
  if (m.includes('invalid login credentials')) return 'Usuario o contraseña incorrectos.';
  if (m.includes('email not confirmed')) return 'Esta cuenta aún no ha confirmado su correo.';
  if (m.includes('already registered') || m.includes('already been registered')) return 'Ya existe ese nombre de usuario.';
  if (m.includes('password') && m.includes('6')) return 'La contraseña debe tener al menos 6 caracteres.';
  if (m.includes('signups not allowed') || m.includes('signup is disabled')) return 'El registro de cuentas está desactivado en Supabase (Authentication → Sign In / Providers).';
  if (m.includes('invalid') && m.includes('email')) return 'El nombre de usuario no es válido.';
  if (m.includes('failed to fetch') || m.includes('network')) return 'Sin conexión a internet.';
  if (m.includes('rate limit')) return 'Supabase bloqueó temporalmente la creación de cuentas por demasiados intentos. Revisa que "Confirm email" esté desactivado y espera un rato.';
  return err?.message || 'Error desconocido.';
}
