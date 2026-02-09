
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

export type ViewState = 'dashboard' | 'receipts';
