import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import { registrarBitacora, traducirErrorAuth, usuarioAEmail, emailAUsuario, normalizarUsuario } from './auth';
import { useAuth } from './AuthGate';
import { UserPlus, Users, KeyRound, KeySquare, LogOut, ScrollText, Loader2, ShieldCheck, User, RefreshCw } from 'lucide-react';

const tarjeta = 'bg-white rounded-2xl p-4 md:p-5 shadow-sm border border-slate-200';
const campo = 'w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20';
const titulo = 'flex items-center gap-2 font-bold text-sm text-amber-900 uppercase tracking-wide mb-4';

const formatearFechaHora = (iso) =>
  new Date(iso).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export default function PanelUsuarios() {
  const { perfil, esAdmin, cerrarSesion } = useAuth();

  return (
    <div className="space-y-4">
      <MiCuenta perfil={perfil} cerrarSesion={cerrarSesion} />
      {esAdmin && <GestionUsuarios perfil={perfil} />}
      {esAdmin && <Bitacora />}
    </div>
  );
}

function MiCuenta({ perfil, cerrarSesion }) {
  const [nueva, setNueva] = useState('');
  const [repetir, setRepetir] = useState('');
  const [msg, setMsg] = useState(null);
  const [guardando, setGuardando] = useState(false);

  const cambiarClave = async (e) => {
    e.preventDefault();
    setMsg(null);
    if (nueva.length < 6) return setMsg({ ok: false, t: 'La contraseña debe tener al menos 6 caracteres.' });
    if (nueva !== repetir) return setMsg({ ok: false, t: 'Las contraseñas no coinciden.' });
    setGuardando(true);
    const { error } = await supabase.auth.updateUser({ password: nueva });
    setGuardando(false);
    if (error) return setMsg({ ok: false, t: traducirErrorAuth(error) });
    setNueva(''); setRepetir('');
    setMsg({ ok: true, t: 'Contraseña cambiada correctamente.' });
    registrarBitacora('Cambió su contraseña');
  };

  return (
    <div className={tarjeta}>
      <h2 className={titulo}><User className="w-4 h-4" /> Mi cuenta</h2>
      <div className="flex flex-col md:flex-row md:items-start gap-5">
        <div className="md:w-1/3 space-y-1">
          <p className="font-bold text-slate-800">{perfil.nombre}</p>
          <p className="text-sm text-slate-500 break-all">Usuario: {emailAUsuario(perfil.email)}</p>
          <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${perfil.rol === 'admin' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'}`}>
            {perfil.rol === 'admin' ? 'Administrador' : 'Usuario'}
          </span>
          <div className="pt-3">
            <button onClick={cerrarSesion}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold flex items-center gap-1.5">
              <LogOut className="w-3.5 h-3.5" /> Cerrar sesión
            </button>
          </div>
        </div>
        <form onSubmit={cambiarClave} className="flex-1 space-y-2">
          <p className="text-xs font-bold text-slate-600 flex items-center gap-1.5"><KeyRound className="w-3.5 h-3.5" /> Cambiar mi contraseña</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input type="password" placeholder="Nueva contraseña" autoComplete="new-password" value={nueva} onChange={(e) => setNueva(e.target.value)} className={campo} />
            <input type="password" placeholder="Repetir contraseña" autoComplete="new-password" value={repetir} onChange={(e) => setRepetir(e.target.value)} className={campo} />
          </div>
          {msg && <p className={`text-xs font-semibold ${msg.ok ? 'text-emerald-700' : 'text-rose-700'}`}>{msg.t}</p>}
          <button type="submit" disabled={guardando || !nueva}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold">
            {guardando ? 'Guardando…' : 'Cambiar contraseña'}
          </button>
        </form>
      </div>
    </div>
  );
}

function GestionUsuarios({ perfil }) {
  const [usuarios, setUsuarios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [form, setForm] = useState({ nombre: '', usuario: '', clave: '', rol: 'usuario' });
  const [creando, setCreando] = useState(false);
  const [msg, setMsg] = useState(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    const { data } = await supabase.from('perfiles').select('*').order('creado_en');
    setUsuarios(data || []);
    setCargando(false);
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const crearUsuario = async (e) => {
    e.preventDefault();
    setMsg(null);
    const nombre = form.nombre.trim();
    const usuario = normalizarUsuario(form.usuario);
    const email = usuarioAEmail(usuario);
    if (!nombre) return setMsg({ ok: false, t: 'Escribe el nombre.' });
    if (usuario.length < 3) return setMsg({ ok: false, t: 'El usuario debe tener al menos 3 letras o números.' });
    if (form.clave.length < 6) return setMsg({ ok: false, t: 'La contraseña debe tener al menos 6 caracteres.' });

    setCreando(true);
    try {
      // Se crea directamente en la base de datos (sin correos ni límites de intentos)
      const { error } = await supabase.rpc('crear_usuario', {
        p_email: email, p_clave: form.clave, p_nombre: nombre, p_rol: form.rol
      });
      if (error) throw error;
      registrarBitacora('Creó usuario', `${nombre} (${usuario}) – ${form.rol === 'admin' ? 'Administrador' : 'Usuario'}`);
      setForm({ nombre: '', usuario: '', clave: '', rol: 'usuario' });
      setMsg({ ok: true, t: `Listo. ${nombre} ya puede entrar con el usuario «${usuario}» y su contraseña.` });
      cargar();
    } catch (err) {
      console.error(err);
      setMsg({ ok: false, t: traducirErrorAuth(err) });
    } finally {
      setCreando(false);
    }
  };

  const actualizar = async (u, cambios, accion) => {
    if (u.id === perfil.id) return;
    const { error } = await supabase.from('perfiles').update(cambios).eq('id', u.id);
    if (error) { alert('No se pudo actualizar el usuario.'); return; }
    registrarBitacora(accion, `${u.nombre} (${emailAUsuario(u.email)})`);
    cargar();
  };

  const restablecerClave = async (u) => {
    const nueva = window.prompt(`Nueva contraseña para ${u.nombre} (mínimo 6 caracteres):`);
    if (nueva === null) return;
    if (nueva.length < 6) { alert('La contraseña debe tener al menos 6 caracteres.'); return; }
    const { error } = await supabase.rpc('cambiar_clave_usuario', { p_id: u.id, p_clave: nueva });
    if (error) { alert(traducirErrorAuth(error)); return; }
    registrarBitacora('Cambió la contraseña de', `${u.nombre} (${emailAUsuario(u.email)})`);
    alert(`Contraseña de ${u.nombre} cambiada. Comunícasela en persona.`);
  };

  return (
    <div className={tarjeta}>
      <h2 className={titulo}><Users className="w-4 h-4" /> Usuarios</h2>

      <form onSubmit={crearUsuario} className="bg-slate-50 border border-slate-200 rounded-xl p-3 mb-4 space-y-2">
        <p className="text-xs font-bold text-slate-600 flex items-center gap-1.5"><UserPlus className="w-3.5 h-3.5" /> Nuevo usuario</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          <input placeholder="Nombre (ej. Karen López)" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} className={campo} />
          <input required placeholder="Usuario para entrar (ej. karen)" autoComplete="off" autoCapitalize="none" value={form.usuario}
            onChange={(e) => setForm({ ...form, usuario: normalizarUsuario(e.target.value) })} className={campo} />
          <input type="text" required placeholder="Contraseña (mín. 6)" autoComplete="off" value={form.clave} onChange={(e) => setForm({ ...form, clave: e.target.value })} className={campo} />
          <select value={form.rol} onChange={(e) => setForm({ ...form, rol: e.target.value })} className={campo}>
            <option value="usuario">Usuario (registra asistencia)</option>
            <option value="admin">Administrador</option>
          </select>
        </div>
        {msg && <p className={`text-xs font-semibold ${msg.ok ? 'text-emerald-700' : 'text-rose-700'}`}>{msg.t}</p>}
        <button type="submit" disabled={creando}
          className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold flex items-center gap-1.5">
          {creando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />} Crear usuario
        </button>
      </form>

      {cargando ? (
        <Loader2 className="w-5 h-5 animate-spin text-amber-700 mx-auto" />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500 border-b border-slate-200">
                <th className="py-2 pr-3">Nombre</th>
                <th className="py-2 pr-3">Usuario</th>
                <th className="py-2 pr-3">Rol</th>
                <th className="py-2 pr-3">Estado</th>
                <th className="py-2 pr-3">Contraseña</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((u) => {
                const soyYo = u.id === perfil.id;
                return (
                  <tr key={u.id} className="border-b border-slate-100">
                    <td className="py-2 pr-3 font-semibold text-slate-800 whitespace-nowrap">
                      {u.nombre} {soyYo && <span className="text-[10px] text-slate-400">(tú)</span>}
                    </td>
                    <td className="py-2 pr-3 text-slate-500">{emailAUsuario(u.email)}</td>
                    <td className="py-2 pr-3">
                      <select value={u.rol} disabled={soyYo}
                        onChange={(e) => actualizar(u, { rol: e.target.value }, e.target.value === 'admin' ? 'Hizo administrador a' : 'Quitó administrador a')}
                        className="px-2 py-1 border border-slate-200 rounded-md text-xs disabled:bg-slate-50">
                        <option value="usuario">Usuario</option>
                        <option value="admin">Administrador</option>
                      </select>
                    </td>
                    <td className="py-2 pr-3">
                      <button disabled={soyYo}
                        onClick={() => actualizar(u, { activo: !u.activo }, u.activo ? 'Desactivó usuario' : 'Activó usuario')}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-bold disabled:cursor-not-allowed ${u.activo ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-700'}`}>
                        {u.activo ? 'Activo' : 'Desactivado'}
                      </button>
                    </td>
                    <td className="py-2 pr-3">
                      {!soyYo && (
                        <button onClick={() => restablecerClave(u)}
                          className="px-2.5 py-1 rounded-md border border-slate-200 text-[11px] font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-1 whitespace-nowrap">
                          <KeySquare className="w-3 h-3" /> Cambiar
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="text-[11px] text-slate-400 mt-2 flex items-center gap-1">
            <ShieldCheck className="w-3 h-3" /> Pulsa en “Activo / Desactivado” para quitar o devolver el acceso a una persona.
          </p>
        </div>
      )}
    </div>
  );
}

function Bitacora() {
  const [filas, setFilas] = useState([]);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    setCargando(true);
    const { data } = await supabase.from('bitacora').select('*').order('fecha_hora', { ascending: false }).limit(200);
    setFilas(data || []);
    setCargando(false);
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  return (
    <div className={tarjeta}>
      <div className="flex items-center justify-between mb-4">
        <h2 className={titulo + ' mb-0'}><ScrollText className="w-4 h-4" /> Bitácora</h2>
        <button onClick={cargar} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500" title="Actualizar">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>
      {cargando ? (
        <Loader2 className="w-5 h-5 animate-spin text-amber-700 mx-auto" />
      ) : filas.length === 0 ? (
        <p className="text-sm text-slate-400">Aún no hay actividad registrada.</p>
      ) : (
        <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-white">
              <tr className="text-left text-xs text-slate-500 border-b border-slate-200">
                <th className="py-2 pr-3">Fecha y hora</th>
                <th className="py-2 pr-3">Usuario</th>
                <th className="py-2 pr-3">Acción</th>
                <th className="py-2 pr-3">Detalle</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((f) => (
                <tr key={f.id} className="border-b border-slate-100 align-top">
                  <td className="py-2 pr-3 text-slate-500 whitespace-nowrap">{formatearFechaHora(f.fecha_hora)}</td>
                  <td className="py-2 pr-3 font-semibold text-slate-800 whitespace-nowrap">{f.usuario_nombre}</td>
                  <td className="py-2 pr-3 text-slate-700 whitespace-nowrap">{f.accion}</td>
                  <td className="py-2 pr-3 text-slate-500">{f.detalle}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-[11px] text-slate-400 mt-2">Se muestran las últimas 200 acciones.</p>
        </div>
      )}
    </div>
  );
}
