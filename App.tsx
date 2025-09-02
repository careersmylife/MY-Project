

import React, { useState, useCallback, useEffect, useRef } from 'react';
import RosterTable from './components/RosterTable';
import Header from './components/Header';
import Legend from './components/Legend';
import ConfirmationDialog from './components/ConfirmationDialog';
import ManageLeaveHolidayModal from './components/ManageLeaveHolidayModal';
import SettingsModal from './components/SettingsModal';
// Fix: Import INITIAL_ROSTER_DATA to resolve reference errors.
import { DEFAULT_SHIFT_COLORS, INITIAL_ROSTER_DATA, NIGHT_SHIFTS, DAY_SHIFTS } from './constants';
import { RosterEntry, ShiftType, Employee, ShiftColorSettings, ShiftColor } from './types';

// Helper function to enforce the 6-day work rule on a single employee's schedule
const enforceSixDayRuleForEmployee = (employee: RosterEntry): RosterEntry => {
    const schedule = [...employee.schedule];
    let consecutiveDuties = 0;
    for (let i = 0; i < schedule.length; i++) {
        const shift = schedule[i];
        // OFF and AL are considered rest days and break the consecutive duty streak
        if (shift !== ShiftType.OFF && shift !== ShiftType.AL) {
            consecutiveDuties++;
        } else {
            consecutiveDuties = 0;
        }

        // If more than 6 consecutive duties, the current day is forced to be OFF
        if (consecutiveDuties > 6) {
            schedule[i] = ShiftType.OFF;
            consecutiveDuties = 0; // Reset counter after forcing an OFF day
        }
    }
    return { ...employee, schedule };
};

