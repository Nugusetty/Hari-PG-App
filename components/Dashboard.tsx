
import React, { useState, useEffect } from 'react';
import { Floor, Resident, Receipt } from '../types';
import { Button } from './Button';
import { BaseModal } from './BaseModal';
import { Plus, Trash2, ChevronDown, ChevronRight, Edit2, Calendar, CheckCircle, Bell, Share2, Eye, X, Phone, Search, MessageCircle } from 'lucide-react';

interface DashboardProps {
  floors: Floor[];
  setFloors: React.Dispatch<React.SetStateAction<Floor[]>>;
  receipts: Receipt[];
}

type ModalType = 'ADD_FLOOR' | 'ADD_ROOM' | 'RESIDENT_MODAL' | 'DUE_REMINDERS';

export const Dashboard: React.FC<DashboardProps> = ({ floors, setFloors, receipts }) => {
  const [expandedFloors, setExpandedFloors] = useState<Set<string>>(new Set());
  const [modalType, setModalType] = useState<ModalType | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [selectedFloorId, setSelectedFloorId] = useState<string | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [selectedResidentId, setSelectedResidentId] = useState<string | null>(null);

  const [dismissedAlerts, setDismissedAlerts] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem('hari_pg_v3_dismissed_alerts');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    localStorage.setItem('hari_pg_v3_dismissed_alerts', JSON.stringify(dismissedAlerts));
  }, [dismissedAlerts]);

  const [floorName, setFloorName] = useState('');
  const [roomNumber, setRoomNumber] = useState('');
  const [residentForm, setResidentForm] = useState({ name: '', mobile: '', rent: '', joiningDate: '' });

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  const unpaidResidentsList: {
    id: string,
    floorId: string,
    roomId: string,
    name: string,
    room: string,
    amount: number,
    mobile: string,
    dueDate: Date,
    dueMonthName: string
  }[] = [];

  floors.forEach(floor => {
    floor.rooms.forEach(room => {
      room.residents.forEach(resident => {
        const residentReceipts = receipts.filter(r =>
          r.residentName.trim().toLowerCase() === resident.name.trim().toLowerCase()
        );

        let checkDate = resident.joiningDate ? new Date(resident.joiningDate) : new Date();
        checkDate.setHours(0, 0, 0, 0);

        let foundUnpaid = false;
        const maxSafetyIterations = 48;
        let iterations = 0;

        while (!foundUnpaid && iterations < maxSafetyIterations) {
          iterations++;
          const hasReceiptForMonth = residentReceipts.some(receipt => {
            const rDate = new Date(receipt.date);
            return rDate.getMonth() === checkDate.getMonth() && rDate.getFullYear() === checkDate.getFullYear();
          });

          if (!hasReceiptForMonth) {
            if (checkDate <= today) {
              const dateToken = checkDate.toDateString();
              if (dismissedAlerts[resident.id] !== dateToken) {
                unpaidResidentsList.push({
                  id: resident.id,
                  floorId: floor.id,
                  roomId: room.id,
                  name: resident.name,
                  room: room.roomNumber,
                  amount: resident.rentAmount,
                  mobile: resident.mobile,
                  dueDate: new Date(checkDate),
                  dueMonthName: `${monthNames[checkDate.getMonth()]} ${checkDate.getFullYear()}`
                });
              }
            }
            foundUnpaid = true;
          } else {
            checkDate.setMonth(checkDate.getMonth() + 1);
            if (checkDate > today) break;
          }
        }
      });
    });
  });

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
    newExpanded.has(floorId) ? newExpanded.delete(floorId) : newExpanded.add(floorId);
    setExpandedFloors(newExpanded);
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
      setResidentForm({ name: '', mobile: '', rent: '', joiningDate: new Date().toISOString().split('T')[0] });
      setSelectedResidentId(null);
    }
    setModalType('RESIDENT_MODAL');
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
                return {
                  ...room,
                  residents: room.residents.map(res =>
                    res.id === selectedResidentId
                      ? { ...res, name: residentForm.name, mobile: residentForm.mobile, rentAmount: parseFloat(residentForm.rent) || 0, joiningDate: residentForm.joiningDate }
                      : res
                  )
                };
              } else {
                return {
                  ...room,
                  residents: [...room.residents, { id: Date.now().toString(), name: residentForm.name, mobile: residentForm.mobile, rentAmount: parseFloat(residentForm.rent) || 0, joiningDate: residentForm.joiningDate }]
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

  const deleteResident = (floorId: string, roomId: string, residentId: string) => {
    if (!confirm("Are you sure you want to remove this resident?")) return;
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
      alert("No valid mobile number provided.");
    }
  };

  const handleWhatsApp = (mobile: string, name: string) => {
    const cleanMobile = mobile.replace(/\D/g, '');
    if (cleanMobile) {
      const text = `Hello ${name}, this is from Hari PG Management.`;
      window.open(`https://wa.me/91${cleanMobile}?text=${encodeURIComponent(text)}`, '_blank');
    } else {
      alert("No valid mobile number provided.");
    }
  };

  const sendPaymentReminder = (mobile: string, name: string, dueDate: Date, monthName: string) => {
    const text = `Hello ${name}, your rent for ${monthName} (due since ${dueDate.toLocaleDateString('en-GB')}) is pending. Please process the payment at your earliest. Thank you!`;
    window.open(`https://wa.me/91${mobile.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`, '_blank');
  };

  // Filter Logic for Floors and Rooms based on Search Term
  const filteredFloors = floors.map(floor => {
    const filteredRooms = floor.rooms.filter(room => {
      const matchesRoom = room.roomNumber.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesResident = room.residents.some(res => res.name.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchesRoom || matchesResident;
    });
    return { ...floor, rooms: filteredRooms };
  }).filter(floor => floor.rooms.length > 0 || floor.floorNumber.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-lg font-semibold text-gray-800 flex items-center">
            <Calendar size={20} className="mr-2 text-blue-600" />
            Rent Tracker: {monthNames[currentMonth]} {currentYear}
          </h2>
          <button onClick={() => setModalType('DUE_REMINDERS')} className="relative p-2 text-gray-500 hover:text-blue-600 transition-colors">
            <Bell size={22} />
            {unpaidCount > 0 && (
              <span className="absolute top-0 right-0 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-red-100 transform translate-x-1/4 -translate-y-1/4 bg-red-600 rounded-full">
                {unpaidCount}
              </span>
            )}
          </button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <div className="bg-blue-50 p-3 rounded-md border border-blue-100 flex flex-col justify-between h-24">
            <p className="text-xs text-blue-600 uppercase font-semibold">Total Residents</p>
            <p className="text-3xl font-bold text-gray-800">{totalResidents}</p>
          </div>

          <div className="bg-green-50 p-3 rounded-md border border-green-100 flex flex-col justify-between h-24">
            <p className="text-xs text-green-600 uppercase font-semibold flex items-center"><CheckCircle size={14} className="mr-1" /> Paid</p>
            <div>
              <span className="text-3xl font-bold text-gray-800">{paidCount}</span>
              <span className="text-sm text-green-600 ml-2">({paidPercentage}%)</span>
            </div>
          </div>

          <div className="bg-red-50 p-3 rounded-md border border-red-100 flex flex-col justify-between h-24 relative cursor-pointer" onClick={() => setModalType('DUE_REMINDERS')}>
            <div className="flex justify-between items-start">
              <p className="text-xs text-red-600 uppercase font-semibold flex items-center">Pending Alerts</p>
              <Eye size={16} className="text-red-400" />
            </div>
            <div>
              <span className="text-3xl font-bold text-gray-800">{unpaidCount}</span>
              <span className="text-sm text-red-600 ml-2">({unpaidPercentage}%)</span>
            </div>
          </div>

          <div className="bg-gray-50 p-3 rounded-md border border-gray-200 flex flex-col justify-between h-24">
            <p className="text-xs text-gray-500 uppercase font-semibold">Total Rooms</p>
            <p className="text-3xl font-bold text-gray-800">{totalRooms}</p>
          </div>
        </div>
      </div>

      {/* Global Search Bar */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search size={18} className="text-gray-400" />
        </div>
        <input
          type="text"
          placeholder="Search Room Number or Resident Name..."
          className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm transition-all"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        {searchTerm && (
          <button onClick={() => setSearchTerm('')} className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600">
            <X size={16} />
          </button>
        )}
      </div>

      <div className="flex justify-between items-center mt-8">
        <h2 className="text-xl font-semibold text-gray-800">Management</h2>
        <Button onClick={() => setModalType('ADD_FLOOR')} size="sm"><Plus size={16} className="mr-2" /> Add Floor</Button>
      </div>

      <div className="space-y-4">
        {filteredFloors.map(floor => (
          <div key={floor.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-gray-50 p-4 flex items-center justify-between cursor-pointer" onClick={() => toggleFloor(floor.id)}>
              <div className="flex items-center space-x-2">
                {(expandedFloors.has(floor.id) || searchTerm) ? <ChevronDown size={20} className="text-gray-500" /> : <ChevronRight size={20} className="text-gray-500" />}
                <h3 className="font-semibold text-lg text-gray-800 uppercase">{floor.floorNumber}</h3>
              </div>
              <div className="flex items-center space-x-2">
                <Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); setSelectedFloorId(floor.id); setRoomNumber(''); setModalType('ADD_ROOM'); }}>+ Room</Button>
                <Button size="sm" variant="ghost" className="text-red-500" onClick={(e) => { e.stopPropagation(); if (confirm("Delete Floor?")) setFloors(floors.filter(f => f.id !== floor.id)); }}><Trash2 size={16} /></Button>
              </div>
            </div>

            {(expandedFloors.has(floor.id) || searchTerm) && (
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 bg-white">
                {floor.rooms.map(room => (
                  <div key={room.id} className="border border-gray-200 rounded-md p-3">
                    <div className="flex justify-between items-center mb-2 pb-2 border-b border-gray-100">
                      <span className="font-bold text-gray-700">Room {room.roomNumber}</span>
                      <button onClick={() => { if (confirm("Delete Room?")) setFloors(floors.map(f => f.id === floor.id ? { ...f, rooms: f.rooms.filter(r => r.id !== room.id) } : f)); }} className="text-gray-300 hover:text-red-500"><Trash2 size={14} /></button>
                    </div>
                    <div className="space-y-2">
                      {room.residents.map(resident => (
                        <div key={resident.id} className="flex justify-between items-center text-xs bg-gray-50 p-2 rounded shadow-sm border border-gray-100">
                          <div className="truncate flex-1">
                            <p className="font-bold text-gray-800 truncate">{resident.name}</p>
                            <p className="text-[10px] text-gray-500">{resident.mobile}</p>
                            {resident.joiningDate && (
                              <p className="text-[9px] text-blue-500 font-medium mt-0.5">Joined: {new Date(resident.joiningDate).toLocaleDateString('en-GB')}</p>
                            )}
                          </div>
                          <div className="flex space-x-0.5 items-center">
                            <button
                              onClick={() => handleCall(resident.mobile)}
                              className="p-1.5 text-green-600 hover:bg-green-50 rounded-full transition-colors"
                              title="Call Resident"
                            >
                              <Phone size={16} />
                            </button>
                            <button
                              onClick={() => handleWhatsApp(resident.mobile, resident.name)}
                              className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-full transition-colors"
                              title="WhatsApp Resident"
                            >
                              <MessageCircle size={16} />
                            </button>
                            <button
                              onClick={() => openResidentModal(floor.id, room.id, resident)}
                              className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-full transition-colors"
                              title="Edit Info"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={() => deleteResident(floor.id, room.id, resident.id)}
                              className="p-1.5 text-red-400 hover:bg-red-50 rounded-full transition-colors"
                              title="Remove Resident"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                      <button onClick={() => openResidentModal(floor.id, room.id)} className="w-full text-[10px] flex items-center justify-center text-blue-600 hover:bg-blue-50 py-1 border border-dashed rounded mt-2">+ Resident</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
        {filteredFloors.length === 0 && searchTerm && (
          <div className="text-center py-10 bg-white rounded-lg border border-dashed">
            <p className="text-gray-500">No rooms or residents found matching "{searchTerm}"</p>
          </div>
        )}
      </div>

      <BaseModal isOpen={modalType === 'DUE_REMINDERS'} onClose={() => setModalType(null)} title="🔔 Rent Alerts (Auto-Calculated)">
        <div className="space-y-4">
          <p className="text-xs text-gray-500 font-medium px-1">The system automatically detects missing rent months:</p>
          {unpaidResidentsList.length === 0 ? (
            <div className="text-center py-8"><CheckCircle className="mx-auto text-green-500 mb-2" size={32} /><p className="text-gray-500">All residents are up to date!</p></div>
          ) : (
            <div className="max-h-[60vh] overflow-y-auto space-y-3 px-1">
              {unpaidResidentsList.map(res => (
                <div key={res.id} className="p-4 rounded-xl border bg-white border-gray-200 shadow-sm flex items-center justify-between group hover:border-blue-200 transition-all">
                  <div className="flex-1">
                    <h4 className="font-bold text-gray-900 text-base">{res.name}</h4>
                    <p className="text-xs text-red-600 font-bold uppercase tracking-tighter mt-0.5">{res.dueMonthName} Rent Pending</p>
                    <p className="text-[10px] text-gray-500 flex items-center mt-1">
                      Room {res.room} • Due: {res.dueDate.toLocaleDateString('en-GB')}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => { if (confirm("Dismiss this alert for this month?")) setDismissedAlerts({ ...dismissedAlerts, [res.id]: res.dueDate.toDateString() }); }}
                      className="px-3 py-1.5 text-xs font-bold text-gray-400 border border-gray-200 rounded-lg hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all flex items-center"
                    >
                      Remove
                    </button>
                    <button
                      onClick={() => handleCall(res.mobile)}
                      className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm transition-all flex items-center justify-center"
                      title="Call Resident"
                    >
                      <Phone size={18} />
                    </button>
                    <button
                      onClick={() => sendPaymentReminder(res.mobile, res.name, res.dueDate, res.dueMonthName)}
                      className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 shadow-sm transition-all flex items-center justify-center"
                      title="Share Reminder"
                    >
                      <Share2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <Button variant="secondary" onClick={() => setModalType(null)} className="w-full mt-2 py-3 font-bold rounded-xl">Close</Button>
        </div>
      </BaseModal>

      <BaseModal isOpen={modalType === 'ADD_FLOOR'} onClose={() => setModalType(null)} title="New Floor">
        <div className="space-y-4">
          <input autoFocus placeholder="e.g. Ground Floor" className="w-full border p-2 rounded text-sm" value={floorName} onChange={e => setFloorName(e.target.value)} />
          <Button className="w-full" onClick={() => { if (floorName) setFloors([...floors, { id: Date.now().toString(), floorNumber: floorName, rooms: [] }]); setModalType(null); }}>Create Floor</Button>
        </div>
      </BaseModal>

      <BaseModal isOpen={modalType === 'ADD_ROOM'} onClose={() => setModalType(null)} title="New Room">
        <div className="space-y-4">
          <input autoFocus placeholder="e.g. 101" className="w-full border p-2 rounded text-sm" value={roomNumber} onChange={e => setRoomNumber(e.target.value)} />
          <Button className="w-full" onClick={() => { if (roomNumber && selectedFloorId) setFloors(floors.map(f => f.id === selectedFloorId ? { ...f, rooms: [...f.rooms, { id: Date.now().toString(), roomNumber, residents: [] }] } : f)); setModalType(null); }}>Create Room</Button>
        </div>
      </BaseModal>

      <BaseModal isOpen={modalType === 'RESIDENT_MODAL'} onClose={() => setModalType(null)} title={selectedResidentId ? "Edit" : "Add Resident"}>
        <form onSubmit={handleSaveResident} className="space-y-3">
          <input required placeholder="Name" className="w-full border p-2 rounded text-sm" value={residentForm.name} onChange={e => setResidentForm({ ...residentForm, name: e.target.value })} />
          <input placeholder="Mobile" className="w-full border p-2 rounded text-sm" value={residentForm.mobile} onChange={e => setResidentForm({ ...residentForm, mobile: e.target.value })} />
          <div className="grid grid-cols-2 gap-2">
            <input type="number" placeholder="Rent ₹" className="w-full border p-2 rounded text-sm" value={residentForm.rent} onChange={e => setResidentForm({ ...residentForm, rent: e.target.value })} />
            <input type="date" className="w-full border p-2 rounded text-sm" value={residentForm.joiningDate} onChange={e => setResidentForm({ ...residentForm, joiningDate: e.target.value })} />
          </div>
          <Button type="submit" className="w-full">Save Resident</Button>
        </form>
      </BaseModal>
    </div>
  );
};
