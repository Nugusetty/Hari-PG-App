import React, { useState } from 'react';
import { Receipt, AppSettings } from '../types';
import { Button } from './Button';
import { ReceiptModal } from './ReceiptModal';
import { BaseModal } from './BaseModal';
import { Trash2, Edit2, Plus, Search, Share2, Calculator } from 'lucide-react';

interface ReceiptsManagerProps {
  receipts: Receipt[];
  setReceipts: React.Dispatch<React.SetStateAction<Receipt[]>>;
  settings: AppSettings;
}

export const ReceiptsManager: React.FC<ReceiptsManagerProps> = ({ receipts, setReceipts, settings }) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  const [viewReceipt, setViewReceipt] = useState<Receipt | null>(null);
  const [receiptToDelete, setReceiptToDelete] = useState<Receipt | null>(null);
  const [search, setSearch] = useState("");
  const [selectedMonthFilter, setSelectedMonthFilter] = useState<string>("ALL");

  const [formData, setFormData] = useState<Partial<Receipt>>({
    residentName: '',
    roomNumber: '',
    mobileNumber: '',
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    forMonth: new Date().toISOString().slice(0, 7),
    paymentMethod: 'UPI',
    notes: ''
  });

  const openForm = (receipt?: Receipt) => {
    if (receipt) {
      setFormData({
        ...receipt,
        amount: Number(receipt.amount) || 0,
        forMonth: receipt.forMonth || receipt.date.slice(0, 7),
        paymentMethod: receipt.paymentMethod || 'UPI'
      });
      setSelectedReceipt(receipt);
    } else {
      setFormData({
        residentName: '',
        roomNumber: '',
        mobileNumber: '',
        amount: 0,
        date: new Date().toISOString().split('T')[0],
        forMonth: new Date().toISOString().slice(0, 7),
        paymentMethod: 'UPI',
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

  const executeDeleteReceipt = () => {
    if (!receiptToDelete) return;
    setReceipts(prev => prev.filter(r => r.id !== receiptToDelete.id));
    setReceiptToDelete(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanAmount = Number(formData.amount) || 0;
    const cleanReceiptData: Receipt = {
      ...(formData as Receipt),
      amount: cleanAmount,
      date: formData.date || new Date().toISOString().split('T')[0],
      forMonth: formData.forMonth || (formData.date ? formData.date.slice(0, 7) : new Date().toISOString().slice(0, 7)),
      paymentMethod: formData.paymentMethod || 'UPI'
    };

    if (selectedReceipt) {
      setReceipts(prev => prev.map(r => r.id === selectedReceipt.id ? { ...cleanReceiptData, id: selectedReceipt.id } : r));
    } else {
      const newReceipt: Receipt = {
        ...cleanReceiptData,
        id: Date.now().toString(),
      };
      setReceipts(prev => [newReceipt, ...prev]);
    }
    closeForm();
  };

  // Distinct available months for filtering
  const availableMonths = Array.from(new Set(receipts.map(r => {
    if (r.forMonth) return r.forMonth;
    if (r.date) return r.date.slice(0, 7);
    return '';
  }).filter(Boolean))).sort().reverse();

  // Filter receipts by search AND selected month
  const filteredReceipts = receipts.filter(r => {
    const query = search.trim().toLowerCase();
    const matchesSearch = !query || 
      (r.residentName || '').toLowerCase().includes(query) ||
      (r.roomNumber || '').toLowerCase().includes(query) ||
      (r.mobileNumber || '').includes(query);

    if (!matchesSearch) return false;

    if (selectedMonthFilter !== "ALL") {
      const receiptMonth = r.forMonth || (r.date ? r.date.slice(0, 7) : '');
      return receiptMonth === selectedMonthFilter;
    }

    return true;
  });

  // Strict mathematical sum casting to Number to prevent any string concatenation
  const totalAmount = filteredReceipts.reduce((sum, receipt) => sum + (Number(receipt.amount) || 0), 0);
  const totalAllTime = receipts.reduce((sum, receipt) => sum + (Number(receipt.amount) || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Payment Receipts</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Total {receipts.length} receipts recorded • All-time: ₹{totalAllTime.toLocaleString('en-IN')}
          </p>
        </div>
        <Button onClick={() => openForm()} className="bg-blue-600 hover:bg-blue-700">
          <Plus size={16} className="mr-2" /> Issue Receipt
        </Button>
      </div>

      <div className="flex flex-col md:flex-row gap-3 justify-between items-stretch md:items-center">
        {/* Search Input */}
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={16} className="text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search by name, room or mobile..."
            className="pl-10 w-full border border-gray-300 rounded-xl py-2 px-3 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Month Filter Dropdown */}
        <div className="w-full md:w-auto">
          <select
            value={selectedMonthFilter}
            onChange={(e) => setSelectedMonthFilter(e.target.value)}
            className="w-full md:w-auto bg-white border border-gray-300 rounded-xl py-2 px-3 text-sm font-semibold text-gray-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            <option value="ALL">All Months ({receipts.length})</option>
            {availableMonths.map(monthStr => {
              const label = new Date(`${monthStr}-02`).toLocaleString('en-IN', { month: 'short', year: 'numeric' });
              const count = receipts.filter(r => (r.forMonth || r.date.slice(0, 7)) === monthStr).length;
              return (
                <option key={monthStr} value={monthStr}>
                  {label} ({count})
                </option>
              );
            })}
          </select>
        </div>

        {/* Total Collected Banner with 100% accurate mathematical sum */}
        <div className="w-full md:w-auto bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2 shadow-xs flex items-center justify-between md:justify-start space-x-4">
          <div className="flex items-center text-emerald-800">
            <Calculator size={18} className="mr-2 text-emerald-600 shrink-0" />
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 block">Total Collected</span>
              <span className="text-[10px] text-emerald-600 font-medium">
                {filteredReceipts.length} {filteredReceipts.length === 1 ? 'receipt' : 'receipts'}
              </span>
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-900">
            ₹{totalAmount.toLocaleString('en-IN')}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-xs border border-gray-200 overflow-hidden">
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
                      <div>{new Date(receipt.date).toLocaleDateString('en-GB')}</div>
                      {receipt.forMonth && (
                        <div className="text-[10px] text-blue-600 font-bold">
                          {new Date(`${receipt.forMonth}-02`).toLocaleString('en-IN', { month: 'short', year: 'numeric' })}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{receipt.residentName}</div>
                      <div className="text-xs text-gray-500">{receipt.mobileNumber}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {receipt.roomNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                      <div>₹{(Number(receipt.amount) || 0).toLocaleString('en-IN')}</div>
                      <div className="text-[10px] text-gray-500 font-normal uppercase">{receipt.paymentMethod || 'Cash'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                         <button 
                          onClick={() => setViewReceipt(receipt)}
                          className="text-green-500 hover:text-green-700"
                          title="View & Share Receipt"
                        >
                          <Share2 size={18} />
                        </button>
                        <button 
                          onClick={() => openForm(receipt)}
                          className="text-gray-400 hover:text-blue-600"
                          title="Edit"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button 
                          onClick={() => setReceiptToDelete(receipt)}
                          className="text-gray-400 hover:text-red-600"
                          title="Delete Receipt"
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
              <select 
                className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                value={formData.paymentMethod}
                onChange={e => setFormData({...formData, paymentMethod: e.target.value})}
              >
                <option value="UPI">UPI</option>
                <option value="Google Pay">Google Pay</option>
                <option value="PhonePe">PhonePe</option>
                <option value="Paytm">Paytm</option>
                <option value="Cash">Cash</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Date</label>
              <input 
                required
                type="date" 
                className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                value={formData.date}
                onChange={e => setFormData({...formData, date: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">For Month</label>
              <input 
                type="month" 
                className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                value={formData.forMonth || formData.date?.slice(0, 7)}
                onChange={e => setFormData({...formData, forMonth: e.target.value})}
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

      {/* IN-APP CONFIRMATION FOR RECEIPT DELETION */}
      {receiptToDelete && (
        <BaseModal isOpen={true} onClose={() => setReceiptToDelete(null)} title="Delete Receipt">
          <div className="space-y-4">
            <div className="bg-red-50 p-4 rounded-xl border border-red-200 flex items-start space-x-3">
              <div className="p-2 bg-red-100 text-red-600 rounded-lg shrink-0">
                <Trash2 size={24} />
              </div>
              <div>
                <h4 className="font-bold text-gray-900 text-base">Permanently Delete Receipt?</h4>
                <p className="text-sm font-semibold text-red-700 mt-1">
                  {receiptToDelete.residentName} • Room {receiptToDelete.roomNumber} (₹{receiptToDelete.amount.toLocaleString('en-IN')})
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  Date: {new Date(receiptToDelete.date).toLocaleDateString('en-GB')}
                </p>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t">
              <Button variant="secondary" onClick={() => setReceiptToDelete(null)}>Cancel</Button>
              <Button 
                variant="danger" 
                onClick={executeDeleteReceipt} 
                className="bg-red-600 hover:bg-red-700 text-white font-bold"
              >
                Yes, Delete Permanently
              </Button>
            </div>
          </div>
        </BaseModal>
      )}

      {viewReceipt && (
        <ReceiptModal 
          receipt={viewReceipt} 
          onClose={() => setViewReceipt(null)}
          settings={settings}
        />
      )}
    </div>
  );
};
