import React from 'react';
import { Document, Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer';
import { agrupar, calcularPromedios, construirBitacora, fechaLatina, MESES_NOMBRES } from './ReportesVista';

// ===================== Estilo formal común =====================
const C = {
  tinta: '#1f2933',
  suave: '#52606d',
  linea: '#d9dee3',
  fondo: '#f5f7f8',
  cabecera: '#2b2f33',
  acento: '#1f5f6b',
};

const s = StyleSheet.create({
  page: { paddingTop: 28, paddingBottom: 46, paddingHorizontal: 32, fontSize: 8.5, fontFamily: 'Helvetica', color: C.tinta },

  encabezado: { flexDirection: 'row', alignItems: 'center', paddingBottom: 10, marginBottom: 4, borderBottomWidth: 2, borderBottomColor: C.cabecera },
  logo: { width: 38, height: 38, marginRight: 10, objectFit: 'contain' },
  iglesia: { fontSize: 11.5, fontFamily: 'Helvetica-Bold', color: C.cabecera },
  direccion: { fontSize: 8, color: C.suave, marginTop: 2 },
  titulo: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: C.cabecera, textAlign: 'right', letterSpacing: 0.5 },
  periodo: { fontSize: 9, color: C.acento, fontFamily: 'Helvetica-Bold', textAlign: 'right', marginTop: 2 },
  franja: { height: 3, backgroundColor: C.acento, marginBottom: 12 },

  resumen: { flexDirection: 'row', marginBottom: 12 },
  caja: { flex: 1, borderWidth: 1, borderColor: C.linea, borderRadius: 3, padding: 7, marginRight: 6 },
  cajaUltima: { marginRight: 0, backgroundColor: C.cabecera, borderColor: C.cabecera },
  cajaEtiqueta: { fontSize: 6.5, color: C.suave, textTransform: 'uppercase', letterSpacing: 0.5 },
  cajaValor: { fontSize: 14, fontFamily: 'Helvetica-Bold', marginTop: 2 },

  tabla: { width: '100%', borderWidth: 1, borderColor: C.linea },
  thFila: { flexDirection: 'row', backgroundColor: C.cabecera, paddingVertical: 5, paddingHorizontal: 6 },
  th: { color: '#ffffff', fontFamily: 'Helvetica-Bold', fontSize: 7.5, letterSpacing: 0.4 },
  fila: { flexDirection: 'row', paddingVertical: 3, paddingHorizontal: 6, borderBottomWidth: 0.5, borderBottomColor: C.linea },
  filaPar: { backgroundColor: C.fondo },
  grupoFila: { flexDirection: 'row', paddingVertical: 4, paddingHorizontal: 6, backgroundColor: '#e7ecef', borderTopWidth: 1, borderTopColor: C.linea },
  subtotal: { flexDirection: 'row', paddingVertical: 4, paddingHorizontal: 6, borderTopWidth: 1, borderTopColor: C.suave, borderBottomWidth: 1, borderBottomColor: C.linea },
  totalFila: { flexDirection: 'row', paddingVertical: 6, paddingHorizontal: 6, backgroundColor: C.acento },
  td: { fontSize: 8 },
  tdNegrita: { fontSize: 8, fontFamily: 'Helvetica-Bold' },
  tdBlanco: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#ffffff' },

  pie: { position: 'absolute', bottom: 20, left: 32, right: 32, flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 0.5, borderTopColor: C.linea, paddingTop: 5, fontSize: 7, color: C.suave },
});

const hoy = () => new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });

function Encabezado({ config, titulo, periodo }) {
  return (
    <View fixed>
      <View style={s.encabezado}>
        {config.logo_url ? <Image src={config.logo_url} style={s.logo} /> : null}
        <View style={{ flex: 1 }}>
          <Text style={s.iglesia}>{config.nombre_iglesia || 'Iglesia Evangélica'}</Text>
          {config.direccion ? <Text style={s.direccion}>{config.direccion}</Text> : null}
        </View>
        <View>
          <Text style={s.titulo}>{titulo}</Text>
          <Text style={s.periodo}>{periodo}</Text>
        </View>
      </View>
      <View style={s.franja} />
    </View>
  );
}

function Pie({ config }) {
  return (
    <View style={s.pie} fixed>
      <Text>{config.nombre_iglesia || ''} · Emitido el {hoy()}</Text>
      <Text render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
    </View>
  );
}

function Resumen({ items }) {
  return (
    <View style={s.resumen}>
      {items.map((it, i) => {
        const ultima = i === items.length - 1;
        return (
          <View key={it.etiqueta} style={[s.caja, ultima && s.cajaUltima]}>
            <Text style={[s.cajaEtiqueta, ultima && { color: '#cbd2d9' }]}>{it.etiqueta}</Text>
            <Text style={[s.cajaValor, ultima && { color: '#ffffff' }]}>{it.valor}</Text>
          </View>
        );
      })}
    </View>
  );
}

