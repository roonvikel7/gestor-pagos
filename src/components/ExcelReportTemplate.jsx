import React from 'react';

export default function ExcelReportTemplate({ id, activity, students, payments, exemptions }) {
  if (!activity) return null;

  const getPayment = (studentId) => payments.find(p => p.StudentID === studentId && p.ActivityID === activity.ID);
  const getExemption = (studentId) => exemptions.find(e => e.StudentID === studentId && e.ActivityID === activity.ID);

  let totalRecaudado = 0;
  let totalFaltante = 0;
  let totalGeneral = 0;

  const rows = students.slice().sort((a,b)=>(a.Name||'').localeCompare(b.Name||'')).map((std, index) => {
    const payment = getPayment(std.ID);
    const exemption = getExemption(std.ID);
    let pago = '';
    let totalStr = '';
    let pagoColor = '';
    let bgColor = 'white';

    if (exemption) {
      pago = '●';
      totalStr = 'S/ 0.00';
      pagoColor = 'black';
      bgColor = '#d9d9d9'; // Gray
    } else if (payment) {
      pago = '✓';
      totalStr = `S/ ${Number(activity.Amount).toFixed(2)}`;
      pagoColor = '#00b050'; // Green
      totalRecaudado += Number(activity.Amount);
      totalGeneral += Number(activity.Amount);
    } else {
      pago = 'X';
      totalStr = 'S/ 0.00';
      pagoColor = 'red';
      totalFaltante += Number(activity.Amount);
      totalGeneral += Number(activity.Amount);
    }

    return { num: index + 1, name: std.Name, pago, totalStr, pagoColor, bgColor };
  });

  return (
    <div id={id} style={{ width: '800px', backgroundColor: 'white', padding: '20px' }}>
      <div style={{ border: '2px solid black' }}>
        {/* Header */}
        <div style={{ backgroundColor: '#4472c4', color: 'white', textAlign: 'center', padding: '10px', fontWeight: 'bold', fontSize: '20px', borderBottom: '1px solid black' }}>
          ACTIVIDAD: {activity.Name.toUpperCase()} - CONTROL DE PAGOS
        </div>
        {/* Subheader */}
        <div style={{ backgroundColor: '#fff2cc', display: 'flex', justifyContent: 'space-between', padding: '5px 10px', fontWeight: 'bold', fontSize: '14px', borderBottom: '2px solid black' }}>
          <span>FECHA: {new Date().toLocaleDateString('es-PE')}</span>
          <span>MONTO: S/ {Number(activity.Amount).toFixed(2)}</span>
        </div>
        {/* Table */}
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', color: 'black' }}>
          <thead>
            <tr style={{ backgroundColor: '#b4c6e7', borderBottom: '2px solid black' }}>
              <th style={{ borderRight: '1px solid black', padding: '5px', width: '40px', textAlign: 'center' }}>N°</th>
              <th style={{ borderRight: '1px solid black', padding: '5px', textAlign: 'center' }}>ESTUDIANTE</th>
              <th style={{ borderRight: '1px solid black', padding: '5px', width: '80px', textAlign: 'center' }}>PAGO</th>
              <th style={{ padding: '5px', width: '120px', textAlign: 'center' }}>TOTAL PAGADO</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.num} style={{ borderBottom: '1px solid black' }}>
                <td style={{ borderRight: '1px solid black', padding: '4px', textAlign: 'center' }}>{r.num}</td>
                <td style={{ borderRight: '1px solid black', padding: '4px 8px' }}>{r.name}</td>
                <td style={{ borderRight: '1px solid black', padding: '4px', textAlign: 'center', backgroundColor: r.bgColor, color: r.pagoColor, fontWeight: 'bold', fontSize: '18px' }}>{r.pago}</td>
                <td style={{ padding: '4px 8px', textAlign: 'right' }}>{r.totalStr}</td>
              </tr>
            ))}
            {/* Totals */}
            <tr style={{ backgroundColor: '#c6e0b4', borderTop: '2px solid black' }}>
              <td colSpan={3} style={{ borderRight: '1px solid black', padding: '6px', textAlign: 'center', fontWeight: 'bold' }}>TOTAL RECAUDADO</td>
              <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 'bold' }}>S/ {totalRecaudado.toFixed(2)}</td>
            </tr>
            <tr style={{ backgroundColor: '#f8cbad', borderTop: '1px solid black' }}>
              <td colSpan={3} style={{ borderRight: '1px solid black', padding: '6px', textAlign: 'center', fontWeight: 'bold' }}>TOTAL FALTANTE</td>
              <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 'bold' }}>S/ {totalFaltante.toFixed(2)}</td>
            </tr>
            <tr style={{ backgroundColor: '#bdd7ee', borderTop: '1px solid black' }}>
              <td colSpan={3} style={{ borderRight: '1px solid black', padding: '6px', textAlign: 'center', fontWeight: 'bold' }}>TOTAL GENERAL</td>
              <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 'bold' }}>S/ {totalGeneral.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
