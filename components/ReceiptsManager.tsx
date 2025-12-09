import React, { useState } from 'react';
import { Receipt } from '../types';
import { Button } from './Button';
import { ReceiptModal } from './ReceiptModal';
import { BaseModal } from './BaseModal';
import { Printer, Trash2, Edit2, Plus, Search } from 'lucide-react';

interface ReceiptsManagerProps {
  receipts: Receipt[];
  setReceipts: React.Dispatch<React.SetStateAction<Receipt[]>>;
}

export const ReceiptsManager: React.FC<ReceiptsManagerProps> = ({ receipts, setReceipts }) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  const [viewReceipt, setViewReceipt] = useState<Receipt | null>(null);
  const [search, setSearch] = useState("");

  // Form State
  const [formData, setFormData] = useState<Partial<Receipt>>({
    residentName: '',
    roomNumber: '',
    mobileNumber: '',
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  const openForm = (receipt?: Receipt) => {
    if (receipt) {
      setFormData(receipt);
      setSelectedReceipt(receipt);
    } else {
      setFormData({
        residentName: '',
        roomNumber: '',
        mobileNumber: '',
        amount: 0,
        date: new Date().toISOString().split('T')[0],
        notes: ''
      });
      setSelectedReceipt(null);
    }
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setSelectedReceipt(null);
  };

  const handleDeleteClick = (id: string) => {
    if (confirm("Are you sure you want to delete this receipt permanently?")) {
      setReceipts(prev => prev.filter(r => r.id !== id));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (selectedReceipt) {
      // Edit Mode
      setReceipts(prev => prev.map(r => r.id === selectedReceipt.id ? { ...formData, id: selectedReceipt.id } as Receipt : r));
    } else {
      // Create Mode
      const newReceipt: Receipt = {
        ...formData as Receipt,
        id: Date.now().toString(),
      };
      setReceipts(prev => [newReceipt, ...prev]);
    }

    closeForm();
  };

  const filteredReceipts = receipts.filter(r => 
    r.residentName.toLowerCase().includes(search.toLowerCase()) ||
    r.roomNumber.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-xl font-semibold text-gray-800">Payment Receipts</h2>
        <Button onClick={() => openForm()}>
          <Plus size={16} className="mr-2" /> Issue Receipt
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search size={16} className="text-gray-400" />
        </div>
        <input
          type="text"
          placeholder="Search by name or room..."
          className="pl-10 w-full md:w-80 border border-gray-300 rounded-md py-2 px-3 text-sm focus:ring-blue-500 focus:border-blue-500"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Resident</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Room</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredReceipts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">No receipts found.</td>
                </tr>
              ) : (
                filteredReceipts.map((receipt) => (
                  <tr key={receipt.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(receipt.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{receipt.residentName}</div>
                      <div className="text-xs text-gray-500">{receipt.mobileNumber}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {receipt.roomNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                      ₹{receipt.amount.toLocaleString('en-IN')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <button 
                          onClick={() => setViewReceipt(receipt)}
                          className="text-gray-400 hover:text-blue-600"
                          title="Print"
                        >
                          <Printer size={18} />
                        </button>
                        <button 
                          onClick={() => openForm(receipt)}
                          className="text-gray-400 hover:text-green-600"
                          title="Edit"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button 
                          onClick={() => handleDeleteClick(receipt.id)}
                          className="text-gray-400 hover:text-red-600"
                          title="Delete"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      <BaseModal
        isOpen={isFormOpen}
        onClose={closeForm}
        title={selectedReceipt ? 'Edit Receipt' : 'New Receipt'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Resident Name</label>
            <input 
              required
              type="text" 
              className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              value={formData.residentName}
              onChange={e => setFormData({...formData, residentName: e.target.value})}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Room Number</label>
              <input 
                required
                type="text" 
                className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                value={formData.roomNumber}
                onChange={e => setFormData({...formData, roomNumber: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Number</label>
              <input 
                required
                type="tel" 
                className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                value={formData.mobileNumber}
                onChange={e => setFormData({...formData, mobileNumber: e.target.value})}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹)</label>
              <input 
                required
                type="number" 
                className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                value={formData.amount}
                onChange={e => setFormData({...formData, amount: Number(e.target.value)})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input 
                required
                type="date" 
                className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                value={formData.date}
                onChange={e => setFormData({...formData, date: e.target.value})}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
            <textarea 
              rows={2}
              className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
              value={formData.notes || ''}
              onChange={e => setFormData({...formData, notes: e.target.value})}
            />
          </div>
          <div className="flex justify-end space-x-3 mt-4">
            <Button type="button" variant="ghost" onClick={closeForm}>Cancel</Button>
            <Button type="submit">{selectedReceipt ? 'Update Receipt' : 'Save Receipt'}</Button>
          </div>
        </form>
      </BaseModal>

      {/* Print Preview Modal */}
      {viewReceipt && (
        <ReceiptModal 
          receipt={viewReceipt} 
          onClose={() => setViewReceipt(null)} 
        />
      )}
    </div>
  );
};