const App: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date(2025, 8, 1)); // Default to September 2025
  const [rosterData, setRosterData] = useState<RosterEntry[]>(INITIAL_ROSTER_DATA);
  const [rosterDataBackup, setRosterDataBackup] = useState<RosterEntry[] | null>(null);
  const [selectedEmployees, setSelectedEmployees] = useState<Set<number>>(new Set());
  const [isEditMode, setIsEditMode] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isSaveConfirmOpen, setIsSaveConfirmOpen] = useState(false);
  const [isAddConfirmOpen, setIsAddConfirmOpen] = useState(false);
  const [isExportConfirmOpen, setIsExportConfirmOpen] = useState(false);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isAutoRosterConfirmOpen, setIsAutoRosterConfirmOpen] = useState(false);
  const [isClearRosterConfirmOpen, setIsClearRosterConfirmOpen] = useState(false);
  const [holidays, setHolidays] = useState<Set<number>>(new Set());
  const [shiftColors, setShiftColors] = useState<ShiftColorSettings>(DEFAULT_SHIFT_COLORS);
  const [saveMessage, setSaveMessage] = useState('');
  const [isLegendOpen, setIsLegendOpen] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Map<number, Set<keyof Omit<Employee, 'id'>>>>(new Map());
  const nextId = useRef(INITIAL_ROSTER_DATA.length > 0 ? Math.max(...INITIAL_ROSTER_DATA.map(e => e.id)) + 1 : 1);
  
  const selectedEmployeesRef = useRef(selectedEmployees);
  selectedEmployeesRef.current = selectedEmployees;

  useEffect(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    setRosterData(prevData => prevData.map(employee => {
      const newSchedule = [...employee.schedule];
      while (newSchedule.length < daysInMonth) {
        newSchedule.push(ShiftType.OFF);
      }
      const finalSchedule = newSchedule.slice(0, daysInMonth);
      return { ...employee, schedule: finalSchedule };
    }));
  }, [currentDate]);

  useEffect(() => {
      try {
        const savedColors = localStorage.getItem('shiftColors');
        if (savedColors) {
          const parsedColors = JSON.parse(savedColors);
           // Simple validation to merge potentially new shift types from defaults
          const mergedColors = { ...DEFAULT_SHIFT_COLORS, ...parsedColors };
          setShiftColors(mergedColors);
        }
      } catch (error) {
        console.error("Failed to load or parse shift colors from localStorage", error);
        setShiftColors(DEFAULT_SHIFT_COLORS);
      }
    }, []);

  const handleShiftColorChange = useCallback((shiftType: ShiftType, newColor: ShiftColor) => {
    setShiftColors(prevColors => {
        const updatedColors = { ...prevColors, [shiftType]: newColor };
        localStorage.setItem('shiftColors', JSON.stringify(updatedColors));
        return updatedColors;
    });
  }, []);

  const handleDateChange = useCallback((newDate: Date) => {
    setCurrentDate(newDate);
  }, []);

  const handleShiftChange = useCallback((employeeId: number, dayIndex: number, newShift: ShiftType) => {
    setRosterData(prevRosterData => {
      const employee = prevRosterData.find(e => e.id === employeeId);
      if (!employee) return prevRosterData;

      const proposedSchedule = [...employee.schedule];
      proposedSchedule[dayIndex] = newShift;

      const isInvalidTransition = (prevShift: ShiftType, nextShift: ShiftType): boolean => {
        return NIGHT_SHIFTS.includes(prevShift) && DAY_SHIFTS.includes(nextShift);
      };

      // Rule: Prevent night -> day transitions
      // 1. Check previous day vs new shift
      if (dayIndex > 0) {
        const prevShift = proposedSchedule[dayIndex - 1];
        if (isInvalidTransition(prevShift, newShift)) {
          alert(`Invalid shift change: Cannot assign a day shift (${newShift}) immediately following a night shift (${prevShift}).`);
          return prevRosterData;
        }
      }

      // 2. Check new shift vs next day
      if (dayIndex < proposedSchedule.length - 1) {
        const nextShift = proposedSchedule[dayIndex + 1];
        if (isInvalidTransition(newShift, nextShift)) {
          alert(`Invalid shift change: This assignment creates a forbidden night shift (${newShift}) to day shift (${nextShift}) sequence with the next day's shift.`);
          return prevRosterData;
        }
      }

      // If valid, map over the roster to apply changes
      return prevRosterData.map(emp => {
        if (emp.id === employeeId) {
          const newEmployeeData = { ...emp, schedule: proposedSchedule };
          return enforceSixDayRuleForEmployee(newEmployeeData);
        }
        return emp;
      });
    });
  }, []);

  const handleEmployeeDetailChange = useCallback((employeeId: number, field: keyof Omit<Employee, 'id'>, value: string) => {
    setRosterData(prevRosterData =>
      prevRosterData.map(employee => {
        if (employee.id === employeeId) {
          return { ...employee, [field]: value };
        }
        return employee;
      })
    );
     // Real-time validation feedback: if a required field is now filled, remove its error marker
    if ((field === 'empNo' || field === 'fusionId') && value.trim() !== '') {
        setValidationErrors(prevErrors => {
            const newErrors = new Map(prevErrors);
            const employeeErrors = newErrors.get(employeeId);
            if (employeeErrors) {
                const newEmployeeErrors = new Set(employeeErrors);
                newEmployeeErrors.delete(field);
                if (newEmployeeErrors.size === 0) {
                    newErrors.delete(employeeId);
                } else {
                    newErrors.set(employeeId, newEmployeeErrors);
                }
            }
            return newErrors;
        });
    }
  }, []);

  const handleAddEmployee = useCallback(() => {
    setIsAddConfirmOpen(true);
  }, []);

  const confirmAddEmployee = useCallback(() => {
    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    const newEmployee: RosterEntry = {
      id: nextId.current,
      empNo: '',
      fusionId: '',
      name: '',
      terminalId: '',
      role: '',
      schedule: Array(daysInMonth).fill(ShiftType.OFF),
    };
    nextId.current++;
    setRosterData(prevData => [...prevData, newEmployee]);
    setIsAddConfirmOpen(false);
    setSaveMessage('New employee added!');
    setTimeout(() => setSaveMessage(''), 3000);
  }, [currentDate]);

  const handleDeleteEmployees = useCallback(() => {
    if (selectedEmployeesRef.current.size > 0) {
        setIsDeleteDialogOpen(true);
    }
  }, []);

  const confirmDeleteEmployees = useCallback(() => {
    const currentSelected = selectedEmployeesRef.current;
    setRosterData(prevData => prevData.filter(employee => !currentSelected.has(employee.id)));
    setSelectedEmployees(new Set());
    setIsDeleteDialogOpen(false);
  }, []);

  const handleSelectEmployee = useCallback((employeeId: number) => {
    setSelectedEmployees(prevSelected => {
      const newSelected = new Set(prevSelected);
      if (newSelected.has(employeeId)) {
        newSelected.delete(employeeId);
      } else {
        newSelected.add(employeeId);
      }
      return newSelected;
    });
  }, []);
  
  const handleSelectAll = useCallback(() => {
    setSelectedEmployees(prevSelected => {
      if (prevSelected.size === rosterData.length) {
        return new Set();
      } else {
        return new Set(rosterData.map(employee => employee.id));
      }
    });
  }, [rosterData]);

  const handleAutoAssignDay = useCallback((dayIndex: number) => {
    // Dynamic quotas based on user rules
    const quotas: { [key in ShiftType]?: number } = {
      [ShiftType.AM18]: 4,
      [ShiftType.PM17]: 4,
      [ShiftType.T2GD]: 1,
      [ShiftType.T2GN]: 1,
      [ShiftType.CROD]: 2,
      [ShiftType.CRON]: 2,
    };

    setRosterData(prevData => {
      const newShifts = new Map<number, ShiftType>();
      // Employees not on Annual Leave are available for assignment
      let unassignedEmployees = prevData.filter(e => e.schedule[dayIndex] !== ShiftType.AL);

      // Create a list of all shifts that need to be assigned based on quotas
      const shiftsToAssign: ShiftType[] = [];
      const priorityOrder = [ShiftType.AM18, ShiftType.PM17, ShiftType.T2GD, ShiftType.T2GN, ShiftType.CROD, ShiftType.CRON];
      
      for (const shift in quotas) {
          for (let i = 0; i < (quotas[shift as ShiftType] || 0); i++) {
              shiftsToAssign.push(shift as ShiftType);
          }
      }
      shiftsToAssign.sort((a, b) => priorityOrder.indexOf(a) - priorityOrder.indexOf(b));
      
      const isInvalidTransition = (prevShift: ShiftType, nextShift: ShiftType): boolean => {
        return NIGHT_SHIFTS.includes(prevShift) && DAY_SHIFTS.includes(nextShift);
      };

      for (const shift of shiftsToAssign) {
        let assignedEmployeeIndex = -1;
        
        // Shuffle available employee indices to ensure random assignment
        const shuffledIndices = [...unassignedEmployees.keys()].sort(() => Math.random() - 0.5);

        for (const index of shuffledIndices) {
            const emp = unassignedEmployees[index];
            
            // --- VALIDATION RULES ---

            // Rule 1: Maria's specific schedule
            if (emp.name.toLowerCase().includes('maria') && shift !== ShiftType.AM18 && shift !== ShiftType.CROD) {
              continue; // Invalid: Maria can only have AM18 or CROD
            }
            
            // Rule 2: Prevent night -> day transitions
            if (dayIndex > 0 && isInvalidTransition(emp.schedule[dayIndex - 1], shift)) {
              continue; // Invalid: Previous day was night shift
            }
            
            if (dayIndex < emp.schedule.length - 1 && isInvalidTransition(shift, emp.schedule[dayIndex + 1])) {
              continue; // Invalid: Next day is day shift
            }

            // --- END VALIDATION ---

            // If all checks pass, this employee is valid for the shift
            assignedEmployeeIndex = index;
            break;
        }
        
        if (assignedEmployeeIndex !== -1) {
            const assignedEmployee = unassignedEmployees[assignedEmployeeIndex];
            newShifts.set(assignedEmployee.id, shift);
            // Remove employee from pool for this day's assignment
            unassignedEmployees.splice(assignedEmployeeIndex, 1);
        } else {
            alert(`Auto-assign failed: Could not find an eligible employee for a ${shift} shift due to scheduling constraints. Please adjust shifts manually.`);
            return prevData; // Revert changes if assignment fails
        }
      }

      // Assign OFF to any remaining unassigned employees
      unassignedEmployees.forEach(emp => {
        newShifts.set(emp.id, ShiftType.OFF);
      });
      
      // Apply all the new shift assignments and enforce the 6-day rule
      return prevData.map(employee => {
        let updatedEmployee = { ...employee };
        if (newShifts.has(employee.id)) {
          const updatedSchedule = [...employee.schedule];
          updatedSchedule[dayIndex] = newShifts.get(employee.id)!;
          updatedEmployee = { ...employee, schedule: updatedSchedule };
        }
        // Always run the 6-day rule check after any change
        return enforceSixDayRuleForEmployee(updatedEmployee);
      });
    });
  }, []);

  const handleAutoRoster = useCallback(() => {
    setIsAutoRosterConfirmOpen(true);
  }, []);

  const confirmAutoRoster = useCallback(() => {
    let newRosterData: RosterEntry[] = JSON.parse(JSON.stringify(rosterData));
    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();

    const quotas: { [key in ShiftType]?: number } = {
      [ShiftType.AM18]: 4,
      [ShiftType.PM17]: 4,
      [ShiftType.T2GD]: 1,
      [ShiftType.T2GN]: 1,
      [ShiftType.CROD]: 2,
      [ShiftType.CRON]: 2,
    };
    const priorityOrder = [ShiftType.AM18, ShiftType.PM17, ShiftType.T2GD, ShiftType.T2GN, ShiftType.CROD, ShiftType.CRON];
    
    const isInvalidTransition = (prevShift: ShiftType, nextShift: ShiftType): boolean => {
      return NIGHT_SHIFTS.includes(prevShift) && DAY_SHIFTS.includes(nextShift);
    };

    for (let dayIndex = 0; dayIndex < daysInMonth; dayIndex++) {
        const shiftsToAssign: ShiftType[] = [];
        for (const shift in quotas) {
            for (let i = 0; i < (quotas[shift as ShiftType] || 0); i++) {
                shiftsToAssign.push(shift as ShiftType);
            }
        }
        shiftsToAssign.sort((a, b) => priorityOrder.indexOf(a) - priorityOrder.indexOf(b));

        let unassignedEmployees = newRosterData.filter(e => e.schedule[dayIndex] !== ShiftType.AL);
        
        const dailyAssignments = new Map<number, ShiftType>();

        for (const shift of shiftsToAssign) {
            let assignedEmployeeIndex = -1;
            const shuffledIndices = [...unassignedEmployees.keys()].sort(() => Math.random() - 0.5);

            for (const index of shuffledIndices) {
                const emp = unassignedEmployees[index];
                
                if (emp.name.toLowerCase().includes('maria') && shift !== ShiftType.AM18 && shift !== ShiftType.CROD) {
                    continue;
                }
                
                if (dayIndex > 0 && isInvalidTransition(emp.schedule[dayIndex - 1], shift)) {
                    continue;
                }

                assignedEmployeeIndex = index;
                break;
            }
            
            if (assignedEmployeeIndex !== -1) {
                const assignedEmployee = unassignedEmployees[assignedEmployeeIndex];
                dailyAssignments.set(assignedEmployee.id, shift);
                unassignedEmployees.splice(assignedEmployeeIndex, 1);
            } else {
                alert(`Auto-roster failed on day ${dayIndex + 1}: Could not find an eligible employee for a ${shift} shift. Process aborted.`);
                setIsAutoRosterConfirmOpen(false);
                return;
            }
        }

        unassignedEmployees.forEach(emp => {
            dailyAssignments.set(emp.id, ShiftType.OFF);
        });
        
        newRosterData = newRosterData.map(emp => {
            if (dailyAssignments.has(emp.id)) {
                const newSchedule = [...emp.schedule];
                newSchedule[dayIndex] = dailyAssignments.get(emp.id)!;
                return { ...emp, schedule: newSchedule };
            }
            return emp;
        });
    }

    newRosterData = newRosterData.map(enforceSixDayRuleForEmployee);

    // Balance OFF days to ensure everyone has at least 7
    let balancedRoster = JSON.parse(JSON.stringify(newRosterData));
    const MAX_BALANCE_ITERATIONS = balancedRoster.length * 10;
    let balanceIteration = 0;

    while (balanceIteration < MAX_BALANCE_ITERATIONS) {
        balanceIteration++;
        const getOffCount = (schedule: ShiftType[]) => schedule.filter(s => s === ShiftType.OFF).length;

        let needsOff = balancedRoster
            .map((emp, index) => ({ emp, index, offCount: getOffCount(emp.schedule) }))
            .filter(item => item.offCount < 7)
            .sort((a, b) => a.offCount - b.offCount);

        let hasSurplusOff = balancedRoster
            .map((emp, index) => ({ emp, index, offCount: getOffCount(emp.schedule) }))
            .filter(item => item.offCount > 7)
            .sort((a, b) => b.offCount - a.offCount);

        if (needsOff.length === 0) break;

        const employeeNeedingOff = needsOff[0];
        let swapFound = false;

        for (let day = 0; day < daysInMonth; day++) {
            const shiftToSwap = employeeNeedingOff.emp.schedule[day];
            if (shiftToSwap === ShiftType.OFF || shiftToSwap === ShiftType.AL) continue;

            for (const donor of hasSurplusOff) {
                if (donor.emp.schedule[day] === ShiftType.OFF) {
                    let tempDonorSchedule = [...donor.emp.schedule];
                    tempDonorSchedule[day] = shiftToSwap;

                    const isInvalidForMaria = donor.emp.name.toLowerCase().includes('maria') && shiftToSwap !== ShiftType.AM18 && shiftToSwap !== ShiftType.CROD;
                    if (isInvalidForMaria) continue;
                    
                    const isInvalidNightDay = (day > 0 && isInvalidTransition(tempDonorSchedule[day - 1], shiftToSwap)) || (day < daysInMonth - 1 && isInvalidTransition(shiftToSwap, tempDonorSchedule[day + 1]));
                    if (isInvalidNightDay) continue;

                    const tempDonorForCheck = { ...donor.emp, schedule: tempDonorSchedule };
                    const finalScheduleForDonor = enforceSixDayRuleForEmployee(tempDonorForCheck).schedule;
                    if (finalScheduleForDonor[day] === ShiftType.OFF) continue;

                    balancedRoster[employeeNeedingOff.index].schedule[day] = ShiftType.OFF;
                    balancedRoster[donor.index].schedule = finalScheduleForDonor;
                    swapFound = true;
                    break;
                }
            }
            if (swapFound) break;
        }

        if (!swapFound) {
            console.warn("Auto-roster balancing could not find a valid swap. Some employees may have fewer than 7 OFF days.");
            break;
        }
    }

    newRosterData = balancedRoster.map(enforceSixDayRuleForEmployee);

    setRosterData(newRosterData);
    setIsAutoRosterConfirmOpen(false);
    setSaveMessage('Full month roster has been automatically generated!');
    setTimeout(() => setSaveMessage(''), 3000);
  }, [rosterData, currentDate]);

  const handleClearRoster = useCallback(() => {
    setIsClearRosterConfirmOpen(true);
  }, []);

  const confirmClearRoster = useCallback(() => {
    setRosterData(prevData =>
      prevData.map(employee => {
        const newSchedule = employee.schedule.map(shift =>
          shift === ShiftType.AL ? ShiftType.AL : ShiftType.OFF
        );
        return { ...employee, schedule: newSchedule };
      })
    );
    setIsClearRosterConfirmOpen(false);
    setSaveMessage('All shifts have been cleared!');
    setTimeout(() => setSaveMessage(''), 3000);
  }, []);

  const handleEnableEditMode = useCallback(() => {
    setRosterDataBackup(JSON.parse(JSON.stringify(rosterData)));
    setIsEditMode(true);
  }, [rosterData]);

  const handleSaveChanges = useCallback(() => {
    const newErrors = new Map<number, Set<keyof Omit<Employee, 'id'>>>();
    rosterData.forEach(employee => {
        const errorsForEmployee = new Set<keyof Omit<Employee, 'id'>>();
        if (employee.empNo.trim() === '') {
            errorsForEmployee.add('empNo');
        }
        if (employee.fusionId.trim() === '') {
            errorsForEmployee.add('fusionId');
        }
        if (errorsForEmployee.size > 0) {
            newErrors.set(employee.id, errorsForEmployee);
        }
    });

    if (newErrors.size > 0) {
        setValidationErrors(newErrors);
        alert("Cannot save. 'Emp No' and 'Fusion ID' cannot be empty. Please fill in the highlighted fields.");
        return;
    }
    
    setValidationErrors(new Map());
    setIsSaveConfirmOpen(true);
  }, [rosterData]);

  const confirmSaveChanges = useCallback(() => {
    setRosterDataBackup(null);
    setIsEditMode(false);
    setSaveMessage('Changes saved successfully!');
    setIsSaveConfirmOpen(false);
    setValidationErrors(new Map()); // Clear errors on successful save
    setTimeout(() => setSaveMessage(''), 3000);
  }, []);

  const handleCancelEdits = useCallback(() => {
    if (rosterDataBackup) {
      setRosterData(rosterDataBackup);
    }
    setRosterDataBackup(null);
    setIsEditMode(false);
    setValidationErrors(new Map()); // Clear errors on cancel
  }, [rosterDataBackup]);

  const handleExportCSV = useCallback(() => {
    setIsExportConfirmOpen(true);
  }, []);

  const confirmExportCSV = useCallback(() => {
    const monthName = currentDate.toLocaleString('en-US', { month: 'long' });
    const year = currentDate.getFullYear();
    const daysInMonthValue = new Date(year, currentDate.getMonth() + 1, 0).getDate();

    const headers = [
      'Emp No',
      'Fusion ID',
      'Employee Name',
      'Terminal ID',
      'Role',
      ...Array.from({ length: daysInMonthValue }, (_, i) => `${i + 1}`)
    ];

    const csvRows = [headers.join(',')];

    rosterData.forEach(employee => {
      // Quoting fields to handle potential commas in string values
      const row = [
        `"${employee.empNo}"`,
        `"${employee.fusionId}"`,
        `"${employee.name}"`,
        `"${employee.terminalId}"`,
        `"${employee.role}"`,
        ...employee.schedule
      ];
      csvRows.push(row.join(','));
    });

    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `Roster-${monthName}-${year}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setIsExportConfirmOpen(false);
  }, [rosterData, currentDate]);

  const handleToggleHoliday = useCallback((day: number) => {
    setHolidays(prevHolidays => {
        const newHolidays = new Set(prevHolidays);
        if (newHolidays.has(day)) {
            newHolidays.delete(day);
        } else {
            newHolidays.add(day);
        }
        return newHolidays;
    });
  }, []);

  const handleAssignLeave = useCallback((employeeId: number, dayIndex: number) => {
      const employee = rosterData.find(e => e.id === employeeId);
      if (!employee) return;
      
      const currentShift = employee.schedule[dayIndex];
      const newShift = currentShift === ShiftType.AL ? ShiftType.OFF : ShiftType.AL;
      
      handleShiftChange(employeeId, dayIndex, newShift);
  }, [rosterData, handleShiftChange]);

  const handleToggleLegend = useCallback(() => {
    setIsLegendOpen(prev => !prev);
  }, []);


  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 p-4 sm:p-6 lg:p-8">
      <div className="max-w-full mx-auto">
        <Header 
            currentDate={currentDate} 
            onDateChange={handleDateChange}
        />
        <main className="mt-6">
          <RosterTable 
            rosterData={rosterData} 
            onShiftChange={handleShiftChange} 
            onEmployeeDetailChange={handleEmployeeDetailChange}
            currentDate={currentDate}
            selectedEmployees={selectedEmployees}
            onSelectEmployee={handleSelectEmployee}
            onSelectAll={handleSelectAll}
            onAddEmployee={handleAddEmployee}
            onDeleteEmployees={handleDeleteEmployees}
            onAutoAssignDay={handleAutoAssignDay}
            onAutoRoster={handleAutoRoster}
            onClearRoster={handleClearRoster}
            isEditMode={isEditMode}
            onEnableEditMode={handleEnableEditMode}
            onSaveChanges={handleSaveChanges}
            onCancelEdits={handleCancelEdits}
            onExportCSV={handleExportCSV}
            holidays={holidays}
            onManageHolidaysAndLeave={() => setIsLeaveModalOpen(true)}
            shiftColors={shiftColors}
            onOpenSettings={() => setIsSettingsModalOpen(true)}
            validationErrors={validationErrors}
          />
        </main>
      </div>
      <Legend 
        isOpen={isLegendOpen} 
        onClose={() => setIsLegendOpen(false)} 
        shiftColors={shiftColors} 
      />
      <ConfirmationDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={confirmDeleteEmployees}
        title="Confirm Deletion"
        confirmButtonText="Delete"
        confirmButtonColor="red"
      >
        Are you sure you want to delete {selectedEmployees.size} selected employee(s)? This action cannot be undone.
      </ConfirmationDialog>
      <ConfirmationDialog
        isOpen={isSaveConfirmOpen}
        onClose={() => setIsSaveConfirmOpen(false)}
        onConfirm={confirmSaveChanges}
        title="Confirm Save"
        confirmButtonText="Save"
        confirmButtonColor="green"
      >
        Are you sure you want to save the changes?
      </ConfirmationDialog>
      <ConfirmationDialog
        isOpen={isAddConfirmOpen}
        onClose={() => setIsAddConfirmOpen(false)}
        onConfirm={confirmAddEmployee}
        title="Confirm Add Employee"
        confirmButtonText="Add"
        confirmButtonColor="green"
      >
        Are you sure you want to add a new employee?
      </ConfirmationDialog>
      <ConfirmationDialog
        isOpen={isExportConfirmOpen}
        onClose={() => setIsExportConfirmOpen(false)}
        onConfirm={confirmExportCSV}
        title="Confirm Export"
        confirmButtonText="Export"
        confirmButtonColor="green"
      >
        Are you sure you want to export the current roster to a CSV file?
      </ConfirmationDialog>
       <ConfirmationDialog
        isOpen={isAutoRosterConfirmOpen}
        onClose={() => setIsAutoRosterConfirmOpen(false)}
        onConfirm={confirmAutoRoster}
        title="Confirm Auto Roster Generation"
        confirmButtonText="Generate"
        confirmButtonColor="green"
      >
        Are you sure you want to automatically generate a new roster for the entire month? This will overwrite all existing shift assignments (except Annual Leave).
      </ConfirmationDialog>
      <ConfirmationDialog
        isOpen={isClearRosterConfirmOpen}
        onClose={() => setIsClearRosterConfirmOpen(false)}
        onConfirm={confirmClearRoster}
        title="Confirm Clear All Shifts"
        confirmButtonText="Clear All"
        confirmButtonColor="red"
      >
        Are you sure you want to clear all shifts for all employees for the current month? All shift assignments (except Annual Leave) will be set to 'OFF'. This action cannot be undone.
      </ConfirmationDialog>
      <ManageLeaveHolidayModal
          isOpen={isLeaveModalOpen}
          onClose={() => setIsLeaveModalOpen(false)}
          currentDate={currentDate}
          employees={rosterData}
          holidays={holidays}
          onToggleHoliday={handleToggleHoliday}
          onAssignLeave={handleAssignLeave}
      />
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        shiftColors={shiftColors}
        onColorChange={handleShiftColorChange}
      />
      {saveMessage && (
        <div className="fixed top-5 right-5 bg-green-500 text-white py-2 px-4 rounded-lg shadow-lg z-50 animate-fade-in-out">
          {saveMessage}
        </div>
      )}
      <button
        onClick={handleToggleLegend}
        className="fixed bottom-6 right-6 bg-indigo-600 text-white p-4 rounded-full shadow-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-75 z-20 transition-transform transform hover:scale-110"
        aria-label="Show Shift Legend"
        title="Show Shift Legend"
        aria-expanded={isLegendOpen}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
        </svg>
      </button>
    </div>
  );
};

export default App;