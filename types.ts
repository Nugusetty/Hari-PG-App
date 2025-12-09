export interface Resident {
  id: string;
  name: string;
  mobile: string;
  rentAmount: number;
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
  notes?: string;
}

export type ViewState = 'dashboard' | 'receipts';