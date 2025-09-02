import React from 'react';
import { ShiftType } from '../types';
import type { ShiftColorSettings, ShiftColor } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  shiftColors: ShiftColorSettings;
  onColorChange: (shiftType: ShiftType, newColor: ShiftColor) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, shiftColors, onColorChange }) => {
  if (!isOpen) return null;

  // Ensure consistent order of shifts in the modal
  const sortedShiftEntries = Object.entries(shiftColors).sort(([shiftA], [shiftB]) => shiftA.localeCompare(shiftB));

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="settings-modal-title">
      <div className="bg-white rounded-lg shadow-xl p-6 m-4 max-w-md w-full" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 id="settings-modal-title" className="text-xl font-bold text-gray-900">Customize Shift Colors</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600" aria-label="Close modal">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
          {sortedShiftEntries.map(([shift, colors]) => (
            <div key={shift} className="flex items-center justify-between p-3 border rounded-lg shadow-sm bg-gray-50">
              <span className="font-semibold text-gray-800" style={{ color: colors.text, backgroundColor: colors.background, padding: '0.25rem 0.5rem', borderRadius: '0.25rem' }}>
                {shift}
              </span>
              <div className="flex items-center gap-4">
                <div className="flex flex-col items-center">
                  <label htmlFor={`bg-color-${shift}`} className="text-sm text-gray-600 mb-1">Background</label>
                  <input
                    id={`bg-color-${shift}`}
                    type="color"
                    value={colors.background}
                    onChange={(e) => onColorChange(shift as ShiftType, { ...colors, background: e.target.value })}
                    className="w-10 h-10 p-0 border-none rounded-md cursor-pointer"
                    aria-label={`Background color for ${shift}`}
                  />
                </div>
                <div className="flex flex-col items-center">
                  <label htmlFor={`text-color-${shift}`} className="text-sm text-gray-600 mb-1">Text</label>
                  <input
                    id={`text-color-${shift}`}
                    type="color"
                    value={colors.text}
                    onChange={(e) => onColorChange(shift as ShiftType, { ...colors, text: e.target.value })}
                    className="w-10 h-10 p-0 border-none rounded-md cursor-pointer"
                    aria-label={`Text color for ${shift}`}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            type="button"
            className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;