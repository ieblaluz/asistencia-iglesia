import React, { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from './supabaseClient';
import { Clock } from 'lucide-react';

export const CLAVE_AVISO_CIERRE = 'sesion_cerrada_inactividad';
const CLAVE_ACTIVIDAD = 'ultima_actividad';
const CLAVE_CONFIG = 'config_inactividad_cache';
const EVENTOS = ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart', 'scroll'];

const ahora = () => Date.now();
const leerActividad = () => {
  try { return parseInt(localStorage.getItem(CLAVE_ACTIVIDAD), 10) || ahora(); } catch { return ahora(); }
};
const guardarActividad = (t) => {
  try { localStorage.setItem(CLAVE_ACTIVIDAD, String(t)); } catch { /* nada */ }
};

// Cierra la sesión si la app no se usa durante el tiempo configurado en
// Usuarios → Seguridad de la sesión. El tiempo en segundo plano también cuenta.
export default function ControlInactividad({ cerrarSesion }) {
  const [minutos, setMinutos] = useState(() => {
    try { return parseInt(localStorage.getItem(CLAVE_CONFIG), 10) || 0; } catch { return 0; }
  });
  const [segundosRestantes, setSegundosRestantes] = useState(null);
  const ultimoGuardado = useRef(0);

  // Cargar la configuración (y recargarla si el administrador la cambia)
  const cargarConfig = useCallback(async () => {
    const { data } = await supabase.from('configuracion').select('sesion_inactividad_min').eq('id', 1).single();
    if (data) {
      const m = data.sesion_inactividad_min || 0;
      setMinutos(m);
      try { localStorage.setItem(CLAVE_CONFIG, String(m)); } catch { /* nada */ }
    }
  }, []);

  useEffect(() => {
    cargarConfig();
    window.addEventListener('config-sesion-cambiada', cargarConfig);
    return () => window.removeEventListener('config-sesion-cambiada', cargarConfig);
  }, [cargarConfig]);

  const cerrarPorInactividad = useCallback(async () => {
    try { sessionStorage.setItem(CLAVE_AVISO_CIERRE, '1'); } catch { /* nada */ }
    try { localStorage.removeItem(CLAVE_ACTIVIDAD); } catch { /* nada */ }
    await cerrarSesion();
  }, [cerrarSesion]);

  // Registrar actividad (como mucho una vez cada 5 segundos)
  useEffect(() => {
    if (!minutos) return;
    const marcar = () => {
      const t = ahora();
      if (t - ultimoGuardado.current > 5000) {
        ultimoGuardado.current = t;
        guardarActividad(t);
        setSegundosRestantes(null);
      }
    };
    // Al abrir la app: si estuvo cerrada demasiado tiempo, cerrar sesión
    if (ahora() - leerActividad() > minutos * 60000) {
      cerrarPorInactividad();
      return;
    }
    marcar();
    EVENTOS.forEach((e) => window.addEventListener(e, marcar, { passive: true }));
    return () => EVENTOS.forEach((e) => window.removeEventListener(e, marcar));
  }, [minutos, cerrarPorInactividad]);

  // Comprobar cada segundo y al volver del segundo plano
  useEffect(() => {
    if (!minutos) { setSegundosRestantes(null); return; }
    const comprobar = () => {
      const restante = minutos * 60000 - (ahora() - leerActividad());
      if (restante <= 0) {
        cerrarPorInactividad();
      } else if (restante <= 60000) {
        setSegundosRestantes(Math.ceil(restante / 1000));
      } else {
        setSegundosRestantes(null);
      }
    };
    const intervalo = setInterval(comprobar, 1000);
    const alVolver = () => { if (document.visibilityState === 'visible') comprobar(); };
    document.addEventListener('visibilitychange', alVolver);
    window.addEventListener('focus', alVolver);
    return () => {
      clearInterval(intervalo);
      document.removeEventListener('visibilitychange', alVolver);
      window.removeEventListener('focus', alVolver);
    };
  }, [minutos, cerrarPorInactividad]);

  const seguirConectado = () => {
    ultimoGuardado.current = ahora();
    guardarActividad(ahora());
    setSegundosRestantes(null);
  };

  if (segundosRestantes === null) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 text-center space-y-4">
        <Clock className="w-10 h-10 text-amber-600 mx-auto" />
        <div>
          <h3 className="font-bold text-slate-800 text-lg">¿Sigues ahí?</h3>
          <p className="text-sm text-slate-600 mt-1">
            Por seguridad, tu sesión se cerrará en <b className="text-amber-700 tabular-nums">{segundosRestantes}</b> segundos por inactividad.
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={cerrarPorInactividad} className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-600 font-bold text-sm hover:bg-slate-50">
            Cerrar sesión
          </button>
          <button onClick={seguirConectado} className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm">
            Seguir conectado
          </button>
        </div>
      </div>
    </div>
  );
}
