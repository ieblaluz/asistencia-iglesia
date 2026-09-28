import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabaseClient';
import { guardarLocalmente, sincronizarConSupabase, obtenerRegistrosPendientes } from './offlineSync';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { ReporteMensualPDF, ReporteAnualPDF, ReportePromediosPDF } from './ReportePDF';
import { Capacitor } from '@capacitor/core';

import { 
  Calendar, 
  Clock, 
  UserCheck, 
  Save, 
  CheckCircle, 
  AlertCircle, 
  BarChart3, 
  ClipboardList,
  Plus,
  Minus,
  Edit3,
  X,
  AlertTriangle,
  TrendingUp,
  PieChart,
  Filter,
  CalendarDays,
  Printer,
  Settings,
  Building2,
  ListOrdered,
  Check,
  Trash2,
  Eye,
  EyeOff,
  Upload,
  Lock,
  Unlock,
  Smartphone,
  Monitor
} from 'lucide-react';

const MESES = [
  { id: '01', nombre: 'Enero' },
  { id: '02', nombre: 'Febrero' },
  { id: '03', nombre: 'Marzo' },
  { id: '04', nombre: 'Abril' },
  { id: '05', nombre: 'Mayo' },
  { id: '06', nombre: 'Junio' },
  { id: '07', nombre: 'Julio' },
  { id: '08', nombre: 'Agosto' },
  { id: '09', nombre: 'Septiembre' },
  { id: '10', nombre: 'Octubre' },
  { id: '11', nombre: 'Noviembre' },
  { id: '12', nombre: 'Diciembre' }
];

const formatearFechaLatina = (fechaISO) => {
  if (!fechaISO) return '';
  const partes = fechaISO.split('-');
  if (partes.length !== 3) return fechaISO;
  const [yyyy, mm, dd] = partes;
  return `${dd}/${mm}/${yyyy}`;
};

