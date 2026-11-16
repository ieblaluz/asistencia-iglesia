import React from 'react';
import { supabase } from './supabaseClient';
import { Sparkles, MessageSquareText } from 'lucide-react';

// ---------- Acceso a datos ----------
export async function cargarInfoCulto(fecha, turno) {
  try {
    const { data } = await supabase
      .from('cultos_info')
      .select('tipo, comentario, observacion')
      .eq('fecha', fecha)
      .eq('turno', turno)
      .maybeSingle();
    return data
      ? { tipo: data.tipo, comentario: data.comentario || '', observacion: data.observacion || '' }
      : { tipo: 'Normal', comentario: '', observacion: '' };
  } catch {
    return { tipo: 'Normal', comentario: '', observacion: '' };
  }
}

export async function guardarInfoCulto(fecha, turno, tipo, comentario, observacion = '') {
  const obs = (observacion || '').trim();
  // Se guarda si es especial o si tiene observación; si no, no hace falta fila
  if (tipo === 'Especial' || obs) {
    return supabase.from('cultos_info').upsert({
      fecha, turno, tipo,
      comentario: tipo === 'Especial' ? (comentario || '').trim() : null,
      observacion: obs || null,
    });
  }
  return supabase.from('cultos_info').delete().eq('fecha', fecha).eq('turno', turno);
}

export async function borrarInfoCulto(fecha, turno) {
  return supabase.from('cultos_info').delete().eq('fecha', fecha).eq('turno', turno);
}

// ---------- Selector ----------
export default function TipoCulto({ tipo, comentario, observacion = '', onChange, onObservacion, disabled = false, compacto = false }) {
  const etiqueta = compacto
    ? 'block text-[10px] font-bold text-slate-500 mb-1 uppercase'
    : 'block text-[11px] font-bold text-slate-500 uppercase mb-1';

  return (
    <div className="space-y-2">
      <div>
        <label className={etiqueta}>Tipo de culto</label>
        <div className="flex gap-2">
          {['Normal', 'Especial'].map((t) => (
            <button
              key={t}
              type="button"
              disabled={disabled}
              onClick={() => onChange(t, t === 'Normal' ? '' : comentario)}
              className={`flex-1 ${compacto ? 'py-1 text-xs rounded' : 'py-2 px-3 text-xs rounded-lg'} font-bold transition flex items-center justify-center gap-1.5 border disabled:cursor-not-allowed disabled:opacity-60 ${
                tipo === t
                  ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                  : 'bg-slate-50 text-slate-600 border-slate-300 hover:bg-slate-100'
              }`}
            >
              {t === 'Especial' && <Sparkles className="w-3.5 h-3.5" />}
              {t}
            </button>
          ))}
        </div>
      </div>
      {tipo === 'Especial' && (
        <input
          type="text"
          value={comentario}
          disabled={disabled}
          onChange={(e) => onChange('Especial', e.target.value)}
          placeholder="¿Por qué es especial? (ej. Día de la Madre)"
          maxLength={120}
          className="input-texto w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 disabled:bg-slate-100"
        />
      )}
      {onObservacion && (
        <div>
          <label className={`${etiqueta} flex items-center gap-1`}><MessageSquareText className="w-3 h-3" /> Observaciones (opcional)</label>
          <textarea
            value={observacion}
            disabled={disabled}
            onChange={(e) => onObservacion(e.target.value)}
            placeholder="Algún comentario sobre este culto…"
            maxLength={500}
            rows={2}
            className="input-texto w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white outline-none resize-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 disabled:bg-slate-100"
          />
        </div>
      )}
    </div>
  );
}
