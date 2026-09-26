import { supabase } from './supabaseClient';

const QUEUE_KEY = 'asistencia_offline_queue';

// Guardar registros localmente si no hay red
export const guardarLocalmente = (nuevosRegistros) => {
  const colaActual = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
  const colaActualizada = [...colaActual, ...nuevosRegistros];
  localStorage.setItem(QUEUE_KEY, JSON.stringify(colaActualizada));
  return colaActualizada.length;
};

// Consultar cuántos registros pendientes hay por subir
export const obtenerRegistrosPendientes = () => {
  const cola = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
  return cola.length;
};

// Subir los datos guardados en la memoria local a Supabase cuando vuelva internet
export const sincronizarConSupabase = async () => {
  if (!navigator.onLine) return { success: false, synced: 0 };

  const cola = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
  if (cola.length === 0) return { success: true, synced: 0 };

  try {
    const { error } = await supabase.from('asistencia').insert(cola);

    if (!error) {
      localStorage.removeItem(QUEUE_KEY);
      return { success: true, synced: cola.length };
    } else {
      console.error('Error al sincronizar con Supabase:', error);
      return { success: false, synced: 0, error };
    }
  } catch (err) {
    console.error('Error de red durante la sincronización:', err);
    return { success: false, synced: 0, error: err };
  }
};