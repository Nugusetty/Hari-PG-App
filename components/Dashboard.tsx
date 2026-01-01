import React, { useState, useEffect } from 'react';
import { Floor, Resident, Receipt } from '../types';
import { Button } from './Button';
import { BaseModal } from './BaseModal';
import { Plus, Trash2, ChevronDown, ChevronRight, Edit2, Calendar, CheckCircle, Bell, Share2, Eye, } from 'lucide-react';

interface DashboardProps {
  floors: Floor[];
  setFloors: React.Dispatch<React.SetStateAction<Floor[]>>;
  receipts: Receipt[];
}

type ModalType = 'ADD_FLOOR' | 'ADD_ROOM' | 'RESIDENT_MODAL' | 'DUE_REMINDERS';

export const Dashboard: React.FC<DashboardProps> = ({ floors, setFloors, receipts }) => {
  const [expandedFloors, setExpandedFloors] = useState<Set<string>>(new Set());
  const [modalType, setModalType] = useState<ModalType | null>(null);

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
    lastPaidDate?: string,
    dueDate: Date
  }[] = [];

  floors.forEach(floor => {
    floor.rooms.forEach(room => {
      room.residents.forEach(resident => {
        const residentReceipts = receipts.filter(r =>
          r.residentName.trim().toLowerCase() === resident.name.trim().toLowerCase()
        );

        residentReceipts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        const lastReceipt = residentReceipts[0];

        let nextDueDate: Date;
        if (lastReceipt) {
          const lastPaidDate = new Date(lastReceipt.date);
          nextDueDate = new Date(lastPaidDate);
          nextDueDate.setMonth(lastPaidDate.getMonth() + 1);
        } else if (resident.joiningDate) {
          nextDueDate = new Date(resident.joiningDate);
        } else {
          nextDueDate = new Date();
        }
        nextDueDate.setHours(0, 0, 0, 0);

        const dateToken = nextDueDate.toDateString();
        if (dismissedAlerts[resident.id] === dateToken) return;

        // STRICT LOGIC: Only show alert if the due date is TODAY or in the PAST.
        const isPastOrToday = nextDueDate <= today;

        if (isPastOrToday) {
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

  const sendPaymentReminder = (mobile: string, name: string, dueDate: Date) => {
    const formattedDate = dueDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });
    const text = `Hello ${name}, your rent for this month (due on ${formattedDate}) is pending. Please process the payment at your earliest. Thank you!`;
    window.open(`https://wa.me/91${mobile.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-lg font-semibold text-gray-800 flex items-center">
            <Calendar size={20} className="mr-2 text-blue-600" />
            Payment Status: {monthNames[currentMonth]} {currentYear}
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

          <div className="bg-red-50 p-3 rounded-md border border-red-100 flex flex-col justify-between h-24 relative">
            <div className="flex justify-between items-start">
              <p className="text-xs text-red-600 uppercase font-semibold flex items-center">Today's Alerts</p>
              <button onClick={() => setModalType('DUE_REMINDERS')} className="text-red-400 hover:text-red-600"><Eye size={16} /></button>
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

      <div className="flex justify-between items-center mt-8">
        <h2 className="text-xl font-semibold text-gray-800">Management</h2>
        <Button onClick={() => setModalType('ADD_FLOOR')} size="sm"><Plus size={16} className="mr-2" /> Add Floor</Button>
      </div>

      <div className="space-y-4">
        {floors.map(floor => (
          <div key={floor.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-gray-50 p-4 flex items-center justify-between cursor-pointer" onClick={() => toggleFloor(floor.id)}>
              <div className="flex items-center space-x-2">
                {expandedFloors.has(floor.id) ? <ChevronDown size={20} className="text-gray-500" /> : <ChevronRight size={20} className="text-gray-500" />}
                <h3 className="font-semibold text-lg text-gray-800 uppercase">{floor.floorNumber}</h3>
              </div>
              <div className="flex items-center space-x-2">
                <Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); setSelectedFloorId(floor.id); setRoomNumber(''); setModalType('ADD_ROOM'); }}>+ Room</Button>
                <Button size="sm" variant="ghost" className="text-red-500" onClick={(e) => { e.stopPropagation(); if (confirm("Delete Floor?")) setFloors(floors.filter(f => f.id !== floor.id)); }}><Trash2 size={16} /></Button>
              </div>
            </div>

            {expandedFloors.has(floor.id) && (
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 bg-white">
                {floor.rooms.map(room => (
                  <div key={room.id} className="border border-gray-200 rounded-md p-3">
                    <div className="flex justify-between items-center mb-2 pb-2 border-b border-gray-100">
                      <span className="font-bold text-gray-700">Room {room.roomNumber}</span>
                      <button onClick={() => { if (confirm("Delete Room?")) setFloors(floors.map(f => f.id === floor.id ? { ...f, rooms: f.rooms.filter(r => r.id !== room.id) } : f)); }} className="text-gray-300 hover:text-red-500"><Trash2 size={14} /></button>
                    </div>
                    <div className="space-y-2">
                      {room.residents.map(resident => (
                        <div key={resident.id} className="flex justify-between items-center text-xs bg-gray-50 p-2 rounded">
                          <div className="truncate flex-1">
                            <p className="font-bold text-gray-800 truncate">{resident.name}</p>
                            <p className="text-[10px] text-gray-500">{resident.mobile}</p>
                            {resident.joiningDate && (
                              <p className="text-[9px] text-blue-500 font-medium mt-0.5">Joined: {new Date(resident.joiningDate).toLocaleDateString('en-GB')}</p>
                            )}
                          </div>
                          <div className="flex space-x-1">
                            <button onClick={() => openResidentModal(floor.id, room.id, resident)} className="p-1 text-blue-500"><Edit2 size={14} /></button>
                            <button onClick={() => deleteResident(floor.id, room.id, resident.id)} className="p-1 text-red-300"><Trash2 size={14} /></button>
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
      </div>

      <BaseModal isOpen={modalType === 'DUE_REMINDERS'} onClose={() => setModalType(null)} title="🔔 Rent Alerts">
        <div className="space-y-4">
          <p className="text-xs text-gray-500 font-medium px-1">Payments due as of today:</p>
          {unpaidResidentsList.length === 0 ? (
            <div className="text-center py-8"><CheckCircle className="mx-auto text-green-500 mb-2" size={32} /><p className="text-gray-500">No pending payments for today.</p></div>
          ) : (
            <div className="max-h-[60vh] overflow-y-auto space-y-3 px-1">
              {unpaidResidentsList.map(res => (
                <div key={res.id} className="p-4 rounded-xl border bg-white border-gray-200 shadow-sm flex items-center justify-between group hover:border-blue-200 transition-all">
                  <div className="flex-1">
                    <h4 className="font-bold text-gray-900 text-base">{res.name}</h4>
                    <p className="text-xs text-gray-500 flex items-center mt-1">
                      Room {res.room} • Due: <span className={`ml-1 font-bold ${res.dueDate < today ? 'text-red-600' : 'text-blue-600'}`}>
                        {res.dueDate.toLocaleDateString('en-GB')}
                      </span>
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => { if (confirm("Dismiss this alert?")) setDismissedAlerts({ ...dismissedAlerts, [res.id]: res.dueDate.toDateString() }); }}
                      className="px-3 py-1.5 text-xs font-bold text-gray-400 border border-gray-200 rounded-lg hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all flex items-center"
                    >
                      Remove
                    </button>
                    <button
                      onClick={() => sendPaymentReminder(res.mobile, res.name, res.dueDate)}
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