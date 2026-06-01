import React from 'react';
import { X } from 'lucide-react';

export default function ImageModal({ base64Image, onClose }) {
  if (!base64Image) return null;

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
        <div className="p-4 w-full flex justify-center bg-gray-50 items-center min-h-[200px]">
          <img src={base64Image} alt="Comprobante" className="max-w-full max-h-[75vh] object-contain rounded-lg" />
        </div>
      </div>
    </div>
  );
}
