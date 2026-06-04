import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Check, Image as ImageIcon, CheckCircle2, AlertCircle, RefreshCw, Upload, LogOut, Banknote, MessageCircle, X, User, CalendarClock, Lock, Loader2 } from 'lucide-react';
import { compressImage } from '../utils/imageCompression';
import ImageModal from '../components/ImageModal';
import Select from 'react-select';

export default function StudentView({ setView, globalData, fetchGlobalData, scriptUrl, highlightLogout }) {
  const [activities, setActivities] = useState([]);
  const [students, setStudents] = useState([]);
  
  const [selectedActivity, setSelectedActivity] = useState('');
  const [selectedStudent, setSelectedStudent] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  
  const [studentActiveTab, setStudentActiveTab] = useState('pendientes');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  // Editing & Auth states
  const [enteredPassword, setEnteredPassword] = useState('');
  const [passwordError, setPasswordError] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(() => localStorage.getItem('app_student_auth') === 'true');
  const [isEditing, setIsEditing] = useState(false);
  
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState({ type: '', text: '' });
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);

  const [lazyImage, setLazyImage] = useState(null);
  const [isFetchingImage, setIsFetchingImage] = useState(false);

  const openImageModal = async (actId) => {
    setIsImageModalOpen(true);
    setLazyImage(null);
    setIsFetchingImage(true);
    
    const url = new URL(window.location);
    url.searchParams.set('modal', 'image');
    window.history.pushState({}, '', url);

    try {
      const res = await fetch(scriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'getPaymentImage', studentId: selectedStudent, activityId: actId })
      });
      const data = await res.json();
      if (data.status === 'success') {
        setLazyImage(data.data.imageBase64);
      }
    } catch(e) {
      console.error(e);
    }
    setIsFetchingImage(false);
  };

  const closeImageModal = () => {
    if (new URLSearchParams(window.location.search).get('modal') === 'image') {
      window.history.back(); 
    } else {
      setIsImageModalOpen(false);
    }
  };

  const fileInputRef = useRef(null);

  const getExistingPayment = () => {
    return globalData?.payments?.find(p => p.StudentID === selectedStudent && p.ActivityID === selectedActivity);
  };
  
  const getExistingExemption = () => {
    return globalData?.exemptions?.find(p => p.StudentID === selectedStudent && p.ActivityID === selectedActivity);
  };

  const selectedActivityData = activities.find(act => act.ID === selectedActivity);
  const isClosed = selectedActivityData?.Deadline ? new Date(selectedActivityData.Deadline) < new Date() : false;

  const hasAlreadyPaid = !!getExistingPayment();
  const isExempted = !!getExistingExemption();

  useEffect(() => {
    if (globalData) {
      setActivities(globalData.activities || []);
      setStudents(globalData.students || []);
      
      if (selectedStudent && globalData.students) {
        const sObj = globalData.students.find(s => s.ID === selectedStudent);
        if (sObj && String(sObj.Password) === '1234') {
          setShowPasswordForm(true);
        }
      }
    }
  }, [globalData, selectedStudent]);

  // Check URL params and handle popstate for browser history
  useEffect(() => {
    const syncFromUrl = () => {
      const params = new URLSearchParams(window.location.search);
      const actId = params.get('actividad');
      const stdId = params.get('alumno');
      setSelectedActivity(actId || '');
      setSelectedStudent(stdId || '');
      if (params.get('modal') !== 'image') {
        setIsImageModalOpen(false);
      }
    };
    
    syncFromUrl();
    window.addEventListener('popstate', syncFromUrl);
    return () => window.removeEventListener('popstate', syncFromUrl);
  }, []);

  const handleActivityChange = (e) => {
    const val = e.target.value;
    setSelectedActivity(val);
    const url = new URL(window.location);
    url.searchParams.set('view', 'student');
    if (val) url.searchParams.set('actividad', val);
    else url.searchParams.delete('actividad');
    if (selectedStudent) url.searchParams.set('alumno', selectedStudent);
    window.history.pushState({}, '', url);
  };

  const handleStudentChange = (e) => {
    const val = e.target.value;
    setSelectedStudent(val);
    const url = new URL(window.location);
    url.searchParams.set('view', 'student');
    if (val) url.searchParams.set('alumno', val);
    else url.searchParams.delete('alumno');
    if (selectedActivity) url.searchParams.set('actividad', selectedActivity);
    window.history.pushState({}, '', url);
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      const url = URL.createObjectURL(file);
      setImagePreview(url);
    }
  };

  const handleVerifyPassword = () => {
    const studentObj = students.find(s => s.ID === selectedStudent);
    if (studentObj && studentObj.Password && String(studentObj.Password).toUpperCase() === enteredPassword) {
      setIsAuthenticated(true);
      setPasswordError(false);
      localStorage.setItem('app_student_auth', 'true');
    } else {
      setPasswordError(true);
    }
  };



  const handleSubmit = async (e) => {
    if(e && e.preventDefault) e.preventDefault();
    if (!selectedActivity || !selectedStudent || !imageFile) {
      setError('Por favor completa todos los campos.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const base64Image = await compressImage(imageFile);
      
      const response = await fetch(scriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'addPayment',
          activityId: selectedActivity,
          studentId: selectedStudent,
          imageBase64: base64Image
        })
      });

      const result = await response.json();
      if (result.status === 'success') {
        setSuccess(true);
        fetchGlobalData();
      } else {
        throw new Error(result.message || 'Error al enviar');
      }
    } catch (err) {
      console.error(err);
      setError('Error de red al enviar el comprobante.');
    }
    setIsSubmitting(false);
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if(newPassword.length !== 4 || currentPassword.length !== 4) return;
    setIsUpdatingPassword(true);
    setPasswordMsg({ type: '', text: '' });
    try {
      const res = await fetch(scriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'updateStudentPassword',
          studentId: selectedStudent,
          currentPassword: currentPassword,
          newPassword: newPassword
        })
      });
      const data = await res.json();
      if(data.status === 'success') {
        setPasswordMsg({ type: 'success', text: 'Contraseña actualizada exitosamente' });
        setCurrentPassword('');
        setNewPassword('');
        setEnteredPassword(newPassword); 
        fetchGlobalData();
      } else {
        setPasswordMsg({ type: 'error', text: data.message });
      }
    } catch (err) {
      setPasswordMsg({ type: 'error', text: 'Error de red' });
    }
    setIsUpdatingPassword(false);
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-green-50">
        <div className="bg-white p-8 rounded-2xl shadow-xl text-center max-w-sm w-full space-y-6">
          <CheckCircle2 size={64} className="text-green-500 mx-auto" />
          <h2 className="text-2xl font-bold text-gray-900">¡Pago Enviado!</h2>
          <p className="text-gray-600">Tu comprobante ha sido registrado exitosamente.</p>
          <button
            onClick={() => {
              setSuccess(false);
              setIsEditing(false);
              setImageFile(null);
              setImagePreview(null);
            }}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-lg font-medium transition"
          >
            Volver a mis actividades
          </button>
        </div>
      </div>
    );
  }

  // --- STUDENT LOGIN SCREEN ---
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <button 
            onClick={() => setView('home')}
            className="flex items-center text-gray-500 hover:text-gray-900 mb-6 transition font-medium"
          >
            <ArrowLeft size={20} className="mr-2" />
            Volver al Menú Principal
          </button>
          
          <div className="bg-white p-8 rounded-2xl shadow-xl text-center space-y-6">
            <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-2">
              <User size={32} />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Portal Estudiante</h2>
            
            <div className="text-left space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tu Nombre</label>
                <Select
                  value={students.sort((a,b) => (a.Name||'').localeCompare(b.Name||'')).map(std => ({ value: std.ID, label: std.Name })).find(opt => opt.value === selectedStudent) || null}
                  onChange={(option) => handleStudentChange({ target: { value: option ? option.value : '' } })}
                  options={students.sort((a,b) => (a.Name||'').localeCompare(b.Name||'')).map(std => ({ value: std.ID, label: std.Name }))}
                  placeholder="Selecciona o busca tu nombre..."
                  isClearable
                  noOptionsMessage={() => "No se encontraron alumnos"}
                  className="text-left text-sm"
                  styles={{
                    control: (base, state) => ({
                      ...base,
                      padding: '4px',
                      borderRadius: '0.5rem',
                      borderColor: state.isFocused ? '#3b82f6' : '#d1d5db',
                      boxShadow: state.isFocused ? '0 0 0 2px rgba(59, 130, 246, 0.5)' : 'none',
                      backgroundColor: '#f9fafb',
                      '&:hover': {
                        borderColor: state.isFocused ? '#3b82f6' : '#d1d5db'
                      }
                    })
                  }}
                />
              </div>

              {selectedStudent && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña (4 letras)</label>
                  <input 
                    type="password" 
                    placeholder="****" 
                    value={enteredPassword}
                    onChange={(e) => {setEnteredPassword(e.target.value.toUpperCase()); setPasswordError(false);}}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && selectedStudent && enteredPassword.length === 4) {
                        handleVerifyPassword();
                      }
                    }}
                    maxLength={4}
                    className={`w-full text-center text-xl border rounded-lg p-3 uppercase font-mono tracking-widest bg-gray-50 outline-none transition focus:ring-2 ${passwordError ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'}`}
                  />
                  {passwordError && <p className="text-red-500 text-sm mt-1 font-medium text-center">Contraseña incorrecta</p>}
                </div>
              )}
            </div>

            <button
              onClick={handleVerifyPassword}
              disabled={!selectedStudent || enteredPassword.length !== 4}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold p-4 rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Ingresar
            </button>
            
            {selectedStudent && (
              <a 
                href={`https://wa.me/51972138509?text=${encodeURIComponent(`Hola, soy ${students.find(s=>s.ID===selectedStudent)?.Name}, solicito mi contraseña de estudiante.`)}`}
                target="_blank" rel="noreferrer"
                className="text-sm text-blue-600 hover:text-blue-800 underline flex justify-center items-center gap-1 font-medium"
              >
                <MessageCircle size={16} /> Olvidé mi contraseña
              </a>
            )}
          </div>
        </div>
      </div>
    );
  }

  // --- STUDENT DASHBOARD SCREEN ---
  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 flex flex-col items-center pt-8">
      <div className="w-full max-w-lg flex justify-between items-center mb-6 gap-3">
        <button 
          onClick={() => { setIsAuthenticated(false); setEnteredPassword(''); localStorage.removeItem('app_student_auth'); setView('home'); }}
          className={`flex-shrink-0 flex items-center font-bold transition px-3 py-1.5 rounded-lg text-sm border shadow-sm ${highlightLogout ? 'bg-red-600 text-white border-red-600 animate-pulse shadow-[0_0_15px_rgba(220,38,38,0.6)]' : 'text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 border-red-100'}`}
        >
          <LogOut size={16} className="mr-1.5" /> Salir
        </button>
        <h2 className="text-sm sm:text-lg font-bold text-gray-900 flex items-center gap-2 text-right leading-tight">
          <User size={18} className="text-blue-600 flex-shrink-0 hidden sm:block" />
          <span className="line-clamp-2">{students.find(s => s.ID === selectedStudent)?.Name}</span>
        </h2>
      </div>

      {/* --- DASHBOARD SUMMARY --- */}
      <div className="max-w-lg w-full flex gap-4 mb-6">
        <div className="flex-1 bg-white p-4 rounded-2xl shadow-sm border text-center">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Actividades Pagadas</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{
            activities.filter(act => 
              act.Status !== 'paused' && 
              !(globalData?.exemptions || []).some(e => e.StudentID === selectedStudent && e.ActivityID === act.ID)
            ).filter(act => (globalData?.payments || []).some(p => p.StudentID === selectedStudent && p.ActivityID === act.ID))
             .length
          }</p>
        </div>
        <div className="flex-1 bg-white p-4 rounded-2xl shadow-sm border text-center">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Pendientes</p>
          <p className="text-2xl font-bold text-orange-500 mt-1">{
            activities.filter(act => 
              act.Status !== 'paused' && 
              !(globalData?.exemptions || []).some(e => e.StudentID === selectedStudent && e.ActivityID === act.ID)
            ).filter(act => !(globalData?.payments || []).some(p => p.StudentID === selectedStudent && p.ActivityID === act.ID))
             .length
          }</p>
        </div>
      </div>

      {/* --- TABS --- */}
      <div className="max-w-lg w-full bg-white rounded-t-2xl border-b flex overflow-hidden">
        <button 
          onClick={() => setStudentActiveTab('pendientes')}
          className={`flex-1 py-4 text-sm font-bold transition-colors ${studentActiveTab === 'pendientes' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50' : 'text-gray-500 hover:bg-gray-50'}`}
        >
          Pagar / Editar
        </button>
        <button 
          onClick={() => setStudentActiveTab('historial')}
          className={`flex-1 py-4 text-sm font-bold transition-colors ${studentActiveTab === 'historial' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50' : 'text-gray-500 hover:bg-gray-50'}`}
        >
          Mi Historial
        </button>
      </div>

      <div className="max-w-lg w-full bg-white rounded-b-2xl shadow-md p-6 sm:p-8">
        
        {studentActiveTab === 'historial' ? (
          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-6">Actividades Pagadas</h3>
            {activities.filter(act => 
              !(globalData?.exemptions || []).some(e => e.StudentID === selectedStudent && e.ActivityID === act.ID)
            ).filter(act => (globalData?.payments || []).some(p => p.StudentID === selectedStudent && p.ActivityID === act.ID)).length === 0 ? (
              <p className="text-gray-500 text-center py-8">Aún no tienes pagos registrados en el historial.</p>
            ) : (
              <div className="space-y-4">
                {activities.filter(act => 
                  !(globalData?.exemptions || []).some(e => e.StudentID === selectedStudent && e.ActivityID === act.ID)
                ).filter(act => (globalData?.payments || []).some(p => p.StudentID === selectedStudent && p.ActivityID === act.ID)).map(act => {
                  const payment = (globalData?.payments || []).find(p => p.StudentID === selectedStudent && p.ActivityID === act.ID);
                  let dateStr = '';
                  if (payment && payment.Timestamp) {
                    const d = new Date(payment.Timestamp);
                    if (!isNaN(d)) {
                      dateStr = d.toLocaleString('es-PE', { dateStyle: 'medium', timeStyle: 'short' });
                    }
                  }
                  
                  return (
                    <div key={act.ID} className="border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:shadow-sm transition">
                      <div>
                        <h4 className="font-bold text-gray-900">{act.Name}</h4>
                        <p className="text-sm text-green-600 font-medium mt-1">
                          S/ {act.Amount} - Pagado {payment?.ImageBase64 === 'EFECTIVO' ? 'en Efectivo' : ''}
                        </p>
                        {dateStr && <p className="text-xs text-gray-500 mt-1">Registrado: {dateStr}</p>}
                      </div>
                      {payment?.ImageBase64 === 'EFECTIVO' ? (
                        <div className="text-sm bg-emerald-50 border border-emerald-200 text-emerald-700 py-2 px-4 rounded-lg font-bold flex items-center justify-center gap-2">
                          <CheckCircle2 size={16} /> Verificado
                        </div>
                      ) : (
                        <button 
                          onClick={() => { setSelectedActivity(act.ID); openImageModal(act.ID); }}
                          className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 px-4 rounded-lg font-medium transition flex items-center justify-center gap-2"
                        >
                          <ImageIcon size={16} /> Ver comprobante
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-6">Pagar o Editar Comprobante</h3>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-6 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Selecciona la actividad</label>
            <select
              value={selectedActivity}
              onChange={handleActivityChange}
              className="w-full border border-gray-300 rounded-lg p-3 bg-white focus:ring-2 focus:ring-blue-500 outline-none transition"
            >
              <option value="">Selecciona una actividad...</option>
              {activities.filter(act => 
                act.Status !== 'paused' && 
                !(globalData?.exemptions || []).some(e => e.StudentID === selectedStudent && e.ActivityID === act.ID)
              ).map(act => {
                const isPaid = (globalData?.payments || []).some(p => p.StudentID === selectedStudent && p.ActivityID === act.ID);
                return (
                  <option 
                    key={act.ID} 
                    value={act.ID}
                    style={{ color: isPaid ? '#16a34a' : '#ea580c', fontWeight: '500' }}
                  >
                    {isPaid ? "✅" : "⏳"} {act.Name} - S/ {act.Amount} {isPaid ? "(Pagado)" : "(Pendiente)"}
                  </option>
                );
              })}
            </select>
          </div>

          {selectedActivity && (
            hasAlreadyPaid ? (
              <div className="bg-green-50 border border-green-200 p-6 rounded-xl text-center shadow-sm">
                <CheckCircle2 size={40} className="text-green-500 mx-auto mb-3" />
                <h3 className="font-bold text-green-800 text-lg">¡Pago Registrado!</h3>
                <p className="text-sm text-green-700 mt-1 mb-4">El sistema ya tiene tu comprobante guardado para esta actividad. ¡Muchas gracias!</p>
                
                <div className="mt-4 border-t border-green-200 pt-4 text-left">
                  <p className="text-sm font-bold text-green-800 mb-2 text-center">Comprobante Actual:</p>
                  
                  {getExistingPayment()?.ImageBase64 === 'EFECTIVO' ? (
                    <div className="w-full bg-emerald-100 text-emerald-800 p-8 rounded-xl flex flex-col items-center justify-center mb-4">
                      <Banknote size={48} className="mb-2 opacity-80" />
                      <span className="font-bold text-lg text-center">Pago realizado en efectivo</span>
                      <span className="text-sm mt-2 opacity-90 text-center">Registrado por la tesorera</span>
                    </div>
                  ) : (
                    <img 
                      src={getExistingPayment()?.ImageBase64} 
                      alt="Comprobante" 
                      className="w-full max-h-64 object-contain rounded border mb-4 bg-white cursor-pointer hover:opacity-90 transition shadow-sm" 
                      onClick={openImageModal}
                    />
                  )}
                  
                  {!isEditing && !isClosed && getExistingPayment()?.ImageBase64 !== 'EFECTIVO' ? (
                    <button 
                      type="button"
                      onClick={() => setIsEditing(true)}
                      disabled={(getExistingPayment()?.Attempts || 1) >= 3}
                      className="w-full bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-3 px-4 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Editar comprobante (Te quedan {3 - (getExistingPayment()?.Attempts || 1)} intentos)
                    </button>
                  ) : !isEditing && isClosed ? (
                    <div className="w-full bg-gray-100 text-gray-500 font-medium py-3 px-4 rounded-lg text-center text-sm border border-gray-200">
                      El plazo para modificar este comprobante ha expirado.
                    </div>
                  ) : getExistingPayment()?.ImageBase64 === 'EFECTIVO' ? (
                     <div className="w-full bg-emerald-50 text-emerald-700 font-medium py-3 px-4 rounded-lg text-center text-sm border border-emerald-200">
                      Los pagos en efectivo no se pueden editar. Si hay un error, comunícate con la tesorera.
                    </div>
                  ) : (
                    <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm mt-4">
                       <h4 className="font-bold text-gray-800 mb-3 text-center">Subir Nuevo Comprobante</h4>
                       <div 
                        onClick={() => fileInputRef.current.click()}
                        className="border-2 border-dashed border-gray-300 rounded-xl p-4 flex flex-col items-center justify-center text-gray-500 cursor-pointer hover:bg-gray-50 transition"
                      >
                         <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageChange} className="hidden" />
                         {imagePreview ? (
                            <img src={imagePreview} className="w-full h-32 object-contain rounded-lg" />
                         ) : (
                            <div className="text-center py-4">
                              <ImageIcon size={24} className="mx-auto mb-2 text-gray-400" />
                              <span className="text-xs font-medium">Toca para subir nueva imagen</span>
                            </div>
                         )}
                      </div>
                      <div className="flex gap-3 mt-4">
                        <button type="button" onClick={() => {setIsEditing(false); setImageFile(null); setImagePreview(null);}} className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 py-2 rounded-lg font-bold transition">Cancelar</button>
                        <button type="button" onClick={handleSubmit} disabled={isSubmitting || !imageFile} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-bold transition disabled:opacity-50">Guardar</button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : isExempted ? (
              <div className="bg-gray-100 border border-gray-200 p-6 rounded-xl text-center shadow-sm">
                <CheckCircle2 size={40} className="text-gray-400 mx-auto mb-3" />
                <h3 className="font-bold text-gray-800 text-lg">No participas en esta actividad</h3>
                <p className="text-sm text-gray-600 mt-1">Has sido marcado como exonerado por la tesorera. No es necesario que envíes ningún comprobante.</p>
              </div>
            ) : isClosed ? (
              <div className="bg-orange-50 border border-orange-200 p-6 rounded-xl text-center shadow-sm">
                <CalendarClock size={40} className="text-orange-500 mx-auto mb-3" />
                <h3 className="font-bold text-orange-800 text-lg">Actividad Cerrada</h3>
                <p className="text-sm text-orange-700 mt-2">
                  El plazo para subir comprobantes de pago de esta actividad ha finalizado. Por favor, realiza el pago y entrega el comprobante (o el dinero en efectivo) directamente a la tesorera en el aula.
                </p>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Captura (Yape/Plin)</label>
                <div 
                  onClick={() => fileInputRef.current.click()}
                  className="border-2 border-dashed border-gray-300 rounded-xl p-6 flex flex-col items-center justify-center text-gray-500 cursor-pointer hover:bg-gray-50 hover:border-blue-400 transition"
                >
                  <input 
                    type="file" 
                    accept="image/*" 
                    ref={fileInputRef} 
                    onChange={handleImageChange} 
                    className="hidden" 
                  />
                  {imagePreview ? (
                    <div className="relative w-full">
                      <img src={imagePreview} alt="Preview" className="w-full h-48 object-contain rounded-lg" />
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 hover:opacity-100 transition rounded-lg text-white font-medium">
                        Cambiar imagen
                      </div>
                    </div>
                  ) : (
                    <>
                      <ImageIcon size={32} className="mb-2 text-gray-400" />
                      <span className="text-sm font-medium">Toca para subir imagen</span>
                      <span className="text-xs text-gray-400 mt-1">JPG, PNG (Max 5MB)</span>
                    </>
                  )}
                </div>
              </div>
            )
          )}

          {!hasAlreadyPaid && !isExempted && selectedActivity && (
            <button
              type="submit"
              disabled={isSubmitting || !imageFile}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold p-4 rounded-xl flex items-center justify-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed mt-6"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Procesando...
                </>
              ) : (
                <>
                  <Upload size={20} />
                  Enviar Comprobante
                </>
              )}
            </button>
          )}
        </form>
          </div>
        )}
      </div>

      <div className="max-w-lg w-full bg-white rounded-2xl shadow-md p-6 sm:p-8 mt-6">
        <div 
          className="flex justify-between items-center cursor-pointer"
          onClick={() => setShowPasswordForm(!showPasswordForm)}
        >
          <div className="flex items-center gap-2 text-gray-900">
            <Lock size={20} className="text-gray-500" />
            <h3 className="text-lg font-bold">Seguridad</h3>
          </div>
          <button className="text-blue-600 font-medium text-sm hover:underline">
            {showPasswordForm ? 'Ocultar' : 'Cambiar Contraseña'}
          </button>
        </div>

        {showPasswordForm && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            {String(students.find(s => s.ID === selectedStudent)?.Password) === '1234' && (
              <p className="text-sm text-yellow-600 bg-yellow-50 p-3 rounded-lg mb-4 border border-yellow-200">
                Estás usando la contraseña por defecto. Te recomendamos cambiarla por seguridad.
              </p>
            )}
            
            {passwordMsg.text && (
              <div className={`p-3 rounded-lg mb-4 text-sm ${passwordMsg.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                {passwordMsg.text}
              </div>
            )}

            <form onSubmit={handleUpdatePassword} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña Actual (4 caracteres)</label>
            <input 
              type="password" 
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value.toUpperCase())}
              maxLength={4}
              placeholder="****"
              className="w-full border border-gray-300 rounded-lg p-3 bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none uppercase font-mono tracking-widest text-center"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nueva Contraseña (4 caracteres)</label>
            <input 
              type="password" 
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value.toUpperCase())}
              maxLength={4}
              placeholder="****"
              className="w-full border border-gray-300 rounded-lg p-3 bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none uppercase font-mono tracking-widest text-center"
            />
          </div>
              <button
                type="submit"
                disabled={isUpdatingPassword || newPassword.length !== 4 || currentPassword.length !== 4}
                className="w-full bg-gray-800 hover:bg-gray-900 text-white font-bold p-3 rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed mt-2"
              >
                {isUpdatingPassword ? 'Actualizando...' : 'Cambiar Contraseña'}
              </button>
            </form>
          </div>
        )}
      </div>

      {isImageModalOpen && (
        <ImageModal base64Image={getExistingPayment()?.ImageBase64} onClose={closeImageModal} />
      )}
    </div>
  );
}
