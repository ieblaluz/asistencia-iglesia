import React, { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import { traducirErrorAuth, usuarioAEmail } from './auth';
import { Loader2, LogIn, Eye, EyeOff } from 'lucide-react';

export default function Login() {
  const [usuario, setUsuario] = useState('');
  const [clave, setClave] = useState('');
  const [verClave, setVerClave] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [iglesia, setIglesia] = useState({ nombre_iglesia: 'Gestión de Asistencia', direccion: '', logo_url: '' });

  useEffect(() => {
    supabase.from('configuracion').select('nombre_iglesia, direccion, logo_url').eq('id', 1).single()
      .then(({ data }) => { if (data) setIglesia(data); });
  }, []);

  const entrar = async (e) => {
    e.preventDefault();
    setError('');
    setCargando(true);
    const { error: err } = await supabase.auth.signInWithPassword({ email: usuarioAEmail(usuario), password: clave });
    if (err) setError(traducirErrorAuth(err));
    setCargando(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-900 to-amber-950 p-4">
      <form onSubmit={entrar} className="bg-white rounded-2xl shadow-xl p-6 md:p-8 w-full max-w-sm space-y-5">
        <div className="text-center space-y-2">
          {iglesia.logo_url ? (
            <img src={iglesia.logo_url} alt="Logo" className="w-16 h-16 mx-auto rounded-xl object-cover" />
          ) : (
            <div className="w-16 h-16 mx-auto rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center text-3xl font-black">✝</div>
          )}
          <h1 className="font-bold text-amber-900 leading-tight">{iglesia.nombre_iglesia}</h1>
          {iglesia.direccion && <p className="text-xs text-slate-500">{iglesia.direccion}</p>}
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Usuario</label>
            <input
              type="text" required autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck={false}
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Contraseña</label>
            <div className="relative">
              <input
                type={verClave ? 'text' : 'password'} required autoComplete="current-password" value={clave}
                onChange={(e) => setClave(e.target.value)}
                className="w-full px-3 py-2.5 pr-10 border border-slate-200 rounded-xl text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
              />
              <button type="button" onClick={() => setVerClave(!verClave)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600">
                {verClave ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        {error && <p className="text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-2">{error}</p>}

        <button type="submit" disabled={cargando}
          className="w-full py-3 bg-amber-700 hover:bg-amber-800 disabled:opacity-60 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2">
          {cargando ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
          Iniciar sesión
        </button>
      </form>
    </div>
  );
}
