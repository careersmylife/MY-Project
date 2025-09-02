import React from 'react';

interface HeaderProps {
  currentDate: Date;
  onDateChange: (date: Date) => void;
}

const Header: React.FC<HeaderProps> = ({ currentDate, onDateChange }) => {
  const monthName = currentDate.toLocaleString('en-US', { month: 'long' });
  const year = currentDate.getFullYear();

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newMonth = parseInt(e.target.value, 10);
    onDateChange(new Date(year, newMonth, 1));
  };

  const handleYearChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newYear = parseInt(e.target.value, 10);
    if (!isNaN(newYear) && newYear >= 2000 && newYear <= 2100) {
      onDateChange(new Date(newYear, currentDate.getMonth(), 1));
    }
  };

  const months = Array.from({ length: 12 }, (_, i) => ({
    value: i,
    name: new Date(0, i).toLocaleString('en-US', { month: 'long' }),
  }));

  return (
    <header className="bg-white shadow-md rounded-lg p-4">
      <div className="flex flex-col items-center">
        <div className="text-center">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">
                DP World Gate Automation Clerk Duty Roster
            </h1>
            <p className="text-center text-gray-500 mt-1">
                For The Month Of {monthName}-{year}
            </p>
        </div>
      </div>
      <div className="flex justify-center items-center flex-wrap gap-4 mt-4" aria-label="Date controls">
        <div className="flex items-center gap-4">
            <div className="flex flex-col">
              <label htmlFor="month-select" className="text-sm font-medium text-gray-700 mb-1">Month</label>
              <select
                id="month-select"
                value={currentDate.getMonth()}
                onChange={handleMonthChange}
                className="p-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="Select month"
              >
                {months.map(({ value, name }) => (
                  <option key={value} value={value}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col">
               <label htmlFor="year-input" className="text-sm font-medium text-gray-700 mb-1">Year</label>
               <input
                id="year-input"
                type="number"
                value={year}
                onChange={handleYearChange}
                className="p-2 border border-gray-300 rounded-md shadow-sm w-28 focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="Select year"
                min="2000"
                max="2100"
               />
            </div>
        </div>
      </div>
    </header>
  );
};

export default Header;