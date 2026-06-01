import React, { useState, useEffect, useRef } from 'react';
import { Upload, ArrowLeft, CheckCircle2, Loader2, Image as ImageIcon, MessageCircle, X, User } from 'lucide-react';
import { compressImage } from '../utils/imageCompression';
import ImageModal from '../components/ImageModal';

export default function StudentView({ setView, globalData, fetchGlobalData, scriptUrl }) {
  const [activities, setActivities] = useState([]);
  const [students, setStudents] = useState([]);
  
  const [selectedActivity, setSelectedActivity] = useState('');
  const [selectedStudent, setSelectedStudent] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  // Editing & Auth states
  const [enteredPassword, setEnteredPassword] = useState('');
  const [passwordError, setPasswordError] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(() => localStorage.getItem('app_student_auth') === 'true');
  const [isEditing, setIsEditing] = useState(false);
  
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);

  const openImageModal = () => {
    setIsImageModalOpen(true);
    const url = new URL(window.location);
    url.searchParams.set('modal', 'image');
    window.history.pushState({}, '', url);
  };

  const closeImageModal = () => {
    if (new URLSearchParams(window.location.search).get('modal') === 'image') {
      window.history.back(); 
    } else {
      setIsImageModalOpen(false);
    }
  };

  const fileInputRef = useRef(null);

  const hasAlreadyPaid = globalData?.payments?.some(
    p => p.StudentID === selectedStudent && p.ActivityID === selectedActivity
  );
  
  const isExempted = globalData?.exemptions?.some(
    e => e.StudentID === selectedStudent && e.ActivityID === selectedActivity
  );

  useEffect(() => {
    if (globalData) {
      setActivities(globalData.activities || []);
      setStudents(globalData.students || []);
    }
  }, [globalData]);

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
    if (studentObj && studentObj.Password && studentObj.Password.toUpperCase() === enteredPassword) {
      setIsAuthenticated(true);
      setPasswordError(false);
      localStorage.setItem('app_student_auth', 'true');
    } else {
      setPasswordError(true);
    }
  };

  const getExistingPayment = () => {
    return globalData?.payments?.find(p => p.StudentID === selectedStudent && p.ActivityID === selectedActivity);
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
      setError('Ocurrió un error: ' + (err.message || 'Revisa tu conexión.'));
    } finally {
      setIsSubmitting(false);
    }
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
            className="flex items-center text-gray-500 hover:text-gray-900 mb-6 transition"
          >
            <ArrowLeft size={20} className="mr-2" />
            Volver
          </button>
          
          <div className="bg-white p-8 rounded-2xl shadow-xl text-center space-y-6">
            <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-2">
              <User size={32} />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Portal Estudiante</h2>
            
            <div className="text-left space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tu Nombre</label>
                <select
                  value={selectedStudent}
                  onChange={handleStudentChange}
                  className="w-full border border-gray-300 rounded-lg p-3 bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none transition"
                >
                  <option value="">Selecciona tu nombre...</option>
                  {students.sort((a,b) => (a.Name||'').localeCompare(b.Name||'')).map(std => (
                    <option key={std.ID} value={std.ID}>{std.Name}</option>
                  ))}
                </select>
              </div>

              {selectedStudent && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña (4 letras)</label>
                  <input 
                    type="password" 
                    placeholder="****" 
                    value={enteredPassword}
                    onChange={(e) => {setEnteredPassword(e.target.value.toUpperCase()); setPasswordError(false);}}
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
      <div className="w-full max-w-lg flex justify-between items-center mb-6">
        <button 
          onClick={() => { setIsAuthenticated(false); setEnteredPassword(''); localStorage.removeItem('app_student_auth'); setView('home'); }}
          className="flex items-center text-gray-500 hover:text-gray-900 transition"
        >
          <ArrowLeft size={20} className="mr-2" /> Salir
        </button>
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <User size={20} className="text-blue-600" />
          {students.find(s => s.ID === selectedStudent)?.Name}
        </h2>
      </div>

      <div className="max-w-lg w-full bg-white rounded-2xl shadow-md p-6 sm:p-8">
        <h3 className="text-xl font-bold text-gray-900 mb-6">Tus Actividades</h3>

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
              {activities.filter(act => act.Status !== 'paused').map(act => (
                <option key={act.ID} value={act.ID}>{act.Name} - S/ {act.Amount}</option>
              ))}
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
                  <img 
                    src={getExistingPayment()?.ImageBase64} 
                    alt="Comprobante" 
                    className="w-full max-h-64 object-contain rounded border mb-4 bg-white cursor-pointer hover:opacity-90 transition shadow-sm" 
                    onClick={openImageModal}
                  />
                  
                  {!isEditing ? (
                    <button 
                      type="button"
                      onClick={() => setIsEditing(true)}
                      disabled={(getExistingPayment()?.Attempts || 1) >= 3}
                      className="w-full bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-3 px-4 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Editar comprobante (Te quedan {3 - (getExistingPayment()?.Attempts || 1)} intentos)
                    </button>
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

      {isImageModalOpen && (
        <ImageModal base64Image={getExistingPayment()?.ImageBase64} onClose={closeImageModal} />
      )}
    </div>
  );
}
