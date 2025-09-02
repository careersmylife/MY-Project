import React, { useState, useMemo } from 'react';
import { RosterEntry, ShiftType } from '../types';

interface ManageLeaveHolidayModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentDate: Date;
  employees: RosterEntry[];
  holidays: Set<number>;
  onToggleHoliday: (day: number) => void;
  onAssignLeave: (employeeId: number, dayIndex: number) => void;
}

type Mode = 'holidays' | 'leave';

const ManageLeaveHolidayModal: React.FC<ManageLeaveHolidayModalProps> = ({
  isOpen,
  onClose,
  currentDate,
  employees,
  holidays,
  onToggleHoliday,
  onAssignLeave,
}) => {
  const [mode, setMode] = useState<Mode>('holidays');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(employees.length > 0 ? employees[0].id : null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  
  const calendarData = useMemo(() => {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 (Sun) - 6 (Sat)
    
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const paddingDays = Array.from({ length: firstDayOfMonth }, () => null);

    return {
      days,
      paddingDays,
      weekdays: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    };
  }, [year, month]);

  const selectedEmployeeSchedule = useMemo(() => {
    if (mode !== 'leave' || !selectedEmployeeId) return null;
    return employees.find(e => e.id === selectedEmployeeId)?.schedule || null;
  }, [mode, selectedEmployeeId, employees]);

  if (!isOpen) return null;
  
  const handleDayClick = (day: number) => {
      if (mode === 'holidays') {
          onToggleHoliday(day);
      } else if (mode === 'leave' && selectedEmployeeId) {
          onAssignLeave(selectedEmployeeId, day - 1); // day is 1-based, index is 0-based
      }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="leave-holiday-modal-title">
      <div className="bg-white rounded-lg shadow-xl p-6 m-4 max-w-2xl w-full transform transition-all" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-start">
          <h3 id="leave-holiday-modal-title" className="text-lg leading-6 font-bold text-gray-900">Manage Holidays & Leave</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600" aria-label="Close modal">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        
        <div className="mt-4 flex flex-col md:flex-row gap-4">
            {/* Controls */}
            <div className="w-full md:w-1/3 p-4 border rounded-lg bg-gray-50">
                <h4 className="font-semibold mb-2 text-gray-800">Mode</h4>
                <div className="space-y-2">
                    <div>
                        <input type="radio" id="mode-holidays" name="mode" value="holidays" checked={mode === 'holidays'} onChange={() => setMode('holidays')} className="form-radio h-4 w-4 text-blue-600" />
                        <label htmlFor="mode-holidays" className="ml-2 text-sm text-gray-700">Mark Holidays</label>
                    </div>
                    <div>
                        <input type="radio" id="mode-leave" name="mode" value="leave" checked={mode === 'leave'} onChange={() => setMode('leave')} className="form-radio h-4 w-4 text-blue-600" />
                        <label htmlFor="mode-leave" className="ml-2 text-sm text-gray-700">Assign Employee Leave</label>
                    </div>
                </div>

                {mode === 'leave' && (
                    <div className="mt-4">
                        <label htmlFor="employee-select" className="block text-sm font-medium text-gray-700 mb-1">Employee</label>
                        <select
                            id="employee-select"
                            value={selectedEmployeeId ?? ''}
                            onChange={(e) => setSelectedEmployeeId(Number(e.target.value))}
                            className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
                        </select>
                    </div>
                )}
            </div>

            {/* Calendar */}
            <div className="w-full md:w-2/3">
                <div className="text-center font-bold text-xl mb-2 text-gray-800">
                    {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                </div>
                <div className="grid grid-cols-7 gap-1 text-center text-sm">
                    {calendarData.weekdays.map(day => <div key={day} className="font-semibold text-gray-600 p-2">{day}</div>)}
                    {calendarData.paddingDays.map((_, i) => <div key={`pad-${i}`} />)}
                    {calendarData.days.map(day => {
                        const isHoliday = holidays.has(day);
                        const isLeave = selectedEmployeeSchedule?.[day - 1] === ShiftType.AL;
                        
                        let dayClasses = "h-10 w-10 flex items-center justify-center rounded-full cursor-pointer transition-colors text-sm";
                        if (isHoliday) {
                            dayClasses += " bg-red-500 text-white font-bold hover:bg-red-600";
                        } else if (isLeave) {
                            dayClasses += " bg-blue-500 text-white font-bold hover:bg-blue-600";
                        } else {
                            dayClasses += " hover:bg-gray-200 text-gray-700";
                        }
                        
                        return (
                            <div key={day} className="flex justify-center items-center">
                                <button className={dayClasses} onClick={() => handleDayClick(day)} aria-label={`Day ${day}`}>
                                    {day}
                                </button>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>

        <div className="mt-6 flex justify-end">
            <button
                type="button"
                className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75 transition-colors"
                onClick={onClose}
            >
                Done
            </button>
        </div>
      </div>
    </div>
  );
};

export default ManageLeaveHolidayModal;