function resumenAsistencia(datos) {
  const cultos = new Set(datos.map((d) => `${d.fecha}|${d.turno}`)).size;
  const total = datos.reduce((a, d) => a + d.cantidad, 0);
  const visitas = datos.filter((d) => d.clase.toLowerCase().includes('visita')).reduce((a, d) => a + d.cantidad, 0);
  return [
    { etiqueta: 'Cultos', valor: cultos },
    { etiqueta: 'Visitas', valor: visitas },
    { etiqueta: 'Media por culto', valor: cultos ? (total / cultos).toFixed(1) : '0' },
    { etiqueta: 'Asistencia total', valor: total },
  ];
}

// Columnas comunes: [etiqueta del bloque, clase, mañana, tarde, total]
const W = { bloque: '22%', clase: '36%', num: '14%' };

function TablaAgrupada({ grupos, etiqueta, textoSubtotal, textoTotal }) {
  const tot = grupos.reduce((a, g) => ({ m: a.m + g.manana, t: a.t + g.tarde, s: a.s + g.total }), { m: 0, t: 0, s: 0 });
  return (
    <View style={s.tabla}>
      <View style={s.thFila} fixed>
        <Text style={[s.th, { width: W.bloque }]}>{etiqueta.toUpperCase()}</Text>
        <Text style={[s.th, { width: W.clase }]}>GRUPO</Text>
        <Text style={[s.th, { width: W.num, textAlign: 'right' }]}>MAÑANA</Text>
        <Text style={[s.th, { width: W.num, textAlign: 'right' }]}>TARDE</Text>
        <Text style={[s.th, { width: W.num, textAlign: 'right' }]}>TOTAL</Text>
      </View>
      {grupos.map((g) => (
        <View key={g.clave} wrap={false}>
          {Object.entries(g.clases).map(([clase, v], i) => (
            <View key={clase} style={[s.fila, i % 2 === 1 && s.filaPar]}>
              <Text style={[s.tdNegrita, { width: W.bloque, color: C.suave }]}>{i === 0 ? g.titulo : ''}</Text>
              <Text style={[s.td, { width: W.clase }]}>{clase}</Text>
              <Text style={[s.td, { width: W.num, textAlign: 'right' }]}>{v.manana}</Text>
              <Text style={[s.td, { width: W.num, textAlign: 'right' }]}>{v.tarde}</Text>
              <Text style={[s.tdNegrita, { width: W.num, textAlign: 'right' }]}>{v.total}</Text>
            </View>
          ))}
          <View style={s.subtotal}>
            <Text style={[s.tdNegrita, { width: '58%' }]}>{textoSubtotal} {g.titulo}</Text>
            <Text style={[s.tdNegrita, { width: W.num, textAlign: 'right' }]}>{g.manana}</Text>
            <Text style={[s.tdNegrita, { width: W.num, textAlign: 'right' }]}>{g.tarde}</Text>
            <Text style={[s.tdNegrita, { width: W.num, textAlign: 'right' }]}>{g.total}</Text>
          </View>
        </View>
      ))}
      <View style={s.totalFila} wrap={false}>
        <Text style={[s.tdBlanco, { width: '58%' }]}>{textoTotal}</Text>
        <Text style={[s.tdBlanco, { width: W.num, textAlign: 'right' }]}>{tot.m}</Text>
        <Text style={[s.tdBlanco, { width: W.num, textAlign: 'right' }]}>{tot.t}</Text>
        <Text style={[s.tdBlanco, { width: W.num, textAlign: 'right' }]}>{tot.s}</Text>
      </View>
    </View>
  );
}

// ===================== 1. Reporte mensual =====================
export const ReporteMensualPDF = ({ datos = [], mesNombre = '', anio = '', config = {} }) => {
  const grupos = agrupar(datos, (d) => d.fecha).map((g) => ({ ...g, titulo: fechaLatina(g.clave) }));
  return (
    <Document title={`Reporte mensual ${mesNombre} ${anio}`}>
      <Page size="A4" style={s.page}>
        <Encabezado config={config} titulo="REPORTE MENSUAL" periodo={`${(mesNombre || '').toUpperCase()} ${anio}`} />
        <Resumen items={resumenAsistencia(datos)} />
        <TablaAgrupada grupos={grupos} etiqueta="Fecha" textoSubtotal="Total" textoTotal="TOTAL DEL MES" />
        <Pie config={config} />
      </Page>
    </Document>
  );
};

// ===================== 2. Reporte anual =====================
export const ReporteAnualPDF = ({ datos = [], anio = '', config = {} }) => {
  const grupos = agrupar(datos, (d) => d.fecha.slice(5, 7)).map((g) => ({ ...g, titulo: MESES_NOMBRES[parseInt(g.clave, 10) - 1] }));
  return (
    <Document title={`Reporte anual ${anio}`}>
      <Page size="A4" style={s.page}>
        <Encabezado config={config} titulo="REPORTE ANUAL" periodo={`AÑO ${anio}`} />
        <Resumen items={resumenAsistencia(datos)} />
        <TablaAgrupada grupos={grupos} etiqueta="Mes" textoSubtotal="Subtotal" textoTotal="TOTAL DEL AÑO" />
        <Pie config={config} />
      </Page>
    </Document>
  );
};

