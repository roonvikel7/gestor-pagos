import React, { useState } from 'react';
import { ArrowLeft, Lock, ArrowRight } from 'lucide-react';

export default function AdminLogin({ setView, onLogin }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (pin === '1234') {
      onLogin();
    } else {
      setError(true);
      setPin('');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 flex flex-col items-center justify-center">
      <div className="w-full max-w-sm">
        <button 
          onClick={() => setView('home')}
          className="flex items-center text-gray-500 hover:text-gray-900 mb-6 transition"
        >
          <ArrowLeft size={20} className="mr-2" />
          Volver
        </button>

        <div className="bg-white p-8 rounded-2xl shadow-xl text-center">
          <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <Lock size={32} />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Acceso Tesorera</h2>
          <p className="text-gray-500 mb-6 text-sm">Ingresa el PIN para continuar</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <input
                type="password"
                value={pin}
                onChange={(e) => { setPin(e.target.value); setError(false); }}
                placeholder="****"
                className={`w-full text-center text-2xl tracking-widest border rounded-xl p-4 bg-gray-50 outline-none transition focus:ring-2 ${error ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-indigo-500'}`}
                maxLength={4}
                autoFocus
              />
              {error && <p className="text-red-500 text-sm mt-2 font-medium">PIN incorrecto</p>}
            </div>

            <button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold p-4 rounded-xl flex items-center justify-center gap-2 transition"
            >
              Ingresar
              <ArrowRight size={20} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
