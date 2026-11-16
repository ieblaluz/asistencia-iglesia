import React, { useMemo, useState } from 'react';
import { ChevronDown, Users, CalendarCheck, TrendingUp, Trophy, Sparkles, MessageSquareText, Ban, ChevronsUpDown } from 'lucide-react';

// ======================= Utilidades =======================
export const MESES_NOMBRES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

export const fechaLatina = (iso) => {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
};

const diaSemana = (iso) =>
  new Date(iso + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'short' }).replace('.', '');

const esVisita = (c) => c.toLowerCase().includes('visita');

// Agrupa los registros por una clave (fecha o mes), con totales por clase y turno
export function agrupar(datos, claveDe) {
  const mapa = {};
  datos.forEach((item) => {
    const k = claveDe(item);
    if (!mapa[k]) mapa[k] = { clave: k, clases: {}, manana: 0, tarde: 0, total: 0, cultos: new Set() };
    const g = mapa[k];
    if (!g.clases[item.clase]) g.clases[item.clase] = { manana: 0, tarde: 0, total: 0 };
    const c = g.clases[item.clase];
    if (item.turno === 'Mañana') { c.manana += item.cantidad; g.manana += item.cantidad; }
    else { c.tarde += item.cantidad; g.tarde += item.cantidad; }
    c.total += item.cantidad;
    g.total += item.cantidad;
    g.cultos.add(`${item.fecha}|${item.turno}`);
  });
  return Object.values(mapa).sort((a, b) => String(a.clave).localeCompare(String(b.clave)));
}

// Totales por culto (fecha + turno)
function totalesPorCulto(datos) {
  const m = {};
  datos.forEach((d) => {
    const k = `${d.fecha}|${d.turno}`;
    m[k] = (m[k] || 0) + d.cantidad;
  });
  return Object.entries(m).map(([k, total]) => {
    const [fecha, turno] = k.split('|');
    return { fecha, turno, total };
  });
}

// ======================= Piezas comunes =======================
function Tarjeta({ icono: Icono, titulo, valor, detalle, destacado }) {
  return (
    <div className={`rounded-xl p-3 border ${destacado ? 'bg-amber-600 border-amber-600 text-white' : 'bg-white border-slate-200'}`}>
      <p className={`text-[11px] font-bold uppercase tracking-wide flex items-center gap-1.5 ${destacado ? 'text-white/80' : 'text-slate-500'}`}>
        <Icono className="w-3.5 h-3.5" /> {titulo}
      </p>
      <p className={`text-2xl font-black leading-tight mt-1 ${destacado ? '' : 'text-slate-800'}`}>{valor}</p>
      {detalle && <p className={`text-[11px] mt-0.5 ${destacado ? 'text-white/80' : 'text-slate-500'}`}>{detalle}</p>}
    </div>
  );
}

function Resumen({ datos }) {
  const cultos = totalesPorCulto(datos);
  const total = cultos.reduce((s, c) => s + c.total, 0);
  const max = cultos.reduce((m, c) => (c.total > (m?.total ?? -1) ? c : m), null);
  const visitas = datos.filter((d) => esVisita(d.clase)).reduce((s, d) => s + d.cantidad, 0);
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-4">
      <Tarjeta icono={Users} titulo="Asistencia total" valor={total} detalle={`${visitas} visitas`} destacado />
      <Tarjeta icono={CalendarCheck} titulo="Cultos" valor={cultos.length} />
      <Tarjeta icono={TrendingUp} titulo="Media por culto" valor={cultos.length ? (total / cultos.length).toFixed(1) : '0'} />
      <Tarjeta icono={Trophy} titulo="Mayor asistencia" valor={max ? max.total : '—'}
        detalle={max ? `${fechaLatina(max.fecha)} · ${max.turno.toLowerCase()}` : ''} />
    </div>
  );
}