// ===================== 3. Promedios =====================
export const ReportePromediosPDF = ({ datos = [], anio = '', mesNombre = '', config = {} }) => {
  const { bloques, total } = calcularPromedios(datos);
  return (
    <Document title={`Promedios de asistencia ${anio}`}>
      <Page size="A4" style={s.page}>
        <Encabezado config={config} titulo="PROMEDIOS DE ASISTENCIA" periodo={mesNombre ? `${mesNombre.toUpperCase()} ${anio}` : `AÑO ${anio}`} />
        <Resumen items={[
          ...bloques.map((b) => ({ etiqueta: `${b.titulo} (${b.n})`, valor: b.subtotal.toFixed(1) })),
          { etiqueta: 'Promedio acumulado', valor: total.toFixed(1) },
        ]} />
        <View style={s.tabla}>
          <View style={s.thFila}>
            <Text style={[s.th, { width: '75%' }]}>CULTO / GRUPO</Text>
            <Text style={[s.th, { width: '25%', textAlign: 'right' }]}>PROMEDIO</Text>
          </View>
          {bloques.filter((b) => b.filas.length > 0).map((b) => (
            <View key={b.id} wrap={false}>
              <View style={s.grupoFila}>
                <Text style={[s.tdNegrita, { width: '75%' }]}>{b.titulo} ({b.n} cultos)</Text>
                <Text style={[s.tdNegrita, { width: '25%', textAlign: 'right' }]}>{b.subtotal.toFixed(1)}</Text>
              </View>
              {b.filas.map((f, i) => (
                <View key={f.clase} style={[s.fila, i % 2 === 1 && s.filaPar]}>
                  <Text style={[s.td, { width: '75%', paddingLeft: 10 }]}>{f.clase}</Text>
                  <Text style={[s.tdNegrita, { width: '25%', textAlign: 'right' }]}>{f.promedio.toFixed(1)}</Text>
                </View>
              ))}
            </View>
          ))}
          <View style={s.totalFila}>
            <Text style={[s.tdBlanco, { width: '75%' }]}>PROMEDIO TOTAL ACUMULADO</Text>
            <Text style={[s.tdBlanco, { width: '25%', textAlign: 'right' }]}>{total.toFixed(1)}</Text>
          </View>
        </View>
        <Pie config={config} />
      </Page>
    </Document>
  );
};

// ===================== 4. Bitácora de cultos =====================
export const BitacoraCultosPDF = ({ datos = {}, filtro = 'todo', periodo = '', config = {} }) => {
  const { lista, resumen } = construirBitacora(datos, filtro);
  return (
    <Document title={`Bitácora de cultos ${periodo}`}>
      <Page size="A4" style={s.page}>
        <Encabezado config={config} titulo="BITÁCORA DE CULTOS" periodo={periodo.toUpperCase()} />
        <Resumen items={[
          { etiqueta: 'Cultos especiales', valor: resumen.especiales },
          { etiqueta: 'Observaciones', valor: resumen.observaciones },
          { etiqueta: 'Días sin culto', valor: resumen.sinCulto },
          { etiqueta: 'Entradas', valor: lista.length },
        ]} />
        <View style={s.tabla}>
          <View style={s.thFila} fixed>
            <Text style={[s.th, { width: '14%' }]}>FECHA</Text>
            <Text style={[s.th, { width: '10%' }]}>TURNO</Text>
            <Text style={[s.th, { width: '64%' }]}>DETALLE</Text>
            <Text style={[s.th, { width: '12%', textAlign: 'right' }]}>ASIST.</Text>
          </View>
          {lista.length === 0 && (
            <View style={s.fila}><Text style={[s.td, { color: C.suave }]}>Sin entradas en este periodo.</Text></View>
          )}
          {lista.map((f, i) => (
            <View key={`${f.fecha}|${f.turno}`} style={[s.fila, i % 2 === 1 && s.filaPar]} wrap={false}>
              <Text style={[s.tdNegrita, { width: '14%' }]}>{fechaLatina(f.fecha)}</Text>
              <Text style={[s.td, { width: '10%' }]}>{f.turno}</Text>
              <View style={{ width: '64%' }}>
                {f.especial ? <Text style={s.td}><Text style={s.tdNegrita}>Especial: </Text>{f.especial}</Text> : null}
                {f.observacion ? <Text style={s.td}><Text style={s.tdNegrita}>Observación: </Text>{f.observacion}</Text> : null}
                {f.sinCulto ? <Text style={s.td}><Text style={s.tdNegrita}>No hubo culto: </Text>{f.sinCulto}</Text> : null}
              </View>
              <Text style={[s.tdNegrita, { width: '12%', textAlign: 'right' }]}>{f.total ?? '—'}</Text>
            </View>
          ))}
        </View>
        <Pie config={config} />
      </Page>
    </Document>
  );
};
