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
  const [isAuthenticated, setIsAuthenticated] = useState(() => localStorage.getItem('app_auth') === 'true');
  const [userRole, setUserRole] = useState(() => localStorage.getItem('app_role') || '');
  const [showLogoutAlert, setShowLogoutAlert] = useState(false);

  const triggerLogoutAlert = () => {
    setShowLogoutAlert(true);
    setTimeout(() => setShowLogoutAlert(false), 3000);
  };

  const [view, setViewState] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    let initialView = params.get('view');
    if (params.get('actividad')) initialView = 'student';
    if (!initialView) initialView = localStorage.getItem('app_view') || 'home';
    return initialView;
  });

  const setView = (newView) => {
    if (newView === view) return;
    setViewState(newView);
    const url = new URL(window.location);
    url.searchParams.set('view', newView);
    window.history.pushState({}, '', url);
  };

  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      let poppedView = params.get('view');
      
      const isStudentAuth = localStorage.getItem('app_student_auth') === 'true';

      if (isAuthenticated && view === 'admin-dashboard' && poppedView !== 'admin-dashboard') {
         const url = new URL(window.location);
         url.searchParams.set('view', 'admin-dashboard');
         window.history.pushState({}, '', url);
         setViewState('admin-dashboard');
         triggerLogoutAlert();
         return;
      }

      if (isStudentAuth && view === 'student' && poppedView !== 'student') {
         const url = new URL(window.location);
         url.searchParams.set('view', 'student');
         window.history.pushState({}, '', url);
         setViewState('student');
         triggerLogoutAlert();
         return;
      }

      if (params.get('actividad')) poppedView = 'student';
      if (!poppedView) poppedView = 'home';
      setViewState(poppedView);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isAuthenticated]);

  useEffect(() => {
    let timeout;
    const resetTimer = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        if (isAuthenticated || localStorage.getItem('app_student_auth') === 'true') {
          globalLogout();
        }
      }, 180000); // 3 minutos
    };

    const events = ['mousemove', 'keydown', 'scroll', 'click', 'touchstart'];
    events.forEach(e => window.addEventListener(e, resetTimer));
    resetTimer();

    return () => {
      clearTimeout(timeout);
      events.forEach(e => window.removeEventListener(e, resetTimer));
    };
  }, [isAuthenticated]);

  const globalLogout = () => {
    setIsAuthenticated(false);
    setUserRole('');
    localStorage.removeItem('app_auth');
    localStorage.removeItem('app_role');
    localStorage.removeItem('app_student_auth');
    localStorage.removeItem('app_student_id');
    
    setViewState('home');
    const url = new URL(window.location);
    url.search = '?view=home';
    window.history.pushState({}, '', url);
  };

  const [globalData, setGlobalData] = useState({ activities: [], students: [], payments: [], exemptions: [] });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    localStorage.setItem('app_view', view);
  }, [view]);

  useEffect(() => {
    localStorage.setItem('app_auth', isAuthenticated);
    localStorage.setItem('app_role', userRole);
  }, [isAuthenticated, userRole]);

  const handleSetView = (newView) => {
    if (newView === view) return;
    
    if (newView === 'home') {
      if ((view === 'admin-dashboard' || view === 'super-login' || view === 'admin-login') && isAuthenticated) {
        triggerLogoutAlert();
        return;
      }
      if (view === 'student' && localStorage.getItem('app_student_auth') === 'true') {
        triggerLogoutAlert();
        return;
      }
    }

    // Auto-redirect if they try to login but are already authenticated for that role
    if (newView === 'admin-login' && isAuthenticated && userRole === 'tesorera') {
      newView = 'admin-dashboard';
    } else if (newView === 'super-login' && isAuthenticated && userRole === 'admin') {
      newView = 'admin-dashboard';
    } else if ((newView === 'admin-login' || newView === 'super-login') && isAuthenticated) {
      // Trying to access a different login while authenticated: logout first
      setIsAuthenticated(false);
      setUserRole('');
      localStorage.removeItem('app_auth');
      localStorage.removeItem('app_role');
    }

    setViewState(newView);
    const url = new URL(window.location);
    url.search = '?view=' + newView;
    window.history.pushState({}, '', url);
  };

  useEffect(() => {
    if (view === 'home') {
      if (isAuthenticated) {
        handleSetView('admin-dashboard');
      } else if (localStorage.getItem('app_student_auth') === 'true') {
        handleSetView('student');
      }
    }
  }, [view, isAuthenticated]);

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

  const handleAdminLogin = (role) => {
    setIsAuthenticated(true);
    setUserRole(role);
    setView('admin-dashboard');
  };

  const handleLogout = () => {
    globalLogout();
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
      {showLogoutAlert && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-4 py-2 rounded-full shadow-lg z-[9999] text-sm font-medium animate-bounce">
          Por favor, cierra sesión para salir.
        </div>
      )}

      {!isUrlConfigured && (
        <div className="bg-red-500 text-white text-center p-2 font-bold text-sm z-50 relative">
          ⚠️ Por favor, configura la SCRIPT_URL en App.jsx con el enlace de Google Apps Script.
        </div>
      )}

      {view === 'home' && <Home setView={handleSetView} />}
      {view === 'student' && <StudentView setView={handleSetView} globalData={globalData} fetchGlobalData={fetchGlobalData} scriptUrl={SCRIPT_URL} highlightLogout={showLogoutAlert} />}
      {view === 'admin-login' && <AdminLogin setView={handleSetView} onLogin={handleAdminLogin} requiredRole="tesorera" scriptUrl={SCRIPT_URL} />}
      {view === 'super-login' && <AdminLogin setView={handleSetView} onLogin={handleAdminLogin} requiredRole="admin" scriptUrl={SCRIPT_URL} />}
      {view === 'admin-dashboard' && (
        isAuthenticated ? (
          <AdminDashboard setView={handleSetView} globalData={globalData} fetchGlobalData={fetchGlobalData} scriptUrl={SCRIPT_URL} onLogout={handleLogout} role={userRole} highlightLogout={showLogoutAlert} />
        ) : (
          <Home setView={handleSetView} />
        )
      )}
    </>
  );
}

export default App;
