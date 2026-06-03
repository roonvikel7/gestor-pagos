import React, { useState } from 'react';
import { ArrowLeft, Check, X, RefreshCw, Plus, Users, ClipboardCopy, Image as ImageIcon, Download, UserMinus, FileSpreadsheet, Image as ImageLucide, MessageCircle, Pause, Play, LogOut, Cake, Trash2, CalendarClock, Lock } from 'lucide-react';
import ImageModal from '../components/ImageModal';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as htmlToImage from 'html-to-image';
import ExcelReportTemplate from '../components/ExcelReportTemplate';
import { getRandomPassword } from '../utils/passwords';
import Select from 'react-select';

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

  const tabs = role === 'admin' ? ['pagos', 'actividades', 'alumnos', 'seguridad'] : ['pagos', 'actividades', 'seguridad'];

  React.useEffect(() => {
    if (role === 'tesorera' && (activeTab === 'alumnos' || activeTab === 'seguridad' && false)) {
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
  const [treasurerName, setTreasurerName] = useState(() => localStorage.getItem('app_treasurer_name') || '');
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

      {/* Seguridad Tab */}
      {activeTab === 'seguridad' && (
        <div className="max-w-md mx-auto space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Lock size={20} className="text-indigo-600" /> Seguridad de Acceso
            </h3>
            <p className="text-sm text-gray-500 mb-6">Actualiza el PIN o contraseña de acceso para tu rol de {role === 'admin' ? 'Administrador' : 'Delegada / Tesorera'}.</p>
            
            {securityMsg.text && (
              <div className={`p-4 rounded-lg mb-6 text-sm font-medium ${securityMsg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                {securityMsg.text}
              </div>
            )}
            
            <form onSubmit={handleUpdateTreasurerPassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña Actual</label>
                <input
                  type="password"
                  value={currentTreasurerPass}
                  onChange={(e) => { setCurrentTreasurerPass(e.target.value); setSecurityMsg({type: '', text: ''}); }}
                  className="w-full border rounded-xl p-3 bg-gray-50 focus:ring-2 focus:ring-indigo-500 outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nueva Contraseña</label>
                <input
                  type="password"
                  value={newTreasurerPass}
                  onChange={(e) => { setNewTreasurerPass(e.target.value); setSecurityMsg({type: '', text: ''}); }}
                  className="w-full border rounded-xl p-3 bg-gray-50 focus:ring-2 focus:ring-indigo-500 outline-none"
                  required
                  maxLength={4}
                  placeholder="Mínimo 4 caracteres (ej. 1234)"
                />
                <p className="text-xs text-gray-500 mt-1">La nueva contraseña reemplazará a tu acceso actual.</p>
              </div>
              <button 
                type="submit" 
                disabled={isSubmitting || newTreasurerPass.length !== 4}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold p-3 rounded-xl transition disabled:opacity-50"
              >
                {isSubmitting ? 'Actualizando...' : 'Actualizar Contraseña'}
              </button>
            </form>
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
      
      {/* Reset Password Modal */}
      {resetModalStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">Modificar Contraseña</h3>
              <button onClick={() => setResetModalStudent(null)} className="text-gray-500 hover:text-gray-800">
                <X size={20} />
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Cambiarás la contraseña del estudiante <strong>{resetModalStudent.Name}</strong>.
            </p>
            
            {resetPasswordError && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">
                {resetPasswordError}
              </div>
            )}
            
            <form onSubmit={handleAdminResetPassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tu PIN de Administrador</label>
                <input 
                  type="password" 
                  value={adminPasswordInput}
                  onChange={(e) => setAdminPasswordInput(e.target.value)}
                  className="w-full border rounded-lg p-2 bg-gray-50 outline-none text-center tracking-widest text-lg"
                  placeholder="****"
                  maxLength={4}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nueva Contraseña (Estudiante)</label>
                <input 
                  type="text" 
                  value={newStudentPassword}
                  onChange={(e) => setNewStudentPassword(e.target.value.toUpperCase())}
                  className="w-full border rounded-lg p-2 bg-gray-50 outline-none text-center font-mono tracking-widest uppercase text-lg"
                  placeholder="****"
                  maxLength={4}
                />
              </div>
              <button 
                type="submit" 
                disabled={isSubmitting || adminPasswordInput.length !== 4 || newStudentPassword.length !== 4}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white p-3 rounded-lg font-bold transition disabled:opacity-50"
              >
                {isSubmitting ? 'Guardando...' : 'Confirmar Cambio'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
