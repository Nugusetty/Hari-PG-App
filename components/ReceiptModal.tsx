import React from 'react';
import { Receipt, AppSettings } from '../types';
import { Button } from './Button';
import { X, Share2, Printer } from 'lucide-react';

interface ReceiptModalProps {
  receipt: Receipt;
  onClose: () => void;
  settings: AppSettings;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  receipt,
  onClose,
  settings,
}) => {
  const handlePrint = () => {
    window.print();
  };

  const handleShare = () => {
    const text =
      `*RENT RECEIPT - ${settings.pgName}*\n\n` +
      `📅 Date: ${new Date(receipt.date).toLocaleDateString()}\n` +
      `👤 Resident: ${receipt.residentName}\n` +
      `🏠 Room: ${receipt.roomNumber}\n` +
      `💰 Amount: ₹${receipt.amount.toLocaleString('en-IN')}\n` +
      `💳 Paid via: ${receipt.paymentMethod || 'Cash'}\n\n` +
      `Thank you!`;

    const cleanMobile = receipt.mobileNumber.replace(/\D/g, '');
    const targetNumber =
      cleanMobile.length === 10 ? `91${cleanMobile}` : cleanMobile;

    const url =
      cleanMobile.length >= 10
        ? `https://wa.me/${targetNumber}?text=${encodeURIComponent(text)}`
        : `https://wa.me/?text=${encodeURIComponent(text)}`;

    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 no-print">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b flex justify-between items-center bg-gray-50">
          <h3 className="font-semibold text-gray-800">Print Preview</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 bg-gray-100">
          <div className="print-area bg-white border-2 border-gray-800 p-8 rounded-sm text-gray-900">
            <div className="text-center mb-6">
              <h1 className="text-3xl font-bold uppercase">
                {settings.pgName}
              </h1>
              <p className="text-sm text-gray-600">{settings.pgSubtitle}</p>
              <p className="text-xs text-gray-500">{settings.address}</p>
              <p className="text-xs text-gray-500">Tel: {settings.phone}</p>
            </div>

            <div className="border-y py-4 mb-6 flex justify-between">
              <span className="font-bold text-lg">RENT RECEIPT</span>
              <span className="text-sm">
                {new Date(receipt.date).toLocaleDateString()}
              </span>
            </div>

            <div className="space-y-3 text-sm">
              <p><b>Resident:</b> {receipt.residentName}</p>
              <p><b>Room:</b> {receipt.roomNumber}</p>
              <p><b>Mobile:</b> {receipt.mobileNumber}</p>
              <p className="text-lg font-bold">
                Amount: ₹ {receipt.amount.toLocaleString('en-IN')}
              </p>
              {receipt.notes && <p><b>Notes:</b> {receipt.notes}</p>}
            </div>

            <div className="mt-10 text-right">
              <p className="font-bold italic">Hari Kumar</p>
              <p className="text-xs">Authorized Signature</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50 flex justify-end gap-2">
          <Button
            variant="secondary"
            className="bg-green-600 text-white"
            onClick={handleShare}
          >
            <Share2 size={16} className="mr-2" />
            WhatsApp
          </Button>

          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>

          <Button onClick={handlePrint}>
            <Printer size={16} className="mr-2" />
            Print
          </Button>
        </div>
      </div>
    </div>
  );
};
