import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from './supabaseClient';
import { registrarBitacora } from './auth';
import { CalendarDays, ChevronLeft, ChevronRight, Loader2, Ban, Undo2 } from 'lucide-react';

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const DIAS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

// Fecha local en formato AAAA-MM-DD (sin desfases por zona horaria)
const aISO = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// Turnos que se esperan cada día de la semana (0 = domingo, 3 = miércoles)
const turnosEsperados = (diaSemana) => {
  if (diaSemana === 0) return ['Mañana', 'Tarde'];
  if (diaSemana === 3) return ['Tarde'];
  return [];
};

const MOTIVOS = ['Alerta por lluvias', 'Fuerza mayor', 'Verano', 'Festivo / vacaciones', 'Otro'];

const ESTILOS = {
  completo: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  parcial:  'bg-orange-100 text-orange-800 border-orange-300',
  falta:    'bg-rose-50 text-rose-700 border-rose-300 border-dashed',
  futuro:   'bg-white text-slate-500 border-slate-200 border-dashed',
  extra:    'bg-sky-50 text-sky-700 border-sky-200',
  sinculto: 'bg-slate-100 text-slate-400 border-slate-200 line-through',
  normal:   'bg-transparent text-slate-400 border-transparent',
};

const describir = (c) => {
  if (c.estado === 'completo') return `Registrado: ${[...c.hechos].join(' y ')}${c.motivo ? ` · Sin culto: ${[...c.anulados].join(' y ')} (${c.motivo})` : ''}`;
  if (c.estado === 'parcial') return `Falta: ${c.pendientes.join(' y ')}`;
  if (c.estado === 'falta') return `Sin registrar: ${c.esperados.join(' y ')}`;
  if (c.estado === 'futuro') return `Culto: ${c.esperados.join(' y ')}`;
  if (c.estado === 'extra') return `Culto especial: ${[...c.hechos].join(' y ')}`;
  if (c.estado === 'sinculto') return `No hubo culto${c.motivo ? ': ' + c.motivo : ''}`;
  return '';
};

function calcularMes(anio, mes, registros, sinCulto, motivos, hoyISO) {
  const totalDias = new Date(anio, mes + 1, 0).getDate();
  const huecoInicial = (new Date(anio, mes, 1).getDay() + 6) % 7; // semana empieza en lunes
  const celdas = Array(huecoInicial).fill(null);
  let faltan = 0;
  let completos = 0;

  for (let d = 1; d <= totalDias; d++) {
    const fecha = new Date(anio, mes, d);
    const iso = aISO(fecha);
    const esperados = turnosEsperados(fecha.getDay());
    const hechos = registros[iso] || new Set();
    const anulados = sinCulto[iso] || new Set();
    const pendientes = esperados.filter((t) => !hechos.has(t) && !anulados.has(t));
    const pasado = iso <= hoyISO;

    let estado = 'normal';
    if (esperados.length > 0) {
      if (pendientes.length === 0) estado = hechos.size > 0 ? 'completo' : 'sinculto';
      else if (!pasado) estado = 'futuro';
      else if (hechos.size > 0) estado = 'parcial';
      else estado = 'falta';
    } else if (hechos.size > 0) {
      estado = 'extra';
    }
    if (esperados.length > 0 && pasado) {
      if (pendientes.length > 0) faltan++;
      else if (hechos.size > 0) completos++;
    }
    const motivo = [...anulados].map((t) => motivos[`${iso}|${t}`]).filter(Boolean).join(', ');
    celdas.push({ d, iso, estado, hechos, anulados, pendientes, esperados, pasado, motivo });
  }
  return { celdas, faltan, completos };
}

