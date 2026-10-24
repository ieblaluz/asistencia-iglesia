import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import { registrarBitacora } from './auth';
import { Ban, Plus, Trash2, Loader2 } from 'lucide-react';

// Tarjeta de Ajustes para gestionar los motivos recurrentes de "No hubo culto"
export default function MotivosSinCulto({ puedeEditar }) {
  const [motivos, setMotivos] = useState([]);
  const [nuevo, setNuevo] = useState('');
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    setCargando(true);
    const { data } = await supabase.from('motivos_sin_culto').select('*').order('orden').order('nombre');
    setMotivos(data || []);
    setCargando(false);
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const agregar = async () => {
    const nombre = nuevo.trim().replace(/\s+/g, ' ');
    if (!nombre) return;
    if (nombre.toLowerCase().startsWith('otro')) { alert('"Otro" ya existe siempre al final de la lista.'); return; }
    if (motivos.some((m) => m.nombre.toLowerCase() === nombre.toLowerCase())) { alert('Ese motivo ya existe.'); return; }
    const orden = motivos.length ? Math.max(...motivos.map((m) => m.orden)) + 1 : 1;
    const { error } = await supabase.from('motivos_sin_culto').insert({ nombre, orden });
    if (error) { alert('No se pudo añadir el motivo.'); return; }
    registrarBitacora('Creó motivo sin culto', nombre);
    setNuevo('');
    cargar();
  };

  const eliminar = async (m) => {
    if (!window.confirm(`¿Quitar "${m.nombre}" de la lista?\n\nLos días ya marcados con este motivo no se modifican.`)) return;
    const { error } = await supabase.from('motivos_sin_culto').delete().eq('id', m.id);
    if (error) { alert('No se pudo eliminar el motivo.'); return; }
    registrarBitacora('Eliminó motivo sin culto', m.nombre);
    cargar();
  };

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200">
      <h2 className="flex items-center gap-2 font-bold text-sm text-amber-800 uppercase tracking-wide mb-1">
        <Ban className="w-4 h-4" /> Motivos de “No hubo culto”
      </h2>
      <p className="text-xs text-slate-500 mb-3">Aparecen en el calendario de Registro al marcar un día sin culto. “Otro” siempre está disponible para escribir un motivo puntual.</p>

      {cargando ? (
        <Loader2 className="w-5 h-5 animate-spin text-amber-600" />
      ) : (
        <div className="flex flex-wrap gap-2">
          {motivos.map((m) => (
            <span key={m.id} className="pl-3 pr-1.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700 flex items-center gap-1">
              {m.nombre}
              {puedeEditar && (
                <button type="button" onClick={() => eliminar(m)} title="Quitar" className="p-0.5 rounded-full text-slate-400 hover:text-rose-600 hover:bg-rose-50">
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </span>
          ))}
          <span className="px-3 py-1 rounded-full border border-dashed border-slate-300 text-xs font-semibold text-slate-400">Otro (escribir motivo)</span>
        </div>
      )}

      {puedeEditar && (
        <div className="flex gap-2 mt-3">
          <input
            type="text"
            value={nuevo}
            onChange={(e) => setNuevo(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') agregar(); }}
            placeholder="Nuevo motivo (ej. Corte de luz)"
            maxLength={60}
            className="input-texto flex-1 max-w-sm px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
          />
          <button type="button" onClick={agregar} disabled={!nuevo.trim()}
            className="px-3 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Añadir
          </button>
        </div>
      )}
    </div>
  );
}
