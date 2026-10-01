export interface Resident {
  id: string;
  name: string;
  mobile: string;
  rentAmount: number;
  joiningDate?: string;
  dueDay?: number; // Day of each month rent is due (1-31). Defaults to day of joiningDate
  notes?: string;
}

export interface Room {
  id: string;
  roomNumber: string;
  residents: Resident[];
}

export interface Floor {
  id: string;
  floorNumber: string;
  rooms: Room[];
}

export interface Receipt {
  id: string;
  residentName: string;
  roomNumber: string;
  mobileNumber: string;
  amount: number;
  date: string;
  paymentMethod: string;
  forMonth?: string; // Format "YYYY-MM", e.g. "2026-10"
  notes?: string;
}

export interface AppSettings {
  pgName: string;
  managerName: string;
  pgSubtitle: string;
  address: string;
  phone: string;
  signatureImage?: string;
  mapUri?: string;
  jsonBinSecret?: string;
  jsonBinId?: string;
}

export interface DataSnapshot {
  id: string;
  timestamp: number;
  dateString: string;
  floorsCount: number;
  roomsCount: number;
  residentsCount: number;
  receiptsCount: number;
  floors: Floor[];
  receipts: Receipt[];
  settings: AppSettings;
  trigger: 'auto' | 'manual';
}

export type ViewState = 'dashboard' | 'receipts';