function Mes({ anio, mes, registros, sinCulto, motivos, hoyISO, fechaSeleccionada, onSeleccionar, cargando, tituloVisible }) {
  const { celdas, faltan, completos } = useMemo(
    () => calcularMes(anio, mes, registros, sinCulto, motivos, hoyISO),
    [anio, mes, registros, sinCulto, motivos, hoyISO]
  );

  return (
    <div className="flex-1 min-w-0">
      <div className={`items-baseline justify-between mb-2 ${tituloVisible ? 'flex' : 'flex md:hidden'}`}>
        <span className="font-bold text-sm text-slate-700">{MESES[mes]} {anio}</span>
        <span className="text-[11px] font-semibold">
          <span className="text-emerald-700">{completos} registrados</span>
          {faltan > 0 && <span className="text-rose-600"> · {faltan} pendiente{faltan > 1 ? 's' : ''}</span>}
        </span>
      </div>
      <div className="grid grid-cols-7 gap-1 mb-1">
        {DIAS.map((d, i) => (
          <div key={d} className={`text-center text-[11px] font-bold ${i === 2 || i === 6 ? 'text-amber-700' : 'text-slate-400'}`}>{d}</div>
        ))}
      </div>
      <div className="relative grid grid-cols-7 gap-1">
        {celdas.map((c, i) =>
          c === null ? (
            <div key={`v${i}`} />
          ) : (
            <button
              key={c.iso}
              type="button"
              title={describir(c)}
              onClick={() => onSeleccionar(c.iso, c.pendientes[0])}
              className={`relative h-10 md:h-11 rounded-lg border text-sm font-bold transition hover:ring-2 hover:ring-amber-300 ${ESTILOS[c.estado]} ${
                c.iso === fechaSeleccionada ? 'ring-2 ring-amber-600' : ''
              }`}
            >
              {c.d}
              {c.iso === hoyISO && <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-amber-600" />}
              {c.esperados.length === 2 && c.estado !== 'futuro' && (
                <span className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                  {c.esperados.map((t) => (
                    <span key={t} className={`w-1.5 h-1.5 rounded-full ${c.hechos.has(t) ? 'bg-emerald-600' : c.anulados.has(t) ? 'bg-slate-300' : 'bg-rose-400'}`} />
                  ))}
                </span>
              )}
            </button>
          )
        )}
        {cargando && (
          <div className="absolute inset-0 bg-white/60 flex items-center justify-center rounded-lg">
            <Loader2 className="w-5 h-5 animate-spin text-amber-600" />
          </div>
        )}
      </div>
    </div>
  );
}

export default function CalendarioRegistros({ fechaSeleccionada, onSeleccionar, refrescar }) {
  // mesVisible = el mes de la derecha (el de la fecha elegida).
  // En el ordenador se muestra también el mes anterior a su izquierda.
  const [mesVisible, setMesVisible] = useState(() => {
    const base = fechaSeleccionada ? new Date(fechaSeleccionada + 'T00:00:00') : new Date();
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });
  const [registros, setRegistros] = useState({});
  const [sinCulto, setSinCulto] = useState({});
  const [motivos, setMotivos] = useState({});
  const [motivo, setMotivo] = useState(MOTIVOS[0]);
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [version, setVersion] = useState(0);

  const mesAnterior = new Date(mesVisible.getFullYear(), mesVisible.getMonth() - 1, 1);

  // Si se elige arriba una fecha que no está en pantalla, el calendario la sigue
  useEffect(() => {
    if (!fechaSeleccionada) return;
    const f = new Date(fechaSeleccionada + 'T00:00:00');
    setMesVisible((m) => {
      const mismoMes = m.getFullYear() === f.getFullYear() && m.getMonth() === f.getMonth();
      const esElAnterior = m.getFullYear() * 12 + m.getMonth() - 1 === f.getFullYear() * 12 + f.getMonth();
      if (mismoMes) return m;
      if (esElAnterior && window.innerWidth >= 768) return m; // ya se ve en el mes de la izquierda
      return new Date(f.getFullYear(), f.getMonth(), 1);
    });
  }, [fechaSeleccionada]);

  const cargar = useCallback(async () => {
    setCargando(true);
    const desde = aISO(new Date(mesVisible.getFullYear(), mesVisible.getMonth() - 1, 1));
    const hasta = aISO(new Date(mesVisible.getFullYear(), mesVisible.getMonth() + 1, 0));
    const agrupar = (filas) => {
      const mapa = {};
      (filas || []).forEach(({ fecha, turno }) => {
        if (!mapa[fecha]) mapa[fecha] = new Set();
        mapa[fecha].add(turno);
      });
      return mapa;
    };
    const [asis, sc] = await Promise.all([
      supabase.from('asistencia').select('fecha, turno').gte('fecha', desde).lte('fecha', hasta),
      supabase.from('dias_sin_culto').select('fecha, turno, motivo').gte('fecha', desde).lte('fecha', hasta),
    ]);
    if (!asis.error) setRegistros(agrupar(asis.data));
    if (!sc.error) {
      setSinCulto(agrupar(sc.data));
      const m = {};
      (sc.data || []).forEach((f) => { m[`${f.fecha}|${f.turno}`] = f.motivo; });
      setMotivos(m);
    }
    setCargando(false);
  }, [mesVisible]);

  useEffect(() => { cargar(); }, [cargar, refrescar, version]);

  // ----- Día seleccionado: marcar o deshacer "no hubo culto" -----
  const infoSeleccion = useMemo(() => {
    if (!fechaSeleccionada) return null;
    const f = new Date(fechaSeleccionada + 'T00:00:00');
    const esperados = turnosEsperados(f.getDay());
    if (esperados.length === 0) return null;
    const hechos = registros[fechaSeleccionada] || new Set();
    const anulados = sinCulto[fechaSeleccionada] || new Set();
    return {
      etiqueta: f.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }),
      marcables: esperados.filter((t) => !hechos.has(t) && !anulados.has(t)),
      anulados: esperados.filter((t) => anulados.has(t)),
    };
  }, [fechaSeleccionada, registros, sinCulto]);

  // Marca uno o varios turnos de golpe
  const marcarVarios = async (turnos) => {
    setGuardando(true);
    const filas = turnos.map((turno) => ({ fecha: fechaSeleccionada, turno, motivo }));
    const { error } = await supabase.from('dias_sin_culto').upsert(filas);
    setGuardando(false);
    if (error) { alert('No se pudo guardar.'); return; }
    registrarBitacora('Marcó sin culto', `${fechaSeleccionada} (${turnos.join(' y ')}) – ${motivo}`);
    setVersion((v) => v + 1);
  };

  const deshacerSinCulto = async (turno) => {
    setGuardando(true);
    const { error } = await supabase.from('dias_sin_culto').delete().eq('fecha', fechaSeleccionada).eq('turno', turno);
    setGuardando(false);
    if (error) { alert('No se pudo deshacer.'); return; }
    registrarBitacora('Quitó marca sin culto', `${fechaSeleccionada} (${turno})`);
    setVersion((v) => v + 1);
  };

  const hoyISO = aISO(new Date());
  const cambiarMes = (delta) => setMesVisible(new Date(mesVisible.getFullYear(), mesVisible.getMonth() + delta, 1));
  const comun = { registros, sinCulto, motivos, hoyISO, fechaSeleccionada, onSeleccionar, cargando };

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200">
      <div className="flex items-center justify-between gap-2 mb-3">
        <h2 className="flex items-center gap-2 font-bold text-sm text-amber-800 uppercase tracking-wide">
          <CalendarDays className="w-4 h-4" /> Calendario de registros
        </h2>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => cambiarMes(-1)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600" aria-label="Mes anterior">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="hidden md:inline w-48 text-center font-bold text-sm text-slate-700">
            {MESES[mesAnterior.getMonth()].slice(0, 3)} {mesAnterior.getFullYear() !== mesVisible.getFullYear() ? mesAnterior.getFullYear() : ''} – {MESES[mesVisible.getMonth()].slice(0, 3)} {mesVisible.getFullYear()}
          </span>
          <button type="button" onClick={() => cambiarMes(1)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600" aria-label="Mes siguiente">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Mes anterior: solo en ordenador */}
        <div className="hidden md:flex flex-1 min-w-0">
          <Mes anio={mesAnterior.getFullYear()} mes={mesAnterior.getMonth()} tituloVisible {...comun} />
        </div>
        <div className="hidden md:block w-px bg-slate-100" />
        <Mes anio={mesVisible.getFullYear()} mes={mesVisible.getMonth()} tituloVisible {...comun} />
      </div>

      {infoSeleccion && (infoSeleccion.marcables.length > 0 || infoSeleccion.anulados.length > 0) && (
        <div className="mt-4 p-3 rounded-xl bg-slate-50 border border-slate-200 flex flex-col lg:flex-row lg:items-center gap-2 text-xs">
          <span className="font-semibold text-slate-700 first-letter:uppercase">{infoSeleccion.etiqueta}</span>
          <div className="flex flex-wrap items-center gap-2 lg:ml-auto">
            {infoSeleccion.marcables.length > 0 && (
              <>
                <span className="text-slate-500 font-semibold">No hubo culto por:</span>
                <select value={motivo} onChange={(e) => setMotivo(e.target.value)}
                  className="px-2 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 font-semibold outline-none focus:border-amber-500">
                  {MOTIVOS.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
                {infoSeleccion.marcables.length > 1 && (
                  <button type="button" disabled={guardando} onClick={() => marcarVarios(infoSeleccion.marcables)}
                    className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 font-bold text-slate-600 flex items-center gap-1.5 disabled:opacity-50">
                    <Ban className="w-3.5 h-3.5" /> Todo el día
                  </button>
                )}
                {infoSeleccion.marcables.map((t) => (
                  <button key={t} type="button" disabled={guardando} onClick={() => marcarVarios([t])}
                    className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 font-bold text-slate-600 flex items-center gap-1.5 disabled:opacity-50">
                    <Ban className="w-3.5 h-3.5" /> Solo {t.toLowerCase()}
                  </button>
                ))}
              </>
            )}
            {infoSeleccion.anulados.map((t) => (
              <button key={t} type="button" disabled={guardando} onClick={() => deshacerSinCulto(t)}
                className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 font-bold text-slate-600 flex items-center gap-1.5 disabled:opacity-50">
                <Undo2 className="w-3.5 h-3.5" /> Sí hubo culto ({t.toLowerCase()}{motivos[`${fechaSeleccionada}|${t}`] ? ` · marcado: ${motivos[`${fechaSeleccionada}|${t}`]}` : ''})
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-600">
        <span className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 rounded bg-emerald-100 border border-emerald-200" /> Completo</span>
        <span className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 rounded bg-orange-100 border border-orange-300" /> Falta un turno</span>
        <span className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 rounded bg-rose-50 border border-dashed border-rose-300" /> Sin registrar</span>
        <span className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 rounded bg-sky-50 border border-sky-200" /> Culto especial</span>
        <span className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 rounded bg-slate-100 border border-slate-200" /> Sin culto</span>
        <span className="text-[11px] text-slate-400 md:ml-auto">Pulsa un día para seleccionarlo y registrarlo.</span>
      </div>
    </div>
  );
}
