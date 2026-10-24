import React, { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import { X, Loader2, Sparkles, Ban, Users, UserPlus, Sigma } from 'lucide-react';

const TURNOS = ['Mañana', 'Tarde'];

// Ventana con el detalle completo de un día del calendario
export default function DetalleDia({ fecha, onCerrar }) {
  const [datos, setDatos] = useState(null);

  useEffect(() => {
    let cancelado = false;
    (async () => {
      const [asis, grupos, info, sc] = await Promise.all([
        supabase.from('asistencia').select('clase, turno, cantidad, creado_por').eq('fecha', fecha),
        supabase.from('grupos_asistencia').select('nombre, orden'),
        supabase.from('cultos_info').select('turno, tipo, comentario').eq('fecha', fecha),
        supabase.from('dias_sin_culto').select('turno, motivo').eq('fecha', fecha),
      ]);

      const filas = asis.data || [];
      const orden = {};
      (grupos.data || []).forEach((g) => { orden[g.nombre] = g.orden; });

      const turnos = TURNOS.filter((t) => filas.some((f) => f.turno === t));
      const clases = [...new Set(filas.map((f) => f.clase))].sort(
        (a, b) => (orden[a] ?? 999) - (orden[b] ?? 999) || a.localeCompare(b)
      );
      const valor = (clase, turno) => filas.find((f) => f.clase === clase && f.turno === turno)?.cantidad ?? 0;

      // Quién registró (solo visible para el administrador por seguridad)
      const ids = [...new Set(filas.map((f) => f.creado_por).filter(Boolean))];
      let autores = {};
      if (ids.length) {
        const { data } = await supabase.from('perfiles').select('id, nombre').in('id', ids);
        (data || []).forEach((p) => { autores[p.id] = p.nombre; });
      }
      const registradoPor = {};
      turnos.forEach((t) => {
        const id = filas.find((f) => f.turno === t && f.creado_por)?.creado_por;
        if (id && autores[id]) registradoPor[t] = autores[id];
      });

      if (!cancelado) {
        setDatos({
          turnos,
          clases,
          valor,
          especiales: (info.data || []).filter((i) => i.tipo === 'Especial'),
          sinCulto: sc.data || [],
          registradoPor,
        });
      }
    })();
    return () => { cancelado = true; };
  }, [fecha]);

  // Cerrar con la tecla Escape
  useEffect(() => {
    const tecla = (e) => { if (e.key === 'Escape') onCerrar(); };
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, [onCerrar]);

  const titulo = new Date(fecha + 'T00:00:00').toLocaleDateString('es-ES', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  const esVisita = (c) => c.toLowerCase().includes('visita');
  const suma = (filtro, turno) =>
    datos.clases.filter(filtro).reduce((acc, c) => acc + (turno ? datos.valor(c, turno) : datos.turnos.reduce((s, t) => s + datos.valor(c, t), 0)), 0);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3" onClick={onCerrar}>
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[95vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="fondo-menu rounded-t-2xl flex items-start justify-between gap-3 px-5 pt-4 pb-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-amber-300">Detalle del registro</p>
            <h3 className="text-xl font-bold text-white first-letter:uppercase leading-tight">{titulo}</h3>
          </div>
          <button type="button" onClick={onCerrar} className="p-1.5 rounded-lg text-white/60 hover:bg-white/10 hover:text-white" aria-label="Cerrar">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 py-4 overflow-y-auto">
          {!datos ? (
            <div className="py-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-amber-600" /></div>
          ) : (
            <div className="space-y-3">
              {datos.turnos.length === 0 ? (
                <p className="text-sm text-slate-500">No hay asistencia registrada este día.</p>
              ) : (
                <>
                  {/* Resumen */}
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { icono: Users, texto: 'Miembros', n: suma((c) => !esVisita(c)) },
                      { icono: UserPlus, texto: 'Visitas', n: suma(esVisita) },
                      { icono: Sigma, texto: 'Total', n: suma(() => true), destacado: true },
                    ].map(({ icono: Icono, texto, n, destacado }) => (
                      <div key={texto} className={`rounded-xl px-3 py-2 border ${destacado ? 'bg-amber-600 border-amber-600 text-white' : 'bg-slate-50 border-slate-200 text-slate-700'}`}>
                        <p className={`text-[11px] font-semibold flex items-center gap-1 ${destacado ? 'text-white/80' : 'text-slate-500'}`}>
                          <Icono className="w-3 h-3" /> {texto}
                        </p>
                        <p className="text-2xl font-black leading-tight">{n}</p>
                      </div>
                    ))}
                  </div>

                  {/* Tabla por grupos */}
                  <table className="w-full text-sm border-separate border-spacing-0">
                    <thead>
                      <tr className="text-[11px] uppercase tracking-wide bg-amber-100 text-amber-800">
                        <th className="text-left font-bold py-2 px-2 rounded-l-lg">Grupo</th>
                        {datos.turnos.map((t, i) => <th key={t} className={`text-right font-bold py-2 px-2 w-20 ${datos.turnos.length === 1 && i === 0 ? 'rounded-r-lg' : ''}`}>{t}</th>)}
                        {datos.turnos.length > 1 && <th className="text-right font-bold py-2 px-2 w-20 rounded-r-lg">Total</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {datos.clases.map((c) => {
                        const total = datos.turnos.reduce((s, t) => s + datos.valor(c, t), 0);
                        return (
                          <tr key={c} className="[&>td]:border-b [&>td]:border-slate-100">
                            <td className={`py-1.5 px-2 ${esVisita(c) ? 'text-slate-500 pl-5' : 'text-slate-800 font-semibold'}`}>{c}</td>
                            {datos.turnos.map((t) => {
                              const v = datos.valor(c, t);
                              return <td key={t} className={`text-right py-1.5 px-2 tabular-nums ${v ? 'text-slate-800 font-semibold' : 'text-slate-300'}`}>{v}</td>;
                            })}
                            {datos.turnos.length > 1 && <td className="text-right py-1.5 px-2 tabular-nums font-bold text-slate-800 bg-slate-50">{total}</td>}
                          </tr>
                        );
                      })}
                      <tr className="bg-amber-600 text-white">
                        <td className="py-2 px-2 font-black uppercase text-xs tracking-wide rounded-l-lg">Total</td>
                        {datos.turnos.map((t, i) => <td key={t} className={`text-right py-2 px-2 font-black tabular-nums text-base ${datos.turnos.length === 1 && i === 0 ? 'rounded-r-lg' : ''}`}>{suma(() => true, t)}</td>)}
                        {datos.turnos.length > 1 && <td className="text-right py-2 px-2 font-black tabular-nums text-base rounded-r-lg bg-amber-700">{suma(() => true)}</td>}
                      </tr>
                    </tbody>
                  </table>
                </>
              )}

              {/* Cultos especiales */}
              {datos.especiales.map((e) => (
                <div key={e.turno} className="flex gap-2 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-sm">
                  <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-slate-700"><b>Culto especial ({e.turno.toLowerCase()}):</b> {e.comentario}</p>
                </div>
              ))}

              {/* Turnos sin culto */}
              {datos.sinCulto.map((s) => (
                <div key={s.turno} className="flex gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm">
                  <Ban className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <p className="text-slate-600"><b>Sin culto ({s.turno.toLowerCase()}):</b> {s.motivo || 'Sin motivo indicado'}</p>
                </div>
              ))}

              {Object.keys(datos.registradoPor).length > 0 && (
                <p className="text-xs text-slate-400">
                  Registrado por: {datos.turnos.filter((t) => datos.registradoPor[t]).map((t) => `${datos.registradoPor[t]} (${t.toLowerCase()})`).join(' · ')}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
