import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

const formatearFechaLatina = (fechaISO) => {
  if (!fechaISO) return '';
  const partes = fechaISO.split('-');
  if (partes.length !== 3) return fechaISO;
  const [yyyy, mm, dd] = partes;
  return `${dd}/${mm}/${yyyy}`;
};

const MESES = [
  { id: '01', nombre: 'ENERO' },
  { id: '02', nombre: 'FEBRERO' },
  { id: '03', nombre: 'MARZO' },
  { id: '04', nombre: 'ABRIL' },
  { id: '05', nombre: 'MAYO' },
  { id: '06', nombre: 'JUNIO' },
  { id: '07', nombre: 'JULIO' },
  { id: '08', nombre: 'AGOSTO' },
  { id: '09', nombre: 'SEPTIEMBRE' },
  { id: '10', nombre: 'OCTUBRE' },
  { id: '11', nombre: 'NOVIEMBRE' },
  { id: '12', nombre: 'DICIEMBRE' }
];

// Estilos minimalistas de alta densidad para PDF impreso
const styles = StyleSheet.create({
  page: {
    padding: 24,
    fontSize: 8,
    fontFamily: 'Helvetica',
    color: '#1e293b',
  },
  header: {
    marginBottom: 10,
    borderBottomWidth: 1.5,
    borderBottomColor: '#0f172a',
    paddingBottom: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  churchName: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  churchSub: {
    fontSize: 7,
    color: '#64748b',
  },
  reportTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#0f172a',
    textAlign: 'right',
  },
  reportSub: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#475569',
    textAlign: 'right',
  },
  table: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    marginTop: 4,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#0f172a',
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  tableHeaderCell: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 7.5,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#e2e8f0',
    paddingVertical: 2.5,
    paddingHorizontal: 4,
  },
  subtotalRow: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderBottomWidth: 1,
    borderBottomColor: '#cbd5e1',
    paddingVertical: 3,
    paddingHorizontal: 4,
  },
  grandTotalRow: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderTopWidth: 1.5,
    borderBottomWidth: 1.5,
    borderColor: '#0f172a',
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  textCell: {
    fontSize: 7.5,
  },
  textCellBold: {
    fontSize: 7.5,
    fontWeight: 'bold',
  },
  textDarkBold: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#0f172a',
  },
});

// 1. PLANTILLA REPORTE MENSUAL
export const ReporteMensualPDF = ({ datos = [], mesNombre = '', anio = '', config = {} }) => {
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
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.churchName}>{config.nombre_iglesia || 'Iglesia Evangélica'}</Text>
            <Text style={styles.churchSub}>{config.direccion || ''}</Text>
          </View>
          <View>
            <Text style={styles.reportTitle}>REPORTE MENSUAL</Text>
            <Text style={styles.reportSub}>{mesNombre?.toUpperCase()} - {anio}</Text>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, { width: '20%' }]}>FECHA</Text>
            <Text style={[styles.tableHeaderCell, { width: '40%' }]}>CLASE</Text>
            <Text style={[styles.tableHeaderCell, { width: '13%', textAlign: 'center' }]}>MAÑANA</Text>
            <Text style={[styles.tableHeaderCell, { width: '13%', textAlign: 'center' }]}>TARDE</Text>
            <Text style={[styles.tableHeaderCell, { width: '14%', textAlign: 'right' }]}>TOTAL</Text>
          </View>

          {fechasOrdenadas.map((bloque) => {
            const listaClases = Object.entries(bloque.clases);
            return (
              <React.Fragment key={bloque.fecha}>
                {listaClases.map(([nombreClase, val], idx) => (
                  <View style={styles.tableRow} key={nombreClase}>
                    <Text style={[styles.textCellBold, { width: '20%', color: '#475569' }]}>
                      {idx === 0 ? bloque.fechaLatina : ''}
                    </Text>
                    <Text style={[styles.textCell, { width: '40%' }]}>{nombreClase}</Text>
                    <Text style={[styles.textCell, { width: '13%', textAlign: 'center' }]}>{val.manana}</Text>
                    <Text style={[styles.textCell, { width: '13%', textAlign: 'center' }]}>{val.tarde}</Text>
                    <Text style={[styles.textCellBold, { width: '14%', textAlign: 'right' }]}>{val.total}</Text>
                  </View>
                ))}
                <View style={styles.subtotalRow}>
                  <Text style={[styles.textCellBold, { width: '60%', color: '#0f172a' }]}>
                    Total {bloque.fechaLatina}
                  </Text>
                  <Text style={[styles.textCellBold, { width: '13%', textAlign: 'center', color: '#0f172a' }]}>
                    {bloque.totalManana}
                  </Text>
                  <Text style={[styles.textCellBold, { width: '13%', textAlign: 'center', color: '#0f172a' }]}>
                    {bloque.totalTarde}
                  </Text>
                  <Text style={[styles.textCellBold, { width: '14%', textAlign: 'right', color: '#0f172a' }]}>
                    {bloque.totalFecha}
                  </Text>
                </View>
              </React.Fragment>
            );
          })}

          <View style={styles.grandTotalRow}>
            <Text style={[styles.textDarkBold, { width: '60%' }]}>TOTAL GENERAL</Text>
            <Text style={[styles.textDarkBold, { width: '13%', textAlign: 'center' }]}>{granTotalManana}</Text>
            <Text style={[styles.textDarkBold, { width: '13%', textAlign: 'center' }]}>{granTotalTarde}</Text>
            <Text style={[styles.textDarkBold, { width: '14%', textAlign: 'right' }]}>{granTotalGeneral}</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
};

