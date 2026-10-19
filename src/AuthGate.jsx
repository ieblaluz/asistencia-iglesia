import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import { establecerPerfilActual, emailAUsuario } from './auth';
import Login from './Login';
import { Loader2, LogOut, ShieldAlert } from 'lucide-react';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

const CLAVE_CACHE = 'perfil_usuario_cache';

export default function AuthGate({ children }) {
  const [session, setSession] = useState(undefined); // undefined = comprobando
  const [perfil, setPerfil] = useState(null);
  const [cargandoPerfil, setCargandoPerfil] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_evento, s) => setSession(s ?? null));
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

  const cerrarSesion = async () => {
    try { localStorage.removeItem(CLAVE_CACHE); } catch { /* nada */ }
    await supabase.auth.signOut();
  };

  if (session === undefined || (session && (cargandoPerfil || !perfil))) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <Loader2 className="w-8 h-8 text-amber-700 animate-spin" />
      </div>
    );
  }

  if (!session) return <Login />;

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
    <AuthContext.Provider value={{ perfil, esAdmin: perfil.rol === 'admin', cerrarSesion }}>
      {children}
    </AuthContext.Provider>
  );
}
