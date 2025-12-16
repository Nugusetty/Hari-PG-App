import React, { useState } from 'react';
import { Floor, Resident, Receipt } from '../types';
import { Button } from './Button';
import { BaseModal } from './BaseModal';
import { Plus, Trash2, User, Home, ChevronDown, ChevronRight, UserPlus, Phone, Edit2, Calendar, CheckCircle, Bell, Share2, XCircle, Eye } from 'lucide-react';

interface DashboardProps {
  floors: Floor[];
  setFloors: React.Dispatch<React.SetStateAction<Floor[]>>;
  receipts: Receipt[];
}

type ModalType = 'ADD_FLOOR' | 'ADD_ROOM' | 'RESIDENT_MODAL' | 'DUE_REMINDERS';

export const Dashboard: React.FC<DashboardProps> = ({ floors, setFloors, receipts }) => {
  const [expandedFloors, setExpandedFloors] = useState<Set<string>>(new Set());
  
  // Modal State initialized to null so it doesn't open automatically
  const [modalType, setModalType] = useState<ModalType | null>(null);
  
  const [selectedFloorId, setSelectedFloorId] = useState<string | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [selectedResidentId, setSelectedResidentId] = useState<string | null>(null);

  // State to track dismissed alerts (so they are removed from popup but residents remain in rooms)
  const [dismissedResidentIds, setDismissedResidentIds] = useState<Set<string>>(new Set());

  // Form State
  const [floorName, setFloorName] = useState('');
  const [roomNumber, setRoomNumber] = useState('');
  const [residentForm, setResidentForm] = useState({ name: '', mobile: '', rent: '', joiningDate: '' });

  // --- Stats Calculation Logic ---
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  // Calculate unpaid residents dynamically
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
        // Skip if this alert has been dismissed for this session
        if (dismissedResidentIds.has(resident.id)) return;

        // 1. Find all receipts for this resident
        const residentReceipts = receipts.filter(r => 
          r.residentName.trim().toLowerCase() === resident.name.trim().toLowerCase()
        );

        // 2. Sort by date descending (newest first)
        residentReceipts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        const lastReceipt = residentReceipts[0];

        // --- DUE DATE LOGIC ---
        let nextDueDate: Date;

        if (lastReceipt) {
          // If paid before, due date is 1 month after last payment
          const lastPaidDate = new Date(lastReceipt.date);
          nextDueDate = new Date(lastPaidDate);
          nextDueDate.setMonth(lastPaidDate.getMonth() + 1);
        } else {
          // If never paid, due date is joining date (or today if missing)
          if (resident.joiningDate) {
            nextDueDate = new Date(resident.joiningDate);
          } else {
            nextDueDate = new Date();
          }
        }

        // Compare dates (ignoring time)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const dueCheck = new Date(nextDueDate);
        dueCheck.setHours(0, 0, 0, 0);

        // If due date is today or passed, add to unpaid list
        if (dueCheck <= today) {
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

  // Sort unpaid list: Oldest due dates first
  unpaidResidentsList.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());

  const totalRooms = floors.reduce((acc, floor) => acc + floor.rooms.length, 0);
  const totalResidents = floors.reduce((acc, floor) => 
    acc + floor.rooms.reduce((rAcc, room) => rAcc + room.residents.length, 0), 0
  );
  
  const unpaidCount = unpaidResidentsList.length;
  const paidCount = Math.max(0, totalResidents - unpaidCount);
  
  const paidPercentage = totalResidents > 0 ? Math.round((paidCount / totalResidents) * 100) : 0;
  const unpaidPercentage = totalResidents > 0 ? Math.round((unpaidCount / totalResidents) * 100) : 0;

  const toggleFloor = (floorId: string) => {
    const newExpanded = new Set(expandedFloors);
    if (newExpanded.has(floorId)) {
      newExpanded.delete(floorId);
    } else {
      newExpanded.add(floorId);
    }
    setExpandedFloors(newExpanded);
  };

  // --- Handlers ---

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
                // Update
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
                // Add
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

  // Only removes the alert from the popup view
  const handleDismissAlert = (residentId: string) => {
    if (confirm("Remove this due date alert? The resident will remain in the room.")) {
      setDismissedResidentIds(prev => {
        const newSet = new Set(prev);
        newSet.add(residentId);
        return newSet;
      });
    }
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

  const sendPaymentReminder = (mobile: string, name: string, dueDate: Date) => {
    const formattedDate = dueDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    const text = `Hello ${name}, your rent due date ${formattedDate} has passed. Please pay the rent.`;
    window.open(`https://wa.me/91${mobile.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`, '_blank');
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
          {/* Notification Bell - Opens 'DUE_REMINDERS' on click */}
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
        
        {/* Stats Cards - Matches Screenshot */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* 1. Total Residents (Blue) */}
          <div className="bg-blue-50 p-3 rounded-md border border-blue-100 flex flex-col justify-between h-24">
            <p className="text-xs text-blue-600 uppercase font-semibold">Total Residents</p>
            <p className="text-3xl font-bold text-gray-800">{totalResidents}</p>
          </div>

          {/* 2. Paid (Green) */}
          <div className="bg-green-50 p-3 rounded-md border border-green-100 flex flex-col justify-between h-24">
             <div className="flex justify-between items-start">
               <p className="text-xs text-green-600 uppercase font-semibold flex items-center">
                 <CheckCircle size={14} className="mr-1" /> Paid
               </p>
             </div>
             <div>
               <span className="text-3xl font-bold text-gray-800">{paidCount}</span>
               <span className="text-sm text-green-600 ml-2">({paidPercentage}%)</span>
             </div>
          </div>

          {/* 3. Not Paid (Red) */}
          <div className="bg-red-50 p-3 rounded-md border border-red-100 flex flex-col justify-between h-24 relative">
             <div className="flex justify-between items-start">
               <p className="text-xs text-red-600 uppercase font-semibold flex items-center">
                 <XCircle size={14} className="mr-1" /> Not Paid
               </p>
               <button onClick={() => setModalType('DUE_REMINDERS')} className="text-red-400 hover:text-red-600">
                  <Eye size={16} />
               </button>
             </div>
             <div>
               <span className="text-3xl font-bold text-gray-800">{unpaidCount}</span>
               <span className="text-sm text-red-600 ml-2">({unpaidPercentage}%)</span>
             </div>
          </div>

          {/* 4. Total Rooms (Gray) */}
          <div className="bg-gray-50 p-3 rounded-md border border-gray-200 flex flex-col justify-between h-24">
             <p className="text-xs text-gray-500 uppercase font-semibold">Total Rooms</p>
             <p className="text-3xl font-bold text-gray-800">{totalRooms}</p>
          </div>
        </div>
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
                    
                    {/* ACTION BUTTONS: DELETE and SHARE only. */}
                    <div className="grid grid-cols-2 gap-3 mt-2">
                       {/* REMOVE BUTTON - dismisses alert only */}
                       <Button 
                         size="sm" 
                         variant="danger"
                         className="flex items-center justify-center text-xs"
                         onClick={() => handleDismissAlert(res.id)}
                       >
                         <Trash2 size={14} className="mr-1" /> Remove
                       </Button>

                       {/* SHARE BUTTON */}
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
      
      {/* OTHER MODALS (Add Floor, Add Room, Resident) */}
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