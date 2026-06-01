import React from 'react';
import { X } from 'lucide-react';

export default function ImageModal({ base64Image, onClose }) {
  if (!base64Image) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="relative bg-white rounded-xl overflow-hidden max-w-lg w-full">
        <div className="absolute top-2 right-2 flex space-x-2">
           <button 
             onClick={onClose} 
             className="p-2 bg-gray-900/50 text-white rounded-full hover:bg-gray-900/80 transition"
           >
             <X size={20} />
           </button>
        </div>
        <div className="p-2">
          <img src={base64Image} alt="Comprobante" className="w-full h-auto rounded-lg" />
        </div>
      </div>
    </div>
  );
}
