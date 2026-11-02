import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import { establecerPerfilActual, emailAUsuario } from './auth';
import Login from './Login';
import ControlInactividad, { CLAVE_AVISO_CIERRE } from './ControlInactividad';
import { Loader2, LogOut, ShieldAlert, Clock } from 'lucide-react';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

const CLAVE_CACHE = 'perfil_usuario_cache';

// Permisos disponibles. El administrador siempre los tiene todos.
export const PERMISOS = [
  { id: 'registrar',      nombre: 'Registrar asistencia',           descripcion: 'Guardar cultos nuevos' },
  { id: 'modificar',      nombre: 'Modificar y eliminar registros', descripcion: 'Botón “Consultar / Modificar”' },
  { id: 'sin_culto',      nombre: 'Marcar días sin culto',          descripcion: 'En el calendario de Registro' },
  { id: 'ver_reportes',   nombre: 'Ver reportes',                   descripcion: 'Pestaña Reportes' },
  { id: 'ver_ajustes',    nombre: 'Ver ajustes',                    descripcion: 'Pestaña Ajustes (solo lectura)' },
  { id: 'editar_ajustes', nombre: 'Editar ajustes',                 descripcion: 'Grupos, datos de la iglesia y motivos' },
];

export default function AuthGate({ children }) {
  const [session, setSession] = useState(undefined); // undefined = comprobando
  const [perfil, setPerfil] = useState(null);
  const [cargandoPerfil, setCargandoPerfil] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((evento, s) => {
      // Al iniciar sesión, el contador de inactividad empieza de cero
      if (evento === 'SIGNED_IN') {
        try { localStorage.setItem('ultima_actividad', String(Date.now())); } catch { /* nada */ }
      }
      setSession(s ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) {
      setPerfil(null);
      establecerPerfilActual(null);
      return;
    }
    let cancelado = false;
    const cargar = async () => {
      setCargandoPerfil(true);
      try {
        const { data, error } = await supabase
          .from('perfiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        if (error) throw error;
        if (cancelado) return;
        setPerfil(data);
        establecerPerfilActual(data);
        try { localStorage.setItem(CLAVE_CACHE, JSON.stringify(data)); } catch { /* sin almacenamiento */ }
      } catch (err) {
        // Sin conexión: usar el último perfil conocido de este mismo usuario
        console.warn('No se pudo cargar el perfil:', err);
        try {
          const cache = JSON.parse(localStorage.getItem(CLAVE_CACHE) || 'null');
          if (!cancelado && cache && cache.id === session.user.id) {
            setPerfil(cache);
            establecerPerfilActual(cache);
          } else if (!cancelado) {
            setPerfil({ id: session.user.id, email: session.user.email, activo: false, sinPerfil: true });
          }
        } catch { /* nada */ }
      } finally {
        if (!cancelado) setCargandoPerfil(false);
      }
    };
    cargar();
    return () => { cancelado = true; };
  }, [session]);

  const cerrarSesion = useCallback(async () => {
    try { localStorage.removeItem(CLAVE_CACHE); } catch { /* nada */ }
    await supabase.auth.signOut();
  }, []);

  const esAdmin = perfil?.rol === 'admin';
  const puede = useCallback(
    (permiso) => esAdmin || !!(perfil?.permisos && perfil.permisos[permiso]),
    [esAdmin, perfil]
  );

  // Aviso tras un cierre automático por inactividad
  const [avisoCierre, setAvisoCierre] = useState(false);
  useEffect(() => {
    if (session === null) {
      try {
        if (sessionStorage.getItem(CLAVE_AVISO_CIERRE)) {
          setAvisoCierre(true);
          sessionStorage.removeItem(CLAVE_AVISO_CIERRE);
        }
      } catch { /* nada */ }
    } else if (session) {
      setAvisoCierre(false);
    }
  }, [session]);

  if (session === undefined || (session && (cargandoPerfil || !perfil))) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <Loader2 className="w-8 h-8 text-amber-700 animate-spin" />
      </div>
    );
  }

  if (!session) {
    return (
      <>
        {avisoCierre && (
          <div className="fixed top-3 inset-x-3 z-50 flex justify-center pointer-events-none">
            <div className="pointer-events-auto max-w-sm w-full bg-white border border-slate-200 shadow-lg rounded-xl px-4 py-3 flex items-center gap-3 text-sm text-slate-700">
              <Clock className="w-5 h-5 text-amber-600 shrink-0" />
              <span className="flex-1">Tu sesión se cerró por inactividad. Vuelve a iniciar sesión.</span>
              <button onClick={() => setAvisoCierre(false)} className="text-slate-400 hover:text-slate-700 font-bold">✕</button>
            </div>
          </div>
        )}
        <Login />
      </>
    );
  }

  if (!perfil.activo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 max-w-sm w-full text-center space-y-4">
          <ShieldAlert className="w-10 h-10 text-amber-600 mx-auto" />
          <h2 className="font-bold text-slate-800">Cuenta sin acceso</h2>
          <p className="text-sm text-slate-600">
            La cuenta <b>{emailAUsuario(perfil.email)}</b> no está activada. Pide al administrador que la active.
          </p>
          <button
            onClick={cerrarSesion}
            className="w-full py-2.5 bg-amber-700 hover:bg-amber-800 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4" /> Cerrar sesión
          </button>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ perfil, esAdmin, puede, cerrarSesion }}>
      <ControlInactividad cerrarSesion={cerrarSesion} />
      {children}
    </AuthContext.Provider>
  );
}