// 2. PLANTILLA REPORTE ANUAL
export const ReporteAnualPDF = ({ datos = [], anio = '', config = {} }) => {
  const mesesMap = {};
  MESES.forEach(m => {
    mesesMap[m.id] = { numMes: parseInt(m.id), nombreMes: m.nombre, clases: {}, totalManana: 0, totalTarde: 0, totalMes: 0 };
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
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.churchName}>{config.nombre_iglesia || 'Iglesia Evangélica'}</Text>
            <Text style={styles.churchSub}>{config.direccion || ''}</Text>
          </View>
          <View>
            <Text style={styles.reportTitle}>REPORTE ANUAL</Text>
            <Text style={styles.reportSub}>AÑO {anio}</Text>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, { width: '8%', textAlign: 'center' }]}>MES</Text>
            <Text style={[styles.tableHeaderCell, { width: '22%' }]}>NOMBRE MES</Text>
            <Text style={[styles.tableHeaderCell, { width: '30%' }]}>CLASE</Text>
            <Text style={[styles.tableHeaderCell, { width: '13%', textAlign: 'center' }]}>MAÑANA</Text>
            <Text style={[styles.tableHeaderCell, { width: '13%', textAlign: 'center' }]}>TARDE</Text>
            <Text style={[styles.tableHeaderCell, { width: '14%', textAlign: 'right' }]}>TOTAL</Text>
          </View>

          {mesesConDatos.map((mes) => {
            const listaClases = Object.entries(mes.clases);
            return (
              <React.Fragment key={mes.numMes}>
                {listaClases.map(([nombreClase, val], idx) => (
                  <View style={styles.tableRow} key={nombreClase}>
                    <Text style={[styles.textCellBold, { width: '8%', textAlign: 'center', color: '#64748b' }]}>
                      {idx === 0 ? mes.numMes : ''}
                    </Text>
                    <Text style={[styles.textCellBold, { width: '22%', color: '#334155' }]}>
                      {idx === 0 ? mes.nombreMes : ''}
                    </Text>
                    <Text style={[styles.textCell, { width: '30%' }]}>{nombreClase}</Text>
                    <Text style={[styles.textCell, { width: '13%', textAlign: 'center' }]}>{val.manana}</Text>
                    <Text style={[styles.textCell, { width: '13%', textAlign: 'center' }]}>{val.tarde}</Text>
                    <Text style={[styles.textCellBold, { width: '14%', textAlign: 'right' }]}>{val.total}</Text>
                  </View>
                ))}
                <View style={styles.subtotalRow}>
                  <Text style={[styles.textCellBold, { width: '60%', color: '#0f172a' }]}>
                    Subtotal {mes.nombreMes}
                  </Text>
                  <Text style={[styles.textCellBold, { width: '13%', textAlign: 'center', color: '#0f172a' }]}>
                    {mes.totalManana}
                  </Text>
                  <Text style={[styles.textCellBold, { width: '13%', textAlign: 'center', color: '#0f172a' }]}>
                    {mes.totalTarde}
                  </Text>
                  <Text style={[styles.textCellBold, { width: '14%', textAlign: 'right', color: '#0f172a' }]}>
                    {mes.totalMes}
                  </Text>
                </View>
              </React.Fragment>
            );
          })}

          <View style={styles.grandTotalRow}>
            <Text style={[styles.textDarkBold, { width: '60%' }]}>TOTAL ANUAL GENERAL</Text>
            <Text style={[styles.textDarkBold, { width: '13%', textAlign: 'center' }]}>{granTotalManana}</Text>
            <Text style={[styles.textDarkBold, { width: '13%', textAlign: 'center' }]}>{granTotalTarde}</Text>
            <Text style={[styles.textDarkBold, { width: '14%', textAlign: 'right' }]}>{granTotalAnio}</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
};

