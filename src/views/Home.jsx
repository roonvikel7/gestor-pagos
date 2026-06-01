import React from 'react';
import { User, ShieldCheck, Bot } from 'lucide-react';

export default function Home({ setView }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-xl space-y-8 text-center">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900">Gestor de Pagos</h1>
          <p className="text-gray-500 mt-2">Selecciona tu rol para continuar</p>
        </div>

        <div className="space-y-4">
          <button
            onClick={() => setView('student')}
            className="w-full flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-xl font-semibold transition shadow hover:shadow-lg"
          >
            <User size={24} />
            Soy Estudiante
          </button>
          
          <button
            onClick={() => setView('admin-login')}
            className="w-full flex items-center justify-center gap-3 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 p-4 rounded-xl font-semibold transition"
          >
            <ShieldCheck size={24} />
            Soy Tesorera
          </button>
        </div>
      </div>

      {/* Floating Robot Icon for Super Admin */}
      <button
        onClick={() => setView('super-login')}
        className="fixed bottom-6 right-6 bg-white p-4 rounded-full shadow-2xl text-indigo-600 hover:scale-110 hover:bg-indigo-50 transition border border-indigo-100 z-50 flex items-center justify-center"
        title="Panel Administrador"
      >
        <Bot size={28} />
      </button>
    </div>
  );
}
