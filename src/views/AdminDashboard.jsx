import React, { useState } from 'react';
import { ArrowLeft, Check, X, RefreshCw, Plus, Users, ClipboardCopy, Image as ImageIcon, Download, UserMinus, FileSpreadsheet, Image as ImageLucide, MessageCircle, Pause, Play, LogOut, Cake, Trash2, CalendarClock } from 'lucide-react';
import ImageModal from '../components/ImageModal';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as htmlToImage from 'html-to-image';
import ExcelReportTemplate from '../components/ExcelReportTemplate';
import { getRandomPassword } from '../utils/passwords';

export default function AdminDashboard({ setView, globalData, fetchGlobalData, scriptUrl, onLogout, role, highlightLogout }) {
  const [activeTab, setActiveTabState] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('tab') || 'pagos';
  });

  const setActiveTab = (newTab) => {
    if (newTab === activeTab) return;
    setActiveTabState(newTab);
    const url = new URL(window.location);
    url.searchParams.set('view', 'admin-dashboard');
    url.searchParams.set('tab', newTab);
    window.history.pushState({}, '', url);
  };

  const tabs = role === 'admin' ? ['pagos', 'actividades', 'alumnos'] : ['pagos', 'actividades'];

  React.useEffect(() => {
    if (role === 'tesorera' && activeTab === 'alumnos') {
      setActiveTab('pagos');
    }
  }, [role, activeTab]);

  const [selectedImage, setSelectedImage] = useState(null);

  React.useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      let t = params.get('tab');
      if (!t || !tabs.includes(t)) t = tabs[0];
      setActiveTabState(t);
      if (params.get('modal') !== 'image') {
        setSelectedImage(null);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const [treasurerName, setTreasurerName] = useState(() => localStorage.getItem('app_treasurer_name') || '');
  const [treasurerGender, setTreasurerGender] = useState(() => localStorage.getItem('app_treasurer_gender') || 'a');

  React.useEffect(() => {
    if (role === 'tesorera') {
      const timer = setTimeout(() => setShowWelcome(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [role]);
  
  // Modals (moved up)

  const openImageModal = (image) => {
    setSelectedImage(image);
    const url = new URL(window.location);
    url.searchParams.set('modal', 'image');
    window.history.pushState({}, '', url);
  };

  const closeImageModal = () => {
    if (new URLSearchParams(window.location.search).get('modal') === 'image') {
      window.history.back(); // This triggers popstate, which clears the selectedImage
    } else {
      setSelectedImage(null);
    }
  };
  
  // Exemption Modal State
  const [showExemptionModal, setShowExemptionModal] = useState(false);
  const [selectedActForExemption, setSelectedActForExemption] = useState(null);
  const [exemptionStudentId, setExemptionStudentId] = useState('');
  const [exemptionReason, setExemptionReason] = useState('');

  // Form States
  const [newActivityName, setNewActivityName] = useState('');
  const [newActivityAmount, setNewActivityAmount] = useState('');
  const [studentListText, setStudentListText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });

  // Delete Activity State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [activityToDelete, setActivityToDelete] = useState(null);
  const [deleteAdminPassword, setDeleteAdminPassword] = useState('');
  const [deleteError, setDeleteError] = useState('');

  // Deadline State
  const [showDeadlineModal, setShowDeadlineModal] = useState(false);
  const [activityToSetDeadline, setActivityToSetDeadline] = useState(null);
  const [deadlineValue, setDeadlineValue] = useState('');

  const activities = globalData?.activities || [];
  const students = globalData?.students || [];
  const payments = globalData?.payments || [];
  const exemptions = globalData?.exemptions || [];

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchGlobalData();
    setIsRefreshing(false);
  };

  const handleAddActivity = async (e) => {
    e.preventDefault();
    if(!newActivityName || !newActivityAmount) return;
    setIsSubmitting(true);
    setMsg({ type: '', text: '' });

    try {
      const res = await fetch(scriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'addActivity',
          name: newActivityName,
          amount: newActivityAmount
        })
      });
      const data = await res.json();
      if(data.status === 'success') {
        setMsg({ type: 'success', text: 'Actividad creada' });
        setNewActivityName('');
        setNewActivityAmount('');
        fetchGlobalData();
      } else {
        setMsg({ type: 'error', text: 'Error del servidor: ' + (data.message || 'Desconocido') });
      }
    } catch(err) {
      setMsg({ type: 'error', text: 'Error de red al crear actividad' });
    }
    setIsSubmitting(false);
  };

  const handleDeleteActivity = async (e) => {
    e.preventDefault();
    if (deleteAdminPassword !== '9999') {
      setDeleteError('Contraseña incorrecta');
      return;
    }
    setDeleteError('');
    setIsSubmitting(true);
    try {
      const res = await fetch(scriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'deleteActivity',
          activityId: activityToDelete.ID
        })
      });
      const data = await res.json();
      if(data.status === 'success') {
        setShowDeleteModal(false);
        setActivityToDelete(null);
        setDeleteAdminPassword('');
        setMsg({ type: 'success', text: `Actividad eliminada` });
        fetchGlobalData();
      } else {
        setDeleteError('Error: ' + data.message);
      }
    } catch(err) {
      setDeleteError('Error de red al eliminar actividad');
    }
    setIsSubmitting(false);
  };

  const handleSetDeadline = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMsg({ type: '', text: '' });
    try {
      const res = await fetch(scriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'setActivityDeadline',
          activityId: activityToSetDeadline.ID,
          deadline: deadlineValue
        })
      });
      const data = await res.json();
      if(data.status === 'success') {
        setShowDeadlineModal(false);
        setActivityToSetDeadline(null);
        setDeadlineValue('');
        setMsg({ type: 'success', text: 'Fecha de cierre actualizada' });
        fetchGlobalData();
      } else {
        alert('Error: ' + data.message);
      }
    } catch(err) {
      alert('Error de red al actualizar fecha límite');
    }
    setIsSubmitting(false);
  };

  const handleAddStudents = async () => {
    if(!studentListText.trim()) return;
    setIsSubmitting(true);
    setMsg({ type: '', text: '' });
    
    const names = studentListText.split('\n').map(n => n.trim()).filter(n => n);
    const studentsWithPasswords = names.map(name => ({
      name,
      password: getRandomPassword()
    }));
    
    try {
      const res = await fetch(scriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'addStudents',
          students: JSON.stringify(studentsWithPasswords)
        })
      });
      const data = await res.json();
      if(data.status === 'success') {
        setMsg({ type: 'success', text: `${names.length} alumnos agregados con contraseñas` });
        setStudentListText('');
        fetchGlobalData();
      } else {
        setMsg({ type: 'error', text: 'Error del servidor: ' + (data.message || 'Desconocido') });
      }
    } catch(err) {
      setMsg({ type: 'error', text: 'Error de red al agregar alumnos' });
    }
    setIsSubmitting(false);
  };

  const handleGenerateMissingPasswords = async () => {
    const studentsWithoutPass = students.filter(s => !s.Password);
    if (studentsWithoutPass.length === 0) {
      alert("Todos los alumnos ya tienen contraseña.");
      return;
    }
    
    setIsSubmitting(true);
    const passwordsDict = {};
    studentsWithoutPass.forEach(s => {
      passwordsDict[s.ID] = getRandomPassword();
    });

    try {
      const res = await fetch(scriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'generateMissingPasswords',
          passwordsDict: JSON.stringify(passwordsDict)
        })
      });
      const data = await res.json();
      if(data.status === 'success') {
        setMsg({ type: 'success', text: `Se generaron contraseñas para ${data.data.updated} alumnos antiguos.` });
        fetchGlobalData();
      } else {
        alert('Error: ' + data.message);
      }
    } catch(err) {
      alert('Error de red al generar contraseñas');
    }
    setIsSubmitting(false);
  };

  const handleAddExemption = async (e) => {
    e.preventDefault();
    if(!exemptionStudentId) return;
    setIsSubmitting(true);
    
    try {
      const res = await fetch(scriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'addExemption',
          activityId: selectedActForExemption.ID,
          studentId: exemptionStudentId,
          reason: exemptionReason
        })
      });
      const data = await res.json();
      if(data.status === 'success') {
        alert('Alumno exonerado exitosamente');
        setShowExemptionModal(false);
        setExemptionStudentId('');
        setExemptionReason('');
        fetchGlobalData();
      } else {
        alert('Error: ' + data.message);
      }
    } catch(err) {
      alert('Error de red al exonerar alumno');
    }
    setIsSubmitting(false);
  };

  const handleTogglePause = async (actId) => {
    setIsSubmitting(true);
    try {
      const res = await fetch(scriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'toggleActivityStatus',
          activityId: actId
        })
      });
      const data = await res.json();
      if(data.status === 'success') {
        fetchGlobalData();
      } else {
        alert('Error: ' + data.message);
      }
    } catch(err) {
      alert('Error de red al pausar actividad');
    }
    setIsSubmitting(false);
  };

  const copyLink = (actId) => {
    const url = `${window.location.origin}${window.location.pathname}?actividad=${actId}`;
    navigator.clipboard.writeText(url);
    alert('Enlace copiado al portapapeles');
  };

  const exportPDF = (actId, actName) => {
    try {
      const doc = new jsPDF();
      
      const tableData = students.sort((a,b)=>(a.Name||'').localeCompare(b.Name||'')).map(std => {
        const payment = getPaymentForStudentAndActivity(std.ID, actId);
        const exemption = getExemptionForStudentAndActivity(std.ID, actId);
        
        let dateStr = '';
        if (payment && payment.Timestamp) {
          const d = new Date(payment.Timestamp);
          if (isNaN(d)) {
            dateStr = payment.Timestamp;
          } else {
            const datePart = d.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
            const timePart = d.toLocaleTimeString('es-PE', { hour: '2-digit', minute:'2-digit', hour12: true });
            dateStr = `${datePart}\n${timePart}`;
          }
        }
        
        let estado = 'Falta';
        if (payment) estado = 'Pagó';
        if (exemption) estado = 'Exonerado';
        
        return [
          std.Name,
          estado,
          dateStr,
          payment ? payment.ImageBase64 : ''
        ];
      });
      
      const chunkSize = 3;
      const chunks = [];
      for (let i = 0; i < tableData.length; i += chunkSize) {
        chunks.push(tableData.slice(i, i + chunkSize));
      }

      chunks.forEach((chunk, index) => {
        if (index > 0) {
          doc.addPage();
        }
        
        let tableStartY = 20;
        if (index === 0) {
          doc.setFont("helvetica", "normal");
          doc.setFontSize(24);
          doc.setTextColor(26, 99, 106);
          doc.text("R E P O R T E   D E   P A G O S", 105, 20, { align: 'center' });
          
          doc.setFontSize(16);
          doc.setTextColor(0, 0, 0);
          doc.text(`"${actName.toUpperCase()}"`, 105, 30, { align: 'center' });
          tableStartY = 40;
        }
        
        autoTable(doc, {
          startY: tableStartY,
          head: [['Estudiante', 'Estado', 'Fecha y hora\nde envío', 'Comprobante']],
          body: chunk.map(row => [row[0], row[1], row[2], '']),
          theme: 'grid',
          styles: { 
            halign: 'center', 
            valign: 'middle', 
            lineColor: [26, 99, 106],
            lineWidth: 0.5,
            textColor: [0, 0, 0],
            fontSize: 12,
            fontStyle: 'normal'
          },
          headStyles: { 
            fillColor: [26, 99, 106],
            textColor: [255, 255, 255],
            fontSize: 12,
            fontStyle: 'bold'
          },
          columnStyles: {
            0: { cellWidth: 50, fillColor: [223, 234, 235], fontStyle: 'bold' },
            1: { cellWidth: 35 },
            2: { cellWidth: 40 },
            3: { cellWidth: 65 }
          },
          bodyStyles: { minCellHeight: 75 },
          willDrawCell: function(data) {
            if (data.section === 'body' && data.column.index === 1) {
              const estado = data.cell.raw;
              data.cell.styles.fontStyle = 'bold';
              if (estado === 'Pagó') {
                data.cell.styles.textColor = [34, 197, 94]; // Green text
              } else if (estado === 'Falta') {
                data.cell.styles.textColor = [239, 68, 68]; // Red text
              } else if (estado === 'Exonerado') {
                data.cell.styles.textColor = [107, 114, 128]; // Gray text
              }
            }
          },
          didDrawCell: function(data) {
            if (data.column.index === 3 && data.section === 'body') {
              const studentName = data.row.raw[0];
              const rowData = tableData.find(r => r[0] === studentName);
              const base64Img = rowData ? rowData[3] : null;
              
              if (base64Img) {
                const dimX = 35;
                const dimY = 70;
                const x = data.cell.x + (data.cell.width - dimX) / 2;
                const y = data.cell.y + (data.cell.height - dimY) / 2;
                try {
                  let format = 'JPEG';
                  if (base64Img.startsWith('data:image/png')) format = 'PNG';
                  else if (base64Img.startsWith('data:image/webp')) format = 'WEBP';
                  doc.addImage(base64Img, format, x, y, dimX, dimY);
                } catch(e) {
                  console.error('Error al dibujar imagen', e);
                }
              }
            }
          }
        });
      });
      
      doc.save(`Reporte_Img_${actName.replace(/\s+/g, '_')}.pdf`);
    } catch(error) {
      console.error(error);
      alert('Hubo un error al generar el PDF: ' + error.message);
    }
  };

  const exportExcelPDF = (actId, actName, actAmount) => {
    try {
      const doc = new jsPDF();
      
      // Blue Header
      doc.setFillColor(68, 114, 196);
      doc.rect(14, 14, 182, 10, 'F');
      doc.setFontSize(14);
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.text(`ACTIVIDAD: ${actName.toUpperCase()} - CONTROL DE PAGOS`, 105, 21, { align: 'center' });
      
      // Cream Subheader
      doc.setFillColor(255, 242, 204);
      doc.rect(14, 24, 182, 8, 'F');
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.text(`FECHA: ${new Date().toLocaleDateString('es-PE')}`, 16, 29);
      doc.text(`MONTO: S/ ${Number(actAmount).toFixed(2)}`, 194, 29, { align: 'right' });
      
      let totalRecaudado = 0;
      let totalFaltante = 0;
      let totalExpected = 0;

      const tableData = students.sort((a,b)=>(a.Name||'').localeCompare(b.Name||'')).map((std, index) => {
        const payment = getPaymentForStudentAndActivity(std.ID, actId);
        const exemption = getExemptionForStudentAndActivity(std.ID, actId);
        
        let pagoMark = '';
        let totalStr = '';
        let bg = [255, 255, 255];
        let textColor = [0,0,0];
        
        if (exemption) {
          pagoMark = '';
          totalStr = 'S/ 0.00';
          bg = [217, 217, 217]; // Gray
        } else if (payment) {
          pagoMark = '';
          totalStr = `S/ ${Number(actAmount).toFixed(2)}`;
          textColor = [0, 176, 80]; // Green
          totalRecaudado += Number(actAmount);
          totalExpected += Number(actAmount);
        } else {
          pagoMark = 'X';
          totalStr = 'S/ 0.00';
          textColor = [255, 0, 0]; // Red
          totalFaltante += Number(actAmount);
          totalExpected += Number(actAmount);
        }
        
        return [
          index + 1,
          std.Name,
          { content: pagoMark, styles: { fillColor: bg, textColor: textColor, fontStyle: 'bold' } },
          totalStr
        ];
      });
      
      autoTable(doc, {
        startY: 32,
        head: [['N°', 'ESTUDIANTE', 'PAGO', 'TOTAL PAGADO']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [180, 198, 231], textColor: [0,0,0], fontStyle: 'bold', halign: 'center' },
        columnStyles: {
          0: { halign: 'center', cellWidth: 15 },
          1: { cellWidth: 100 },
          2: { halign: 'center', cellWidth: 25 },
          3: { halign: 'right', cellWidth: 42 }
        },
        styles: { fontSize: 9, cellPadding: 1, lineColor: [0, 0, 0], lineWidth: 0.2 },
        margin: { left: 14, right: 14 },
        didDrawCell: function(data) {
          if (data.column.index === 2 && data.cell.section === 'body') {
            const studentName = data.row.raw[1];
            const std = students.find(s => s.Name === studentName);
            if (std) {
              const payment = getPaymentForStudentAndActivity(std.ID, actId);
              const exemption = getExemptionForStudentAndActivity(std.ID, actId);
              
              const x = data.cell.x + data.cell.width / 2;
              const y = data.cell.y + data.cell.height / 2;
              
              if (exemption) {
                doc.setFillColor(0, 0, 0);
                doc.circle(x, y, 1.5, 'F');
              } else if (payment) {
                doc.setDrawColor(0, 176, 80); // Green
                doc.setLineWidth(0.8);
                // Draw checkmark perfectly centered and small
                doc.line(x - 1.2, y, x - 0.3, y + 1.2);
                doc.line(x - 0.3, y + 1.2, x + 1.5, y - 1.2);
              }
            }
          }
        }
      });
      
      const finalY = doc.lastAutoTable.finalY;
      
      // Footer totals
      autoTable(doc, {
        startY: finalY,
        body: [
          ['TOTAL RECAUDADO', `S/ ${totalRecaudado.toFixed(2)}`],
          ['TOTAL FALTANTE', `S/ ${totalFaltante.toFixed(2)}`],
          ['TOTAL GENERAL', `S/ ${totalExpected.toFixed(2)}`]
        ],
        theme: 'grid',
        styles: { fontSize: 10, cellPadding: 2, fontStyle: 'bold', lineColor: [0,0,0], lineWidth: 0.2, textColor: [0,0,0] },
        columnStyles: {
          0: { halign: 'center', cellWidth: 140 },
          1: { halign: 'right', cellWidth: 42 }
        },
        margin: { left: 14, right: 14 },
        didParseCell: function(data) {
          if (data.row.index === 0) data.cell.styles.fillColor = [198, 224, 180]; // Green
          if (data.row.index === 1) data.cell.styles.fillColor = [248, 203, 173]; // Orange
          if (data.row.index === 2) data.cell.styles.fillColor = [189, 215, 238]; // Blue
        }
      });
      
      doc.save(`Control_${actName.replace(/\s+/g, '_')}.pdf`);
    } catch (e) {
      console.error(e);
      alert('Error: ' + e.message);
    }
  };

  const exportImage = async (actId, actName) => {
    try {
      const element = document.getElementById(`excel-report-${actId}`);
      if (!element) {
        alert("No se encontró la plantilla HTML oculta.");
        return;
      }
      
      const dataUrl = await htmlToImage.toPng(element, { pixelRatio: 2, backgroundColor: 'white' });
      
      const link = document.createElement('a');
      link.download = `Control_${actName.replace(/\s+/g, '_')}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error(err);
      alert('Hubo un error al generar la imagen: ' + (err.message || err.toString()));
    }
  };

  const shareToWhatsApp = async (actId, actName) => {
    try {
      const element = document.getElementById(`excel-report-${actId}`);
      if (!element) return;
      
      const dataUrl = await htmlToImage.toPng(element, { pixelRatio: 2, backgroundColor: 'white' });
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      const file = new File([blob], `Control_${actName.replace(/\s+/g, '_')}.png`, { type: 'image/png' });

      const now = new Date();
      const datePart = now.toLocaleDateString('es-PE', { dateStyle: 'long' });
      const timePart = now.toLocaleTimeString('es-PE', { hour: 'numeric', minute: '2-digit', hour12: true });
      const customMessage = `*Reporte de la actividad:*\n${actName}\n*Actualización:*\n${datePart} a las ${timePart}`;

      if (navigator.canShare && navigator.canShare({ files: [file] }) && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
        // Soporte nativo para móviles o navegadores compatibles
        await navigator.share({
          files: [file],
          title: `Reporte de Pagos: ${actName}`,
          text: customMessage
        });
      } else {
        // Fallback para computadoras de escritorio (WhatsApp Web)
        try {
          await navigator.clipboard.write([
            new ClipboardItem({ [blob.type]: blob })
          ]);
          setMsg({ type: 'success', text: '¡Imagen copiada! Cuando se abra WhatsApp Web, haz click en el cuadro de mensaje y presiona "Ctrl + V" para pegar la imagen.' });
          
          const text = encodeURIComponent(customMessage);
          window.open(`https://web.whatsapp.com/send?text=${text}`, '_blank');
        } catch (clipboardErr) {
          alert('Tu navegador no soporta copiado directo. Se descargará la imagen para que la envíes manualmente a WhatsApp.');
          exportImage(actId, actName);
        }
      }
    } catch (err) {
      console.error(err);
      if (err.name !== 'AbortError') { // Ignorar si el usuario cancela el diálogo de compartir
        alert('Hubo un error al intentar compartir: ' + (err.message || err.toString()));
      }
    }
  };

  // Matrix Logic
  const getPaymentForStudentAndActivity = (studentId, activityId) => {
    return payments.find(p => p.StudentID === studentId && p.ActivityID === activityId);
  };
  
  const getExemptionForStudentAndActivity = (studentId, activityId) => {
    return exemptions.find(e => e.StudentID === studentId && e.ActivityID === activityId);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col relative">
      {/* Floating Welcome (Fixed and Pastel) */}
      {showWelcome && role === 'tesorera' && treasurerName && (
        <div className="fixed top-6 left-1/2 transform -translate-x-1/2 bg-indigo-50 border border-indigo-200 text-indigo-700 px-6 py-3 rounded-full shadow-lg z-50 animate-bounce text-sm sm:text-base font-medium whitespace-nowrap">
          ¡Bienvenid{treasurerGender} Tesorer{treasurerGender} {treasurerName}!
        </div>
      )}

      {/* Header */}
      <header className="bg-white shadow-sm px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => setView('home')} className="text-gray-500 hover:text-gray-900 transition">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-bold text-gray-900">
            {role === 'admin' ? 'Panel Administrador' : 'Panel Tesorera'}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={handleRefresh} 
            className={`p-2 bg-indigo-50 text-indigo-600 rounded-full hover:bg-indigo-100 transition ${isRefreshing ? 'animate-spin' : ''}`}
            title="Actualizar Datos"
          >
            <RefreshCw size={20} />
          </button>
          <button 
            onClick={onLogout} 
            className={`p-2 rounded-full transition flex items-center justify-center ${highlightLogout ? 'bg-red-600 text-white animate-pulse shadow-[0_0_15px_rgba(220,38,38,0.6)]' : 'bg-red-50 text-red-600 hover:bg-red-100'}`}
            title="Cerrar Sesión"
          >
            <LogOut size={20} />
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b px-6 flex space-x-6 overflow-x-auto relative">
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => { setActiveTab(tab); setMsg({type:'', text:''}); }}
            className={`py-4 font-medium text-sm capitalize border-b-2 transition whitespace-nowrap ${activeTab === tab ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Content */}
      <main className="flex-1 p-6 overflow-auto">
        {msg.text && (
          <div className={`p-4 rounded-lg mb-6 ${msg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {msg.text}
          </div>
        )}

        {/* Pagos Tab */}
        {activeTab === 'pagos' && (
          <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-600 font-semibold border-b">
                  <tr>
                    <th className="p-3 sm:p-4 sticky left-0 bg-gray-50 z-10 border-r shadow-[1px_0_0_0_#e5e7eb] min-w-[120px] max-w-[140px] whitespace-normal">Alumno</th>
                    {activities.map(act => (
                      <th key={act.ID} className="p-3 sm:p-4 text-center border-r min-w-[100px] max-w-[140px] whitespace-normal">
                        {act.Name} <br/><span className="text-xs font-normal text-gray-400">S/ {act.Amount}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {students.sort((a,b)=>(a.Name||'').localeCompare(b.Name||'')).map(std => (
                    <tr key={std.ID} className="hover:bg-gray-50 transition">
                      <td className="p-3 sm:p-4 sticky left-0 bg-white z-10 border-r shadow-[1px_0_0_0_#e5e7eb] font-medium text-gray-900 min-w-[120px] max-w-[160px] whitespace-normal leading-tight text-xs sm:text-sm">
                        {std.Name}
                      </td>
                      {activities.map(act => {
                        const payment = getPaymentForStudentAndActivity(std.ID, act.ID);
                        const ex = getExemptionForStudentAndActivity(std.ID, act.ID);
                        
                        if (ex) {
                          const isBirthday = act.Name.toLowerCase().includes('cumpleaño') || act.Name.toLowerCase().includes('cumpleano');
                          return (
                            <td key={act.ID} className="p-3 sm:p-4 text-center border-r bg-gray-50/50">
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                                {isBirthday ? <Cake size={14} /> : <UserMinus size={14} />} {ex.Reason || 'No participa'}
                              </span>
                            </td>
                          );
                        }
                        
                        return (
                          <td key={act.ID} className="p-3 sm:p-4 text-center border-r whitespace-nowrap">
                            {payment ? (
                              <div className="flex flex-col items-center gap-2">
                                <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-bold">
                                  <Check size={14} /> Pagó
                                </span>
                                <button 
                                  onClick={() => openImageModal(payment.ImageBase64)}
                                  className="text-xs flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-medium bg-indigo-50 px-2 py-1 rounded"
                                >
                                  <ImageIcon size={12} /> Ver
                                </button>
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 px-2 py-1 rounded-full text-xs font-bold">
                                <X size={14} /> Falta
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                  {students.length === 0 && (
                    <tr>
                      <td colSpan={activities.length + 1} className="p-8 text-center text-gray-500">
                        No hay alumnos registrados. Ve a la pestaña "Alumnos".
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Actividades Tab */}
        {activeTab === 'actividades' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Plus size={20} className="text-indigo-600" /> Nueva Actividad
              </h3>
              <form onSubmit={handleAddActivity} className="flex flex-col sm:flex-row gap-4">
                <input 
                  type="text" placeholder="Nombre (ej. Cuota Pro-fondos)" required
                  value={newActivityName} onChange={e => setNewActivityName(e.target.value)}
                  className="flex-1 border rounded-lg p-3 bg-gray-50 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
                <input 
                  type="number" placeholder="Monto (S/)" required step="0.10"
                  value={newActivityAmount} onChange={e => setNewActivityAmount(e.target.value)}
                  className="w-32 border rounded-lg p-3 bg-gray-50 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
                <button 
                  type="submit" disabled={isSubmitting}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-3 rounded-lg transition disabled:opacity-70 whitespace-nowrap"
                >
                  {isSubmitting ? 'Guardando...' : 'Crear'}
                </button>
              </form>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
              <ul className="divide-y">
                {activities.map(act => (
                  <li key={act.ID} className={`p-4 flex flex-col md:flex-row md:items-center justify-between hover:bg-gray-50 transition gap-4 ${act.Status === 'paused' ? 'opacity-60 bg-gray-100 grayscale-[30%]' : ''}`}>
                    <div>
                      <h4 className="font-bold text-gray-900 flex items-center gap-2">
                        {act.Name}
                        {act.Status === 'paused' && (
                          <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-0.5 rounded-full border border-yellow-200 font-bold">
                            Pausada
                          </span>
                        )}
                        {act.Deadline && new Date(act.Deadline) < new Date() && (
                          <span className="bg-red-100 text-red-800 text-xs px-2 py-0.5 rounded-full border border-red-200 font-bold">
                            Cerrada
                          </span>
                        )}
                      </h4>
                      <p className="text-sm text-gray-500 mb-1">Monto: S/ {act.Amount}</p>
                      {act.Deadline && (
                        <p className="text-xs text-gray-500 font-medium">
                          Cierre: {new Date(act.Deadline).toLocaleString('es-PE', { dateStyle: 'medium', timeStyle: 'short' })}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button 
                        onClick={() => handleTogglePause(act.ID)}
                        disabled={isSubmitting}
                        className="flex items-center gap-2 text-sm bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-2 rounded-lg font-medium transition disabled:opacity-50"
                      >
                        {act.Status === 'paused' ? <Play size={16} /> : <Pause size={16} />}
                        {act.Status === 'paused' ? 'Reanudar' : 'Pausar'}
                      </button>
                      <button 
                        onClick={() => { setActivityToSetDeadline(act); setDeadlineValue(act.Deadline || ''); setShowDeadlineModal(true); }}
                        className="flex items-center gap-2 text-sm bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-2 rounded-lg font-medium transition"
                      >
                        <CalendarClock size={16} /> Programar
                      </button>
                      <button 
                        onClick={() => { setSelectedActForExemption(act); setShowExemptionModal(true); }}
                        className="flex items-center gap-2 text-sm bg-orange-50 hover:bg-orange-100 text-orange-700 px-3 py-2 rounded-lg font-medium transition"
                      >
                        <UserMinus size={16} /> Exonerados
                      </button>
                      <button 
                        onClick={() => exportExcelPDF(act.ID, act.Name, act.Amount)}
                        className="flex items-center gap-2 text-sm bg-green-50 hover:bg-green-100 text-green-700 px-3 py-2 rounded-lg font-medium transition"
                      >
                        <FileSpreadsheet size={16} /> Resumen Excel
                      </button>
                      <button 
                        onClick={() => exportImage(act.ID, act.Name)}
                        className="flex items-center gap-2 text-sm bg-cyan-50 hover:bg-cyan-100 text-cyan-700 px-3 py-2 rounded-lg font-medium transition"
                      >
                        <ImageLucide size={16} /> Imagen PNG
                      </button>
                      <button 
                        onClick={() => shareToWhatsApp(act.ID, act.Name)}
                        className="flex items-center gap-2 text-sm bg-[#25D366] hover:bg-[#128C7E] text-white px-3 py-2 rounded-lg font-medium transition shadow-sm"
                      >
                        <MessageCircle size={16} /> WhatsApp
                      </button>
                      <button 
                        onClick={() => exportPDF(act.ID, act.Name)}
                        className="flex items-center gap-2 text-sm bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-3 py-2 rounded-lg font-medium transition"
                      >
                        <Download size={16} /> Reporte (Imágenes)
                      </button>
                      <button 
                        onClick={() => copyLink(act.ID)}
                        className="flex items-center gap-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg font-medium transition"
                      >
                        <ClipboardCopy size={16} /> Copiar Enlace
                      </button>
                      {role === 'admin' && (
                        <button 
                          onClick={() => { setActivityToDelete(act); setShowDeleteModal(true); setDeleteAdminPassword(''); setDeleteError(''); }}
                          className="flex items-center gap-2 text-sm bg-red-50 hover:bg-red-100 text-red-600 px-3 py-2 rounded-lg font-medium transition"
                        >
                          <Trash2 size={16} /> Eliminar
                        </button>
                      )}
                    </div>
                  </li>
                ))}
                {activities.length === 0 && (
                  <li className="p-8 text-center text-gray-500">No hay actividades creadas.</li>
                )}
              </ul>
            </div>
            
            {/* Hidden Templates for Image Generation */}
            <div style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }}>
              {activities.map(act => (
                <ExcelReportTemplate 
                  key={`tpl-${act.ID}`}
                  id={`excel-report-${act.ID}`}
                  activity={act}
                  students={students}
                  payments={payments}
                  exemptions={exemptions}
                />
              ))}
            </div>
          </div>
        )}

        {/* Alumnos Tab (Only Admin) */}
        {activeTab === 'alumnos' && role === 'admin' && (
          <div className="max-w-3xl space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
                <Users size={20} className="text-indigo-600" /> Configurar Tesorera(o)
              </h3>
              <p className="text-sm text-gray-500 mb-4">Selecciona el nombre y género para la bienvenida de la tesorería.</p>
              <div className="flex flex-col sm:flex-row gap-4 items-center">
                <select 
                  value={treasurerGender}
                  onChange={(e) => {
                    setTreasurerGender(e.target.value);
                    localStorage.setItem('app_treasurer_gender', e.target.value);
                  }}
                  className="border rounded-xl p-3 bg-gray-50 outline-none w-full sm:w-auto"
                >
                  <option value="a">Tesorera</option>
                  <option value="o">Tesorero</option>
                </select>
                <select 
                  value={treasurerName}
                  onChange={(e) => {
                    setTreasurerName(e.target.value);
                    localStorage.setItem('app_treasurer_name', e.target.value);
                  }}
                  className="flex-1 border rounded-xl p-3 bg-gray-50 outline-none w-full"
                >
                  <option value="">Selecciona al alumno...</option>
                  {students.sort((a,b)=>(a.Name||'').localeCompare(b.Name||'')).map(s => (
                    <option key={s.ID} value={s.Name}>{s.Name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
                <Users size={20} className="text-indigo-600" /> Carga Masiva de Alumnos
              </h3>
              <p className="text-sm text-gray-500 mb-4">Pega una lista de nombres, uno por línea.</p>
              
              <textarea 
                rows={10} 
                placeholder="Juan Perez&#10;Maria Lopez&#10;Carlos Sanchez"
                value={studentListText}
                onChange={e => setStudentListText(e.target.value)}
                className="w-full border rounded-xl p-4 bg-gray-50 focus:ring-2 focus:ring-indigo-500 outline-none resize-none font-mono text-sm mb-4"
              />
              <button 
                onClick={handleAddStudents} 
                disabled={isSubmitting || !studentListText.trim()}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold p-4 rounded-xl transition disabled:opacity-70"
              >
                {isSubmitting ? 'Guardando...' : 'Guardar Lista'}
              </button>
            </div>
            
            <div className="bg-white rounded-2xl shadow-sm border p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-4">
                <h4 className="font-bold text-gray-900">Total: {students.length} alumnos registrados</h4>
                <button 
                  onClick={handleGenerateMissingPasswords}
                  disabled={isSubmitting}
                  className="text-sm bg-indigo-50 text-indigo-700 hover:bg-indigo-100 px-4 py-2 rounded-lg font-medium transition disabled:opacity-50"
                >
                  Generar contraseñas faltantes
                </button>
              </div>
              
              <div className="overflow-x-auto border rounded-xl">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 text-gray-600 font-semibold border-b">
                    <tr>
                      <th className="p-3 border-r">Nombres</th>
                      <th className="p-3 text-center w-32">Contraseña (4 letras)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {students.sort((a,b)=>(a.Name||'').localeCompare(b.Name||'')).map(s => (
                      <tr key={s.ID} className="hover:bg-gray-50">
                        <td className="p-3 border-r font-medium text-gray-900">{s.Name}</td>
                        <td className="p-3 text-center">
                          {s.Password ? (
                            <span className="font-mono bg-indigo-50 text-indigo-700 font-bold px-2 py-1 rounded tracking-wider">
                              {s.Password}
                            </span>
                          ) : (
                            <span className="text-gray-400 italic text-xs">Sin contraseña</span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {students.length === 0 && (
                      <tr><td colSpan="2" className="p-4 text-center text-gray-500">No hay alumnos</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Modals */}
      <ImageModal base64Image={selectedImage} onClose={closeImageModal} />

      {/* Exemption Modal */}
      {showExemptionModal && selectedActForExemption && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">Marcar No Participa</h3>
              <button onClick={() => setShowExemptionModal(false)} className="text-gray-500 hover:text-gray-800">
                <X size={20} />
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Actividad: <span className="font-semibold">{selectedActForExemption.Name}</span>
            </p>
            
            <form onSubmit={handleAddExemption} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Alumno</label>
                <select 
                  required
                  value={exemptionStudentId} 
                  onChange={e => setExemptionStudentId(e.target.value)}
                  className="w-full border rounded-lg p-2 bg-gray-50 focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value="">Seleccionar alumno...</option>
                  {students.map(s => {
                    const isExempt = getExemptionForStudentAndActivity(s.ID, selectedActForExemption.ID);
                    if (isExempt) return null; // already exempt
                    return <option key={s.ID} value={s.ID}>{s.Name}</option>;
                  })}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Motivo (Opcional)</label>
                <input 
                  type="text" 
                  maxLength={50}
                  value={exemptionReason}
                  onChange={e => setExemptionReason(e.target.value)}
                  placeholder="Ej. Retirado, Exonerado por dirección..."
                  className="w-full border rounded-lg p-2 bg-gray-50 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <button 
                type="submit" disabled={isSubmitting || !exemptionStudentId}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold p-3 rounded-lg transition disabled:opacity-70"
              >
                {isSubmitting ? 'Guardando...' : 'Guardar Exoneración'}
              </button>
            </form>

            <div className="mt-6 pt-4 border-t">
              <h4 className="text-sm font-bold text-gray-700 mb-2">Exonerados actuales:</h4>
              <ul className="space-y-2 max-h-40 overflow-y-auto">
                {exemptions.filter(e => e.ActivityID === selectedActForExemption.ID).map(ex => {
                  const s = students.find(st => st.ID === ex.StudentID);
                  return (
                    <li key={ex.ID} className="text-xs bg-gray-100 p-2 rounded flex justify-between">
                      <span className="font-medium">{s?.Name || 'Desconocido'}</span>
                      <span className="text-gray-500">{ex.Reason || 'Sin motivo'}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Deadline Modal */}
      {showDeadlineModal && activityToSetDeadline && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-blue-50">
              <h3 className="text-xl font-bold text-blue-900 flex items-center gap-2">
                <CalendarClock size={20} className="text-blue-600" />
                Programar Cierre
              </h3>
              <button onClick={() => setShowDeadlineModal(false)} className="text-blue-500 hover:bg-blue-100 p-2 rounded-full transition">
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              <p className="text-gray-700 mb-4 text-sm">
                Selecciona la fecha y hora límite para la actividad <strong>{activityToSetDeadline.Name}</strong>. 
                Dejar vacío para mantenerla siempre abierta.
              </p>
              <form onSubmit={handleSetDeadline} className="space-y-4">
                <div>
                  <input
                    type="datetime-local"
                    value={deadlineValue}
                    onChange={(e) => setDeadlineValue(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl p-3 bg-gray-50 outline-none transition focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex gap-3 mt-6">
                  <button type="button" onClick={() => setShowDeadlineModal(false)} className="flex-1 px-4 py-3 border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition">
                    Cancelar
                  </button>
                  <button type="submit" disabled={isSubmitting} className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center justify-center transition disabled:opacity-50">
                    {isSubmitting ? 'Guardando...' : 'Guardar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && activityToDelete && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-red-50">
              <h3 className="text-xl font-bold text-red-800">Eliminar Actividad</h3>
              <button onClick={() => setShowDeleteModal(false)} className="text-red-500 hover:bg-red-100 p-2 rounded-full transition">
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              <p className="text-gray-700 mb-4 text-sm">
                Estás a punto de eliminar la actividad <strong>{activityToDelete.Name}</strong>. Esta acción no se puede deshacer. Por favor, ingresa tu contraseña de administrador para confirmar.
              </p>
              <form onSubmit={handleDeleteActivity} className="space-y-4">
                <div>
                  <input
                    type="password"
                    placeholder="****"
                    maxLength={4}
                    value={deleteAdminPassword}
                    onChange={(e) => { setDeleteAdminPassword(e.target.value); setDeleteError(''); }}
                    className={`w-full text-center text-2xl tracking-widest border rounded-xl p-3 bg-gray-50 outline-none transition focus:ring-2 ${deleteError ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-indigo-500'}`}
                    autoFocus
                  />
                  {deleteError && <p className="text-red-500 text-sm mt-2 font-medium text-center">{deleteError}</p>}
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setShowDeleteModal(false)} className="flex-1 px-4 py-3 border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition">
                    Cancelar
                  </button>
                  <button type="submit" disabled={isSubmitting || deleteAdminPassword.length !== 4} className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition disabled:opacity-50">
                    {isSubmitting ? 'Eliminando...' : 'Eliminar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
