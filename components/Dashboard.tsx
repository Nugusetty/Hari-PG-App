import React, { useState } from 'react';
import { Floor, Resident, Receipt, AppSettings } from '../types';
import { Button } from './Button';
import { BaseModal } from './BaseModal';
import { ReceiptModal } from './ReceiptModal';
import { 
  Plus, Trash2, ChevronDown, ChevronRight, Edit2, Calendar, 
  CheckCircle, Bell, Share2, X, Phone, Search, MessageCircle,
  ChevronLeft, History, IndianRupee, FileText, Check, AlertTriangle
} from 'lucide-react';

interface DashboardProps {
  floors: Floor[];
  setFloors: React.Dispatch<React.SetStateAction<Floor[]>>;
  receipts: Receipt[];
  setReceipts: React.Dispatch<React.SetStateAction<Receipt[]>>;
  settings: AppSettings;
}

type ModalType = 'ADD_FLOOR' | 'ADD_ROOM' | 'RESIDENT_MODAL' | 'DUE_REMINDERS' | 'COLLECT_RENT' | 'RESIDENT_HISTORY' | 'EDIT_FLOOR' | 'EDIT_ROOM';

interface DeleteTarget {
  type: 'FLOOR' | 'ROOM' | 'RESIDENT';
  id: string;
  name: string;
  floorId?: string;
  message?: string;
}

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
  
  // Custom In-App Delete Confirmation Modal State
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

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

  // Current real-world date
  const currentDate = new Date();
  const currentDay = currentDate.getDate(); // e.g. 1 on 1st of month
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth);

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

  const isCurrentViewingMonth = selectedYear === currentYear && selectedMonth === currentMonth;
  const isPastMonth = selectedYear < currentYear || (selectedYear === currentYear && selectedMonth < currentMonth);

  // STRICT DUE LOGIC: ONLY residents whose payment date has arrived and NOT paid
  const allResidentsWithStatus: {
    resident: Resident;
    roomNumber: string;
    floorNumber: string;
    floorId: string;
    roomId: string;
    paidReceipt?: Receipt;
    isPaid: boolean;
    dueDay: number;
    isDueNow: boolean; // TRUE ONLY IF payment date has arrived (dueDay <= currentDay) AND NOT PAID!
    dueDateText: string;
  }[] = [];

  floors.forEach(floor => {
    floor.rooms.forEach(room => {
      room.residents.forEach(resident => {
        const paidReceipt = getResidentMonthReceipt(resident.name, selectedYear, selectedMonth);
        const isPaid = !!paidReceipt;
        const dueDay = Number(resident.dueDay) || (resident.joiningDate ? new Date(resident.joiningDate).getDate() : 1);
        const dueDateText = `Day ${dueDay} of ${MONTH_NAMES[selectedMonth]}`;

        // Has resident's joining date arrived yet?
        let hasJoined = true;
        if (resident.joiningDate) {
          const [jYear, jMonth, jDay] = resident.joiningDate.split('-').map(Number);
          if (jYear > selectedYear || (jYear === selectedYear && jMonth - 1 > selectedMonth)) {
            hasJoined = false;
          } else if (isCurrentViewingMonth && jYear === currentYear && jMonth - 1 === currentMonth && jDay > currentDay) {
            hasJoined = false;
          }
        }

        // STRICT PAYMENT DATE RULE:
        // A resident is DUE NOW ONLY IF:
        // 1. They have NOT paid yet (!isPaid)
        // 2. They have already joined (hasJoined)
        // 3. For current month: Their rent payment day has ARRIVED (dueDay <= currentDay)
        //    (e.g., if today is 1st, ONLY dueDay === 1 residents appear. Residents with dueDay 2, 5, 10 do NOT appear!)
        // 4. For past month: All unpaid are overdue
        let isDueNow = false;
        if (!isPaid && hasJoined) {
          if (isPastMonth) {
            isDueNow = true;
          } else if (isCurrentViewingMonth) {
            if (dueDay <= currentDay) {
              isDueNow = true;
            }
          }
        }

        allResidentsWithStatus.push({
          resident,
          roomNumber: room.roomNumber,
          floorNumber: floor.floorNumber,
          floorId: floor.id,
          roomId: room.id,
          paidReceipt,
          isPaid,
          dueDay,
          isDueNow,
          dueDateText
        });
      });
    });
  });

  const totalResidents = allResidentsWithStatus.length;
  const paidResidents = allResidentsWithStatus.filter(r => r.isPaid);
  const paidCount = paidResidents.length;

  // STRICT LIST: ONLY residents whose payment date has arrived and must pay!
  const dueNowResidents = allResidentsWithStatus.filter(r => r.isDueNow);
  const dueNowCount = dueNowResidents.length;

  const totalRooms = floors.reduce((acc, floor) => acc + floor.rooms.length, 0);
  const totalCollectedThisMonth = paidResidents.reduce((acc, r) => acc + (r.paidReceipt?.amount || r.resident.rentAmount), 0);
  const totalPendingDueNowAmount = dueNowResidents.reduce((acc, r) => acc + r.resident.rentAmount, 0);

  const paidPercentage = totalResidents > 0 ? Math.round((paidCount / totalResidents) * 100) : 0;

  // 100% Reliable In-App Delete
  const executeDelete = () => {
    if (!deleteTarget) return;

    if (deleteTarget.type === 'FLOOR') {
      setFloors(prev => prev.filter(f => f.id !== deleteTarget.id));
    } else if (deleteTarget.type === 'ROOM') {
      setFloors(prev => prev.map(f => {
        if (f.id === deleteTarget.floorId) {
          return {
            ...f,
            rooms: f.rooms.filter(r => r.id !== deleteTarget.id)
          };
        }
        return f;
      }));
    } else if (deleteTarget.type === 'RESIDENT') {
      setFloors(prev => prev.map(f => ({
        ...f,
        rooms: f.rooms.map(r => ({
          ...r,
          residents: r.residents.filter(res => res.id !== deleteTarget.id)
        }))
      })));
      if (activeResidentForAction?.resident.id === deleteTarget.id) {
        setActiveResidentForAction(null);
      }
    }

    setDeleteTarget(null);
  };

  // Quick Collect Rent Trigger (Opens form for receipt)
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

  // 1-Click Quick Mark as Paid (Instantly records receipt & removes from Due Alert list)
  const handleQuickMarkAsPaid = (resident: Resident, roomNumber: string) => {
    const targetMonthKey = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}`;
    const newReceipt: Receipt = {
      id: Date.now().toString(),
      residentName: resident.name,
      roomNumber: roomNumber,
      mobileNumber: resident.mobile,
      amount: resident.rentAmount,
      date: new Date().toISOString().split('T')[0],
      paymentMethod: 'UPI',
      forMonth: targetMonthKey,
      notes: `Paid for ${MONTH_NAMES[selectedMonth]} ${selectedYear}`
    };

    setReceipts(prev => [newReceipt, ...prev]);
  };

  // Submit Collect Rent from Modal
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
    setViewingReceipt(newReceipt);
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
        dueDay: '1' 
      });
      setSelectedResidentId(null);
    }
    setModalType('RESIDENT_MODAL');
  };

  // Save Resident
  const handleSaveResident = (e: React.FormEvent) => {
    e.preventDefault();
    if (!residentForm.name.trim() || !selectedFloorId || !selectedRoomId) return;

    const dueDayNum = Math.min(31, Math.max(1, parseInt(residentForm.dueDay) || 1));

    setFloors(prevFloors => prevFloors.map(floor => {
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

  const handleCall = (mobile: string) => {
    const cleanMobile = mobile.replace(/\D/g, '');
    if (cleanMobile) window.location.href = `tel:${cleanMobile}`;
  };

  const handleWhatsApp = (mobile: string, name: string) => {
    const cleanMobile = mobile.replace(/\D/g, '');
    if (cleanMobile) {
      const text = `Hello ${name}, this is from ${settings.pgName} Management.`;
      window.open(`https://wa.me/91${cleanMobile}?text=${encodeURIComponent(text)}`, '_blank');
    }
  };

  const sendPaymentReminder = (mobile: string, name: string, amount: number) => {
    const cleanMobile = mobile.replace(/\D/g, '');
    const monthName = `${MONTH_NAMES[selectedMonth]} ${selectedYear}`;
    const text = `Hello ${name},\nThis is a payment reminder from ${settings.pgName}.\nYour rent of ₹${amount.toLocaleString('en-IN')} for ${monthName} is due. Please complete the payment.\nThank you!`;
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

  const activeResidentHistory = activeResidentForAction
    ? receipts.filter(r => r.residentName.trim().toLowerCase() === activeResidentForAction.resident.name.trim().toLowerCase())
    : [];

  return (
    <div className="space-y-6">
      {/* Month Navigator & Summary Card */}
      <div className="bg-white p-5 rounded-2xl shadow-xs border border-gray-200">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-5 border-b pb-4">
          <div className="flex items-center space-x-2.5">
            <Calendar className="text-blue-600 h-6 w-6" />
            <div>
              <h2 className="text-lg font-bold text-gray-900 leading-tight">
                Monthly Rent Tracker
              </h2>
              <p className="text-xs text-gray-500">
                {isCurrentViewingMonth 
                  ? `Today is Day ${currentDay} of ${MONTH_NAMES[selectedMonth]} • Rent activates strictly on each resident's due date`
                  : `Viewing: ${MONTH_NAMES[selectedMonth]} ${selectedYear}`
                }
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-1.5 bg-gray-100 p-1 rounded-xl self-stretch sm:self-auto justify-between sm:justify-start">
            <button onClick={handlePrevMonth} className="p-1.5 hover:bg-white rounded-lg text-gray-700 transition-all" title="Previous Month">
              <ChevronLeft size={18} />
            </button>
            <div className="px-3 text-center">
              <span className="text-sm font-bold text-gray-900">
                {MONTH_NAMES[selectedMonth]} {selectedYear}
              </span>
              {isCurrentViewingMonth && (
                <span className="ml-1.5 text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-bold uppercase">
                  Today: Day {currentDay}
                </span>
              )}
            </div>
            <button onClick={handleNextMonth} className="p-1.5 hover:bg-white rounded-lg text-gray-700 transition-all" title="Next Month">
              <ChevronRight size={18} />
            </button>
            {!isCurrentViewingMonth && (
              <button onClick={handleCurrentMonth} className="text-xs font-semibold px-2.5 py-1 bg-white text-blue-600 rounded-lg border ml-1 shadow-2xs">
                This Month
              </button>
            )}
          </div>
        </div>

        {/* 4 Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <div className="bg-blue-50/70 p-3.5 rounded-xl border border-blue-100 flex flex-col justify-between">
            <p className="text-xs text-blue-700 uppercase font-bold tracking-wider">Total Residents</p>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-3xl font-extrabold text-blue-900">{totalResidents}</span>
              <span className="text-xs text-gray-500 font-medium">({totalRooms} Rooms)</span>
            </div>
          </div>

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

          {/* Card 3: STRICT RENT DUE ALERT (ONLY residents whose payment date is due today or overdue!) */}
          <div 
            className="bg-rose-50/70 p-3.5 rounded-xl border border-rose-200 flex flex-col justify-between cursor-pointer hover:border-rose-400 hover:shadow-xs transition-all"
            onClick={() => setModalType('DUE_REMINDERS')}
          >
            <div className="flex justify-between items-center">
              <p className="text-xs text-rose-700 uppercase font-bold tracking-wider flex items-center">
                <Bell size={14} className="mr-1 text-rose-600 animate-pulse" /> Payment Due Alerts
              </p>
              <span className="text-xs font-bold text-rose-800 bg-rose-100 px-2 py-0.5 rounded-full">
                Day 1 to {currentDay}
              </span>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <div>
                <span className="text-3xl font-extrabold text-rose-800">{dueNowCount}</span>
                <span className="text-xs font-bold text-rose-600 ml-2">₹{totalPendingDueNowAmount.toLocaleString('en-IN')}</span>
              </div>
              <span className="text-[11px] text-rose-600 font-semibold underline">View Due List &rarr;</span>
            </div>
          </div>

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
          <button onClick={() => setSearchTerm('')} className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600">
            <X size={16} />
          </button>
        )}
      </div>

      {/* Floor & Room Header */}
      <div className="flex justify-between items-center pt-2">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Rooms & Residents</h2>
          <p className="text-xs text-gray-500">{MONTH_NAMES[selectedMonth]} {selectedYear} Status</p>
        </div>
        <Button onClick={() => setModalType('ADD_FLOOR')} size="sm">
          <Plus size={16} className="mr-1" /> Add Floor
        </Button>
      </div>

      {/* Floors List */}
      <div className="space-y-4">
        {filteredFloors.map(floor => (
          <div key={floor.id} className="bg-white rounded-2xl shadow-xs border border-gray-200 overflow-hidden">
            
            <div 
              className="bg-gray-50/80 hover:bg-gray-100/80 p-4 flex items-center justify-between cursor-pointer border-b transition-colors"
              onClick={() => toggleFloor(floor.id)}
            >
              <div className="flex items-center space-x-3">
                <div className="text-gray-600">
                  {(expandedFloors.has(floor.id) || searchTerm) ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                </div>
                <div>
                  <h3 className="font-bold text-base text-gray-900 uppercase">{floor.floorNumber}</h3>
                  <span className="text-xs text-gray-500">
                    {floor.rooms.length} Rooms • {floor.rooms.reduce((acc, r) => acc + r.residents.length, 0)} Residents
                  </span>
                </div>
              </div>

              <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
                <Button 
                  size="sm" 
                  variant="secondary" 
                  onClick={() => { 
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
                  className="text-gray-500 hover:text-blue-600 hover:bg-blue-50" 
                  title="Rename Floor"
                  onClick={() => {
                    setSelectedFloorId(floor.id);
                    setFloorName(floor.floorNumber);
                    setModalType('EDIT_FLOOR');
                  }}
                >
                  <Edit2 size={15} />
                </Button>

                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="text-red-500 hover:bg-red-50 hover:text-red-700" 
                  title="Delete Floor"
                  onClick={() => { 
                    setDeleteTarget({
                      type: 'FLOOR',
                      id: floor.id,
                      name: floor.floorNumber,
                      message: `Are you sure you want to delete ${floor.floorNumber}? All ${floor.rooms.length} room(s) and their residents will be permanently removed.`
                    });
                  }}
                >
                  <Trash2 size={16} />
                </Button>
              </div>
            </div>

            {(expandedFloors.has(floor.id) || searchTerm) && (
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 bg-gray-50/30">
                {floor.rooms.map(room => (
                  <div key={room.id} className="bg-white border border-gray-200 rounded-xl p-3.5 shadow-xs flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-center mb-3 pb-2 border-b border-gray-100">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-gray-900 text-sm">Room {room.roomNumber}</span>
                          <span className="text-[10px] text-gray-400 font-semibold bg-gray-100 px-1.5 py-0.5 rounded">
                            {room.residents.length} Residents
                          </span>
                        </div>
                        
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => {
                              setSelectedFloorId(floor.id);
                              setSelectedRoomId(room.id);
                              setRoomNumber(room.roomNumber);
                              setModalType('EDIT_ROOM');
                            }}
                            className="text-gray-400 hover:text-blue-600 p-1 rounded transition-colors"
                            title="Edit Room Number"
                          >
                            <Edit2 size={14} />
                          </button>

                          <button 
                            onClick={() => { 
                              setDeleteTarget({
                                type: 'ROOM',
                                id: room.id,
                                floorId: floor.id,
                                name: `Room ${room.roomNumber} (${floor.floorNumber})`,
                                message: `Are you sure you want to delete Room ${room.roomNumber}? All ${room.residents.length} resident(s) inside will be removed.`
                              });
                            }} 
                            className="text-gray-400 hover:text-red-600 p-1 rounded transition-colors"
                            title="Delete Room"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2.5">
                        {room.residents.map(resident => {
                          const paidReceipt = getResidentMonthReceipt(resident.name, selectedYear, selectedMonth);
                          const isPaid = !!paidReceipt;
                          const dueDay = Number(resident.dueDay) || (resident.joiningDate ? new Date(resident.joiningDate).getDate() : 1);
                          const isDueNow = !isPaid && (isPastMonth || (isCurrentViewingMonth && dueDay <= currentDay));

                          return (
                            <div 
                              key={resident.id} 
                              className={`p-3 rounded-xl border transition-all ${
                                isPaid 
                                  ? 'bg-emerald-50/40 border-emerald-200' 
                                  : isDueNow 
                                    ? 'bg-rose-50/30 border-rose-200' 
                                    : 'bg-white border-gray-200'
                              }`}
                            >
                              <div className="flex justify-between items-start gap-2">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center space-x-1.5">
                                    <h4 className="font-bold text-gray-900 text-sm truncate">{resident.name}</h4>
                                    <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-1.5 rounded">
                                      ₹{resident.rentAmount.toLocaleString('en-IN')}
                                    </span>
                                  </div>
                                  <p className="text-xs text-gray-500 font-medium mt-0.5">{resident.mobile}</p>
                                  <p className="text-[10px] text-gray-400 mt-0.5 font-medium">
                                    📅 Payment Day: {dueDay} of every month
                                  </p>
                                </div>

                                <div className="flex items-center space-x-0.5 shrink-0">
                                  <button onClick={() => handleCall(resident.mobile)} className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg" title="Call">
                                    <Phone size={15} />
                                  </button>
                                  <button onClick={() => handleWhatsApp(resident.mobile, resident.name)} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg" title="WhatsApp">
                                    <MessageCircle size={15} />
                                  </button>
                                  <button onClick={() => { setActiveResidentForAction({ resident, roomNumber: room.roomNumber, floorNumber: floor.floorNumber }); setModalType('RESIDENT_HISTORY'); }} className="p-1.5 text-purple-600 hover:bg-purple-50 rounded-lg" title="Payment History">
                                    <History size={15} />
                                  </button>
                                  <button onClick={() => openResidentModal(floor.id, room.id, resident)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg" title="Edit Resident">
                                    <Edit2 size={15} />
                                  </button>
                                  <button 
                                    onClick={() => {
                                      setDeleteTarget({
                                        type: 'RESIDENT',
                                        id: resident.id,
                                        name: resident.name,
                                        message: `Are you sure you want to permanently delete resident "${resident.name}"? They will be removed from Room ${room.roomNumber} and all lists.`
                                      });
                                    }} 
                                    className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg" 
                                    title="Delete Resident"
                                  >
                                    <Trash2 size={15} />
                                  </button>
                                </div>
                              </div>

                              <div className="mt-2.5 pt-2 border-t border-gray-100 flex items-center justify-between gap-2">
                                {isPaid ? (
                                  <div className="flex items-center space-x-1.5">
                                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center">
                                      <CheckCircle size={12} className="mr-1" /> Paid for {MONTH_NAMES[selectedMonth]}
                                    </span>
                                    <button onClick={() => setViewingReceipt(paidReceipt)} className="text-[10px] text-blue-600 hover:underline flex items-center font-bold ml-1">
                                      <FileText size={11} className="mr-0.5" /> Receipt
                                    </button>
                                  </div>
                                ) : isDueNow ? (
                                  <div className="flex items-center justify-between w-full">
                                    <span className="text-[11px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md flex items-center">
                                      <AlertTriangle size={11} className="mr-1" /> Due: Day {dueDay}
                                    </span>
                                    <button onClick={() => handleOpenCollectRent(resident, room.roomNumber, floor.floorNumber)} className="text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 rounded-lg flex items-center shadow-2xs">
                                      <IndianRupee size={12} className="mr-0.5" /> Collect Rent
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-between w-full">
                                    <span className="text-[11px] font-medium text-gray-500 bg-gray-50 px-2 py-0.5 rounded-md flex items-center">
                                      Payment Date: Day {dueDay} {MONTH_NAMES[selectedMonth]}
                                    </span>
                                    <button onClick={() => handleOpenCollectRent(resident, room.roomNumber, floor.floorNumber)} className="text-xs font-medium text-blue-600 hover:bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                                      Pre-pay
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <button onClick={() => openResidentModal(floor.id, room.id)} className="w-full text-xs font-semibold text-blue-600 hover:bg-blue-50 py-2 border border-dashed border-blue-200 rounded-xl mt-3 flex items-center justify-center">
                      <Plus size={14} className="mr-1" /> Add Resident
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* QUICK COLLECT RENT MODAL */}
      <BaseModal isOpen={modalType === 'COLLECT_RENT'} onClose={() => setModalType(null)} title="Collect Rent & Issue Receipt">
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
                <input required type="number" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-base font-bold" value={collectRentForm.amount} onChange={e => setCollectRentForm({ ...collectRentForm, amount: Number(e.target.value) })} />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Payment Method</label>
                <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white" value={collectRentForm.paymentMethod} onChange={e => setCollectRentForm({ ...collectRentForm, paymentMethod: e.target.value })}>
                  <option value="UPI">UPI (GPay / PhonePe / Paytm)</option>
                  <option value="Cash">Cash</option>
                  <option value="Google Pay">Google Pay</option>
                  <option value="PhonePe">PhonePe</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Payment Date</label>
              <input required type="date" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" value={collectRentForm.date} onChange={e => setCollectRentForm({ ...collectRentForm, date: e.target.value })} />
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t">
              <Button type="button" variant="ghost" onClick={() => setModalType(null)}>Cancel</Button>
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 font-bold">✓ Issue Receipt</Button>
            </div>
          </form>
        )}
      </BaseModal>

      {/* STRICT PAYMENT DUE ALERTS MODAL: ONLY RESIDENTS WHOSE PAYMENT DATE HAS ARRIVED! */}
      <BaseModal 
        isOpen={modalType === 'DUE_REMINDERS'} 
        onClose={() => setModalType(null)} 
        title={`🚨 Payment Due Alerts (${dueNowCount}) - ${MONTH_NAMES[selectedMonth]} ${selectedYear}`}
      >
        <div className="space-y-4">
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-3">
            <p className="text-xs text-rose-800 leading-relaxed font-medium">
              Below are <b>ONLY</b> the residents whose payment date has arrived (on or before Day {currentDay} of {MONTH_NAMES[selectedMonth]}) and have not paid yet. Tomorrow at midnight, next day's residents will automatically be added.
            </p>
          </div>

          {dueNowResidents.length === 0 ? (
            <div className="text-center py-10">
              <CheckCircle className="mx-auto text-emerald-500 mb-2" size={40} />
              <h4 className="text-base font-bold text-gray-900">No Pending Payments!</h4>
              <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                All residents whose payment date is on or before Day {currentDay} have successfully paid. Residents with future dates will appear only when their day arrives.
              </p>
            </div>
          ) : (
            <div className="max-h-[60vh] overflow-y-auto space-y-3 pr-1">
              {dueNowResidents.map(item => (
                <div key={item.resident.id} className="p-3.5 rounded-xl border border-rose-200 bg-white shadow-xs hover:border-rose-400 transition-all">
                  
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <h4 className="font-bold text-gray-900 text-sm truncate">{item.resident.name}</h4>
                        <span className="text-xs font-extrabold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded">
                          ₹{item.resident.rentAmount.toLocaleString('en-IN')} Due
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Room {item.roomNumber} ({item.floorNumber}) • {item.resident.mobile}
                      </p>
                      <p className="text-[11px] font-bold text-rose-600 mt-0.5">
                        Payment Date: Day {item.dueDay} of month {item.dueDay === currentDay ? '• (DUE TODAY!)' : '• (OVERDUE)'}
                      </p>
                    </div>

                    <div className="flex items-center space-x-1 shrink-0">
                      <button 
                        onClick={() => handleCall(item.resident.mobile)} 
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" 
                        title="Call"
                      >
                        <Phone size={15} />
                      </button>
                      <button 
                        onClick={() => sendPaymentReminder(item.resident.mobile, item.resident.name, item.resident.rentAmount)} 
                        className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors" 
                        title="WhatsApp Reminder"
                      >
                        <Share2 size={15} />
                      </button>
                      
                      {/* EDIT RESIDENT BUTTON (If due day was set wrong, changing it to a future day removes them immediately!) */}
                      <button 
                        onClick={() => {
                          setModalType(null);
                          openResidentModal(item.floorId, item.roomId, item.resident);
                        }} 
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" 
                        title="Edit Details or Change Due Date"
                      >
                        <Edit2 size={15} />
                      </button>

                      {/* DELETE RESIDENT BUTTON */}
                      <button 
                        onClick={() => {
                          setDeleteTarget({
                            type: 'RESIDENT',
                            id: item.resident.id,
                            name: item.resident.name,
                            message: `Are you sure you want to permanently delete resident "${item.resident.name}"?`
                          });
                        }} 
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors" 
                        title="Delete Resident"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  {/* Action Buttons: 1-Click Mark Paid or Collect & Receipt */}
                  <div className="mt-2.5 pt-2 border-t border-gray-100 flex items-center justify-end space-x-2">
                    <button 
                      onClick={() => handleQuickMarkAsPaid(item.resident, item.roomNumber)} 
                      className="text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg transition-colors flex items-center shadow-2xs"
                      title="1-Click: Mark paid and remove immediately from alerts"
                    >
                      <Check size={13} className="mr-1" /> Mark Paid
                    </button>
                    <button 
                      onClick={() => { 
                        setModalType(null); 
                        handleOpenCollectRent(item.resident, item.roomNumber, item.floorNumber); 
                      }} 
                      className="text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg transition-colors flex items-center shadow-2xs"
                    >
                      <IndianRupee size={13} className="mr-0.5" /> Issue Receipt
                    </button>
                  </div>

                </div>
              ))}
            </div>
          )}

          <Button variant="secondary" onClick={() => setModalType(null)} className="w-full font-bold">Close</Button>
        </div>
      </BaseModal>

      {/* RESIDENT PAYMENT HISTORY MODAL */}
      <BaseModal isOpen={modalType === 'RESIDENT_HISTORY'} onClose={() => setModalType(null)} title={`📜 Payment History`}>
        <div className="space-y-4">
          {activeResidentHistory.length === 0 ? (
            <div className="text-center py-6 text-gray-500 text-xs">No receipts issued for this resident yet.</div>
          ) : (
            <div className="max-h-[60vh] overflow-y-auto space-y-2.5 pr-1">
              {activeResidentHistory.map(rec => (
                <div key={rec.id} className="p-3 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-sm font-bold text-gray-900">₹{rec.amount.toLocaleString('en-IN')}</span>
                    <p className="text-xs text-gray-600 mt-0.5">Date: {new Date(rec.date).toLocaleDateString('en-GB')}</p>
                  </div>
                  <button onClick={() => setViewingReceipt(rec)} className="text-xs text-blue-600 font-bold px-2 py-1 bg-white border rounded-lg">View Receipt</button>
                </div>
              ))}
            </div>
          )}
          <Button variant="secondary" onClick={() => setModalType(null)} className="w-full">Close</Button>
        </div>
      </BaseModal>

      {/* ADD/EDIT RESIDENT MODAL WITH PROMINENT PAYMENT DUE DAY FIELD */}
      <BaseModal isOpen={modalType === 'RESIDENT_MODAL'} onClose={() => setModalType(null)} title={selectedResidentId ? "Edit Resident Details" : "Add New Resident"}>
        <form onSubmit={handleSaveResident} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Full Name</label>
            <input required type="text" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="e.g. Ramesh Reddy" value={residentForm.name} onChange={e => setResidentForm({ ...residentForm, name: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Mobile Number</label>
              <input required type="tel" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="10-digit number" value={residentForm.mobile} onChange={e => setResidentForm({ ...residentForm, mobile: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Monthly Rent (₹)</label>
              <input required type="number" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-bold" placeholder="e.g. 6000" value={residentForm.rent} onChange={e => setResidentForm({ ...residentForm, rent: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Joining Date</label>
              <input required type="date" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" value={residentForm.joiningDate} onChange={e => setResidentForm({ ...residentForm, joiningDate: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-bold text-blue-700 uppercase mb-1">
                Rent Payment Day (1-31) *
              </label>
              <input 
                required 
                type="number" 
                min="1" 
                max="31" 
                className="w-full border-2 border-blue-400 bg-blue-50/30 rounded-lg px-3 py-2 text-sm font-extrabold text-blue-900" 
                placeholder="e.g. 5" 
                value={residentForm.dueDay} 
                onChange={e => setResidentForm({ ...residentForm, dueDay: e.target.value })} 
              />
              <span className="text-[10px] text-blue-600 mt-0.5 block font-medium">
                Rent alert will trigger ONLY on this day each month.
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
          setFloors(prev => [...prev, { id: Date.now().toString(), floorNumber: floorName.trim(), rooms: [] }]);
          setFloorName('');
          setModalType(null);
        }} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Floor Name or Number</label>
            <input required autoFocus type="text" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="e.g. 1st Floor" value={floorName} onChange={e => setFloorName(e.target.value)} />
          </div>
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="ghost" onClick={() => setModalType(null)}>Cancel</Button>
            <Button type="submit">Add Floor</Button>
          </div>
        </form>
      </BaseModal>

      {/* EDIT FLOOR MODAL (Rename) */}
      <BaseModal isOpen={modalType === 'EDIT_FLOOR'} onClose={() => setModalType(null)} title="Rename Floor">
        <form onSubmit={(e) => {
          e.preventDefault();
          if (!floorName.trim() || !selectedFloorId) return;
          setFloors(prev => prev.map(f => f.id === selectedFloorId ? { ...f, floorNumber: floorName.trim() } : f));
          setFloorName('');
          setModalType(null);
        }} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Floor Name or Number</label>
            <input required autoFocus type="text" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" value={floorName} onChange={e => setFloorName(e.target.value)} />
          </div>
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="ghost" onClick={() => setModalType(null)}>Cancel</Button>
            <Button type="submit">Save Changes</Button>
          </div>
        </form>
      </BaseModal>

      {/* ADD ROOM MODAL */}
      <BaseModal isOpen={modalType === 'ADD_ROOM'} onClose={() => setModalType(null)} title="New Room">
        <form onSubmit={(e) => {
          e.preventDefault();
          if (!roomNumber.trim() || !selectedFloorId) return;
          setFloors(prev => prev.map(floor => floor.id === selectedFloorId ? { ...floor, rooms: [...floor.rooms, { id: Date.now().toString(), roomNumber: roomNumber.trim(), residents: [] }] } : floor));
          setRoomNumber('');
          setModalType(null);
        }} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Room Number</label>
            <input required autoFocus type="text" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="e.g. 101" value={roomNumber} onChange={e => setRoomNumber(e.target.value)} />
          </div>
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="ghost" onClick={() => setModalType(null)}>Cancel</Button>
            <Button type="submit">Add Room</Button>
          </div>
        </form>
      </BaseModal>

      {/* EDIT ROOM MODAL (Rename Room) */}
      <BaseModal isOpen={modalType === 'EDIT_ROOM'} onClose={() => setModalType(null)} title="Edit Room Number">
        <form onSubmit={(e) => {
          e.preventDefault();
          if (!roomNumber.trim() || !selectedFloorId || !selectedRoomId) return;
          setFloors(prev => prev.map(floor => {
            if (floor.id === selectedFloorId) {
              return {
                ...floor,
                rooms: floor.rooms.map(room => room.id === selectedRoomId ? { ...room, roomNumber: roomNumber.trim() } : room)
              };
            }
            return floor;
          }));
          setRoomNumber('');
          setModalType(null);
        }} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Room Number</label>
            <input required autoFocus type="text" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" value={roomNumber} onChange={e => setRoomNumber(e.target.value)} />
          </div>
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="ghost" onClick={() => setModalType(null)}>Cancel</Button>
            <Button type="submit">Save Changes</Button>
          </div>
        </form>
      </BaseModal>

      {/* GUARANTEED IN-APP DELETE CONFIRMATION MODAL */}
      {deleteTarget && (
        <BaseModal isOpen={true} onClose={() => setDeleteTarget(null)} title="Confirm Deletion">
          <div className="space-y-4">
            <div className="bg-red-50 p-4 rounded-xl border border-red-200 flex items-start space-x-3">
              <div className="p-2 bg-red-100 text-red-600 rounded-lg shrink-0">
                <Trash2 size={24} />
              </div>
              <div>
                <h4 className="font-bold text-gray-900 text-base">
                  Delete {deleteTarget.type === 'FLOOR' ? 'Floor' : deleteTarget.type === 'ROOM' ? 'Room' : 'Resident'}?
                </h4>
                <p className="text-sm font-extrabold text-red-700 mt-1">"{deleteTarget.name}"</p>
                <p className="text-xs text-gray-600 mt-1.5 leading-relaxed">
                  {deleteTarget.message || 'This action cannot be undone. Are you sure you want to permanently delete this?'}
                </p>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t">
              <Button variant="secondary" onClick={() => setDeleteTarget(null)}>
                Cancel
              </Button>
              <Button 
                variant="danger" 
                onClick={executeDelete} 
                className="bg-red-600 hover:bg-red-700 text-white font-bold"
              >
                Yes, Delete Permanently
              </Button>
            </div>
          </div>
        </BaseModal>
      )}

      {/* RECEIPT VIEW / PRINT / SHARE MODAL */}
      {viewingReceipt && (
        <ReceiptModal receipt={viewingReceipt} onClose={() => setViewingReceipt(null)} settings={settings} />
      )}
    </div>
  );
};
