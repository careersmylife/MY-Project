

import React, { useMemo } from 'react';
import type { RosterEntry, ShiftType, Employee, ShiftColorSettings } from '../types';
import { ShiftType as ShiftTypeEnum } from '../types';
import ShiftCell from './ShiftCell';

interface RosterTableProps {
  rosterData: RosterEntry[];
  onShiftChange: (employeeId: number, dayIndex: number, newShift: ShiftType) => void;
  onEmployeeDetailChange: (employeeId: number, field: keyof Omit<Employee, 'id'>, value: string) => void;
  currentDate: Date;
  selectedEmployees: Set<number>;
  onSelectEmployee: (employeeId: number) => void;
  onSelectAll: () => void;
  onAddEmployee: () => void;
  onDeleteEmployees: () => void;
  onAutoAssignDay: (dayIndex: number) => void;
  onAutoRoster: () => void;
  onClearRoster: () => void;
  isEditMode: boolean;
  onEnableEditMode: () => void;
  onSaveChanges: () => void;
  onCancelEdits: () => void;
  onExportCSV: () => void;
  holidays: Set<number>;
  onManageHolidaysAndLeave: () => void;
  shiftColors: ShiftColorSettings;
  onOpenSettings: () => void;
  validationErrors: Map<number, Set<keyof Omit<Employee, 'id'>>>;
}