export default function App() {
  const [tab, setTab] = useState('registro');

  // --- DETECCIÓN DE PLATAFORMA NATIVA (APK Android/iOS vs Web) ---
  const esAppNativa = Capacitor.isNativePlatform();

  // --- ESTADOS DE SINCRONIZACIÓN OFFLINE ---
  const [pendientes, setPendientes] = useState(obtenerRegistrosPendientes());
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      const res = await sincronizarConSupabase();
      if (res && res.synced > 0) {
        alert(`¡Conexión restablecida! Se sincronizaron ${res.synced} registros pendientes.`);
        setPendientes(obtenerRegistrosPendientes());
      }
    };

    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // --- ESTADOS DE CONFIGURACIÓN ---
  const [configIglesia, setConfigIglesia] = useState({
    nombre_iglesia: 'Iglesia Evangélica Bautista LA LUZ',
    direccion: 'Málaga - España',
    logo_url: ''
  });
  const [listaGrupos, setListaGrupos] = useState([]);
  const [modoEdicionConfig, setModoEdicionConfig] = useState(false);

  // --- ESTADOS DE REGISTRO ---
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [turno, setTurno] = useState('Mañana');
  const [cantidades, setCantidades] = useState({});
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });
  const [existeRegistro, setExisteRegistro] = useState(false);

  // --- ESTADOS MODAL EDICIÓN ---
  const [mostrarModalEditar, setMostrarModalEditar] = useState(false);
  const [editFecha, setEditFecha] = useState(new Date().toISOString().split('T')[0]);
  const [editTurno, setEditTurno] = useState('Mañana');
  const [editCantidades, setEditCantidades] = useState({});
  const [cargandoModal, setCargandoModal] = useState(false);

  // --- ESTADOS DE REPORTES ---
  const [subTabReporte, setSubTabReporte] = useState('mensual');
  const [anioReporte, setAnioReporte] = useState(new Date().getFullYear().toString());
  const [mesReporte, setMesReporte] = useState(String(new Date().getMonth() + 1).padStart(2, '0'));
  const [promedioMes, setPromedioMes] = useState('ALL');
  const [datosReporte, setDatosReporte] = useState([]);
  const [cargandoReporte, setCargandoReporte] = useState(false);

  // --- ESTADOS FORMULARIO CONFIGURACIÓN ---
  const [formConfig, setFormConfig] = useState({ nombre_iglesia: '', direccion: '', logo_url: '' });
  const [nuevoGrupo, setNuevoGrupo] = useState({ nombre: '', aplica_a: 'domingo', orden: 1 });
  const [editandoGrupoId, setEditandoGrupoId] = useState(null);
  const [grupoEditForm, setGrupoEditForm] = useState({ nombre: '', aplica_a: 'domingo', orden: 1 });
  const [guardandoConfig, setGuardandoConfig] = useState(false);

  // CARGAR CONFIGURACIÓN Y CLASES DESDE SUPABASE
  const cargarConfiguracionYGrupos = useCallback(async () => {
    try {
      const { data: confData } = await supabase.from('configuracion').select('*').eq('id', 1).single();
      if (confData) {
        setConfigIglesia(confData);
        setFormConfig(confData);
      }

      const { data: gruposData } = await supabase
        .from('grupos_asistencia')
        .select('*')
        .order('orden', { ascending: true });

      if (gruposData) {
        setListaGrupos(gruposData);
      }
    } catch (err) {
      console.error('Error al cargar configuración:', err);
    }
  }, []);

  useEffect(() => {
    cargarConfiguracionYGrupos();
  }, [cargarConfiguracionYGrupos]);

  const obtenerValoresVacios = useCallback(() => {
    const vacios = {};
    listaGrupos.forEach(g => vacios[g.nombre] = 0);
    return vacios;
  }, [listaGrupos]);

  const comprobarRegistroExistente = useCallback(async (fechaSel, turnoSel) => {
    try {
      const { data, error } = await supabase
        .from('asistencia')
        .select('id')
        .eq('fecha', fechaSel)
        .eq('turno', turnoSel)
        .limit(1);

      if (error) throw error;
      setExisteRegistro(data && data.length > 0);
    } catch (err) {
      console.error('Error al verificar registro:', err);
      setExisteRegistro(false);
    }
  }, []);

  const handleFechaChange = (nuevaFecha) => {
    setFecha(nuevaFecha);
    const dateObj = new Date(nuevaFecha + 'T00:00:00');
    const nuevoTurno = dateObj.getDay() === 3 ? 'Tarde' : 'Mañana';
    setTurno(nuevoTurno);
    setCantidades(obtenerValoresVacios());
    comprobarRegistroExistente(nuevaFecha, nuevoTurno);
  };

  const handleTurnoChange = (nuevoTurno) => {
    setTurno(nuevoTurno);
    setCantidades(obtenerValoresVacios());
    comprobarRegistroExistente(fecha, nuevoTurno);
  };

  useEffect(() => {
    if (listaGrupos.length > 0) {
      const dateObj = new Date(fecha + 'T00:00:00');
      const turnoInicial = dateObj.getDay() === 3 ? 'Tarde' : 'Mañana';
      setTurno(turnoInicial);
      setCantidades(obtenerValoresVacios());
      comprobarRegistroExistente(fecha, turnoInicial);
    }
  }, [listaGrupos, comprobarRegistroExistente]);

  const handleCantidadChange = (grupo, valor) => {
    const num = Math.max(0, parseInt(valor) || 0);
    setCantidades(prev => ({ ...prev, [grupo]: num }));
  };

  const modificarCantidad = (grupo, delta) => {
    setCantidades(prev => ({
      ...prev,
      [grupo]: Math.max(0, (prev[grupo] || 0) + delta)
    }));
  };

  const guardarAsistencia = async () => {
    if (existeRegistro) return;
    setCargando(true);
    setMensaje({ tipo: '', texto: '' });

    const esMiercoles = new Date(fecha + 'T00:00:00').getDay() === 3;
    const gruposAInsertar = listaGrupos.filter(g => {
      if (!g.activo) return false;
      if (esMiercoles) return g.aplica_a === 'miercoles' || g.aplica_a === 'ambos';
      return g.aplica_a === 'domingo' || g.aplica_a === 'ambos';
    });

    const filas = gruposAInsertar.map(g => ({
      fecha,
      turno,
      clase: g.nombre,
      cantidad: cantidades[g.nombre] || 0
    }));

    if (!navigator.onLine) {
      guardarLocalmente(filas);
      setPendientes(obtenerRegistrosPendientes());
      setMensaje({ tipo: 'exito', texto: 'Sin conexión a internet. La asistencia se guardó localmente en el dispositivo y se subirá automáticamente al conectar.' });
      setCantidades(obtenerValoresVacios());
      setExisteRegistro(true);
      setCargando(false);
      return;
    }

    try {
      await supabase
        .from('asistencia')
        .delete()
        .eq('fecha', fecha)
        .eq('turno', turno);

      const { error: insError } = await supabase.from('asistencia').insert(filas);
      if (insError) throw insError;

      setMensaje({ tipo: 'exito', texto: '¡Asistencia guardada con éxito en la nube!' });
      setCantidades(obtenerValoresVacios());
      setExisteRegistro(true);
    } catch (err) {
      console.error('Error al guardar en nube, utilizando fallback local:', err);
      guardarLocalmente(filas);
      setPendientes(obtenerRegistrosPendientes());
      setMensaje({ tipo: 'exito', texto: 'Ocurrió un problema de red. Se guardó localmente y se reintentará luego.' });
      setCantidades(obtenerValoresVacios());
      setExisteRegistro(true);
    } finally {
      setCargando(false);
    }
  };

  // MODAL EDICIÓN
  const abrirModalEdicion = (fechaInicial, turnoInicial) => {
    setEditFecha(fechaInicial);
    setEditTurno(turnoInicial);
    setMostrarModalEditar(true);
    cargarDatosParaEditar(fechaInicial, turnoInicial);
  };

  const cargarDatosParaEditar = async (f, t) => {
    setCargandoModal(true);
    const iniciales = obtenerValoresVacios();

    try {
      const { data, error } = await supabase
        .from('asistencia')
        .select('clase, cantidad')
        .eq('fecha', f)
        .eq('turno', t);

      if (error) throw error;

      if (data && data.length > 0) {
        data.forEach(item => {
          iniciales[item.clase] = item.cantidad;
        });
      }
      setEditCantidades(iniciales);
    } catch (err) {
      console.error('Error al cargar datos en modal:', err);
    } finally {
      setCargandoModal(false);
    }
  };

  const guardarEdicionModal = async () => {
    setCargandoModal(true);
    try {
      await supabase
        .from('asistencia')
        .delete()
        .eq('fecha', editFecha)
        .eq('turno', editTurno);

      const esMiercolesEdit = new Date(editFecha + 'T00:00:00').getDay() === 3;
      const gruposAInsertar = listaGrupos.filter(g => {
        if (!g.activo) return false;
        if (esMiercolesEdit) return g.aplica_a === 'miercoles' || g.aplica_a === 'ambos';
        return g.aplica_a === 'domingo' || g.aplica_a === 'ambos';
      });

      const filas = gruposAInsertar.map(g => ({
        fecha: editFecha,
        turno: editTurno,
        clase: g.nombre,
        cantidad: editCantidades[g.nombre] || 0
      }));

      const { error: insError } = await supabase.from('asistencia').insert(filas);
      if (insError) throw insError;

      setMostrarModalEditar(false);
      setMensaje({ tipo: 'exito', texto: '¡Registro modificado con éxito!' });
      comprobarRegistroExistente(fecha, turno);
    } catch (err) {
      console.error('Error al modificar:', err);
      alert('Error al guardar las modificaciones');
    } finally {
      setCargandoModal(false);
    }
  };

  // REPORTES
  const cargarReportes = useCallback(async () => {
    setCargandoReporte(true);
    try {
      let query = supabase.from('asistencia').select('*');

      if (subTabReporte === 'mensual') {
        const inicioMes = `${anioReporte}-${mesReporte}-01`;
        const ultimoDia = new Date(parseInt(anioReporte), parseInt(mesReporte), 0).getDate();
        const finMes = `${anioReporte}-${mesReporte}-${String(ultimoDia).padStart(2, '0')}`;
        query = query.gte('fecha', inicioMes).lte('fecha', finMes);
      } else if (subTabReporte === 'promedios' && promedioMes !== 'ALL') {
        const inicioMes = `${anioReporte}-${promedioMes}-01`;
        const ultimoDia = new Date(parseInt(anioReporte), parseInt(promedioMes), 0).getDate();
        const finMes = `${anioReporte}-${promedioMes}-${String(ultimoDia).padStart(2, '0')}`;
        query = query.gte('fecha', inicioMes).lte('fecha', finMes);
      } else {
        const inicioAnio = `${anioReporte}-01-01`;
        const finAnio = `${anioReporte}-12-31`;
        query = query.gte('fecha', inicioAnio).lte('fecha', finAnio);
      }

      const { data, error } = await query;
      if (error) throw error;
      setDatosReporte(data || []);
    } catch (err) {
      console.error('Error al cargar reportes:', err);
      setDatosReporte([]);
    } finally {
      setCargandoReporte(false);
    }
  }, [subTabReporte, anioReporte, mesReporte, promedioMes]);

  useEffect(() => {
    if (tab === 'reportes') cargarReportes();
  }, [tab, subTabReporte, anioReporte, mesReporte, promedioMes, cargarReportes]);

  // CONFIGURACIÓN: LOGO Y CLASES
  const handleLogoImagen = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert("⚠️ La imagen es superior a 2MB. Por favor, selecciona una imagen más liviana.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setFormConfig(prev => ({ ...prev, logo_url: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  const guardarIdentidadIglesia = async (e) => {
    e.preventDefault();
    if (!modoEdicionConfig) return;
    setGuardandoConfig(true);
    try {
      const { error } = await supabase
        .from('configuracion')
        .upsert({ id: 1, ...formConfig });

      if (error) throw error;
      setConfigIglesia(formConfig);
      alert('¡Configuración e imagen guardadas con éxito!');
    } catch (err) {
      console.error('Error al guardar configuración:', err);
      alert('Error al guardar la configuración');
    } finally {
      setGuardandoConfig(false);
    }
  };

  // AGREGAR GRUPO CON VALIDACIÓN ANTI-DUPLICADOS
  const agregarGrupo = async (e) => {
    e.preventDefault();
    if (!modoEdicionConfig) return;
    const nombreLimpio = nuevoGrupo.nombre.trim();

    if (!nombreLimpio) return;

    const yaExiste = listaGrupos.some(
      g => g.nombre.trim().toLowerCase() === nombreLimpio.toLowerCase()
    );

    if (yaExiste) {
      alert(`⚠️ La clase "${nombreLimpio}" ya existe en la lista. Por favor, ingresa un nombre diferente.`);
      return;
    }

    try {
      const { error } = await supabase.from('grupos_asistencia').insert([{
        nombre: nombreLimpio,
        aplica_a: nuevoGrupo.aplica_a,
        orden: parseInt(nuevoGrupo.orden) || (listaGrupos.length + 1),
        activo: true
      }]);

      if (error) throw error;
      setNuevoGrupo({ nombre: '', aplica_a: 'domingo', orden: listaGrupos.length + 2 });
      cargarConfiguracionYGrupos();
      alert('✅ Clase creada correctamente.');
    } catch (err) {
      console.error('Error al agregar grupo:', err);
      alert('Error al agregar la clase');
    }
  };

  const alternarEstadoGrupo = async (grupo) => {
    if (!modoEdicionConfig) return;
    try {
      const { error } = await supabase
        .from('grupos_asistencia')
        .update({ activo: !grupo.activo })
        .eq('id', grupo.id);

      if (error) throw error;
      cargarConfiguracionYGrupos();
    } catch (err) {
      console.error('Error al cambiar estado:', err);
    }
  };

  const guardarEdicionGrupo = async (id) => {
    if (!modoEdicionConfig) return;
    try {
      const { error } = await supabase
        .from('grupos_asistencia')
        .update({
          nombre: grupoEditForm.nombre.trim(),
          aplica_a: grupoEditForm.aplica_a,
          orden: parseInt(grupoEditForm.orden) || 1
        })
        .eq('id', id);

      if (error) throw error;
      setEditandoGrupoId(null);
      cargarConfiguracionYGrupos();
    } catch (err) {
      console.error('Error al editar grupo:', err);
      alert('Error al actualizar el grupo');
    }
  };

  const eliminarGrupo = async (id) => {
    if (!modoEdicionConfig) return;
    if (!confirm('¿Seguro que deseas eliminar esta clase?')) return;
    try {
      const { error } = await supabase.from('grupos_asistencia').delete().eq('id', id);
      if (error) throw error;
      cargarConfiguracionYGrupos();
    } catch (err) {
      console.error('Error al eliminar grupo:', err);
      alert('Error al eliminar la clase');
    }
  };

  const esMiercoles = new Date(fecha + 'T00:00:00').getDay() === 3;
  const gruposAmostrar = listaGrupos.filter(g => {
    if (!g.activo) return false;
    if (esMiercoles) return g.aplica_a === 'miercoles' || g.aplica_a === 'ambos';
    return g.aplica_a === 'domingo' || g.aplica_a === 'ambos';
  });

  const totalAsistentes = gruposAmostrar.reduce((acc, g) => acc + (cantidades[g.nombre] || 0), 0);

  const esMiercolesEdit = new Date(editFecha + 'T00:00:00').getDay() === 3;
  const gruposAmostrarEdit = listaGrupos.filter(g => {
    if (!g.activo) return false;
    if (esMiercolesEdit) return g.aplica_a === 'miercoles' || g.aplica_a === 'ambos';
    return g.aplica_a === 'domingo' || g.aplica_a === 'ambos';
  });

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-slate-100 text-slate-800 font-sans w-full overflow-x-hidden">
      {/* BARRA LATERAL / CABECERA RESPONSIVA */}
      <aside className="bg-amber-900 text-white sticky top-0 z-50 md:relative md:w-64 md:min-h-screen md:shrink-0 flex flex-col justify-between p-3 md:p-4 shadow-lg">
        <div className="space-y-3 md:space-y-6">
          {/* Logo y Nombre de la Iglesia */}
          <div className="flex items-center gap-3 p-2 bg-amber-950/40 rounded-xl">
            {configIglesia.logo_url ? (
              <img src={configIglesia.logo_url} alt="Logo" className="w-9 h-9 md:w-10 md:h-10 rounded-lg object-cover bg-white p-0.5 shrink-0" />
            ) : (
              <div className="bg-amber-100 text-amber-900 w-9 h-9 md:w-10 md:h-10 rounded-lg flex items-center justify-center font-black text-lg md:text-xl shrink-0">✝</div>
            )}
            <div className="min-w-0 flex-1">
              <h1 className="font-bold text-xs md:text-sm leading-tight truncate">{configIglesia.nombre_iglesia}</h1>
              <p className="text-amber-200 text-[10px] md:text-[11px] font-medium truncate">{configIglesia.direccion}</p>
            </div>
          </div>

          {/* Navegación Pestañas */}
          <nav className="flex md:flex-col gap-1.5 bg-amber-950/30 md:bg-transparent p-1 md:p-0 rounded-xl">
            <button
              onClick={() => setTab('registro')}
              className={`flex-1 md:flex-none flex items-center justify-center md:justify-start gap-2 px-3 md:px-4 py-2.5 md:py-3 rounded-xl font-bold text-xs uppercase transition ${
                tab === 'registro' ? 'bg-amber-600 text-white shadow-md' : 'text-amber-200 hover:bg-amber-800/60 hover:text-white'
              }`}
            >
              <ClipboardList className="w-4 h-4 shrink-0" />
              <span>REGISTRO</span>
            </button>
            <button
              onClick={() => setTab('reportes')}
              className={`flex-1 md:flex-none flex items-center justify-center md:justify-start gap-2 px-3 md:px-4 py-2.5 md:py-3 rounded-xl font-bold text-xs uppercase transition ${
                tab === 'reportes' ? 'bg-amber-600 text-white shadow-md' : 'text-amber-200 hover:bg-amber-800/60 hover:text-white'
              }`}
            >
              <BarChart3 className="w-4 h-4 shrink-0" />
              <span>REPORTES</span>
            </button>
            <button
              onClick={() => setTab('configuracion')}
              className={`flex-1 md:flex-none flex items-center justify-center md:justify-start gap-2 px-3 md:px-4 py-2.5 md:py-3 rounded-xl font-bold text-xs uppercase transition ${
                tab === 'configuracion' ? 'bg-amber-600 text-white shadow-md' : 'text-amber-200 hover:bg-amber-800/60 hover:text-white'
              }`}
            >
              <Settings className="w-4 h-4 shrink-0" />
              <span>AJUSTES</span>
            </button>
          </nav>
        </div>

        {/* Footer Sidebar & Indicador de Modo Nativo */}
        <div className="hidden md:block text-center pt-4 border-t border-amber-800/60">
          <div className="flex items-center justify-center gap-1.5 text-amber-300/80 text-xs font-bold mb-1">
            {esAppNativa ? (
              <span className="flex items-center gap-1"><Smartphone className="w-3.5 h-3.5" /> App Móvil Nativa</span>
            ) : (
              <span className="flex items-center gap-1"><Monitor className="w-3.5 h-3.5" /> Modo Web Escritorio</span>
            )}
          </div>
          <p className="text-amber-400/60 text-[10px]">v1.2.0 · Gestión de Asistencia</p>
        </div>
      </aside>

      {/* ÁREA DE CONTENIDO PRINCIPAL */}
      <main className="flex-1 p-3 md:p-6 overflow-y-auto max-w-7xl mx-auto w-full">

        {/* Indicador visual de estado offline */}
        {!isOnline && (
          <div className="bg-amber-500 text-white p-2.5 rounded-xl mb-4 text-center font-semibold text-xs shadow-sm">
            ⚠️ Modo Sin Conexión (Offline). Los registros se guardarán localmente en el dispositivo.
          </div>
        )}

        {/* Indicador visual de registros pendientes */}
        {pendientes > 0 && (
          <div className="bg-blue-600 text-white p-2.5 rounded-xl mb-4 text-center text-xs font-medium flex justify-between items-center shadow-sm">
            <span>{pendientes} registros pendientes de subir</span>
            {isOnline && (
              <button
                onClick={async () => {
                  const res = await sincronizarConSupabase();
                  if (res && res.synced > 0) setPendientes(obtenerRegistrosPendientes());
                }}
                className="bg-white text-blue-700 px-3 py-1 rounded-lg text-xs font-bold hover:bg-slate-100 transition"
              >
                Sincronizar Ahora
              </button>
            )}
          </div>
        )}

        {/* PESTAÑA REGISTRO */}
        {tab === 'registro' && (
          <div className="space-y-3">
            {existeRegistro && (
              <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-300 flex items-center justify-between gap-2 text-amber-900 text-xs">
                <div className="flex items-center gap-2 font-semibold">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Ya existe un registro guardado para el <strong>{formatearFechaLatina(fecha)}</strong> ({turno}).</span>
                </div>
                <button
                  type="button"
                  onClick={() => abrirModalEdicion(fecha, turno)}
                  className="px-2.5 py-1 bg-amber-600 text-white font-bold rounded-md hover:bg-amber-700 transition shrink-0"
                >
                  Editar
                </button>
              </div>
            )}

            {mensaje.texto && (
              <div className={`p-2.5 rounded-xl flex items-center gap-2 text-xs font-bold ${
                mensaje.tipo === 'exito' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}>
                {mensaje.tipo === 'exito' ? <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
                {mensaje.texto}
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-1 bg-white rounded-xl p-4 shadow-sm border border-slate-200 h-fit">
                <div className="flex items-center justify-between gap-2 mb-4 pb-2 border-b border-slate-100">
                  <h2 className="text-xs font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4 text-amber-600" />
                    Datos del Culto
                  </h2>
                  <button
                    type="button"
                    onClick={() => abrirModalEdicion(fecha, turno)}
                    className="flex items-center gap-1 px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-lg text-[11px] font-bold transition"
                  >
                    <Edit3 className="w-3 h-3 text-amber-700" />
                    Consultar / Modificar
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Fecha del Culto</label>
                    <div className="relative">
                      <div className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-800 font-bold flex items-center justify-between pointer-events-none">
                        <span>{formatearFechaLatina(fecha)}</span>
                        <Calendar className="w-4 h-4 text-slate-400" />
                      </div>
                      <input
                        type="date"
                        value={fecha}
                        onChange={(e) => handleFechaChange(e.target.value)}
                        className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Turno</label>
                    <div className="flex gap-2">
                      {['Mañana', 'Tarde'].map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => handleTurnoChange(t)}
                          className={`flex-1 py-2 px-3 rounded-lg font-bold text-xs transition flex items-center justify-center gap-1.5 border ${
                            turno === t ? 'bg-amber-600 text-white border-amber-600 shadow-sm' : 'bg-slate-50 text-slate-600 border-slate-300 hover:bg-slate-100'
                          }`}
                        >
                          <Clock className="w-3.5 h-3.5" />
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-2 bg-white rounded-xl p-4 shadow-sm border border-slate-200">
                <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
                  <h2 className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                    {esMiercoles ? 'Asistencia Culto de Miércoles' : 'Asistencia por Grupos'}
                  </h2>
                  <span className="text-xs font-black uppercase tracking-wider bg-amber-100 text-amber-900 px-3 py-1 rounded-full border border-amber-200">
                    Total: {totalAsistentes}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {gruposAmostrar.map((g) => (
                    <div key={g.id} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200 hover:border-amber-400 transition">
                      <span className="font-bold text-xs text-slate-700 pr-2 truncate">{g.nombre}</span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => modificarCantidad(g.nombre, -1)}
                          disabled={existeRegistro}
                          className="w-8 h-8 flex items-center justify-center bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100 transition font-bold disabled:opacity-50"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <input
                          type="number"
                          min="0"
                          disabled={existeRegistro}
                          value={cantidades[g.nombre] ?? 0}
                          onChange={(e) => handleCantidadChange(g.nombre, e.target.value)}
                          className="w-12 text-center py-1 font-black text-slate-800 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 text-sm disabled:bg-slate-100"
                        />
                        <button
                          type="button"
                          onClick={() => modificarCantidad(g.nombre, 1)}
                          disabled={existeRegistro}
                          className="w-8 h-8 flex items-center justify-center bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition font-bold disabled:opacity-50"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={guardarAsistencia}
                    disabled={cargando || existeRegistro}
                    className={`w-full py-3 font-bold rounded-xl shadow transition flex items-center justify-center gap-2 text-sm ${
                      existeRegistro ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none' : 'bg-amber-600 hover:bg-amber-700 text-white'
                    }`}
                  >
                    <Save className="w-4 h-4" />
                    {cargando ? 'Guardando...' : existeRegistro ? 'Registro existente (Usar opción Editar)' : 'Guardar Asistencia'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PESTAÑA REPORTES */}
        {tab === 'reportes' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4 border-b border-slate-100 pb-3">
                <div className="flex bg-slate-100 p-1 rounded-xl gap-1 overflow-x-auto">
                  <button
                    onClick={() => setSubTabReporte('mensual')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition ${
                      subTabReporte === 'mensual' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <CalendarDays className="w-3.5 h-3.5" /> Mensual
                  </button>
                  <button
                    onClick={() => setSubTabReporte('anual')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition ${
                      subTabReporte === 'anual' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <PieChart className="w-3.5 h-3.5" /> Anual
                  </button>
                  <button
                    onClick={() => setSubTabReporte('promedios')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition ${
                      subTabReporte === 'promedios' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <TrendingUp className="w-3.5 h-3.5" /> Promedios
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Filter className="w-4 h-4 text-slate-400 hidden sm:block" />
                  
                  {/* Selector de Mes para Vista Mensual */}
                  {subTabReporte === 'mensual' && (
                    <select
                      value={mesReporte}
                      onChange={(e) => setMesReporte(e.target.value)}
                      className="px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-bold text-xs text-slate-700"
                    >
                      {MESES.map((m) => (
                        <option key={m.id} value={m.id}>{m.nombre}</option>
                      ))}
                    </select>
                  )}

                  {/* Selector de Mes/Anual para Vista Promedios */}
                  {subTabReporte === 'promedios' && (
                    <select
                      value={promedioMes}
                      onChange={(e) => setPromedioMes(e.target.value)}
                      className="px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-bold text-xs text-slate-700"
                    >
                      <option value="ALL">Todo el año (Anual)</option>
                      {MESES.map((m) => (
                        <option key={m.id} value={m.id}>{m.nombre}</option>
                      ))}
                    </select>
                  )}

                  {/* Selector de Año */}
                  <select
                    value={anioReporte}
                    onChange={(e) => setAnioReporte(e.target.value)}
                    className="px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-bold text-xs text-slate-700"
                  >
                    {['2024', '2025', '2026', '2027'].map((a) => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>

                  {/* Botones de Descargar PDF */}
                  {subTabReporte === 'mensual' && (
                    <PDFDownloadLink
                      document={<ReporteMensualPDF datos={datosReporte} mesNombre={MESES.find(m => m.id === mesReporte)?.nombre} anio={anioReporte} config={configIglesia} />}
                      fileName={`reporte_mensual_${mesReporte}_${anioReporte}.pdf`}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-800 hover:bg-amber-900 text-white rounded-lg text-xs font-bold transition shadow-sm ml-auto sm:ml-2 cursor-pointer"
                    >
                      {({ loading }) => (
                        <>
                          <Printer className="w-3.5 h-3.5" />
                          {loading ? 'Generando PDF...' : 'Descargar PDF'}
                        </>
                      )}
                    </PDFDownloadLink>
                  )}

                  {subTabReporte === 'anual' && (
                    <PDFDownloadLink
                      document={<ReporteAnualPDF datos={datosReporte} anio={anioReporte} config={configIglesia} />}
                      fileName={`reporte_anual_${anioReporte}.pdf`}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-800 hover:bg-amber-900 text-white rounded-lg text-xs font-bold transition shadow-sm ml-auto sm:ml-2 cursor-pointer"
                    >
                      {({ loading }) => (
                        <>
                          <Printer className="w-3.5 h-3.5" />
                          {loading ? 'Generando PDF...' : 'Descargar PDF'}
                        </>
                      )}
                    </PDFDownloadLink>
                  )}

                  {subTabReporte === 'promedios' && (
                    <PDFDownloadLink
                      document={<ReportePromediosPDF datos={datosReporte} anio={anioReporte} config={configIglesia} />}
                      fileName={`reporte_promedios_${anioReporte}.pdf`}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-800 hover:bg-amber-900 text-white rounded-lg text-xs font-bold transition shadow-sm ml-auto sm:ml-2 cursor-pointer"
                    >
                      {({ loading }) => (
                        <>
                          <Printer className="w-3.5 h-3.5" />
                          {loading ? 'Generando PDF...' : 'Descargar PDF'}
                        </>
                      )}
                    </PDFDownloadLink>
                  )}
                </div>
              </div>

              {cargandoReporte ? (
                <div className="py-12 text-center text-slate-400 font-medium animate-pulse text-sm">Cargando datos...</div>
              ) : (
                <>
                  {subTabReporte === 'mensual' && <VistaReporteMensual datos={datosReporte} mesNombre={MESES.find(m => m.id === mesReporte)?.nombre} anio={anioReporte} config={configIglesia} />}
                  {subTabReporte === 'anual' && <VistaReporteAnual datos={datosReporte} anio={anioReporte} config={configIglesia} />}
                  {subTabReporte === 'promedios' && <VistaPromedios datos={datosReporte} anio={anioReporte} promedioMes={promedioMes} config={configIglesia} />}
                </>
              )}
            </div>
          </div>
        )}

        {/* PESTAÑA AJUSTES / CONFIGURACIÓN */}
        {tab === 'configuracion' && (
          <div className="space-y-4">
            {/* CONTROL DE MODO LECTURA / MODO EDICIÓN */}
            <div className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all ${
              modoEdicionConfig 
                ? 'bg-amber-50 border-amber-300 text-amber-950' 
                : 'bg-slate-200/80 border-slate-300 text-slate-700'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg shrink-0 ${modoEdicionConfig ? 'bg-amber-600 text-white' : 'bg-slate-400 text-white'}`}>
                  {modoEdicionConfig ? <Unlock className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="font-bold text-xs uppercase tracking-wider">
                    {modoEdicionConfig ? 'Modo de Edición Activado' : 'Ajustes Protegidos (Modo Solo Lectura)'}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    {modoEdicionConfig 
                      ? 'Puedes modificar la identidad de la iglesia y agregar o editar clases.' 
                      : 'Activa la edición para realizar modificaciones en la configuración de la aplicación.'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setModoEdicionConfig(!modoEdicionConfig)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm shrink-0 ${
                  modoEdicionConfig
                    ? 'bg-slate-800 hover:bg-slate-900 text-white'
                    : 'bg-amber-600 hover:bg-amber-700 text-white'
                }`}
              >
                {modoEdicionConfig ? (
                  <>
                    <Lock className="w-3.5 h-3.5" /> Finalizar Edición
                  </>
                ) : (
                  <>
                    <Unlock className="w-3.5 h-3.5" /> Habilitar Edición
                  </>
                )}
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* PANEL IDENTIDAD DE LA IGLESIA */}
              <div className="lg:col-span-1 bg-white p-4 rounded-xl border border-slate-200 shadow-sm h-fit">
                <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-1.5 border-b pb-2">
                  <Building2 className="w-4 h-4 text-amber-600" />
                  Identidad de la Iglesia
                </h2>

                <form onSubmit={guardarIdentidadIglesia} className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Nombre de la Iglesia</label>
                    <input
                      type="text"
                      required
                      disabled={!modoEdicionConfig}
                      value={formConfig.nombre_iglesia}
                      onChange={(e) => setFormConfig({ ...formConfig, nombre_iglesia: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-300 rounded-lg disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Dirección / Ubicación</label>
                    <input
                      type="text"
                      disabled={!modoEdicionConfig}
                      value={formConfig.direccion}
                      onChange={(e) => setFormConfig({ ...formConfig, direccion: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-300 rounded-lg disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Logo de la Iglesia (Seleccionar del dispositivo)</label>
                    <div className="flex items-center gap-2 border border-slate-200 p-2 rounded-lg bg-slate-50">
                      {formConfig.logo_url ? (
                        <img src={formConfig.logo_url} alt="Logo Prev" className="w-10 h-10 object-cover rounded border bg-white p-0.5 shrink-0" />
                      ) : (
                        <div className="w-10 h-10 bg-amber-100 text-amber-800 rounded flex items-center justify-center font-bold shrink-0">
                          <Upload className="w-4 h-4" />
                        </div>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        disabled={!modoEdicionConfig}
                        onChange={handleLogoImagen}
                        className="w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:font-bold file:bg-amber-100 file:text-amber-800 hover:file:bg-amber-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={!modoEdicionConfig || guardandoConfig}
                    className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg transition flex items-center justify-center gap-1.5 shadow disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed disabled:shadow-none"
                  >
                    <Save className="w-3.5 h-3.5" />
                    {guardandoConfig ? 'Guardando...' : 'Guardar Cambios'}
                  </button>
                </form>
              </div>

              {/* PANEL ADMINISTRAR CLASES Y GRUPOS */}
              <div className="lg:col-span-2 bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
                <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 border-b pb-2">
                  <ListOrdered className="w-4 h-4 text-amber-600" />
                  Administrar Clases y Grupos
                </h2>

                {/* FORMULARIO AGREGAR NUEVA CLASE */}
                <form onSubmit={agregarGrupo} className="p-3 bg-amber-50/60 rounded-xl border border-amber-200 grid grid-cols-1 sm:grid-cols-4 gap-2 items-end">
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-bold text-amber-900 uppercase mb-1">Nombre de la Clase</label>
                    <input
                      type="text"
                      required
                      disabled={!modoEdicionConfig}
                      placeholder="Ej. Jóvenes Adultos"
                      value={nuevoGrupo.nombre}
                      onChange={(e) => setNuevoGrupo({ ...nuevoGrupo, nombre: e.target.value })}
                      className="w-full px-2.5 py-1.5 text-xs font-bold bg-white border border-amber-300 rounded-lg disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-200"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-amber-900 uppercase mb-1">Aplica A</label>
                    <select
                      disabled={!modoEdicionConfig}
                      value={nuevoGrupo.aplica_a}
                      onChange={(e) => setNuevoGrupo({ ...nuevoGrupo, aplica_a: e.target.value })}
                      className="w-full px-2 py-1.5 text-xs font-bold bg-white border border-amber-300 rounded-lg disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-200"
                    >
                      <option value="domingo">Domingo</option>
                      <option value="miercoles">Miércoles</option>
                      <option value="ambos">Ambos</option>
                    </select>
                  </div>
                  <button
                    type="submit"
                    disabled={!modoEdicionConfig}
                    className="py-1.5 bg-amber-700 hover:bg-amber-800 text-white font-bold text-xs rounded-lg transition flex items-center justify-center gap-1 disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed"
                  >
                    <Plus className="w-3.5 h-3.5" /> Crear
                  </button>
                </form>

                {/* TABLA DE CLASES */}
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                        <th className="p-2 text-left">Clase</th>
                        <th className="p-2 text-center w-24">Aplica a</th>
                        <th className="p-2 text-center w-20">Estado</th>
                        <th className="p-2 text-right w-32">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {listaGrupos.map((g) => (
                        <tr key={g.id} className="border-b border-slate-100 hover:bg-slate-50">
                          {editandoGrupoId === g.id ? (
                            <>
                              <td className="p-2">
                                <input
                                  type="text"
                                  value={grupoEditForm.nombre}
                                  onChange={(e) => setGrupoEditForm({ ...grupoEditForm, nombre: e.target.value })}
                                  className="w-full px-2 py-1 text-xs border rounded font-bold"
                                />
                              </td>
                              <td className="p-2 text-center">
                                <select
                                  value={grupoEditForm.aplica_a}
                                  onChange={(e) => setGrupoEditForm({ ...grupoEditForm, aplica_a: e.target.value })}
                                  className="px-1 py-1 text-xs border rounded"
                                >
                                  <option value="domingo">Domingo</option>
                                  <option value="miercoles">Miércoles</option>
                                  <option value="ambos">Ambos</option>
                                </select>
                              </td>
                              <td className="p-2 text-center">-</td>
                              <td className="p-2 text-right space-x-1">
                                <button
                                  onClick={() => guardarEdicionGrupo(g.id)}
                                  className="p-1 bg-emerald-600 text-white rounded hover:bg-emerald-700"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => setEditandoGrupoId(null)}
                                  className="p-1 bg-slate-400 text-white rounded hover:bg-slate-500"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="p-2 font-bold text-slate-700">{g.nombre}</td>
                              <td className="p-2 text-center capitalize text-slate-500 font-medium">{g.aplica_a}</td>
                              <td className="p-2 text-center">
                                <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                                  g.activo ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                                }`}>
                                  {g.activo ? 'Activo' : 'Inactivo'}
                                </span>
                              </td>
                              <td className="p-2 text-right space-x-1">
                                <button
                                  onClick={() => alternarEstadoGrupo(g)}
                                  disabled={!modoEdicionConfig}
                                  title={g.activo ? 'Desactivar clase' : 'Activar clase'}
                                  className="p-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                  {g.activo ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                                </button>
                                <button
                                  onClick={() => {
                                    if (!modoEdicionConfig) return;
                                    setEditandoGrupoId(g.id);
                                    setGrupoEditForm({ nombre: g.nombre, aplica_a: g.aplica_a, orden: g.orden });
                                  }}
                                  disabled={!modoEdicionConfig}
                                  className="p-1 bg-amber-100 hover:bg-amber-200 text-amber-800 rounded disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => eliminarGrupo(g.id)}
                                  disabled={!modoEdicionConfig}
                                  className="p-1 bg-rose-100 hover:bg-rose-200 text-rose-700 rounded disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* MODAL EDITAR REGISTRO */}
      {mostrarModalEditar && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl max-w-xl w-full p-5 border border-slate-200 my-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <div className="flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-amber-600" />
                <h3 className="text-base font-bold text-slate-800">
                  Modificar Registro ({formatearFechaLatina(editFecha)})
                </h3>
              </div>
              <button onClick={() => setMostrarModalEditar(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4 p-2.5 bg-slate-50 rounded-lg border border-slate-200">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Fecha</label>
                <div className="relative">
                  <div className="w-full p-1.5 bg-white border border-slate-300 rounded-md font-bold text-xs flex items-center justify-between pointer-events-none">
                    <span>{formatearFechaLatina(editFecha)}</span>
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                  <input
                    type="date"
                    value={editFecha}
                    onChange={(e) => {
                      setEditFecha(e.target.value);
                      const d = new Date(e.target.value + 'T00:00:00');
                      const t = d.getDay() === 3 ? 'Tarde' : 'Mañana';
                      setEditTurno(t);
                      cargarDatosParaEditar(e.target.value, t);
                    }}
                    className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Turno</label>
                <div className="flex gap-1">
                  {['Mañana', 'Tarde'].map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => {
                        setEditTurno(t);
                        cargarDatosParaEditar(editFecha, t);
                      }}
                      className={`flex-1 py-1 rounded text-xs font-bold ${
                        editTurno === t ? 'bg-amber-600 text-white' : 'bg-white border text-slate-600'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {cargandoModal ? (
              <div className="py-8 text-center text-slate-400 font-medium animate-pulse text-xs">Cargando datos...</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[45vh] overflow-y-auto pr-1">
                {gruposAmostrarEdit.map((g) => (
                  <div key={g.id} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="font-bold text-xs text-slate-700 truncate pr-2">{g.nombre}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => setEditCantidades({ ...editCantidades, [g.nombre]: Math.max(0, (editCantidades[g.nombre] || 0) - 1) })}
                        className="w-7 h-7 flex items-center justify-center bg-white border rounded font-bold text-slate-700 text-xs"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <input
                        type="number"
                        min="0"
                        value={editCantidades[g.nombre] ?? 0}
                        onChange={(e) => setEditCantidades({ ...editCantidades, [g.nombre]: Math.max(0, parseInt(e.target.value) || 0) })}
                        className="w-10 text-center py-0.5 font-bold bg-white border rounded text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => setEditCantidades({ ...editCantidades, [g.nombre]: (editCantidades[g.nombre] || 0) + 1 })}
                        className="w-7 h-7 flex items-center justify-center bg-amber-600 text-white rounded font-bold text-xs"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button type="button" onClick={() => setMostrarModalEditar(false)} className="px-3 py-2 text-slate-600 font-bold text-xs hover:bg-slate-100 rounded-lg">Cancelar</button>
              <button type="button" onClick={guardarEdicionModal} disabled={cargandoModal} className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg shadow flex items-center gap-1.5">
                <Save className="w-3.5 h-3.5" /> Guardar Cambios
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// VISTAS DE PANTALLA DE REPORTES
function VistaReporteMensual({ datos, mesNombre, anio, config }) {
  const fechasMap = {};
  datos.forEach(item => {
    const f = item.fecha;
    if (!fechasMap[f]) {
      fechasMap[f] = { fecha: f, fechaLatina: formatearFechaLatina(f), clases: {}, totalManana: 0, totalTarde: 0, totalFecha: 0 };
    }
    if (!fechasMap[f].clases[item.clase]) {
      fechasMap[f].clases[item.clase] = { manana: 0, tarde: 0, total: 0 };
    }
    if (item.turno === 'Mañana') {
      fechasMap[f].clases[item.clase].manana += item.cantidad;
      fechasMap[f].totalManana += item.cantidad;
    } else {
      fechasMap[f].clases[item.clase].tarde += item.cantidad;
      fechasMap[f].totalTarde += item.cantidad;
    }
    fechasMap[f].clases[item.clase].total += item.cantidad;
    fechasMap[f].totalFecha += item.cantidad;
  });

  const fechasOrdenadas = Object.values(fechasMap).sort((a, b) => a.fecha.localeCompare(b.fecha));
  let granTotalManana = 0, granTotalTarde = 0, granTotalGeneral = 0;
  fechasOrdenadas.forEach(f => {
    granTotalManana += f.totalManana;
    granTotalTarde += f.totalTarde;
    granTotalGeneral += f.totalFecha;
  });

  return (
    <div className="bg-white p-4 rounded-xl border border-slate-200 font-sans">
      <div className="flex justify-between items-center mb-4 border-b pb-3">
        <div className="flex items-center gap-3">
          {config.logo_url ? (
            <img src={config.logo_url} alt="Logo" className="w-10 h-10 rounded object-cover" />
          ) : (
            <div className="w-10 h-10 bg-amber-700 text-white font-black text-xl flex items-center justify-center rounded">✝</div>
          )}
          <div>
            <p className="font-bold text-xs text-amber-900 uppercase">{config.nombre_iglesia}</p>
            <p className="text-[10px] text-slate-500">{config.direccion}</p>
          </div>
        </div>
        <div className="text-right">
          <h3 className="text-base font-black text-slate-800 tracking-tight">REPORTE MENSUAL</h3>
          <p className="text-xs font-bold text-amber-800">MES: {mesNombre?.toUpperCase()} | AÑO: {anio}</p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-amber-700 text-white font-bold">
              <th className="p-2 border border-amber-800 text-left">FECHA</th>
              <th className="p-2 border border-amber-800 text-left">CLASE</th>
              <th className="p-2 border border-amber-800 text-center w-24">Mañana</th>
              <th className="p-2 border border-amber-800 text-center w-24">Tarde</th>
              <th className="p-2 border border-amber-800 text-center w-28">Total general</th>
            </tr>
          </thead>
          <tbody>
            {fechasOrdenadas.map((bloque) => {
              const listaClases = Object.entries(bloque.clases);
              return (
                <React.Fragment key={bloque.fecha}>
                  {listaClases.map(([nombreClase, val], idx) => (
                    <tr key={nombreClase} className="border-b border-slate-200 hover:bg-amber-50/50">
                      <td className="p-1.5 border-x border-slate-200 font-semibold text-slate-700">{idx === 0 ? bloque.fechaLatina : ''}</td>
                      <td className="p-1.5 border-x border-slate-200 text-slate-800">{nombreClase}</td>
                      <td className="p-1.5 border-x border-slate-200 text-center">{val.manana}</td>
                      <td className="p-1.5 border-x border-slate-200 text-center">{val.tarde}</td>
                      <td className="p-1.5 border-x border-slate-200 text-center font-bold">{val.total}</td>
                    </tr>
                  ))}
                  <tr className="bg-amber-100/80 font-bold text-amber-950 border-y-2 border-amber-300">
                    <td colSpan={2} className="p-2 border border-amber-200">Total {bloque.fechaLatina}</td>
                    <td className="p-2 text-center border border-amber-200">{bloque.totalManana}</td>
                    <td className="p-2 text-center border border-amber-200">{bloque.totalTarde}</td>
                    <td className="p-2 text-center border border-amber-200">{bloque.totalFecha}</td>
                  </tr>
                </React.Fragment>
              );
            })}
            <tr className="bg-amber-900 text-white font-black text-sm">
              <td colSpan={2} className="p-2.5">Total general</td>
              <td className="p-2.5 text-center">{granTotalManana}</td>
              <td className="p-2.5 text-center">{granTotalTarde}</td>
              <td className="p-2.5 text-center">{granTotalGeneral}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function VistaReporteAnual({ datos, anio, config }) {
  const mesesMap = {};
  MESES.forEach(m => {
    mesesMap[m.id] = { numMes: parseInt(m.id), nombreMes: m.nombre.toUpperCase(), clases: {}, totalManana: 0, totalTarde: 0, totalMes: 0 };
  });

  datos.forEach(item => {
    const mId = item.fecha.split('-')[1];
    if (mesesMap[mId]) {
      if (!mesesMap[mId].clases[item.clase]) {
        mesesMap[mId].clases[item.clase] = { manana: 0, tarde: 0, total: 0 };
      }
      if (item.turno === 'Mañana') {
        mesesMap[mId].clases[item.clase].manana += item.cantidad;
        mesesMap[mId].totalManana += item.cantidad;
      } else {
        mesesMap[mId].clases[item.clase].tarde += item.cantidad;
        mesesMap[mId].totalTarde += item.cantidad;
      }
      mesesMap[mId].clases[item.clase].total += item.cantidad;
      mesesMap[mId].totalMes += item.cantidad;
    }
  });

  const mesesConDatos = Object.values(mesesMap).filter(m => m.totalMes > 0 || Object.keys(m.clases).length > 0);
  let granTotalManana = 0, granTotalTarde = 0, granTotalAnio = 0;
  mesesConDatos.forEach(m => {
    granTotalManana += m.totalManana;
    granTotalTarde += m.totalTarde;
    granTotalAnio += m.totalMes;
  });

  return (
    <div className="bg-white p-4 rounded-xl border border-slate-200 font-sans">
      <div className="flex justify-between items-center mb-4 border-b pb-3">
        <div className="flex items-center gap-3">
          {config.logo_url ? (
            <img src={config.logo_url} alt="Logo" className="w-10 h-10 rounded object-cover" />
          ) : (
            <div className="w-10 h-10 bg-amber-700 text-white font-black text-xl flex items-center justify-center rounded">✝</div>
          )}
          <div>
            <p className="font-bold text-xs text-amber-900 uppercase">{config.nombre_iglesia}</p>
            <p className="text-[10px] text-slate-500">{config.direccion}</p>
          </div>
        </div>
        <div className="text-right">
          <h3 className="text-base font-black text-slate-800 tracking-tight">REPORTE ANUAL</h3>
          <p className="text-xs font-bold text-amber-800">AÑO: {anio}</p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-amber-700 text-white font-bold">
              <th className="p-2 border border-amber-800 text-center w-12">MES</th>
              <th className="p-2 border border-amber-800 text-left w-28">MESNom</th>
              <th className="p-2 border border-amber-800 text-left">CLASE</th>
              <th className="p-2 border border-amber-800 text-center w-24">Mañana</th>
              <th className="p-2 border border-amber-800 text-center w-24">Tarde</th>
              <th className="p-2 border border-amber-800 text-center w-28">Total general</th>
            </tr>
          </thead>
          <tbody>
            {mesesConDatos.map((mes) => {
              const listaClases = Object.entries(mes.clases);
              return (
                <React.Fragment key={mes.numMes}>
                  {listaClases.map(([nombreClase, val], idx) => (
                    <tr key={nombreClase} className="border-b border-slate-200 hover:bg-amber-50/50">
                      <td className="p-1.5 border-x border-slate-200 text-center font-bold text-slate-600">{idx === 0 ? mes.numMes : ''}</td>
                      <td className="p-1.5 border-x border-slate-200 font-bold text-slate-800">{idx === 0 ? mes.nombreMes : ''}</td>
                      <td className="p-1.5 border-x border-slate-200 text-slate-800">{nombreClase}</td>
                      <td className="p-1.5 border-x border-slate-200 text-center">{val.manana}</td>
                      <td className="p-1.5 border-x border-slate-200 text-center">{val.tarde}</td>
                      <td className="p-1.5 border-x border-slate-200 text-center font-bold">{val.total}</td>
                    </tr>
                  ))}
                  <tr className="bg-amber-100/80 font-bold text-amber-950 border-y-2 border-amber-300">
                    <td colSpan={3} className="p-2 border border-amber-200">Total {mes.numMes}</td>
                    <td className="p-2 text-center border border-amber-200">{mes.totalManana}</td>
                    <td className="p-2 text-center border border-amber-200">{mes.totalTarde}</td>
                    <td className="p-2 text-center border border-amber-200">{mes.totalMes}</td>
                  </tr>
                </React.Fragment>
              );
            })}
            <tr className="bg-amber-900 text-white font-black text-sm">
              <td colSpan={3} className="p-2.5">Total general</td>
              <td className="p-2.5 text-center">{granTotalManana}</td>
              <td className="p-2.5 text-center">{granTotalTarde}</td>
              <td className="p-2.5 text-center">{granTotalAnio}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function VistaPromedios({ datos, anio, promedioMes, config }) {
  const fechasDomManana = new Set(datos.filter(d => d.turno === 'Mañana').map(d => d.fecha));
  const fechasDomTarde = new Set(
    datos.filter(d => d.turno === 'Tarde' && new Date(d.fecha + 'T00:00:00').getDay() !== 3).map(d => d.fecha)
  );
  const fechasMiercoles = new Set(
    datos.filter(d => new Date(d.fecha + 'T00:00:00').getDay() === 3).map(d => d.fecha)
  );

  const numDomManana = fechasDomManana.size || 1;
  const numDomTarde = fechasDomTarde.size || 1;
  const numMiercoles = fechasMiercoles.size || 1;

  const domMananaClases = {};
  const domTardeClases = {};
  const miercolesClases = {};

  datos.forEach(item => {
    const esMiercoles = new Date(item.fecha + 'T00:00:00').getDay() === 3;
    if (esMiercoles) {
      miercolesClases[item.clase] = (miercolesClases[item.clase] || 0) + item.cantidad;
    } else if (item.turno === 'Mañana') {
      domMananaClases[item.clase] = (domMananaClases[item.clase] || 0) + item.cantidad;
    } else if (item.turno === 'Tarde') {
      domTardeClases[item.clase] = (domTardeClases[item.clase] || 0) + item.cantidad;
    }
  });

  const calcularFilas = (objetoClases, totalCultos) => {
    return Object.entries(objetoClases).map(([clase, suma]) => ({
      clase,
      promedio: Number((suma / totalCultos).toFixed(1))
    }));
  };

  const rowsDomManana = calcularFilas(domMananaClases, numDomManana);
  const rowsDomTarde = calcularFilas(domTardeClases, numDomTarde);
  const rowsMiercoles = calcularFilas(miercolesClases, numMiercoles);

  const subtotalDomManana = rowsDomManana.reduce((a, b) => a + b.promedio, 0);
  const subtotalDomTarde = rowsDomTarde.reduce((a, b) => a + b.promedio, 0);
  const subtotalMiercoles = rowsMiercoles.reduce((a, b) => a + b.promedio, 0);

  const totalGeneralPromedio = Number((subtotalDomManana + subtotalDomTarde + subtotalMiercoles).toFixed(1));

  return (
    <div className="max-w-3xl mx-auto bg-white p-4 rounded-xl border border-slate-200 font-sans space-y-4">
      <div className="flex justify-between items-center border-b pb-3">
        <div className="flex items-center gap-3">
          {config.logo_url ? (
            <img src={config.logo_url} alt="Logo" className="w-10 h-10 rounded object-cover" />
          ) : (
            <div className="w-10 h-10 bg-amber-700 text-white font-black text-xl flex items-center justify-center rounded">✝</div>
          )}
          <div>
            <p className="font-bold text-xs text-amber-900 uppercase">{config.nombre_iglesia}</p>
            <p className="text-[10px] text-slate-500">{config.direccion}</p>
          </div>
        </div>
        <div className="text-right">
          <h3 className="text-base font-black text-slate-800 tracking-tight">PROMEDIOS DE ASISTENCIA</h3>
          <p className="text-xs font-bold text-amber-800">
            {promedioMes === 'ALL' || !promedioMes
              ? `AÑO: ${anio}`
              : `${MESES.find(m => m.id === promedioMes)?.nombre.toUpperCase()} ${anio}`}
          </p>
        </div>
      </div>

      {/* TABLA DOMINGO MAÑANA */}
      <div>
        <h4 className="text-xs font-bold text-amber-900 uppercase mb-1">Cultos Dominicales - Turno Mañana ({numDomManana} cultos)</h4>
        <table className="w-full text-xs border-collapse border border-slate-200">
          <thead>
            <tr className="bg-amber-700 text-white font-bold">
              <th className="p-1.5 text-left border">Clase / Grupo</th>
              <th className="p-1.5 text-center w-28 border">Promedio</th>
            </tr>
          </thead>
          <tbody>
            {rowsDomManana.length === 0 ? (
              <tr><td colSpan={2} className="p-2 text-center text-slate-400">Sin datos registrados</td></tr>
            ) : (
              rowsDomManana.map(r => (
                <tr key={r.clase} className="border-b hover:bg-amber-50/50">
                  <td className="p-1.5 border">{r.clase}</td>
                  <td className="p-1.5 border text-center font-bold">{r.promedio}</td>
                </tr>
              ))
            )}
            <tr className="bg-amber-100 font-bold text-amber-950">
              <td className="p-1.5 border">Subtotal Mañana</td>
              <td className="p-1.5 border text-center">{subtotalDomManana.toFixed(1)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* TABLA DOMINGO TARDE */}
      <div>
        <h4 className="text-xs font-bold text-amber-900 uppercase mb-1">Cultos Dominicales - Turno Tarde ({numDomTarde} cultos)</h4>
        <table className="w-full text-xs border-collapse border border-slate-200">
          <thead>
            <tr className="bg-amber-700 text-white font-bold">
              <th className="p-1.5 text-left border">Clase / Grupo</th>
              <th className="p-1.5 text-center w-28 border">Promedio</th>
            </tr>
          </thead>
          <tbody>
            {rowsDomTarde.length === 0 ? (
              <tr><td colSpan={2} className="p-2 text-center text-slate-400">Sin datos registrados</td></tr>
            ) : (
              rowsDomTarde.map(r => (
                <tr key={r.clase} className="border-b hover:bg-amber-50/50">
                  <td className="p-1.5 border">{r.clase}</td>
                  <td className="p-1.5 border text-center font-bold">{r.promedio}</td>
                </tr>
              ))
            )}
            <tr className="bg-amber-100 font-bold text-amber-950">
              <td className="p-1.5 border">Subtotal Tarde</td>
              <td className="p-1.5 border text-center">{subtotalDomTarde.toFixed(1)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* TABLA MIÉRCOLES */}
      <div>
        <h4 className="text-xs font-bold text-amber-900 uppercase mb-1">Cultos de Miércoles ({numMiercoles} cultos)</h4>
        <table className="w-full text-xs border-collapse border border-slate-200">
          <thead>
            <tr className="bg-amber-700 text-white font-bold">
              <th className="p-1.5 text-left border">Clase / Grupo</th>
              <th className="p-1.5 text-center w-28 border">Promedio</th>
            </tr>
          </thead>
          <tbody>
            {rowsMiercoles.length === 0 ? (
              <tr><td colSpan={2} className="p-2 text-center text-slate-400">Sin datos registrados</td></tr>
            ) : (
              rowsMiercoles.map(r => (
                <tr key={r.clase} className="border-b hover:bg-amber-50/50">
                  <td className="p-1.5 border">{r.clase}</td>
                  <td className="p-1.5 border text-center font-bold">{r.promedio}</td>
                </tr>
              ))
            )}
            <tr className="bg-amber-100 font-bold text-amber-950">
              <td className="p-1.5 border">Subtotal Miércoles</td>
              <td className="p-1.5 border text-center">{subtotalMiercoles.toFixed(1)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* TOTAL GENERAL DE PROMEDIOS */}
      <div className="bg-amber-900 text-white p-3 rounded-xl flex justify-between items-center font-black text-sm">
        <span>PROMEDIO GENERAL DE ASISTENCIA</span>
        <span>{totalGeneralPromedio}</span>
      </div>
    </div>
  );
}