// Gráfico de barras apiladas (mañana + tarde), sin librerías
function GraficoBarras({ grupos, etiqueta, titulo }) {
  const max = Math.max(1, ...grupos.map((g) => g.total));
  if (grupos.length === 0) return null;
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-3 mb-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{titulo}</p>
        <div className="flex gap-3 text-[11px] text-slate-500">
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-amber-600" /> Mañana</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-amber-300" /> Tarde</span>
        </div>
      </div>
      <div className="flex items-end gap-1.5 h-36">
        {grupos.map((g) => (
          <div key={g.clave} className="flex-1 min-w-0 h-full flex flex-col items-center justify-end group relative">
            <span className="text-[10px] font-bold text-slate-600 mb-0.5">{g.total}</span>
            <div className="w-full max-w-[42px] flex flex-col-reverse rounded-t-md overflow-hidden" style={{ height: `${(g.total / max) * 100}%` }}>
              <div className="bg-amber-600" style={{ height: `${g.total ? (g.manana / g.total) * 100 : 0}%` }} />
              <div className="bg-amber-300" style={{ height: `${g.total ? (g.tarde / g.total) * 100 : 0}%` }} />
            </div>
            <span className="text-[10px] text-slate-500 mt-1 truncate w-full text-center">{etiqueta(g)}</span>
            <div className="hidden group-hover:block absolute bottom-full mb-1 z-10 whitespace-nowrap bg-slate-800 text-white text-[11px] rounded-md px-2 py-1 shadow">
              Mañana {g.manana} · Tarde {g.tarde}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Bloque plegable con tabla de clases
function BloquePlegable({ titulo, subtitulo, grupo, abierto, onToggle, extra }) {
  const clases = Object.entries(grupo.clases);
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <button type="button" onClick={onToggle}
        className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 text-left">
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${abierto ? '' : '-rotate-90'}`} />
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm text-slate-800 flex items-center gap-2">{titulo} {extra}</p>
          {subtitulo && <p className="text-[11px] text-slate-500">{subtitulo}</p>}
        </div>
        <div className="hidden sm:flex gap-4 text-xs text-slate-500 tabular-nums">
          <span>Mañana <b className="text-slate-700">{grupo.manana}</b></span>
          <span>Tarde <b className="text-slate-700">{grupo.tarde}</b></span>
        </div>
        <span className="px-2.5 py-1 rounded-lg bg-amber-100 text-amber-800 font-black text-sm tabular-nums min-w-[3rem] text-center">{grupo.total}</span>
      </button>
      {abierto && (
        <table className="w-full text-sm border-t border-slate-100">
          <thead>
            <tr className="text-[11px] uppercase tracking-wide text-slate-500 bg-slate-50">
              <th className="text-left font-bold py-1.5 px-3">Grupo</th>
              <th className="text-right font-bold py-1.5 px-3 w-20">Mañana</th>
              <th className="text-right font-bold py-1.5 px-3 w-20">Tarde</th>
              <th className="text-right font-bold py-1.5 px-3 w-20">Total</th>
            </tr>
          </thead>
          <tbody>
            {clases.map(([c, v]) => (
              <tr key={c} className="border-t border-slate-100">
                <td className={`py-1.5 px-3 ${esVisita(c) ? 'text-slate-500 pl-6' : 'text-slate-800 font-semibold'}`}>{c}</td>
                <td className={`text-right py-1.5 px-3 tabular-nums ${v.manana ? '' : 'text-slate-300'}`}>{v.manana}</td>
                <td className={`text-right py-1.5 px-3 tabular-nums ${v.tarde ? '' : 'text-slate-300'}`}>{v.tarde}</td>
                <td className="text-right py-1.5 px-3 tabular-nums font-bold">{v.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function TotalGeneral({ grupos, texto }) {
  const t = grupos.reduce((a, g) => ({ m: a.m + g.manana, t: a.t + g.tarde, s: a.s + g.total }), { m: 0, t: 0, s: 0 });
  return (
    <div className="mt-2 rounded-xl bg-amber-600 text-white px-3 py-2.5 flex items-center gap-3">
      <span className="flex-1 font-black uppercase text-xs tracking-wide">{texto}</span>
      <span className="hidden sm:inline text-xs text-white/80 tabular-nums">Mañana <b className="text-white">{t.m}</b></span>
      <span className="hidden sm:inline text-xs text-white/80 tabular-nums">Tarde <b className="text-white">{t.t}</b></span>
      <span className="font-black text-lg tabular-nums">{t.s}</span>
    </div>
  );
}

function BarraPlegar({ todosAbiertos, onCambiar }) {
  return (
    <div className="flex justify-end mb-2">
      <button type="button" onClick={onCambiar}
        className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-slate-100">
        <ChevronsUpDown className="w-3.5 h-3.5" /> {todosAbiertos ? 'Plegar todo' : 'Desplegar todo'}
      </button>
    </div>
  );
}

const SinDatos = () => <p className="py-10 text-center text-sm text-slate-400">No hay registros en este periodo.</p>;

// ======================= Reporte mensual =======================
export function VistaReporteMensual({ datos }) {
  const grupos = useMemo(() => agrupar(datos, (d) => d.fecha), [datos]);
  const [abiertos, setAbiertos] = useState({});
  if (!datos.length) return <SinDatos />;
  const todos = grupos.every((g) => abiertos[g.clave]);
  const alternar = () => setAbiertos(todos ? {} : Object.fromEntries(grupos.map((g) => [g.clave, true])));

  return (
    <div>
      <Resumen datos={datos} />
      <GraficoBarras grupos={grupos} titulo="Asistencia por culto"
        etiqueta={(g) => `${diaSemana(g.clave)} ${g.clave.slice(8)}`} />
      <BarraPlegar todosAbiertos={todos} onCambiar={alternar} />
      <div className="space-y-2">
        {grupos.map((g) => (
          <BloquePlegable key={g.clave} grupo={g}
            titulo={fechaLatina(g.clave)}
            subtitulo={new Date(g.clave + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'long' })}
            abierto={!!abiertos[g.clave]}
            onToggle={() => setAbiertos({ ...abiertos, [g.clave]: !abiertos[g.clave] })} />
        ))}
      </div>
      <TotalGeneral grupos={grupos} texto="Total del mes" />
    </div>
  );
}

// ======================= Reporte anual =======================
export function VistaReporteAnual({ datos }) {
  const grupos = useMemo(() => agrupar(datos, (d) => d.fecha.slice(5, 7)), [datos]);
  const [abiertos, setAbiertos] = useState({});
  if (!datos.length) return <SinDatos />;
  const todos = grupos.every((g) => abiertos[g.clave]);
  const alternar = () => setAbiertos(todos ? {} : Object.fromEntries(grupos.map((g) => [g.clave, true])));

  return (
    <div>
      <Resumen datos={datos} />
      <GraficoBarras grupos={grupos} titulo="Asistencia por mes"
        etiqueta={(g) => MESES_NOMBRES[parseInt(g.clave, 10) - 1].slice(0, 3)} />
      <BarraPlegar todosAbiertos={todos} onCambiar={alternar} />
      <div className="space-y-2">
        {grupos.map((g) => (
          <BloquePlegable key={g.clave} grupo={g}
            titulo={MESES_NOMBRES[parseInt(g.clave, 10) - 1]}
            subtitulo={`${g.cultos.size} cultos · media ${(g.total / Math.max(1, g.cultos.size)).toFixed(1)} por culto`}
            abierto={!!abiertos[g.clave]}
            onToggle={() => setAbiertos({ ...abiertos, [g.clave]: !abiertos[g.clave] })} />
        ))}
      </div>
      <TotalGeneral grupos={grupos} texto="Total del año" />
    </div>
  );
}

// ======================= Promedios (mismo cálculo que antes) =======================
export function calcularPromedios(datos) {
  const esMie = (f) => new Date(f + 'T00:00:00').getDay() === 3;
  const bloques = [
    { id: 'dm', titulo: 'Domingo mañana', filtro: (d) => !esMie(d.fecha) && d.turno === 'Mañana', fechas: (d) => d.turno === 'Mañana' },
    { id: 'dt', titulo: 'Domingo tarde', filtro: (d) => !esMie(d.fecha) && d.turno === 'Tarde', fechas: (d) => d.turno === 'Tarde' && !esMie(d.fecha) },
    { id: 'mi', titulo: 'Miércoles tarde', filtro: (d) => esMie(d.fecha), fechas: (d) => esMie(d.fecha) },
  ];
  const res = bloques.map((b) => {
    const n = new Set(datos.filter(b.fechas).map((d) => d.fecha)).size;
    const sumas = {};
    datos.filter(b.filtro).forEach((d) => { sumas[d.clase] = (sumas[d.clase] || 0) + d.cantidad; });
    const filas = Object.entries(sumas).map(([clase, s]) => ({ clase, promedio: Number((s / (n || 1)).toFixed(1)) }));
    return { ...b, n, filas, subtotal: filas.reduce((a, f) => a + f.promedio, 0) };
  });
  return { bloques: res, total: Number(res.reduce((a, b) => a + b.subtotal, 0).toFixed(1)) };
}

export function VistaPromedios({ datos }) {
  const { bloques, total } = useMemo(() => calcularPromedios(datos), [datos]);
  if (!datos.length) return <SinDatos />;
  return (
    <div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-4">
        {bloques.map((b) => (
          <Tarjeta key={b.id} icono={TrendingUp} titulo={b.titulo} valor={b.subtotal.toFixed(1)} detalle={`${b.n} cultos`} />
        ))}
        <Tarjeta icono={Users} titulo="Promedio acumulado" valor={total.toFixed(1)} destacado />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {bloques.map((b) => {
          const max = Math.max(1, ...b.filas.map((f) => f.promedio));
          return (
            <div key={b.id} className="bg-white rounded-xl border border-slate-200 p-3">
              <div className="flex items-baseline justify-between mb-2">
                <p className="font-bold text-sm text-slate-800">{b.titulo}</p>
                <p className="text-[11px] text-slate-500">{b.n} cultos</p>
              </div>
              {b.filas.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">Sin datos</p>
              ) : (
                <div className="space-y-1.5">
                  {b.filas.map((f) => (
                    <div key={f.clase} title={`${f.clase}: ${f.promedio}`}>
                      <div className="flex justify-between text-xs">
                        <span className={esVisita(f.clase) ? 'text-slate-500' : 'text-slate-700 font-semibold'}>{f.clase}</span>
                        <span className="font-bold tabular-nums">{f.promedio.toFixed(1)}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                        <div className={`h-full rounded-full ${esVisita(f.clase) ? 'bg-amber-300' : 'bg-amber-600'}`} style={{ width: `${(f.promedio / max) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                  <div className="flex justify-between text-sm font-black text-amber-800 pt-2 mt-1 border-t border-slate-100">
                    <span>Subtotal</span><span className="tabular-nums">{b.subtotal.toFixed(1)}</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ======================= Bitácora de cultos =======================
// Une especiales, observaciones y días sin culto en una lista cronológica
export function construirBitacora({ asistencia = [], info = [], sinCulto = [] }, filtro = 'todo') {
  const totales = {};
  asistencia.forEach((d) => { const k = `${d.fecha}|${d.turno}`; totales[k] = (totales[k] || 0) + d.cantidad; });
  const filas = {};
  const fila = (fecha, turno) => {
    const k = `${fecha}|${turno}`;
    if (!filas[k]) filas[k] = { fecha, turno, total: totales[k] ?? null };
    return filas[k];
  };
  info.forEach((i) => {
    if (i.tipo === 'Especial') fila(i.fecha, i.turno).especial = i.comentario || 'Culto especial';
    if (i.observacion) fila(i.fecha, i.turno).observacion = i.observacion;
  });
  sinCulto.forEach((s) => { fila(s.fecha, s.turno).sinCulto = s.motivo || 'Sin motivo indicado'; });

  const lista = Object.values(filas).sort((a, b) => (a.fecha + a.turno).localeCompare(b.fecha + b.turno));
  const resumen = {
    especiales: lista.filter((f) => f.especial).length,
    observaciones: lista.filter((f) => f.observacion).length,
    sinCulto: lista.filter((f) => f.sinCulto).length,
  };
  const filtrada = lista.filter((f) =>
    filtro === 'todo' || (filtro === 'especiales' && f.especial) || (filtro === 'observaciones' && f.observacion) || (filtro === 'sinculto' && f.sinCulto)
  );
  // media de cultos normales del periodo, para comparar con los especiales
  const normales = Object.entries(totales).filter(([k]) => !info.some((i) => i.tipo === 'Especial' && `${i.fecha}|${i.turno}` === k)).map(([, t]) => t);
  const mediaNormal = normales.length ? normales.reduce((a, b) => a + b, 0) / normales.length : 0;
  return { lista: filtrada, resumen, mediaNormal };
}

export const FILTROS_BITACORA = [
  { id: 'todo', texto: 'Todo' },
  { id: 'especiales', texto: 'Especiales' },
  { id: 'observaciones', texto: 'Observaciones' },
  { id: 'sinculto', texto: 'Sin culto' },
];

export function VistaBitacora({ datos, filtro, onFiltro }) {
  const { lista, resumen, mediaNormal } = useMemo(() => construirBitacora(datos, filtro), [datos, filtro]);

  return (
    <div>
      <div className="grid grid-cols-3 gap-2 mb-4">
        <Tarjeta icono={Sparkles} titulo="Especiales" valor={resumen.especiales} />
        <Tarjeta icono={MessageSquareText} titulo="Observaciones" valor={resumen.observaciones} />
        <Tarjeta icono={Ban} titulo="Sin culto" valor={resumen.sinCulto} />
      </div>
      <div className="flex flex-wrap gap-1.5 mb-3">
        {FILTROS_BITACORA.map((f) => (
          <button key={f.id} type="button" onClick={() => onFiltro(f.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold border transition ${filtro === f.id ? 'bg-amber-600 border-amber-600 text-white' : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'}`}>
            {f.texto}
          </button>
        ))}
      </div>
      {lista.length === 0 ? (
        <p className="py-10 text-center text-sm text-slate-400">Nada que mostrar en este periodo.</p>
      ) : (
        <ol className="relative border-l-2 border-slate-200 ml-2 space-y-3">
          {lista.map((f) => (
            <li key={`${f.fecha}|${f.turno}`} className="ml-4">
              <span className={`absolute -left-[7px] mt-3 w-3 h-3 rounded-full border-2 border-white ${f.especial ? 'bg-amber-500' : f.sinCulto ? 'bg-slate-400' : 'bg-sky-500'}`} />
              <div className="bg-white rounded-xl border border-slate-200 p-3">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mb-1.5">
                  <span className="font-bold text-sm text-slate-800">{fechaLatina(f.fecha)}</span>
                  <span className="text-xs text-slate-500 capitalize">
                    {new Date(f.fecha + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'long' })} · {f.turno.toLowerCase()}
                  </span>
                  {f.total != null && (
                    <span className="ml-auto text-xs text-slate-500">
                      Asistencia <b className="text-slate-800 text-sm">{f.total}</b>
                      {f.especial && mediaNormal > 0 && (
                        <span className={`ml-1.5 font-bold ${f.total >= mediaNormal ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {f.total >= mediaNormal ? '▲' : '▼'} {Math.abs(Math.round(((f.total - mediaNormal) / mediaNormal) * 100))}% vs. media
                        </span>
                      )}
                    </span>
                  )}
                </div>
                <div className="space-y-1 text-sm">
                  {f.especial && <p className="flex gap-1.5 text-slate-700"><Sparkles className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" /><span><b>Especial:</b> {f.especial}</span></p>}
                  {f.observacion && <p className="flex gap-1.5 text-slate-700"><MessageSquareText className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" /><span className="whitespace-pre-line"><b>Observación:</b> {f.observacion}</span></p>}
                  {f.sinCulto && <p className="flex gap-1.5 text-slate-600"><Ban className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" /><span><b>No hubo culto:</b> {f.sinCulto}</span></p>}
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
