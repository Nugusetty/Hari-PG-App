import React, { useState, useEffect } from 'react';
import { Floor, Resident, Receipt } from '../types';
import { Button } from './Button';
import { BaseModal } from './BaseModal';
import { Plus, Trash2, User, Home, ChevronDown, ChevronRight, UserPlus, Phone, Edit2, Calendar, CheckCircle, XCircle, AlertCircle, Share2, Eye, EyeOff, Clock, Bell, CheckSquare, MessageCircle } from 'lucide-react';

interface DashboardProps {
  floors: Floor[];
  setFloors: React.Dispatch<React.SetStateAction<Floor[]>>;
  receipts: Receipt[];
  setReceipts: React.Dispatch<React.SetStateAction<Receipt[]>>;
}

type ModalType = 'ADD_FLOOR' | 'ADD_ROOM' | 'RESIDENT_MODAL' | 'DUE_REMINDERS';

export const Dashboard: React.FC<DashboardProps> = ({ floors, setFloors, receipts, setReceipts }) => {
  const [expandedFloors, setExpandedFloors] = useState<Set<string>>(new Set());
  const [showUnpaidList, setShowUnpaidList] = useState(false);
  
  // Modal State
  const [modalType, setModalType] = useState<ModalType | null>(null);
  const [selectedFloorId, setSelectedFloorId] = useState<string | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [selectedResidentId, setSelectedResidentId] = useState<string | null>(null);

  // Form State
  const [floorName, setFloorName] = useState('');
  const [roomNumber, setRoomNumber] = useState('');
  const [residentForm, setResidentForm] = useState({ name: '', mobile: '', rent: '', joiningDate: '' });

  // --- Stats Calculation Logic ---
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  let paidCount = 0;
  
  // We need to calculate status for every resident
  const unpaidResidentsList: {
    id: string,
    floorId: string,
    roomId: string,
    name: string, 
    room: string, 
    amount: number, 
    mobile: string, 
    lastPaidDate?: string,
    dueDate: Date
  }[] = [];
  
  floors.forEach(floor => {
    floor.rooms.forEach(room => {
      room.residents.forEach(resident => {
        // 1. Find all receipts for this resident
        const residentReceipts = receipts.filter(r => 
          r.residentName.trim().toLowerCase() === resident.name.trim().toLowerCase()
        );

        // 2. Sort by date descending (newest first)
        residentReceipts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        const lastReceipt = residentReceipts[0];

        // 3. Check if paid CURRENT month (Optional check, mainly for stats)
        const hasPaidThisMonth = residentReceipts.some(r => {
           const rDate = new Date(r.date);
           return rDate.getMonth() === currentMonth && rDate.getFullYear() === currentYear;
        });
        
        if (hasPaidThisMonth) {
           paidCount++;
        }

        // --- NEW DUE DATE LOGIC ---
        // Requirement: 
        // 1. If Paid Dec 15 -> Due Jan 15.
        // 2. If Added Dec 1 -> Due Jan 1 (Assuming paid on Dec 1).
        
        let nextDueDate: Date;

        if (lastReceipt) {
          // If they have paid before, the next due date is exactly 1 month after the last payment date.
          const lastPaidDate = new Date(lastReceipt.date);
          nextDueDate = new Date(lastPaidDate);
          nextDueDate.setMonth(lastPaidDate.getMonth() + 1);
        } else {
          // If they have NEVER paid, the due date is their joining date (entry date).
          // If they joined today, they owe today.
          if (resident.joiningDate) {
            nextDueDate = new Date(resident.joiningDate);
          } else {
            nextDueDate = new Date(); // Fallback to today
          }
        }

        // Check if the calculated due date has arrived or passed
        // We compare the dates at midnight to avoid time discrepancies
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const dueCheck = new Date(nextDueDate);
        dueCheck.setHours(0, 0, 0, 0);

        // Logic: 
        // If hasPaidThisMonth is true, they are effectively "safe" for the calendar month usually, 
        // BUT strict "30 day" cycle means we rely solely on nextDueDate.
        // If nextDueDate <= today, they show up in the list.
        
        if (dueCheck <= today) {
           // We ensure we don't double count if hasPaidThisMonth is true but the calculation differs.
           // However, if they paid on the 1st, and today is the 2nd of next month, hasPaidThisMonth (current calendar month) might be false.
           // The most robust way is strictly: Is Today >= NextDueDate?
           
           // One edge case: If I paid on Jan 2nd (for Jan), and today is Jan 25th.
           // Next due is Feb 2nd. Feb 2nd > Jan 25th. Not due yet.
           
           unpaidResidentsList.push({
             id: resident.id,
             floorId: floor.id,
             roomId: room.id,
             name: resident.name,
             room: room.roomNumber,
             amount: resident.rentAmount,
             mobile: resident.mobile,
             lastPaidDate: lastReceipt ? lastReceipt.date : undefined,
             dueDate: nextDueDate
           });
        }
      });
    });
  });

  // Sort unpaid list: Oldest due dates first (most urgent)
  unpaidResidentsList.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());

  const totalRooms = floors.reduce((acc, floor) => acc + floor.rooms.length, 0);
  const totalResidents = floors.reduce((acc, floor) => 
    acc + floor.rooms.reduce((rAcc, room) => rAcc + room.residents.length, 0), 0
  );
  
  const unpaidCount = unpaidResidentsList.length;
  const paidPercentage = totalResidents > 0 ? Math.round((paidCount / totalResidents) * 100) : 0;
  const unpaidPercentage = totalResidents > 0 ? Math.round((unpaidCount / totalResidents) * 100) : 0;

  // --- Automatic Popup Logic ---
  // Check if there are any dues when component mounts
  useEffect(() => {
    // Only show if there are unpaid residents
    if (unpaidResidentsList.length > 0) {
      // Check if we haven't shown it this session to avoid annoyance
      const hasShown = sessionStorage.getItem('hasShownDueModal');
      if (!hasShown) {
        setModalType('DUE_REMINDERS');
        sessionStorage.setItem('hasShownDueModal', 'true');
      }
    }
  }, [unpaidResidentsList.length]);

  const toggleFloor = (floorId: string) => {
    const newExpanded = new Set(expandedFloors);
    if (newExpanded.has(floorId)) {
      newExpanded.delete(floorId);
    } else {
      newExpanded.add(floorId);
    }
    setExpandedFloors(newExpanded);
  };

  // --- Handlers for opening Modals ---

  const openAddFloor = () => {
    setFloorName('');
    setModalType('ADD_FLOOR');
  };

  const openAddRoom = (floorId: string) => {
    setSelectedFloorId(floorId);
    setRoomNumber('');
    setModalType('ADD_ROOM');
  };

  const openResidentModal = (floorId: string, roomId: string, resident?: Resident) => {
    setSelectedFloorId(floorId);
    setSelectedRoomId(roomId);
    
    if (resident) {
      setResidentForm({
        name: resident.name,
        mobile: resident.mobile,
        rent: resident.rentAmount ? resident.rentAmount.toString() : '',
        joiningDate: resident.joiningDate || new Date().toISOString().split('T')[0]
      });
      setSelectedResidentId(resident.id);
    } else {
      setResidentForm({ 
        name: '', 
        mobile: '', 
        rent: '', 
        joiningDate: new Date().toISOString().split('T')[0] 
      });
      setSelectedResidentId(null);
    }
    
    setModalType('RESIDENT_MODAL');
  };

  const closeModal = () => {
    setModalType(null);
    setSelectedFloorId(null);
    setSelectedRoomId(null);
    setSelectedResidentId(null);
  };

  // --- Actions ---

  const handleAddFloor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!floorName.trim()) return;
    
    const newFloor: Floor = {
      id: Date.now().toString(),
      floorNumber: floorName,
      rooms: []
    };
    setFloors([...floors, newFloor]);
    setExpandedFloors(new Set(expandedFloors).add(newFloor.id));
    closeModal();
  };

  const handleAddRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomNumber.trim() || !selectedFloorId) return;

    setFloors(floors.map(floor => {
      if (floor.id === selectedFloorId) {
        return {
          ...floor,
          rooms: [...floor.rooms, { id: Date.now().toString(), roomNumber, residents: [] }]
        };
      }
      return floor;
    }));
    closeModal();
  };

  const handleSaveResident = (e: React.FormEvent) => {
    e.preventDefault();
    if (!residentForm.name.trim() || !selectedFloorId || !selectedRoomId) return;
    
    setFloors(floors.map(floor => {
      if (floor.id === selectedFloorId) {
        return {
          ...floor,
          rooms: floor.rooms.map(room => {
            if (room.id === selectedRoomId) {
              if (selectedResidentId) {
                // Update existing resident
                return {
                  ...room,
                  residents: room.residents.map(res => 
                    res.id === selectedResidentId 
                    ? {
                        ...res,
                        name: residentForm.name,
                        mobile: residentForm.mobile,
                        rentAmount: parseFloat(residentForm.rent) || 0,
                        joiningDate: residentForm.joiningDate
                      }
                    : res
                  )
                };
              } else {
                // Add new resident
                const newResident: Resident = {
                  id: Date.now().toString(),
                  name: residentForm.name,
                  mobile: residentForm.mobile,
                  rentAmount: parseFloat(residentForm.rent) || 0,
                  joiningDate: residentForm.joiningDate
                };
                return {
                  ...room,
                  residents: [...room.residents, newResident]
                };
              }
            }
            return room;
          })
        };
      }
      return floor;
    }));
    closeModal();
  };

  const deleteFloor = (floorId: string) => {
    if (confirm("Are you sure you want to delete this floor and all its rooms/residents?")) {
      setFloors(floors.filter(f => f.id !== floorId));
    }
  };

  const deleteRoom = (floorId: string, roomId: string) => {
    if (confirm("Delete this room?")) {
      setFloors(floors.map(floor => {
        if (floor.id === floorId) {
          return {
            ...floor,
            rooms: floor.rooms.filter(r => r.id !== roomId)
          };
        }
        return floor;
      }));
    }
  };

  const deleteResident = (floorId: string, roomId: string, residentId: string) => {
    if (confirm("Remove this resident?")) {
      setFloors(floors.map(floor => {
        if (floor.id === floorId) {
          return {
            ...floor,
            rooms: floor.rooms.map(room => {
              if (room.id === roomId) {
                return {
                  ...room,
                  residents: room.residents.filter(res => res.id !== residentId)
                };
              }
              return room;
            })
          };
        }
        return floor;
      }));
    }
  };

  // UPDATED: Reminder text for WhatsApp
  const sendPaymentReminder = (mobile: string, name: string, dueDate: Date) => {
    const formattedDate = dueDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    // Text requested: "Your due date has passed. Please pay the rent."
    // WhatsApp format often needs to be conversational
    const text = `Hello ${name}, your rent due date ${formattedDate} has passed. Please pay the rent.`;
    window.open(`https://wa.me/91${mobile.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`, '_blank');
  };

  // NEW: Handle "Paid" action
  const handleMarkPaid = (resident: typeof unpaidResidentsList[0]) => {
     if (!confirm(`Mark rent as PAID for ${resident.name}? This will create a receipt for ₹${resident.amount}.`)) {
       return;
     }

     const newReceipt: Receipt = {
        id: Date.now().toString(),
        residentName: resident.name,
        roomNumber: resident.room,
        mobileNumber: resident.mobile,
        amount: resident.amount,
        date: new Date().toISOString().split('T')[0],
        paymentMethod: 'Cash', 
        notes: 'Marked as Paid from Dashboard Alert'
     };
     
     setReceipts(prev => [newReceipt, ...prev]);
  };

  return (
    <div className="space-y-6">
      
      {/* Payment Stats Header */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-lg font-semibold text-gray-800 flex items-center">
            <Calendar size={20} className="mr-2 text-blue-600" />
            Payment Status: {monthNames[currentMonth]} {currentYear}
          </h2>
          {/* Notification Bell */}
          <button 
            onClick={() => setModalType('DUE_REMINDERS')}
            className="relative p-2 text-gray-500 hover:text-blue-600 transition-colors"
            title="View Upcoming Dues"
          >
            <Bell size={22} />
            {unpaidCount > 0 && (
              <span className="absolute top-0 right-0 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-red-100 transform translate-x-1/4 -translate-y-1/4 bg-red-600 rounded-full">
                {unpaidCount}
              </span>
            )}
          </button>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 p-3 rounded-md border border-blue-100">
            <p className="text-xs text-blue-600 uppercase font-semibold">Total Residents</p>
            <p className="text-2xl font-bold text-gray-800">{totalResidents}</p>
          </div>
          
          <div className="bg-green-50 p-3 rounded-md border border-green-100">
            <p className="text-xs text-green-600 uppercase font-semibold flex items-center">
              <CheckCircle size={12} className="mr-1" /> Paid
            </p>
            <div className="flex items-baseline space-x-2">
              <p className="text-2xl font-bold text-gray-800">{paidCount}</p>
              <span className="text-xs text-green-600 font-medium">({paidPercentage}%)</span>
            </div>
          </div>

          <div className="bg-red-50 p-3 rounded-md border border-red-100 cursor-pointer hover:bg-red-100 transition-colors" onClick={() => setShowUnpaidList(!showUnpaidList)}>
             <div className="flex justify-between items-start">
              <div>
                <p className="text-xs text-red-600 uppercase font-semibold flex items-center">
                  <XCircle size={12} className="mr-1" /> Not Paid
                </p>
                <div className="flex items-baseline space-x-2">
                  <p className="text-2xl font-bold text-gray-800">{unpaidCount}</p>
                  <span className="text-xs text-red-600 font-medium">({unpaidPercentage}%)</span>
                </div>
              </div>
              {showUnpaidList ? <EyeOff size={16} className="text-red-400" /> : <Eye size={16} className="text-red-400" />}
             </div>
          </div>

          <div className="bg-gray-50 p-3 rounded-md border border-gray-100">
             <p className="text-xs text-gray-500 uppercase font-semibold">Total Rooms</p>
             <p className="text-2xl font-bold text-gray-800">{totalRooms}</p>
          </div>
        </div>

        {/* Unpaid List Collapsible */}
        {showUnpaidList && unpaidResidentsList.length > 0 && (
          <div className="mt-4 border-t pt-4 animate-in slide-in-from-top-2">
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
              <AlertCircle size={16} className="mr-2 text-red-500" /> Pending Payments
            </h3>
            <div className="bg-gray-50 rounded-md border border-gray-200 overflow-hidden">
               <div className="max-h-60 overflow-y-auto">
                 <table className="min-w-full divide-y divide-gray-200">
                   <thead className="bg-gray-100">
                     <tr>
                       <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Name</th>
                       <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Room</th>
                       <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Due Date</th>
                       <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Action</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-200">
                     {unpaidResidentsList.map((res) => {
                       const isOverdue = new Date() >= res.dueDate;
                       return (
                       <tr key={res.id} className={isOverdue ? "bg-red-50" : ""}>
                         <td className="px-4 py-2 text-sm text-gray-900 font-medium">{res.name}</td>
                         <td className="px-4 py-2 text-sm text-gray-600">{res.room}</td>
                         <td className="px-4 py-2 text-sm">
                           <div className="flex items-center">
                              {isOverdue && <Clock size={12} className="text-red-500 mr-1" />}
                              <span className={isOverdue ? "text-red-600 font-bold" : "text-gray-600"}>
                                {res.dueDate.toLocaleDateString()}
                              </span>
                           </div>
                         </td>
                         <td className="px-4 py-2 text-right">
                           {res.mobile && (
                             <button 
                               onClick={() => sendPaymentReminder(res.mobile, res.name, res.dueDate)}
                               className="text-white bg-green-600 hover:bg-green-700 px-2 py-1 rounded text-xs font-medium flex items-center justify-center ml-auto transition-colors"
                             >
                               <Share2 size={12} className="mr-1" /> WhatsApp
                             </button>
                           )}
                         </td>
                       </tr>
                     )})}
                   </tbody>
                 </table>
               </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-between items-center mt-8">
        <h2 className="text-xl font-semibold text-gray-800">Room Management</h2>
        <Button onClick={openAddFloor} size="sm">
          <Plus size={16} className="mr-2" /> Add Floor
        </Button>
      </div>

      <div className="space-y-4">
        {floors.length === 0 && (
          <div className="text-center py-10 bg-white rounded-lg border border-dashed border-gray-300">
            <p className="text-gray-500">No floors added yet. Click "Add Floor" to start.</p>
          </div>
        )}

        {floors.map(floor => (
          <div key={floor.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div 
              className="bg-gray-50 p-4 flex items-center justify-between cursor-pointer select-none"
              onClick={() => toggleFloor(floor.id)}
            >
              <div className="flex items-center space-x-2">
                {expandedFloors.has(floor.id) ? <ChevronDown size={20} className="text-gray-500" /> : <ChevronRight size={20} className="text-gray-500" />}
                <h3 className="font-semibold text-lg text-gray-800">{floor.floorNumber}</h3>
                <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">
                  {floor.rooms.length} Rooms
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <Button 
                  size="sm" 
                  variant="secondary" 
                  onClick={(e) => { e.stopPropagation(); openAddRoom(floor.id); }}
                >
                  <Plus size={14} className="mr-1" /> Room
                </Button>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="text-red-500 hover:bg-red-50 hover:text-red-600"
                  onClick={(e) => { e.stopPropagation(); deleteFloor(floor.id); }}
                >
                  <Trash2 size={16} />
                </Button>
              </div>
            </div>

            {expandedFloors.has(floor.id) && (
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 bg-white">
                {floor.rooms.length === 0 && (
                  <p className="col-span-full text-center text-sm text-gray-400 py-4">No rooms on this floor.</p>
                )}
                
                {floor.rooms.map(room => (
                  <div key={room.id} className="border border-gray-200 rounded-md p-3 relative hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-2 pb-2 border-b border-gray-100">
                      <div className="flex items-center">
                        <Home size={16} className="text-blue-500 mr-2" />
                        <span className="font-medium text-gray-700">Room {room.roomNumber}</span>
                      </div>
                      <button 
                        onClick={() => deleteRoom(floor.id, room.id)}
                        className="text-gray-400 hover:text-red-500"
                        title="Delete Room"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    <div className="space-y-2 min-h-[60px]">
                      {room.residents.length === 0 && (
                        <p className="text-xs text-gray-400 italic">Vacant</p>
                      )}
                      {room.residents.map(resident => (
                        <div key={resident.id} className="flex justify-between items-center text-sm bg-gray-50 p-2 rounded group">
                          <div className="flex items-center overflow-hidden flex-1 mr-2">
                            <User size={12} className="text-gray-400 mr-2 flex-shrink-0" />
                            <div className="truncate">
                              <p className="font-medium text-gray-800 truncate" title={resident.name}>{resident.name}</p>
                              <div className="flex flex-col">
                                {resident.mobile && <p className="text-[10px] text-gray-500">{resident.mobile}</p>}
                                {resident.joiningDate && (
                                  <p className="text-[10px] text-blue-600 flex items-center mt-0.5">
                                    <span className='opacity-75 mr-1'>Entry:</span> {new Date(resident.joiningDate).toLocaleDateString()}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-1 opacity-100">
                             {resident.mobile && (
                                <a 
                                  href={`tel:${resident.mobile}`}
                                  className="p-1.5 text-green-500 hover:bg-green-50 rounded-full transition-colors"
                                  title="Call"
                                >
                                  <Phone size={14} />
                                </a>
                             )}
                             <button 
                                onClick={() => openResidentModal(floor.id, room.id, resident)}
                                className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-full transition-colors"
                                title="Edit"
                             >
                                <Edit2 size={14} />
                             </button>
                             <button 
                                onClick={() => deleteResident(floor.id, room.id, resident.id)}
                                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                                title="Delete"
                             >
                                <Trash2 size={14} />
                             </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-3 pt-2 border-t border-gray-50">
                      <button 
                        onClick={() => openResidentModal(floor.id, room.id)}
                        className="w-full text-xs flex items-center justify-center text-blue-600 hover:text-blue-800 py-1"
                      >
                        <UserPlus size={12} className="mr-1" /> Add Person
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* --- Modals --- */}

      {/* RENT REMINDERS POPUP */}
      <BaseModal 
        isOpen={modalType === 'DUE_REMINDERS'} 
        onClose={() => setModalType(null)} 
        title="🔔 Due Date Alerts"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600 mb-2">
            The following residents have rent due.
          </p>
          
          {unpaidResidentsList.length === 0 ? (
            <div className="text-center py-8 bg-green-50 rounded border border-green-100">
               <CheckCircle className="mx-auto text-green-500 mb-2" size={32} />
               <p className="text-green-800 font-medium">All clear! No pending payments.</p>
            </div>
          ) : (
            <div className="max-h-[60vh] overflow-y-auto space-y-3">
              {unpaidResidentsList.map(res => {
                 const isOverdue = new Date() >= res.dueDate;
                 const formattedDate = res.dueDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
                 
                 return (
                  <div key={res.id} className={`p-3 rounded border ${isOverdue ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'} shadow-sm`}>
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-bold text-gray-800">{res.name}</h4>
                        <p className="text-xs text-gray-500">Room {res.room} • ₹{res.amount}</p>
                      </div>
                      <div className="text-right">
                         <span className={`text-xs font-bold px-2 py-1 rounded ${isOverdue ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                           Due: {formattedDate}
                         </span>
                      </div>
                    </div>
                    {isOverdue && (
                      <p className="text-xs text-red-600 font-medium mb-3 bg-red-100 p-1 rounded text-center">
                        Your due date has passed. Please pay the rent.
                      </p>
                    )}
                    
                    {/* ACTION BUTTONS */}
                    <div className="grid grid-cols-2 gap-3 mt-2">
                       <Button 
                         size="sm" 
                         variant="danger"
                         className="flex items-center justify-center text-xs"
                         onClick={() => deleteResident(res.floorId, res.roomId, res.id)}
                       >
                         <Trash2 size={14} className="mr-1" /> Delete
                       </Button>

                       {res.mobile ? (
                        <Button 
                          size="sm" 
                          className="flex items-center justify-center bg-green-600 hover:bg-green-700 text-white text-xs"
                          onClick={() => sendPaymentReminder(res.mobile, res.name, res.dueDate)}
                        >
                          <Share2 size={14} className="mr-1" /> Share
                        </Button>
                       ) : (
                        <Button size="sm" variant="secondary" disabled className="text-xs opacity-50">
                          No #
                        </Button>
                       )}
                    </div>

                  </div>
                 );
              })}
            </div>
          )}
          
          <div className="pt-2 border-t flex justify-end">
            <Button variant="secondary" onClick={() => setModalType(null)}>Close</Button>
          </div>
        </div>
      </BaseModal>
      
      <BaseModal 
        isOpen={modalType === 'ADD_FLOOR'} 
        onClose={closeModal} 
        title="Add New Floor"
      >
        <form onSubmit={handleAddFloor}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Floor Name</label>
            <input 
              autoFocus
              type="text" 
              placeholder="e.g. Ground Floor, 2nd Floor"
              className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              value={floorName}
              onChange={e => setFloorName(e.target.value)}
            />
          </div>
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="ghost" onClick={closeModal}>Cancel</Button>
            <Button type="submit">Add Floor</Button>
          </div>
        </form>
      </BaseModal>

      <BaseModal 
        isOpen={modalType === 'ADD_ROOM'} 
        onClose={closeModal} 
        title="Add New Room"
      >
        <form onSubmit={handleAddRoom}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Room Number</label>
            <input 
              autoFocus
              type="text" 
              placeholder="e.g. 101, A2"
              className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              value={roomNumber}
              onChange={e => setRoomNumber(e.target.value)}
            />
          </div>
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="ghost" onClick={closeModal}>Cancel</Button>
            <Button type="submit">Add Room</Button>
          </div>
        </form>
      </BaseModal>

      <BaseModal 
        isOpen={modalType === 'RESIDENT_MODAL'} 
        onClose={closeModal} 
        title={selectedResidentId ? 'Edit Resident' : 'Add Resident'}
      >
        <form onSubmit={handleSaveResident}>
          <div className="space-y-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input 
                autoFocus
                required
                type="text" 
                className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                value={residentForm.name}
                onChange={e => setResidentForm({...residentForm, name: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mobile</label>
              <input 
                type="tel" 
                className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                value={residentForm.mobile}
                onChange={e => setResidentForm({...residentForm, mobile: e.target.value})}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rent Amount</label>
                <input 
                  type="number" 
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  value={residentForm.rent}
                  onChange={e => setResidentForm({...residentForm, rent: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date of Entry</label>
                <div className="relative">
                  <input 
                    type="date" 
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    value={residentForm.joiningDate}
                    onChange={e => setResidentForm({...residentForm, joiningDate: e.target.value})}
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <Calendar size={14} className="text-gray-400" />
                  </div>
                </div>
              </div>
            </div>

          </div>
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="ghost" onClick={closeModal}>Cancel</Button>
            <Button type="submit">{selectedResidentId ? 'Save Changes' : 'Add Resident'}</Button>
          </div>
        </form>
      </BaseModal>

    </div>
  );
};