const RosterTable: React.FC<RosterTableProps> = ({ 
    rosterData, 
    onShiftChange, 
    onEmployeeDetailChange, 
    currentDate,
    selectedEmployees,
    onSelectEmployee,
    onSelectAll,
    onAddEmployee,
    onDeleteEmployees,
    onAutoAssignDay,
    onAutoRoster,
    onClearRoster,
    isEditMode,
    onEnableEditMode,
    onSaveChanges,
    onCancelEdits,
    onExportCSV,
    holidays,
    onManageHolidaysAndLeave,
    shiftColors,
    onOpenSettings,
    validationErrors,
}) => {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = useMemo(() => new Date(year, month + 1, 0).getDate(), [year, month]);

  const dateHeaders = useMemo(() => {
    const headers = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
      headers.push({ day, dayName });
    }
    return headers;
  }, [year, month, daysInMonth]);
  
  const summaryShifts: ShiftType[] = [
    ShiftTypeEnum.AM18,
    ShiftTypeEnum.T2GD,
    ShiftTypeEnum.CROD,
    ShiftTypeEnum.PM17,
    ShiftTypeEnum.T2GN,
    ShiftTypeEnum.CRON,
    ShiftTypeEnum.AL,
    ShiftTypeEnum.OFF,
  ];

  const totalDayNightCounts = useMemo(() => {
      const dayShifts = [ShiftTypeEnum.AM18, ShiftTypeEnum.T2GD, ShiftTypeEnum.CROD];
      const nightShifts = [ShiftTypeEnum.PM17, ShiftTypeEnum.T2GN, ShiftTypeEnum.CRON];
      
      const dailyTotals = Array.from({length: daysInMonth}, () => ({day: 0, night: 0}));

      rosterData.forEach(emp => {
          emp.schedule.forEach((shift, dayIndex) => {
              // Fix: Add a bounds check to prevent a crash when currentDate and rosterData props are temporarily out of sync during a re-render.
              // This can happen when changing months, where an employee's schedule array might be longer than the new month's `daysInMonth`.
              if (dailyTotals[dayIndex]) {
                  if(dayShifts.includes(shift)){
                      dailyTotals[dayIndex].day++;
                  } else if (nightShifts.includes(shift)) {
                       dailyTotals[dayIndex].night++;
                  }
              }
          })
      });
      return dailyTotals;
  }, [rosterData, daysInMonth]);


  return (
    <>
    <div id="roster-table-container" className="overflow-x-auto bg-white shadow-lg rounded-lg">
      <table className="min-w-full text-sm border-collapse">
        <thead className="bg-blue-800 text-white sticky top-0 z-10">
          <tr>
            <th className="p-2 border border-blue-700 whitespace-nowrap" colSpan={7}>Employee Details</th>
            <th className="p-2 border border-blue-700 text-center" colSpan={daysInMonth}>Dates</th>
            <th className="p-2 border border-blue-700 whitespace-nowrap" colSpan={summaryShifts.length}>Shift Summary</th>
          </tr>
          <tr>
            <th className="p-2 border border-blue-700 font-semibold no-print">
               <input
                type="checkbox"
                onChange={onSelectAll}
                checked={rosterData.length > 0 && selectedEmployees.size === rosterData.length}
                aria-label="Select all employees"
                className="form-checkbox h-5 w-5 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
               />
            </th>
            <th className="p-2 border border-blue-700 font-semibold whitespace-nowrap">SN</th>
            <th className="p-2 border border-blue-700 font-semibold whitespace-nowrap">Emp No</th>
            <th className="p-2 border border-blue-700 font-semibold whitespace-nowrap">Fusion ID</th>
            <th className="p-2 border border-blue-700 font-semibold min-w-[150px]">Employee Name</th>
            <th className="p-2 border border-blue-700 font-semibold whitespace-nowrap">Terminal ID</th>
            <th className="p-2 border border-blue-700 font-semibold min-w-[100px]">Role</th>
            {dateHeaders.map(({ day, dayName }, index) => (
              <th key={day} className={`p-1 border border-blue-700 font-semibold min-w-[5rem] text-center relative group transition-colors ${holidays.has(day) ? 'bg-red-400' : ''}`}>
                <div className="text-xs">{dayName}</div>
                <div>{String(day).padStart(2, '0')}</div>
                <button
                  onClick={() => onAutoAssignDay(index)}
                  className="absolute top-1/2 -translate-y-1/2 right-1 p-1 rounded-full bg-blue-600 text-white opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity duration-200 no-print"
                  aria-label={`Auto-assign shifts for day ${day}`}
                  title={`Auto-assign shifts for day ${day}`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M11.3 2.24a.75.75 0 011.06 0l4.25 4.25a.75.75 0 010 1.06l-4.25 4.25a.75.75 0 01-1.06-1.06L14.44 8 11.3 4.86a.75.75 0 010-1.06zM4.75 3.5a.75.75 0 01.75-.75h6a.75.75 0 010 1.5h-6a.75.75 0 01-.75-.75zm0 4a.75.75 0 01.75-.75h3.5a.75.75 0 010 1.5h-3.5a.75.75 0 01-.75-.75zM4 11.25a.75.75 0 01.75-.75h6a.75.75 0 010 1.5h-6a.75.75 0 01-.75-.75zm.75 3.25a.75.75 0 000 1.5h3.5a.75.75 0 000-1.5h-3.5z" clipRule="evenodd" />
                    <path d="M2.25 6.53a.75.75 0 011.06 0l2.22 2.22a.75.75 0 010 1.06l-2.22 2.22a.75.75 0 01-1.06-1.06L3.44 10 2.25 8.81a.75.75 0 010-1.06z" />
                  </svg>
                </button>
              </th>
            ))}
            {summaryShifts.map(shift => (
                <th key={shift} className="p-2 border border-blue-700 font-semibold whitespace-nowrap">{shift}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rosterData.map((employee, index) => (
            <tr key={employee.id} className={`transition-colors ${selectedEmployees.has(employee.id) ? 'bg-blue-100' : 'even:bg-gray-50' + (isEditMode ? '' : ' hover:bg-blue-50')}`}>
              <td className="p-2 border border-gray-300 text-center no-print">
                <input
                    type="checkbox"
                    checked={selectedEmployees.has(employee.id)}
                    onChange={() => onSelectEmployee(employee.id)}
                    aria-label={`Select employee ${employee.name}`}
                    className="form-checkbox h-5 w-5 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                />
              </td>
              <td className="p-2 border border-gray-300 text-center font-medium text-gray-600">{index + 1}</td>
              <td className="p-0 border border-gray-300">
                <input
                  type="text"
                  value={employee.empNo}
                  onChange={(e) => onEmployeeDetailChange(employee.id, 'empNo', e.target.value)}
                  readOnly={!isEditMode}
                  className={`w-full p-2 text-center focus:outline-none ${isEditMode ? `bg-white border rounded-sm focus:ring-2 ${validationErrors.get(employee.id)?.has('empNo') ? 'border-red-500 focus:ring-red-500' : 'border-blue-300 focus:ring-blue-500'}` : 'bg-transparent border-none pointer-events-none'}`}
                  aria-label={`Employee number for ${employee.name}`}
                />
              </td>
              <td className="p-0 border border-gray-300">
                <input
                  type="text"
                  value={employee.fusionId}
                  onChange={(e) => onEmployeeDetailChange(employee.id, 'fusionId', e.target.value)}
                  readOnly={!isEditMode}
                  className={`w-full p-2 text-center focus:outline-none ${isEditMode ? `bg-white border rounded-sm focus:ring-2 ${validationErrors.get(employee.id)?.has('fusionId') ? 'border-red-500 focus:ring-red-500' : 'border-blue-300 focus:ring-blue-500'}` : 'bg-transparent border-none pointer-events-none'}`}
                  aria-label={`Fusion ID for ${employee.name}`}
                />
              </td>
              <td className="p-0 border border-gray-300">
                <input
                  type="text"
                  value={employee.name}
                  onChange={(e) => onEmployeeDetailChange(employee.id, 'name', e.target.value)}
                  readOnly={!isEditMode}
                  className={`w-full p-2 focus:outline-none ${isEditMode ? 'bg-white border border-blue-300 rounded-sm focus:ring-2 focus:ring-blue-500' : 'bg-transparent border-none pointer-events-none'}`}
                  aria-label={`Employee name for ${employee.name}`}
                />
              </td>
              <td className="p-0 border border-gray-300">
                <input
                  type="text"
                  value={employee.terminalId}
                  onChange={(e) => onEmployeeDetailChange(employee.id, 'terminalId', e.target.value)}
                  readOnly={!isEditMode}
                  className={`w-full p-2 text-center focus:outline-none ${isEditMode ? 'bg-white border border-blue-300 rounded-sm focus:ring-2 focus:ring-blue-500' : 'bg-transparent border-none pointer-events-none'}`}
                  aria-label={`Terminal ID for ${employee.name}`}
                />
              </td>
              <td className="p-0 border border-gray-300">
                <input
                  type="text"
                  value={employee.role}
                  onChange={(e) => onEmployeeDetailChange(employee.id, 'role', e.target.value)}
                  readOnly={!isEditMode}
                  className={`w-full p-2 focus:outline-none ${isEditMode ? 'bg-white border border-blue-300 rounded-sm focus:ring-2 focus:ring-blue-500' : 'bg-transparent border-none pointer-events-none'}`}
                  aria-label={`Role for ${employee.name}`}
                />
              </td>
              {employee.schedule.map((shift, dayIndex) => (
                <ShiftCell
                  key={`${employee.id}-${dayIndex}`}
                  shift={shift}
                  employeeId={employee.id}
                  dayIndex={dayIndex}
                  onShiftChange={onShiftChange}
                  isHoliday={holidays.has(dayIndex + 1)}
                  shiftColors={shiftColors}
                />
              ))}
              {summaryShifts.map(shiftType => (
                <td key={shiftType} className="p-2 border border-gray-300 text-center font-medium">
                    {employee.schedule.filter(s => s === shiftType).length}
                </td>
              ))}
            </tr>
          ))}
          {/* Summary Rows */}
          <tr className="bg-gray-800 text-white font-bold">
            <td colSpan={7} className="p-2 border border-gray-700 text-right">Totals by Shift</td>
            <td colSpan={daysInMonth + summaryShifts.length} className="p-2 border-t-2 border-gray-700 text-center"></td>
          </tr>
          {summaryShifts.map(shiftType => (
             <tr key={shiftType} className="bg-gray-100 font-medium">
                <td colSpan={7} className="p-2 border border-gray-300 text-right">{shiftType}</td>
                {Array.from({length: daysInMonth}).map((_, dayIndex) => {
                    const dailyCount = rosterData.reduce((acc, emp) => acc + (emp.schedule[dayIndex] === shiftType ? 1: 0), 0);
                    
                    let cellClasses = `p-2 border border-gray-300 text-center transition-colors ${holidays.has(dayIndex + 1) ? 'bg-red-100' : ''}`;
                    let title = '';
                    if ((shiftType === ShiftTypeEnum.CROD || shiftType === ShiftTypeEnum.CRON) && dailyCount !== 2) {
                        cellClasses += ' bg-yellow-200 text-yellow-800 font-bold';
                        title = `Warning: ${shiftType} should have exactly 2 employees. Currently has ${dailyCount}.`;
                    }

                    return (
                        <td key={dayIndex} className={cellClasses} title={title}>
                            {dailyCount}
                        </td>
                    );
                })}
                <td colSpan={summaryShifts.length} className="p-2 border border-gray-300 text-center bg-gray-200"></td>
             </tr>
          ))}
          <tr className="bg-blue-800 text-white font-bold">
            <td colSpan={7} className="p-2 border border-blue-700 text-right">Total Day</td>
            {totalDayNightCounts.map((counts, dayIndex) => (
                <td key={dayIndex} className={`p-2 border border-blue-700 text-center ${holidays.has(dayIndex + 1) ? 'bg-red-400' : ''}`}>{counts.day}</td>
            ))}
            <td colSpan={summaryShifts.length} className="p-2 border border-blue-700 text-center"></td>
          </tr>
          <tr className="bg-blue-800 text-white font-bold">
            <td colSpan={7} className="p-2 border border-blue-700 text-right">Total Night</td>
            {totalDayNightCounts.map((counts, dayIndex) => (
                <td key={dayIndex} className={`p-2 border border-blue-700 text-center ${holidays.has(dayIndex + 1) ? 'bg-red-400' : ''}`}>{counts.night}</td>
            ))}
            <td colSpan={summaryShifts.length} className="p-2 border border-blue-700 text-center"></td>
          </tr>
        </tbody>
      </table>
    </div>
    <div className="flex justify-center items-center flex-wrap gap-4 mt-4 no-print">
      {isEditMode ? (
        <>
          <button
            onClick={onSaveChanges}
            className="px-4 py-2 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-75 transition-colors"
          >
            Save Changes
          </button>
          <button
            onClick={onCancelEdits}
            className="px-4 py-2 bg-gray-500 text-white font-semibold rounded-lg shadow-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-opacity-75 transition-colors"
          >
            Cancel Edits
          </button>
        </>
      ) : (
        <>
          <button
            onClick={onEnableEditMode}
            className="px-4 py-2 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-75 transition-colors"
          >
            Enable Edit Mode
          </button>
          <button
            onClick={onAddEmployee}
            className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75 transition-colors"
          >
            Add Employee
          </button>
          <button
            onClick={onAutoRoster}
            className="px-4 py-2 bg-teal-600 text-white font-semibold rounded-lg shadow-md hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-opacity-75 transition-colors flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M11.3 2.24a.75.75 0 011.06 0l4.25 4.25a.75.75 0 010 1.06l-4.25 4.25a.75.75 0 01-1.06-1.06L14.44 8 11.3 4.86a.75.75 0 010-1.06zM4.75 3.5a.75.75 0 01.75-.75h6a.75.75 0 010 1.5h-6a.75.75 0 01-.75-.75zm0 4a.75.75 0 01.75-.75h3.5a.75.75 0 010 1.5h-3.5a.75.75 0 01-.75-.75zM4 11.25a.75.75 0 01.75-.75h6a.75.75 0 010 1.5h-6a.75.75 0 01-.75-.75zm.75 3.25a.75.75 0 000 1.5h3.5a.75.75 0 000-1.5h-3.5z" clipRule="evenodd" />
              <path d="M2.25 6.53a.75.75 0 011.06 0l2.22 2.22a.75.75 0 010 1.06l-2.22 2.22a.75.75 0 01-1.06-1.06L3.44 10 2.25 8.81a.75.75 0 010-1.06z" />
            </svg>
            Auto Adjustment Roster
          </button>
          <button
            onClick={onClearRoster}
            className="px-4 py-2 bg-orange-500 text-white font-semibold rounded-lg shadow-md hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-opacity-75 transition-colors flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            Clear All Shifts
          </button>
          <button
            onClick={onManageHolidaysAndLeave}
            className="px-4 py-2 bg-purple-600 text-white font-semibold rounded-lg shadow-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-75 transition-colors"
          >
            Manage Holidays & Leave
          </button>
          <button
            onClick={onOpenSettings}
            className="px-4 py-2 bg-gray-700 text-white font-semibold rounded-lg shadow-md hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-600 focus:ring-opacity-75 transition-colors flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.982.54 2.295 0 3.277-1.372.836-.836 2.942 2.106 2.106.54-.982 2.295-.982 3.277 0 .836 1.372 2.942.836 2.106-2.106-.54-.982-.54-2.295 0-3.277a1.532 1.532 0 012.286-.948c1.372-.836.836-2.942-2.106-2.106a1.532 1.532 0 01-2.286-.948zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
            </svg>
            Settings
          </button>
          <button
            onClick={onExportCSV}
            className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75 transition-colors"
          >
            Export to CSV
          </button>
          {selectedEmployees.size > 0 && (
            <button
              onClick={onDeleteEmployees}
              className="px-4 py-2 bg-red-600 text-white font-semibold rounded-lg shadow-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-75 transition-colors"
            >
              Delete Selected ({selectedEmployees.size})
            </button>
          )}
        </>
      )}
    </div>
    </>
  );
};

export default RosterTable;