// 3. PLANTILLA REPORTE PROMEDIOS
export const ReportePromediosPDF = ({ datos = [], anio = '', config = {} }) => {
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
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.churchName}>{config.nombre_iglesia || 'Iglesia Evangélica'}</Text>
            <Text style={styles.churchSub}>{config.direccion || ''}</Text>
          </View>
          <View>
            <Text style={styles.reportTitle}>PROMEDIOS DE ASISTENCIA</Text>
            <Text style={styles.reportSub}>AÑO {anio}</Text>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, { width: '70%' }]}>CULTOS / CLASES</Text>
            <Text style={[styles.tableHeaderCell, { width: '30%', textAlign: 'right' }]}>PROMEDIO ASISTENCIA</Text>
          </View>

          {rowsDomManana.length > 0 && (
            <>
              <View style={styles.subtotalRow}>
                <Text style={[styles.textCellBold, { width: '70%', color: '#0f172a' }]}>
                  Domingo Mañana ({numDomManana} cultos)
                </Text>
                <Text style={[styles.textCellBold, { width: '30%', textAlign: 'right', color: '#0f172a' }]}>
                  {subtotalDomManana.toFixed(1)}
                </Text>
              </View>
              {rowsDomManana.map(r => (
                <View style={styles.tableRow} key={`dm_${r.clase}`}>
                  <Text style={[styles.textCell, { width: '70%', paddingLeft: 10 }]}>{r.clase}</Text>
                  <Text style={[styles.textCellBold, { width: '30%', textAlign: 'right' }]}>{r.promedio.toFixed(1)}</Text>
                </View>
              ))}
            </>
          )}

          {rowsDomTarde.length > 0 && (
            <>
              <View style={styles.subtotalRow}>
                <Text style={[styles.textCellBold, { width: '70%', color: '#0f172a' }]}>
                  Domingo Tarde ({numDomTarde} cultos)
                </Text>
                <Text style={[styles.textCellBold, { width: '30%', textAlign: 'right', color: '#0f172a' }]}>
                  {subtotalDomTarde.toFixed(1)}
                </Text>
              </View>
              {rowsDomTarde.map(r => (
                <View style={styles.tableRow} key={`dt_${r.clase}`}>
                  <Text style={[styles.textCell, { width: '70%', paddingLeft: 10 }]}>{r.clase}</Text>
                  <Text style={[styles.textCellBold, { width: '30%', textAlign: 'right' }]}>{r.promedio.toFixed(1)}</Text>
                </View>
              ))}
            </>
          )}

          {rowsMiercoles.length > 0 && (
            <>
              <View style={styles.subtotalRow}>
                <Text style={[styles.textCellBold, { width: '70%', color: '#0f172a' }]}>
                  Miércoles Tarde ({numMiercoles} cultos)
                </Text>
                <Text style={[styles.textCellBold, { width: '30%', textAlign: 'right', color: '#0f172a' }]}>
                  {subtotalMiercoles.toFixed(1)}
                </Text>
              </View>
              {rowsMiercoles.map(r => (
                <View style={styles.tableRow} key={`mi_${r.clase}`}>
                  <Text style={[styles.textCell, { width: '70%', paddingLeft: 10 }]}>{r.clase}</Text>
                  <Text style={[styles.textCellBold, { width: '30%', textAlign: 'right' }]}>{r.promedio.toFixed(1)}</Text>
                </View>
              ))}
            </>
          )}

          <View style={styles.grandTotalRow}>
            <Text style={[styles.textDarkBold, { width: '70%' }]}>PROMEDIO TOTAL ACUMULADO</Text>
            <Text style={[styles.textDarkBold, { width: '30%', textAlign: 'right' }]}>
              {totalGeneralPromedio.toFixed(1)}
            </Text>
          </View>
        </View>
      </Page>
    </Document>
  );
};