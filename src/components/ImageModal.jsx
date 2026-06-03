import React from 'react';
import { X } from 'lucide-react';

export default function ImageModal({ base64Image, image, isLoading, onClose }) {
  const finalImage = base64Image || image;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="relative bg-white rounded-xl overflow-hidden max-w-3xl w-full flex flex-col items-center shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="absolute top-3 right-3 flex space-x-2 z-10">
           <button 
             onClick={onClose} 
             className="p-2 bg-black/50 text-white rounded-full hover:bg-black/80 transition"
           >
             <X size={20} />
           </button>
        </div>
        <div className="p-4 w-full flex justify-center bg-gray-50 items-center min-h-[300px]">
          {isLoading ? (
            <div className="flex flex-col items-center text-gray-500">
              <svg className="animate-spin h-10 w-10 mb-4 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="font-medium">Cargando comprobante...</p>
            </div>
          ) : finalImage ? (
            <img src={finalImage} alt="Comprobante" className="max-w-full max-h-[75vh] object-contain rounded-lg" />
          ) : (
            <p className="text-gray-500">Imagen no disponible</p>
          )}
        </div>
      </div>
    </div>
  );
}
