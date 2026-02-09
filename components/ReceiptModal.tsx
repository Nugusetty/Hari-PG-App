
import React, { useState } from 'react';
import { Receipt, AppSettings } from '../types';
import { Button } from './Button';
import { X, Share2, Loader2 } from 'lucide-react';
import html2canvas from 'html2canvas';

interface ReceiptModalProps {
  receipt: Receipt;
  onClose: () => void;
  settings: AppSettings;
}

const numberToWords = (num: number): string => {
  const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const numStr = num.toString();
  if (numStr.length > 9) return 'overflow';
  const n = ('000000000' + numStr).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
  if (!n) return '';
  let str = '';
  str += (Number(n[1]) !== 0) ? (a[Number(n[1])] || b[Number(n[1][0])] + ' ' + a[Number(n[1][1])]) + 'Crore ' : '';
  str += (Number(n[2]) !== 0) ? (a[Number(n[2])] || b[Number(n[2][0])] + ' ' + a[Number(n[2][1])]) + 'Lakh ' : '';
  str += (Number(n[3]) !== 0) ? (a[Number(n[3])] || b[Number(n[3][0])] + ' ' + a[Number(n[3][1])]) + 'Thousand ' : '';
  str += (Number(n[4]) !== 0) ? (a[Number(n[4])] || b[Number(n[4][0])] + ' ' + a[Number(n[4][1])]) + 'Hundred ' : '';
  str += (Number(n[5]) !== 0) ? ((str !== '') ? 'and ' : '') + (a[Number(n[5])] || b[Number(n[5][0])] + ' ' + a[Number(n[5][1])]) + 'Rupees Only' : 'Rupees Only';
  return str;
};

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ receipt, onClose, settings }) => {
  const [isSharing, setIsSharing] = useState(false);

  const handleShareOnWhatsApp = async () => {
    setIsSharing(true);
    const element = document.querySelector('.print-area') as HTMLElement;
    if (element) {
      try {
        const canvas = await html2canvas(element, { scale: 3, backgroundColor: '#ffffff', useCORS: true } as any);
        const cleanMobile = receipt.mobileNumber.replace(/\D/g, '');
        const targetNumber = cleanMobile.length === 10 ? `91${cleanMobile}` : cleanMobile;
        const textSummary = `*RENT RECEIPT - ${settings.pgName}*\nResident: ${receipt.residentName}\nAmount: ₹${receipt.amount.toLocaleString('en-IN')}\n\nThank you!`;
        const fileName = `Receipt_${receipt.residentName.replace(/\s+/g, '_')}.png`;
        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
        if (blob && navigator.share && navigator.canShare({ files: [new File([blob], fileName, { type: 'image/png' })] })) {
          await navigator.share({ files: [new File([blob], fileName, { type: 'image/png' })], title: 'Rent Receipt', text: textSummary });
        } else {
          window.open(`https://wa.me/${targetNumber}?text=${encodeURIComponent(textSummary)}`, '_blank');
        }
      } catch (err) { alert("Sharing failed."); }
    }
    setIsSharing(false);
  };

  const formattedMonth = new Date(receipt.date).toLocaleString('en-IN', { month: 'long', year: 'numeric' });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 no-print overflow-y-auto">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-sm flex flex-col border-t-4 border-blue-900">
        <div className="p-2 border-b flex justify-between bg-gray-50">
          <span className="text-[10px] font-bold text-gray-400 uppercase px-2">Receipt Slip</span>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-red-600"><X size={16} /></button>
        </div>

        <div className="p-3 bg-gray-100 flex justify-center overflow-y-auto max-h-[75vh]">
          <div className="print-area bg-white border-2 border-blue-900 p-6 text-blue-900 font-serif w-full max-w-[340px]">
            <div className="text-center mb-4 border-b border-blue-100 pb-3">
              <h1 className="text-2xl font-black uppercase tracking-tight">{settings.pgName}</h1>
              <p className="text-[8px] italic text-gray-600 leading-tight">{settings.address}</p>
              <p className="text-[10px] font-black mt-1">Mob: {settings.phone}</p>
            </div>

            <div className="flex justify-between items-center border-y border-blue-900 py-1 mb-5">
              <span className="text-[9px] font-bold">No. {receipt.id.slice(-4)}</span>
              <div className="bg-blue-900 text-white px-3 py-0.5 font-bold text-[10px] uppercase">Rent Receipt</div>
              <span className="text-[9px] font-bold">{new Date(receipt.date).toLocaleDateString('en-GB')}</span>
            </div>

            <div className="space-y-4 text-[12px] mb-8">
              <div className="flex border-b border-blue-900 border-dashed pb-0.5"><span className="font-bold mr-2 shrink-0">Room No.</span> <span className="flex-1 text-center font-black">{receipt.roomNumber}</span></div>
              <div className="flex border-b border-blue-900 border-dashed pb-0.5"><span className="font-bold mr-2 shrink-0">Received From</span> <span className="flex-1 font-black italic">{receipt.residentName}</span></div>
              <div className="flex flex-col border-b border-blue-900 border-dashed pb-0.5"><span className="font-bold uppercase text-[9px]">Sum of Rupees</span> <span className="font-bold text-[10px]">{numberToWords(receipt.amount)}</span></div>
              <div className="flex border-b border-blue-900 border-dashed pb-0.5"><span className="font-bold mr-2 shrink-0">For Month</span> <span className="flex-1 font-bold">{formattedMonth}</span></div>
            </div>

            <div className="flex justify-between items-end">
              <div className="border-[1.5px] border-blue-900 flex rounded shadow-sm">
                <div className="bg-blue-900 text-white px-2 py-1 font-black">₹</div>
                <div className="px-4 py-1 font-black text-lg">{receipt.amount.toLocaleString('en-IN')}/-</div>
              </div>
              <div className="text-center w-32">
                <span className="text-xl font-bold text-blue-900" style={{ fontFamily: 'cursive' }}>{settings.managerName || 'Management'}</span>
                <div className="border-t border-blue-900 mt-1 font-black text-[7px] uppercase tracking-tighter">
                  Signature ({settings.managerName ? settings.managerName.toUpperCase() : 'MANAGER'})
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 border-t space-y-2">
          <Button className="w-full bg-green-600 hover:bg-green-700 py-3 font-bold" onClick={handleShareOnWhatsApp} disabled={isSharing}>
            {isSharing ? <Loader2 size={18} className="animate-spin mr-2" /> : <Share2 size={18} className="mr-2" />} Share Receipt
          </Button>
          <Button variant="secondary" onClick={onClose} className="w-full py-2">Close</Button>
        </div>
      </div>
    </div>
  );
};
