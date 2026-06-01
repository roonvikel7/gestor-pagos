import React, { useState, useEffect } from 'react';
import Home from './views/Home';
import StudentView from './views/StudentView';
import AdminLogin from './views/AdminLogin';
import AdminDashboard from './views/AdminDashboard';
import { Loader2 } from 'lucide-react';

// === IMPORTANTE ===
// Pega aquí la URL de tu Google Apps Script web app
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyTqqbD5BLwe3eNmmXTMVgrHU5GpvlwLJG0pEPeVKo9abPc5QJAeGsRhw9nwESvLm-wkg/exec";

function App() {
  const [view, setView] = useState(() => localStorage.getItem('app_view') || 'home');
  const [globalData, setGlobalData] = useState({ activities: [], students: [], payments: [], exemptions: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(() => localStorage.getItem('app_auth') === 'true');

  useEffect(() => {
    localStorage.setItem('app_view', view);
  }, [view]);

  useEffect(() => {
    localStorage.setItem('app_auth', isAuthenticated);
  }, [isAuthenticated]);

  const handleSetView = (newView) => {
    // Si intenta ir al login pero ya está autenticado, mandarlo directo al dashboard
    if (newView === 'admin-login' && isAuthenticated) {
      setView('admin-dashboard');
    } else {
      setView(newView);
    }
  };

  // Inicialmente ver si hay un parámetro 'actividad'
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('actividad')) {
      handleSetView('student');
    }
  }, []);

  const fetchGlobalData = async () => {
    try {
      // Evita hacer la llamada si no hay URL configurada
      if (SCRIPT_URL === "LA_URL_DE_TU_APPS_SCRIPT_AQUI") {
        setIsLoading(false);
        return;
      }
      
      const res = await fetch(SCRIPT_URL);
      const result = await res.json();
      if (result.status === 'success') {
        setGlobalData(result.data);
      }
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGlobalData();
  }, []);

  const handleAdminLogin = () => {
    setIsAuthenticated(true);
    setView('admin-dashboard');
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setView('home');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center text-blue-600">
          <Loader2 size={48} className="animate-spin mb-4" />
          <p className="font-medium text-gray-600">Cargando sistema...</p>
        </div>
      </div>
    );
  }

  // Warning if URL is not set
  const isUrlConfigured = SCRIPT_URL !== "LA_URL_DE_TU_APPS_SCRIPT_AQUI";

  return (
    <>
      {!isUrlConfigured && (
        <div className="bg-red-500 text-white text-center p-2 font-bold text-sm z-50 relative">
          ⚠️ Por favor, configura la SCRIPT_URL en App.jsx con el enlace de Google Apps Script.
        </div>
      )}

      {view === 'home' && <Home setView={handleSetView} />}
      {view === 'student' && <StudentView setView={handleSetView} globalData={globalData} fetchGlobalData={fetchGlobalData} scriptUrl={SCRIPT_URL} />}
      {view === 'admin-login' && <AdminLogin setView={handleSetView} onLogin={handleAdminLogin} />}
      {view === 'admin-dashboard' && (
        isAuthenticated ? (
          <AdminDashboard setView={handleSetView} globalData={globalData} fetchGlobalData={fetchGlobalData} scriptUrl={SCRIPT_URL} onLogout={handleLogout} />
        ) : (
          <Home setView={handleSetView} />
        )
      )}
    </>
  );
}

export default App;
