import React, { useState } from 'react';
import { Floor, Resident, Receipt, AppSettings } from '../types';
import { Button } from './Button';
import { BaseModal } from './BaseModal';
import { ReceiptModal } from './ReceiptModal';
import { 
  Plus, Trash2, ChevronDown, ChevronRight, Edit2, Calendar, 
  CheckCircle, Bell, Share2, X, Phone, Search, MessageCircle,
  ChevronLeft, History, IndianRupee, FileText
} from 'lucide-react';

interface DashboardProps {
  floors: Floor[];
  setFloors: React.Dispatch<React.SetStateAction<Floor[]>>;
  receipts: Receipt[];
  setReceipts: React.Dispatch<React.SetStateAction<Receipt[]>>;
  settings: AppSettings;
}

type ModalType = 'ADD_FLOOR' | 'ADD_ROOM' | 'RESIDENT_MODAL' | 'DUE_REMINDERS' | 'COLLECT_RENT' | 'RESIDENT_HISTORY';

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June", 
  "July", "August", "September", "October", "November", "December"
];

export const Dashboard: React.FC<DashboardProps> = ({ 
  floors, 
  setFloors, 
  receipts, 
  setReceipts,
  settings 
}) => {
  const [expandedFloors, setExpandedFloors] = useState<Set<string>>(new Set());
  const [modalType, setModalType] = useState<ModalType | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Selected Floor & Room & Resident
  const [selectedFloorId, setSelectedFloorId] = useState<string | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [selectedResidentId, setSelectedResidentId] = useState<string | null>(null);
  const [activeResidentForAction, setActiveResidentForAction] = useState<{
    resident: Resident;
    roomNumber: string;
    floorNumber: string;
  } | null>(null);

  // Receipt Preview
  const [viewingReceipt, setViewingReceipt] = useState<Receipt | null>(null);

  // Month navigation: default to current month
  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth()); // 0-indexed

  // Form states
  const [floorName, setFloorName] = useState('');
  const [roomNumber, setRoomNumber] = useState('');
  const [residentForm, setResidentForm] = useState({ 
    name: '', 
    mobile: '', 
    rent: '', 
    joiningDate: '', 
    dueDay: '1' 
  });

  // Quick Collect Rent Form state
  const selectedMonthKey = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}`;
  const [collectRentForm, setCollectRentForm] = useState({
    amount: 0,
    paymentMethod: 'UPI',
    date: new Date().toISOString().split('T')[0],
    notes: '',
    forMonth: selectedMonthKey
  });

  // Check if a resident has paid for the targeted month
  const getResidentMonthReceipt = (residentName: string, year: number, month: number): Receipt | undefined => {
    const targetMonthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
    return receipts.find(r => {
      const nameMatch = r.residentName.trim().toLowerCase() === residentName.trim().toLowerCase();
      if (!nameMatch) return false;
      if (r.forMonth) {
        return r.forMonth === targetMonthKey;
      }
      const rDate = new Date(r.date);
      return rDate.getFullYear() === year && rDate.getMonth() === month;
    });
  };

  // Month navigation helpers
  const handlePrevMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear(y => y - 1);
    } else {
      setSelectedMonth(m => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear(y => y + 1);
    } else {
      setSelectedMonth(m => m + 1);
    }
  };

  const handleCurrentMonth = () => {
    const now = new Date();
    setSelectedMonth(now.getMonth());
    setSelectedYear(now.getFullYear());
  };

  const isCurrentViewingMonth = selectedYear === currentDate.getFullYear() && selectedMonth === currentDate.getMonth();

  // All residents flattened list with month status
  const allResidentsWithStatus: {
    resident: Resident;
    roomNumber: string;
    floorNumber: string;
    floorId: string;
    roomId: string;
    paidReceipt?: Receipt;
    isPaid: boolean;
    dueDateText: string;
  }[] = [];

  floors.forEach(floor => {
    floor.rooms.forEach(room => {
      room.residents.forEach(resident => {
        const paidReceipt = getResidentMonthReceipt(resident.name, selectedYear, selectedMonth);
        const dueDay = resident.dueDay || (resident.joiningDate ? new Date(resident.joiningDate).getDate() : 1);
        const dueDateText = `${dueDay} ${MONTH_NAMES[selectedMonth]} ${selectedYear}`;

        allResidentsWithStatus.push({
          resident,
          roomNumber: room.roomNumber,
          floorNumber: floor.floorNumber,
          floorId: floor.id,
          roomId: room.id,
          paidReceipt,
          isPaid: !!paidReceipt,
          dueDateText
        });
      });
    });
  });

  const totalResidents = allResidentsWithStatus.length;
  const paidResidents = allResidentsWithStatus.filter(r => r.isPaid);
  const unpaidResidents = allResidentsWithStatus.filter(r => !r.isPaid);
  const paidCount = paidResidents.length;
  const unpaidCount = unpaidResidents.length;
  const totalRooms = floors.reduce((acc, floor) => acc + floor.rooms.length, 0);

  const totalCollectedThisMonth = paidResidents.reduce((acc, r) => acc + (r.paidReceipt?.amount || r.resident.rentAmount), 0);
  const totalPendingThisMonth = unpaidResidents.reduce((acc, r) => acc + r.resident.rentAmount, 0);

  const paidPercentage = totalResidents > 0 ? Math.round((paidCount / totalResidents) * 100) : 0;
  const unpaidPercentage = totalResidents > 0 ? Math.round((unpaidCount / totalResidents) * 100) : 0;

  // Quick Collect Rent Trigger
  const handleOpenCollectRent = (resident: Resident, roomNumber: string, floorNumber: string) => {
    setActiveResidentForAction({ resident, roomNumber, floorNumber });
    const targetMonthKey = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}`;
    setCollectRentForm({
      amount: resident.rentAmount || 0,
      paymentMethod: 'UPI',
      date: new Date().toISOString().split('T')[0],
      notes: `Rent for ${MONTH_NAMES[selectedMonth]} ${selectedYear}`,
      forMonth: targetMonthKey
    });
    setModalType('COLLECT_RENT');
  };

  // Submit Collect Rent
  const handleSubmitCollectRent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeResidentForAction) return;

    const newReceipt: Receipt = {
      id: Date.now().toString(),
      residentName: activeResidentForAction.resident.name,
      roomNumber: activeResidentForAction.roomNumber,
      mobileNumber: activeResidentForAction.resident.mobile,
      amount: Number(collectRentForm.amount),
      date: collectRentForm.date,
      paymentMethod: collectRentForm.paymentMethod,
      forMonth: collectRentForm.forMonth,
      notes: collectRentForm.notes
    };

    setReceipts(prev => [newReceipt, ...prev]);
    setModalType(null);
    setViewingReceipt(newReceipt); // immediately show receipt for print/whatsapp!
  };

  // Floor expand/collapse
  const toggleFloor = (floorId: string) => {
    const newExpanded = new Set(expandedFloors);
    newExpanded.has(floorId) ? newExpanded.delete(floorId) : newExpanded.add(floorId);
    setExpandedFloors(newExpanded);
  };

  // Resident Modal for Add/Edit
  const openResidentModal = (floorId: string, roomId: string, resident?: Resident) => {
    setSelectedFloorId(floorId);
    setSelectedRoomId(roomId);
    if (resident) {
      const derivedDueDay = resident.dueDay ? resident.dueDay.toString() : (resident.joiningDate ? new Date(resident.joiningDate).getDate().toString() : '1');
      setResidentForm({
        name: resident.name,
        mobile: resident.mobile,
        rent: resident.rentAmount ? resident.rentAmount.toString() : '',
        joiningDate: resident.joiningDate || new Date().toISOString().split('T')[0],
        dueDay: derivedDueDay
      });
      setSelectedResidentId(resident.id);
    } else {
      const todayStr = new Date().toISOString().split('T')[0];
      setResidentForm({ 
        name: '', 
        mobile: '', 
        rent: '', 
        joiningDate: todayStr, 
        dueDay: new Date().getDate().toString() 
      });
      setSelectedResidentId(null);
    }
    setModalType('RESIDENT_MODAL');
  };

  // Save Resident (Preserves original joining date!)
  const handleSaveResident = (e: React.FormEvent) => {
    e.preventDefault();
    if (!residentForm.name.trim() || !selectedFloorId || !selectedRoomId) return;

    const dueDayNum = Math.min(31, Math.max(1, parseInt(residentForm.dueDay) || 1));

    setFloors(floors.map(floor => {
      if (floor.id === selectedFloorId) {
        return {
          ...floor,
          rooms: floor.rooms.map(room => {
            if (room.id === selectedRoomId) {
              if (selectedResidentId) {
                return {
                  ...room,
                  residents: room.residents.map(res =>
                    res.id === selectedResidentId
                      ? { 
                          ...res, 
                          name: residentForm.name.trim(), 
                          mobile: residentForm.mobile.trim(), 
                          rentAmount: parseFloat(residentForm.rent) || 0, 
                          joiningDate: residentForm.joiningDate || res.joiningDate,
                          dueDay: dueDayNum
                        }
                      : res
                  )
                };
              } else {
                return {
                  ...room,
                  residents: [
                    ...room.residents, 
                    { 
                      id: Date.now().toString(), 
                      name: residentForm.name.trim(), 
                      mobile: residentForm.mobile.trim(), 
                      rentAmount: parseFloat(residentForm.rent) || 0, 
                      joiningDate: residentForm.joiningDate,
                      dueDay: dueDayNum
                    }
                  ]
                };
              }
            }
            return room;
          })
        };
      }
      return floor;
    }));
    setModalType(null);
  };

  const deleteResident = (floorId: string, roomId: string, residentId: string, residentName: string) => {
    if (!confirm(`Are you sure you want to remove resident ${residentName}?`)) return;
    setFloors(floors.map(f => {
      if (f.id === floorId) {
        return {
          ...f,
          rooms: f.rooms.map(r => {
            if (r.id === roomId) {
              return { ...r, residents: r.residents.filter(res => res.id !== residentId) };
            }
            return r;
          })
        };
      }
      return f;
    }));
  };

  const handleCall = (mobile: string) => {
    const cleanMobile = mobile.replace(/\D/g, '');
    if (cleanMobile) {
      window.location.href = `tel:${cleanMobile}`;
    } else {
      alert("No valid phone number.");
    }
  };

  const handleWhatsApp = (mobile: string, name: string) => {
    const cleanMobile = mobile.replace(/\D/g, '');
    if (cleanMobile) {
      const text = `Hello ${name}, this is from ${settings.pgName} Management.`;
      window.open(`https://wa.me/91${cleanMobile}?text=${encodeURIComponent(text)}`, '_blank');
    } else {
      alert("No valid phone number.");
    }
  };

  const sendPaymentReminder = (mobile: string, name: string, amount: number) => {
    const cleanMobile = mobile.replace(/\D/g, '');
    const monthName = `${MONTH_NAMES[selectedMonth]} ${selectedYear}`;
    const text = `Hello ${name},\nThis is a reminder from ${settings.pgName}.\nYour rent of ₹${amount.toLocaleString('en-IN')} for ${monthName} is currently pending. Please make the payment at your earliest convenience.\nThank you!`;
    window.open(`https://wa.me/91${cleanMobile}?text=${encodeURIComponent(text)}`, '_blank');
  };

  // Filter Logic for Search
  const filteredFloors = floors.map(floor => {
    const filteredRooms = floor.rooms.filter(room => {
      const matchesRoom = room.roomNumber.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesResident = room.residents.some(res => res.name.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchesRoom || matchesResident;
    });
    return { ...floor, rooms: filteredRooms };
  }).filter(floor => floor.rooms.length > 0 || floor.floorNumber.toLowerCase().includes(searchTerm.toLowerCase()));

  // Active resident history list
  const activeResidentHistory = activeResidentForAction
    ? receipts.filter(r => r.residentName.trim().toLowerCase() === activeResidentForAction.resident.name.trim().toLowerCase())
    : [];

  return (
    <div className="space-y-6">
      {/* Month Navigator & Summary Card */}
      <div className="bg-white p-5 rounded-2xl shadow-xs border border-gray-200">
        
        {/* Top Header with Month Navigator */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-5 border-b pb-4">
          <div className="flex items-center space-x-2.5">
            <Calendar className="text-blue-600 h-6 w-6" />
            <div>
              <h2 className="text-lg font-bold text-gray-900 leading-tight">
                Monthly Rent Tracker
              </h2>
              <p className="text-xs text-gray-500">
                Automatically tracks rent month-by-month • No manual date updates needed
              </p>
            </div>
          </div>

          {/* Month Switcher Controls */}
          <div className="flex items-center space-x-1.5 bg-gray-100 p-1 rounded-xl self-stretch sm:self-auto justify-between sm:justify-start">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 hover:bg-white rounded-lg text-gray-700 hover:shadow-xs transition-all"
              title="Previous Month"
            >
              <ChevronLeft size={18} />
            </button>
            <div className="px-3 text-center">
              <span className="text-sm font-bold text-gray-900">
                {MONTH_NAMES[selectedMonth]} {selectedYear}
              </span>
              {isCurrentViewingMonth && (
                <span className="ml-1.5 text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-bold uppercase">
                  Current
                </span>
              )}
            </div>
            <button
              onClick={handleNextMonth}
              className="p-1.5 hover:bg-white rounded-lg text-gray-700 hover:shadow-xs transition-all"
              title="Next Month"
            >
              <ChevronRight size={18} />
            </button>
            {!isCurrentViewingMonth && (
              <button
                onClick={handleCurrentMonth}
                className="text-xs font-semibold px-2.5 py-1 bg-white text-blue-600 rounded-lg hover:bg-blue-50 border border-gray-200 transition-all ml-1 shadow-2xs"
              >
                This Month
              </button>
            )}
          </div>
        </div>

        {/* 4 Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          {/* Card 1: Total Residents */}
          <div className="bg-blue-50/70 p-3.5 rounded-xl border border-blue-100 flex flex-col justify-between">
            <p className="text-xs text-blue-700 uppercase font-bold tracking-wider">Total Residents</p>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-3xl font-extrabold text-blue-900">{totalResidents}</span>
              <span className="text-xs text-gray-500 font-medium">({totalRooms} Rooms)</span>
            </div>
          </div>

          {/* Card 2: Paid */}
          <div className="bg-emerald-50/70 p-3.5 rounded-xl border border-emerald-200 flex flex-col justify-between">
            <div className="flex justify-between items-center">
              <p className="text-xs text-emerald-700 uppercase font-bold tracking-wider flex items-center">
                <CheckCircle size={14} className="mr-1" /> Paid
              </p>
              <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                {paidPercentage}%
              </span>
            </div>
            <div className="mt-2">
              <span className="text-3xl font-extrabold text-emerald-800">{paidCount}</span>
              <span className="text-xs font-bold text-emerald-700 ml-2">₹{totalCollectedThisMonth.toLocaleString('en-IN')}</span>
            </div>
          </div>

          {/* Card 3: Pending Alerts */}
          <div 
            className="bg-rose-50/70 p-3.5 rounded-xl border border-rose-200 flex flex-col justify-between cursor-pointer hover:border-rose-400 transition-all"
            onClick={() => setModalType('DUE_REMINDERS')}
          >
            <div className="flex justify-between items-center">
              <p className="text-xs text-rose-700 uppercase font-bold tracking-wider flex items-center">
                <Bell size={14} className="mr-1 text-rose-600 animate-pulse" /> Pending Due
              </p>
              <span className="text-xs font-bold text-rose-800 bg-rose-100 px-2 py-0.5 rounded-full">
                {unpaidPercentage}%
              </span>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <div>
                <span className="text-3xl font-extrabold text-rose-800">{unpaidCount}</span>
                <span className="text-xs font-bold text-rose-600 ml-2">₹{totalPendingThisMonth.toLocaleString('en-IN')}</span>
              </div>
              <span className="text-[11px] text-rose-600 font-semibold underline">View &rarr;</span>
            </div>
          </div>

          {/* Card 4: Rent Collected */}
          <div className="bg-purple-50/70 p-3.5 rounded-xl border border-purple-100 flex flex-col justify-between">
            <p className="text-xs text-purple-700 uppercase font-bold tracking-wider">Total Collected</p>
            <div className="mt-2">
              <div className="text-xl font-black text-purple-950">
                ₹{totalCollectedThisMonth.toLocaleString('en-IN')}
              </div>
              <p className="text-[10px] text-purple-600 font-medium">
                {MONTH_NAMES[selectedMonth]} {selectedYear} Receipts
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Global Search Bar */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
          <Search size={18} className="text-gray-400" />
        </div>
        <input
          type="text"
          placeholder="Search by room number or resident name..."
          className="w-full pl-10 pr-10 py-3 bg-white border border-gray-200 rounded-xl shadow-xs focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm transition-all"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        {searchTerm && (
          <button 
            onClick={() => setSearchTerm('')} 
            className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Floor & Room Header */}
      <div className="flex justify-between items-center pt-2">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Rooms & Residents</h2>
          <p className="text-xs text-gray-500">
            {MONTH_NAMES[selectedMonth]} {selectedYear} Rent Status
          </p>
        </div>
        <Button onClick={() => setModalType('ADD_FLOOR')} size="sm">
          <Plus size={16} className="mr-1" /> Add Floor
        </Button>
      </div>

      {/* Floors List */}
      <div className="space-y-4">
        {filteredFloors.map(floor => (
          <div key={floor.id} className="bg-white rounded-2xl shadow-xs border border-gray-200 overflow-hidden">
            
            {/* Floor Header Bar */}
            <div 
              className="bg-gray-50/80 hover:bg-gray-100/80 p-4 flex items-center justify-between cursor-pointer border-b transition-colors"
              onClick={() => toggleFloor(floor.id)}
            >
              <div className="flex items-center space-x-3">
                <div className="text-gray-600">
                  {(expandedFloors.has(floor.id) || searchTerm) ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                </div>
                <div>
                  <h3 className="font-bold text-base text-gray-900 uppercase">
                    {floor.floorNumber}
                  </h3>
                  <span className="text-xs text-gray-500">
                    {floor.rooms.length} Rooms • {floor.rooms.reduce((acc, r) => acc + r.residents.length, 0)} Residents
                  </span>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Button 
                  size="sm" 
                  variant="secondary" 
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    setSelectedFloorId(floor.id); 
                    setRoomNumber(''); 
                    setModalType('ADD_ROOM'); 
                  }}
                >
                  <Plus size={14} className="mr-1" /> Room
                </Button>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="text-red-500 hover:bg-red-50" 
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    if (confirm(`Delete entire ${floor.floorNumber}? All rooms inside will be removed.`)) {
                      setFloors(floors.filter(f => f.id !== floor.id)); 
                    }
                  }}
                >
                  <Trash2 size={16} />
                </Button>
              </div>
            </div>

            {/* Floor Rooms Grid */}
            {(expandedFloors.has(floor.id) || searchTerm) && (
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 bg-gray-50/30">
                {floor.rooms.map(room => (
                  <div key={room.id} className="bg-white border border-gray-200 rounded-xl p-3.5 shadow-xs flex flex-col justify-between">
                    <div>
                      {/* Room Header */}
                      <div className="flex justify-between items-center mb-3 pb-2 border-b border-gray-100">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-gray-900 text-sm">Room {room.roomNumber}</span>
                          <span className="text-[10px] text-gray-400 font-semibold bg-gray-100 px-1.5 py-0.5 rounded">
                            {room.residents.length} Residents
                          </span>
                        </div>
                        <button 
                          onClick={() => { 
                            if (confirm(`Delete Room ${room.roomNumber}?`)) {
                              setFloors(floors.map(f => f.id === floor.id ? { ...f, rooms: f.rooms.filter(r => r.id !== room.id) } : f));
                            }
                          }} 
                          className="text-gray-300 hover:text-red-500 transition-colors p-1"
                          title="Delete Room"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                      {/* Residents in this Room */}
                      <div className="space-y-2.5">
                        {room.residents.map(resident => {
                          const paidReceipt = getResidentMonthReceipt(resident.name, selectedYear, selectedMonth);
                          const isPaid = !!paidReceipt;
                          const dueDay = resident.dueDay || (resident.joiningDate ? new Date(resident.joiningDate).getDate() : 1);

                          return (
                            <div 
                              key={resident.id} 
                              className={`p-3 rounded-xl border transition-all ${
                                isPaid 
                                  ? 'bg-emerald-50/40 border-emerald-200' 
                                  : 'bg-white border-gray-200 hover:border-blue-300'
                              }`}
                            >
                              {/* Resident Info Row */}
                              <div className="flex justify-between items-start gap-2">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center space-x-1.5">
                                    <h4 className="font-bold text-gray-900 text-sm truncate">{resident.name}</h4>
                                    <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-1.5 rounded">
                                      ₹{resident.rentAmount.toLocaleString('en-IN')}
                                    </span>
                                  </div>
                                  <p className="text-xs text-gray-500 font-medium mt-0.5">{resident.mobile}</p>
                                  
                                  {resident.joiningDate && (
                                    <p className="text-[10px] text-gray-400 mt-0.5">
                                      Joined: {new Date(resident.joiningDate).toLocaleDateString('en-GB')} • Due: Day {dueDay} of month
                                    </p>
                                  )}
                                </div>

                                {/* Action Buttons: Call, WhatsApp, History, Edit, Delete */}
                                <div className="flex items-center space-x-0.5 shrink-0">
                                  <button
                                    onClick={() => handleCall(resident.mobile)}
                                    className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                    title="Call"
                                  >
                                    <Phone size={15} />
                                  </button>
                                  <button
                                    onClick={() => handleWhatsApp(resident.mobile, resident.name)}
                                    className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                    title="WhatsApp"
                                  >
                                    <MessageCircle size={15} />
                                  </button>
                                  <button
                                    onClick={() => {
                                      setActiveResidentForAction({ resident, roomNumber: room.roomNumber, floorNumber: floor.floorNumber });
                                      setModalType('RESIDENT_HISTORY');
                                    }}
                                    className="p-1.5 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                                    title="Payment History"
                                  >
                                    <History size={15} />
                                  </button>
                                  <button
                                    onClick={() => openResidentModal(floor.id, room.id, resident)}
                                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                    title="Edit Resident"
                                  >
                                    <Edit2 size={15} />
                                  </button>
                                  <button
                                    onClick={() => deleteResident(floor.id, room.id, resident.id, resident.name)}
                                    className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Remove Resident"
                                  >
                                    <Trash2 size={15} />
                                  </button>
                                </div>
                              </div>

                              {/* Monthly Status & Quick Collect Button */}
                              <div className="mt-2.5 pt-2 border-t border-gray-100 flex items-center justify-between gap-2">
                                {isPaid ? (
                                  <div className="flex items-center space-x-1.5">
                                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center">
                                      <CheckCircle size={12} className="mr-1" /> 
                                      Paid for {MONTH_NAMES[selectedMonth]}
                                    </span>
                                    <button 
                                      onClick={() => setViewingReceipt(paidReceipt)}
                                      className="text-[10px] text-blue-600 hover:underline flex items-center font-bold ml-1"
                                    >
                                      <FileText size={11} className="mr-0.5" /> Receipt
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-between w-full">
                                    <span className="text-[11px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md">
                                      Due for {MONTH_NAMES[selectedMonth]}
                                    </span>

                                    {/* 1-Click Collect Rent Button */}
                                    <button
                                      onClick={() => handleOpenCollectRent(resident, room.roomNumber, floor.floorNumber)}
                                      className="text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 rounded-lg shadow-xs transition-colors flex items-center"
                                    >
                                      <IndianRupee size={12} className="mr-0.5" /> Collect Rent
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Add Resident Button for Room */}
                    <button 
                      onClick={() => openResidentModal(floor.id, room.id)} 
                      className="w-full text-xs font-semibold text-blue-600 hover:bg-blue-50 py-2 border border-dashed border-blue-200 rounded-xl mt-3 flex items-center justify-center transition-colors"
                    >
                      <Plus size={14} className="mr-1" /> Add Resident
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {filteredFloors.length === 0 && (
          <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-gray-300">
            <p className="text-gray-500 font-medium">No rooms or residents found.</p>
            <Button onClick={() => setModalType('ADD_FLOOR')} className="mt-3" size="sm">
              <Plus size={16} className="mr-1" /> Add First Floor
            </Button>
          </div>
        )}
      </div>

      {/* QUICK COLLECT RENT MODAL */}
      <BaseModal 
        isOpen={modalType === 'COLLECT_RENT'} 
        onClose={() => setModalType(null)} 
        title="Collect Rent & Issue Receipt"
      >
        {activeResidentForAction && (
          <form onSubmit={handleSubmitCollectRent} className="space-y-4">
            <div className="bg-blue-50 p-3.5 rounded-xl border border-blue-100 flex items-center justify-between">
              <div>
                <p className="text-xs text-blue-600 font-semibold uppercase">Resident Details</p>
                <h4 className="font-extrabold text-gray-900 text-base">{activeResidentForAction.resident.name}</h4>
                <p className="text-xs text-gray-500">Room: {activeResidentForAction.roomNumber} • Mobile: {activeResidentForAction.resident.mobile}</p>
              </div>
              <div className="text-right">
                <span className="text-xs text-gray-500 font-bold block">Rent Month</span>
                <span className="text-sm font-extrabold text-blue-800">{MONTH_NAMES[selectedMonth]} {selectedYear}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Rent Amount (₹)</label>
                <input
                  required
                  type="number"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-base font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  value={collectRentForm.amount}
                  onChange={e => setCollectRentForm({ ...collectRentForm, amount: Number(e.target.value) })}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Payment Method</label>
                <select
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  value={collectRentForm.paymentMethod}
                  onChange={e => setCollectRentForm({ ...collectRentForm, paymentMethod: e.target.value })}
                >
                  <option value="UPI">UPI (GPay / PhonePe / Paytm)</option>
                  <option value="Cash">Cash</option>
                  <option value="Google Pay">Google Pay</option>
                  <option value="PhonePe">PhonePe</option>
                  <option value="Paytm">Paytm</option>
                  <option value="Bank Transfer">Bank Transfer (NEFT / IMPS)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Payment Date</label>
              <input
                required
                type="date"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                value={collectRentForm.date}
                onChange={e => setCollectRentForm({ ...collectRentForm, date: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Notes (Optional)</label>
              <input
                type="text"
                placeholder="e.g. October 2026 rent"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                value={collectRentForm.notes}
                onChange={e => setCollectRentForm({ ...collectRentForm, notes: e.target.value })}
              />
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t">
              <Button type="button" variant="ghost" onClick={() => setModalType(null)}>Cancel</Button>
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 font-bold">
                ✓ Issue Receipt
              </Button>
            </div>
          </form>
        )}
      </BaseModal>

      {/* RENT ALERTS / PENDING LIST MODAL */}
      <BaseModal 
        isOpen={modalType === 'DUE_REMINDERS'} 
        onClose={() => setModalType(null)} 
        title={`🔔 Pending Rent Alerts (${unpaidCount}) - ${MONTH_NAMES[selectedMonth]} ${selectedYear}`}
      >
        <div className="space-y-4">
          <p className="text-xs text-gray-500">
            List of residents with rent pending for {MONTH_NAMES[selectedMonth]} {selectedYear}:
          </p>

          {unpaidResidents.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="mx-auto text-emerald-500 mb-2" size={36} />
              <p className="text-gray-800 font-bold">All residents are up to date!</p>
              <p className="text-xs text-gray-500 mt-1">No pending rent for {MONTH_NAMES[selectedMonth]} {selectedYear}.</p>
            </div>
          ) : (
            <div className="max-h-[60vh] overflow-y-auto space-y-3 pr-1">
              {unpaidResidents.map(item => (
                <div 
                  key={item.resident.id} 
                  className="p-3.5 rounded-xl border border-gray-200 bg-white shadow-xs flex items-center justify-between gap-3 hover:border-blue-300 transition-all"
                >
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-gray-900 text-sm truncate">{item.resident.name}</h4>
                    <p className="text-xs text-rose-600 font-bold mt-0.5">
                      ₹{item.resident.rentAmount.toLocaleString('en-IN')} Pending
                    </p>
                    <p className="text-[10px] text-gray-500 mt-0.5">
                      Room {item.roomNumber} ({item.floorNumber}) • Due: {item.dueDateText}
                    </p>
                  </div>

                  <div className="flex items-center space-x-1.5 shrink-0">
                    <button
                      onClick={() => handleCall(item.resident.mobile)}
                      className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      title="Call"
                    >
                      <Phone size={15} />
                    </button>
                    <button
                      onClick={() => sendPaymentReminder(item.resident.mobile, item.resident.name, item.resident.rentAmount)}
                      className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                      title="WhatsApp Reminder"
                    >
                      <Share2 size={15} />
                    </button>
                    <button
                      onClick={() => {
                        setModalType(null);
                        handleOpenCollectRent(item.resident, item.roomNumber, item.floorNumber);
                      }}
                      className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors"
                    >
                      Collect Rent
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <Button variant="secondary" onClick={() => setModalType(null)} className="w-full py-2.5 font-bold">
            Close
          </Button>
        </div>
      </BaseModal>

      {/* RESIDENT PAYMENT HISTORY MODAL */}
      <BaseModal
        isOpen={modalType === 'RESIDENT_HISTORY'}
        onClose={() => setModalType(null)}
        title={`📜 ${activeResidentForAction?.resident.name} - Payment History`}
      >
        <div className="space-y-4">
          {activeResidentHistory.length === 0 ? (
            <div className="text-center py-6 text-gray-500 text-xs">
              No receipts issued for this resident yet.
            </div>
          ) : (
            <div className="max-h-[60vh] overflow-y-auto space-y-2.5 pr-1">
              {activeResidentHistory.map(rec => (
                <div key={rec.id} className="p-3 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-between">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-bold text-gray-900">₹{rec.amount.toLocaleString('en-IN')}</span>
                      <span className="text-[10px] bg-blue-100 text-blue-700 font-bold px-1.5 py-0.5 rounded">
                        {rec.paymentMethod || 'UPI'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 mt-0.5">
                      Date: {new Date(rec.date).toLocaleDateString('en-GB')} {rec.notes ? `• ${rec.notes}` : ''}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setViewingReceipt(rec);
                    }}
                    className="text-xs text-blue-600 hover:underline font-bold px-2 py-1 bg-white border border-gray-200 rounded-lg shadow-2xs"
                  >
                    View Receipt
                  </button>
                </div>
              ))}
            </div>
          )}
          <Button variant="secondary" onClick={() => setModalType(null)} className="w-full">
            Close
          </Button>
        </div>
      </BaseModal>

      {/* ADD/EDIT RESIDENT MODAL */}
      <BaseModal 
        isOpen={modalType === 'RESIDENT_MODAL'} 
        onClose={() => setModalType(null)} 
        title={selectedResidentId ? "Edit Resident Details" : "Add New Resident"}
      >
        <form onSubmit={handleSaveResident} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Full Name</label>
            <input
              required
              type="text"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              placeholder="e.g. Ramesh Reddy"
              value={residentForm.name}
              onChange={e => setResidentForm({ ...residentForm, name: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Mobile Number</label>
              <input
                required
                type="tel"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                placeholder="10-digit number"
                value={residentForm.mobile}
                onChange={e => setResidentForm({ ...residentForm, mobile: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Monthly Rent (₹)</label>
              <input
                required
                type="number"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                placeholder="e.g. 6000"
                value={residentForm.rent}
                onChange={e => setResidentForm({ ...residentForm, rent: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                Original Joining Date
              </label>
              <input
                required
                type="date"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                value={residentForm.joiningDate}
                onChange={e => setResidentForm({ ...residentForm, joiningDate: e.target.value })}
              />
              <span className="text-[10px] text-gray-400 mt-0.5 block">
                *Keep original joining date. No need to change every month.
              </span>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                Rent Due Day (1-31)
              </label>
              <input
                required
                type="number"
                min="1"
                max="31"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                placeholder="e.g. 5"
                value={residentForm.dueDay}
                onChange={e => setResidentForm({ ...residentForm, dueDay: e.target.value })}
              />
              <span className="text-[10px] text-gray-400 mt-0.5 block">
                Rent is calculated due on this day each month.
              </span>
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-2 border-t">
            <Button type="button" variant="ghost" onClick={() => setModalType(null)}>Cancel</Button>
            <Button type="submit">{selectedResidentId ? 'Save Changes' : 'Add Resident'}</Button>
          </div>
        </form>
      </BaseModal>

      {/* ADD FLOOR MODAL */}
      <BaseModal isOpen={modalType === 'ADD_FLOOR'} onClose={() => setModalType(null)} title="New Floor">
        <form onSubmit={(e) => {
          e.preventDefault();
          if (!floorName.trim()) return;
          const newFloor: Floor = { id: Date.now().toString(), floorNumber: floorName.trim(), rooms: [] };
          setFloors([...floors, newFloor]);
          setFloorName('');
          setModalType(null);
        }} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Floor Name or Number (e.g. Ground Floor, 1st Floor)</label>
            <input
              required
              autoFocus
              type="text"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              placeholder="e.g. 1st Floor"
              value={floorName}
              onChange={e => setFloorName(e.target.value)}
            />
          </div>
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="ghost" onClick={() => setModalType(null)}>Cancel</Button>
            <Button type="submit">Add Floor</Button>
          </div>
        </form>
      </BaseModal>

      {/* ADD ROOM MODAL */}
      <BaseModal isOpen={modalType === 'ADD_ROOM'} onClose={() => setModalType(null)} title="New Room">
        <form onSubmit={(e) => {
          e.preventDefault();
          if (!roomNumber.trim() || !selectedFloorId) return;
          setFloors(floors.map(floor => {
            if (floor.id === selectedFloorId) {
              return {
                ...floor,
                rooms: [...floor.rooms, { id: Date.now().toString(), roomNumber: roomNumber.trim(), residents: [] }]
              };
            }
            return floor;
          }));
          setRoomNumber('');
          setModalType(null);
        }} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Room Number (e.g. 101, 102)</label>
            <input
              required
              autoFocus
              type="text"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              placeholder="e.g. 101, 102"
              value={roomNumber}
              onChange={e => setRoomNumber(e.target.value)}
            />
          </div>
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="ghost" onClick={() => setModalType(null)}>Cancel</Button>
            <Button type="submit">Add Room</Button>
          </div>
        </form>
      </BaseModal>

      {/* RECEIPT VIEW / PRINT / SHARE MODAL */}
      {viewingReceipt && (
        <ReceiptModal
          receipt={viewingReceipt}
          onClose={() => setViewingReceipt(null)}
          settings={settings}
        />
      )}
    </div>
  );
};
