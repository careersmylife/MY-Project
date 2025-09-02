import React from 'react';
import { SHIFT_TYPES } from '../constants';
import { ShiftType, ShiftColorSettings } from '../types';

interface ShiftCellProps {
  shift: ShiftType;
  employeeId: number;
  dayIndex: number;
  onShiftChange: (employeeId: number, dayIndex: number, newShift: ShiftType) => void;
  isHoliday?: boolean;
  shiftColors: ShiftColorSettings;
}

const ShiftCell: React.FC<ShiftCellProps> = ({ shift, employeeId, dayIndex, onShiftChange, isHoliday = false, shiftColors }) => {
  const colorStyle = shiftColors[shift] || { background: '#FFFFFF', text: '#000000' };

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onShiftChange(employeeId, dayIndex, e.target.value as ShiftType);
  };

  const isHolidayOff = isHoliday && shift === ShiftType.OFF;

  return (
    <td className={`border border-gray-300 p-0 ${isHolidayOff ? 'bg-red-100' : ''}`}>
      <select
        value={shift}
        onChange={handleChange}
        style={{
          backgroundColor: isHolidayOff ? undefined : colorStyle.background,
          color: colorStyle.text,
        }}
        className={`w-full h-full p-2 text-center appearance-none border-none focus:ring-2 focus:ring-blue-500 focus:outline-none font-bold text-xs cursor-pointer`}
        aria-label={`Shift for day ${dayIndex + 1}`}
      >
        {SHIFT_TYPES.map(type => (
          <option
            key={type}
            value={type}
            style={{
                backgroundColor: shiftColors[type]?.background || '#FFFFFF', 
                color: shiftColors[type]?.text || '#000000',
            }}
          >
            {type}
          </option>
        ))}
      </select>
    </td>
  );
};

export default ShiftCell;