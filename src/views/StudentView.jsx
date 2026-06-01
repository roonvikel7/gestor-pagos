import React, { useState, useEffect, useRef } from 'react';
import { Upload, ArrowLeft, CheckCircle2, Loader2, Image as ImageIcon } from 'lucide-react';
import { compressImage } from '../utils/imageCompression';

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

  const fileInputRef = useRef(null);

  useEffect(() => {
    if (globalData) {
      setActivities(globalData.activities || []);
      setStudents(globalData.students || []);
    }
  }, [globalData]);

  // Check URL params for ?actividad=ID
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const actId = params.get('actividad');
    if (actId) {
      setSelectedActivity(actId);
    }
  }, []);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      const url = URL.createObjectURL(file);
      setImagePreview(url);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
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
        fetchGlobalData(); // refresh data silently
      } else {
        throw new Error(result.message || 'Error al enviar');
      }
    } catch (err) {
      console.error(err);
      setError('Ocurrió un error al enviar el comprobante. Revisa tu conexión.');
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
            onClick={() => setView('home')}
            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 p-3 rounded-lg font-medium transition"
          >
            Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 flex justify-center items-start pt-12">
      <div className="max-w-lg w-full bg-white rounded-2xl shadow-md p-6 sm:p-8">
        <button 
          onClick={() => setView('home')}
          className="flex items-center text-gray-500 hover:text-gray-900 mb-6 transition"
        >
          <ArrowLeft size={20} className="mr-2" />
          Volver
        </button>

        <h2 className="text-2xl font-bold text-gray-900 mb-6">Subir Comprobante</h2>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-6 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Actividad</label>
            <select
              value={selectedActivity}
              onChange={(e) => setSelectedActivity(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-3 bg-white focus:ring-2 focus:ring-blue-500 outline-none transition"
              disabled={new URLSearchParams(window.location.search).get('actividad') !== null}
            >
              <option value="">Selecciona una actividad...</option>
              {activities.filter(act => act.Status !== 'paused').map(act => (
                <option key={act.ID} value={act.ID}>{act.Name} - S/ {act.Amount}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tu Nombre</label>
            <select
              value={selectedStudent}
              onChange={(e) => setSelectedStudent(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-3 bg-white focus:ring-2 focus:ring-blue-500 outline-none transition"
            >
              <option value="">Selecciona tu nombre...</option>
              {students.sort((a,b) => a.Name.localeCompare(b.Name)).map(std => (
                <option key={std.ID} value={std.ID}>{std.Name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Captura (Yape/Plin)</label>
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

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold p-4 rounded-xl flex items-center justify-center gap-2 transition disabled:opacity-70"
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
        </form>
      </div>
    </div>
  );
}
