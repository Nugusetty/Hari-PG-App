export interface Resident {
  id: string;
  name: string;
  mobile: string;
  rentAmount: number;
  joiningDate?: string;
  notes?: string;
}

export interface Room {
  id: string;
  roomNumber: string;
  residents: Resident[];
}

export interface Floor {
  id: string;
  floorNumber: string; // e.g., "Ground Floor", "1st Floor"
  rooms: Room[];
}

export interface Receipt {
  id: string;
  residentName: string;
  roomNumber: string;
  mobileNumber: string;
  amount: number;
  date: string;
  paymentMethod: string; // 'Cash' | 'UPI' | 'Bank Transfer' | 'Other'
  notes?: string;
}

export interface AppSettings {
  pgName: string;
  pgSubtitle: string;
  address: string;
  phone: string;
  signatureImage?: string;
}

export type ViewState = 'dashboard' | 'receipts';