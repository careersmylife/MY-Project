import React from 'react';
import { ShiftType } from '../types';
import type { ShiftColorSettings } from '../types';

interface LegendProps {
  isOpen: boolean;
  onClose: () => void;
  shiftColors: ShiftColorSettings;
}

const Legend: React.FC<LegendProps> = ({ isOpen, onClose, shiftColors }) => {
  // Define a more logical sort order: Day shifts, then Night shifts, then others.
  const customSortOrder: ShiftType[] = [
    ShiftType.AM18,
    ShiftType.T2GD,
    ShiftType.CROD,
    ShiftType.PM17,
    ShiftType.T2GN,
    ShiftType.CRON,
    ShiftType.AL,
    ShiftType.OFF,
  ];

  const sortedShiftEntries = Object.entries(shiftColors).sort(([shiftA], [shiftB]) => {
    const indexA = customSortOrder.indexOf(shiftA as ShiftType);
    const indexB = customSortOrder.indexOf(shiftB as ShiftType);
    // Fallback for any shifts not in the custom order
    if (indexA === -1 && indexB === -1) return shiftA.localeCompare(shiftB);
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    return indexA - indexB;
  });

  return (
    <div 
      className={`fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center transition-opacity duration-300 ease-in-out ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      onClick={onClose} 
      role="dialog" 
      aria-modal="true" 
      aria-labelledby="legend-modal-title"
    >
      <div 
        className={`bg-white rounded-2xl shadow-2xl p-6 m-4 max-w-xs w-full transform transition-all duration-300 ease-in-out ${isOpen ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-4 opacity-0 scale-95'}`} 
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h3 id="legend-modal-title" className="text-2xl font-bold text-gray-800">Shift Legend</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors" aria-label="Close modal">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        
        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
          {sortedShiftEntries.map(([shift, colors]) => (
            <div key={shift} className="flex items-center gap-4 p-2 rounded-lg hover:bg-gray-50 transition-colors" >
              <div className="w-8 h-8 rounded-md shadow-inner" style={{ backgroundColor: colors.background }}></div>
              <span className="font-semibold" style={{ color: colors.text }}>
                {shift}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            type="button"
            className="w-full px-4 py-3 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-75 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default Legend;