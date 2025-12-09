import React, { useState } from 'react';
import { Floor, Resident } from '../types';
import { Button } from './Button';
import { BaseModal } from './BaseModal';
import { Plus, Trash2, User, Home, Layers, ChevronDown, ChevronRight, UserPlus, Phone, Edit2 } from 'lucide-react';

interface DashboardProps {
  floors: Floor[];
  setFloors: React.Dispatch<React.SetStateAction<Floor[]>>;
}

type ModalType = 'ADD_FLOOR' | 'ADD_ROOM' | 'RESIDENT_MODAL';

export const Dashboard: React.FC<DashboardProps> = ({ floors, setFloors }) => {
  const [expandedFloors, setExpandedFloors] = useState<Set<string>>(new Set());
  
  // Modal State
  const [modalType, setModalType] = useState<ModalType | null>(null);
  const [selectedFloorId, setSelectedFloorId] = useState<string | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [selectedResidentId, setSelectedResidentId] = useState<string | null>(null);

  // Form State
  const [floorName, setFloorName] = useState('');
  const [roomNumber, setRoomNumber] = useState('');
  const [residentForm, setResidentForm] = useState({ name: '', mobile: '', rent: '' });

  // Stats
  const totalRooms = floors.reduce((acc, floor) => acc + floor.rooms.length, 0);
  const totalResidents = floors.reduce((acc, floor) => 
    acc + floor.rooms.reduce((rAcc, room) => rAcc + room.residents.length, 0), 0
  );

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
      // Edit Mode
      setResidentForm({
        name: resident.name,
        mobile: resident.mobile,
        rent: resident.rentAmount ? resident.rentAmount.toString() : ''
      });
      setSelectedResidentId(resident.id);
    } else {
      // Add Mode
      setResidentForm({ name: '', mobile: '', rent: '' });
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
                        rentAmount: parseFloat(residentForm.rent) || 0
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
                  rentAmount: parseFloat(residentForm.rent) || 0
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

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 flex items-center space-x-4">
          <div className="p-3 bg-blue-100 rounded-full text-blue-600">
            <Layers size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500">Total Floors</p>
            <p className="text-2xl font-bold text-gray-800">{floors.length}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 flex items-center space-x-4">
          <div className="p-3 bg-green-100 rounded-full text-green-600">
            <Home size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500">Total Rooms</p>
            <p className="text-2xl font-bold text-gray-800">{totalRooms}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 flex items-center space-x-4">
          <div className="p-3 bg-purple-100 rounded-full text-purple-600">
            <User size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500">Total Residents</p>
            <p className="text-2xl font-bold text-gray-800">{totalResidents}</p>
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-800">Structure Overview</h2>
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
                              {resident.mobile && <p className="text-[10px] text-gray-500">{resident.mobile}</p>}
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rent Amount</label>
              <input 
                type="number" 
                className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                value={residentForm.rent}
                onChange={e => setResidentForm({...residentForm, rent: e.target.value})}
              />
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