'use client';

import React from 'react';
import { HistoryItem } from '../../types/image-describer';
import { CloseIcon, InfoIcon } from './Icons';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  history: HistoryItem[];
  onClear: () => void;
}

const HistoryModal: React.FC<HistoryModalProps> = ({ isOpen, onClose, history, onClear }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl animate-fade-in-up">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-2xl font-bold text-gray-800">History</h2>
          <div className="flex items-center gap-4">
             {history.length > 0 && (
              <button 
                onClick={onClear}
                className="text-red-500 text-sm font-medium hover:text-red-700"
              >
                Clear All
              </button>
            )}
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <CloseIcon />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-6 flex-1 custom-scrollbar">
          
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-6 flex items-start">
            <InfoIcon />
            <p className="text-blue-800 text-sm leading-relaxed">
              Your image describer history is stored locally in your browser. You can use previous describers or clear your history at any time.
            </p>
          </div>

          <div className="space-y-4">
            {history.length === 0 ? (
              <p className="text-center text-gray-500 py-10">No history available yet.</p>
            ) : (
              history.map((item) => (
                <div key={item.id} className="border border-gray-200 rounded-xl p-4 flex gap-4 hover:shadow-md transition-shadow">
                  <div className="w-24 h-24 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                    <img src={item.imagePreview} alt="Thumbnail" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1">
                       <span className="text-xs text-gray-500">{item.timestamp}</span>
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-1">{item.option}</h3>
                    <p className="text-gray-600 text-sm line-clamp-3 leading-relaxed">
                      {item.result}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HistoryModal;