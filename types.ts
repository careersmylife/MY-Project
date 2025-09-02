export enum ShiftType {
  OFF = 'OFF',
  AM18 = 'AM18',
  PM17 = 'PM17',
  T2GD = 'T2GD',
  T2GN = 'T2GN',
  CROD = 'CROD',
  CRON = 'CRON',
  AL = 'AL',
}

export interface Employee {
  id: number;
  empNo: string;
  fusionId: string;
  name: string;
  terminalId: string;
  role: string;
}

export interface RosterEntry extends Employee {
  schedule: ShiftType[];
}

export type ShiftColor = {
  background: string;
  text: string;
};

export type ShiftColorSettings = Record<ShiftType, ShiftColor>;