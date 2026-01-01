import React, { useState } from 'react';
import { Receipt, AppSettings } from '../types';
import { Button } from './Button';
import { X, Printer, Share2, Loader2 } from 'lucide-react';
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

  const handlePrint = () => {
    window.print();
  };

  const handleShareOnWhatsApp = async () => {
    setIsSharing(true);
    const element = document.querySelector('.print-area') as HTMLElement;

    if (element) {
      try {
        const canvas = await html2canvas(element, {
          scale: 3,
          backgroundColor: '#ffffff',
          logging: false,
          useCORS: true
        } as any);

        const cleanMobile = receipt.mobileNumber.replace(/\D/g, '');
        const targetNumber = cleanMobile.length === 10 ? `91${cleanMobile}` : cleanMobile;

        const formattedDate = new Date(receipt.date).toLocaleDateString('en-GB');
        const textSummary =
          `*RENT RECEIPT - ${settings.pgName}*\n\n` +
          `*Resident:* ${receipt.residentName}\n` +
          `*Room No:* ${receipt.roomNumber}\n` +
          `*Amount Paid:* ₹${receipt.amount.toLocaleString('en-IN')}/-\n` +
          `*Date:* ${formattedDate}\n\n` +
          `Thank you for the payment!\nRegards,\nHari Kumar`;

        const fileName = `Receipt_${receipt.residentName.replace(/\s+/g, '_')}.png`;

        // 1. Convert Canvas to Blob/File
        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
        if (!blob) throw new Error("Canvas to Blob failed");

        const file = new File([blob], fileName, { type: 'image/png' });

        // 2. Try Web Share API (Mobile Direct Sharing)
        if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              files: [file],
              title: `Rent Receipt - ${receipt.residentName}`,
              text: textSummary,
            });
            setIsSharing(false);
            return; // Successful share
          } catch (err) {
            console.log("Web Share failed or cancelled:", err);
            // Fall back to old method if share was cancelled or failed
          }
        }

        // 3. Fallback: Manual Download + WhatsApp Link
        const link = document.createElement('a');
        link.href = canvas.toDataURL('image/png');
        link.download = fileName;
        link.click();

        if (targetNumber) {
          window.open(`https://wa.me/${targetNumber}?text=${encodeURIComponent(textSummary)}`, '_blank');
        } else {
          alert("Resident mobile missing. Image downloaded for manual sharing.");
        }
      } catch (error) {
        console.error("Sharing error:", error);
        alert("Failed to share. Please try again or use the print option.");
      }
    }
    setIsSharing(false);
  };

  const formattedMonth = new Date(receipt.date).toLocaleString('en-IN', { month: 'long', year: 'numeric' });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80 p-4 no-print overflow-y-auto">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-sm overflow-hidden flex flex-col my-auto border-t-4 border-blue-900">
        <div className="p-2 border-b flex justify-between items-center bg-gray-50 no-print">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center px-2">
            <Share2 size={12} className="mr-2" /> Receipt Preview
          </span>
          <div className="flex space-x-1">
            <button onClick={handlePrint} className="p-1.5 text-gray-400 hover:text-blue-600 rounded-full transition-colors">
              <Printer size={16} />
            </button>
            <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-red-600 rounded-full transition-colors">
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="p-3 bg-gray-100 flex justify-center overflow-y-auto max-h-[85vh]">
          {/* THE RECEIPT SLIP */}
          <div className="print-area bg-white border-[2px] border-blue-900 p-6 text-blue-900 shadow-md relative font-serif w-full max-w-[340px]">

            <div className="text-center mb-4 border-b border-blue-100 pb-3">
              <h1 className="text-2xl font-black uppercase leading-none tracking-tight mb-2">{settings.pgName}</h1>
              <p className="text-[9px] font-bold leading-tight mb-1 px-4 text-gray-600 italic">
                {settings.address}
              </p>
              <p className="text-[11px] font-black mt-1">Mob: {settings.phone}</p>
            </div>

            <div className="flex justify-between items-center border-t border-b border-blue-900 py-1.5 mb-5">
              <div className="flex items-baseline space-x-0.5">
                <span className="text-[10px] font-bold">No.</span>
                <span className="border-b border-blue-900 border-dashed text-[11px] min-w-[35px] text-center font-black">
                  {receipt.id.slice(-4)}
                </span>
              </div>
              <div className="bg-blue-900 text-white px-4 py-1 font-bold tracking-widest text-[11px] rounded-sm uppercase">
                Rent Receipt
              </div>
              <div className="flex items-baseline space-x-0.5">
                <span className="text-[10px] font-bold">Date:</span>
                <span className="border-b border-blue-900 border-dashed text-[10px] min-w-[55px] text-center font-black">
                  {new Date(receipt.date).toLocaleDateString('en-GB')}
                </span>
              </div>
            </div>

            <div className="space-y-5 text-[13px] mb-8">
              <div className="flex items-end">
                <span className="font-bold mr-2 text-[11px] whitespace-nowrap">Room No.</span>
                <div className="flex-1 border-b border-blue-900 border-dashed pb-0.5 text-center font-black text-sm">
                  {receipt.roomNumber}
                </div>
              </div>

              <div className="flex items-end">
                <span className="font-bold mr-2 text-[11px] whitespace-nowrap">Received From Mr.</span>
                <div className="flex-1 border-b border-blue-900 border-dashed pb-0.5 font-black text-sm italic truncate">
                  {receipt.residentName}
                </div>
              </div>

              <div className="flex flex-col">
                <span className="font-bold text-[11px] mb-0.5 uppercase tracking-tighter">Sum of Rupees</span>
                <div className="w-full border-b border-blue-900 border-dashed pb-0.5 font-bold text-[10px] capitalize leading-tight">
                  {numberToWords(receipt.amount)}
                </div>
              </div>

              <div className="flex items-end">
                <span className="font-bold mr-2 text-[11px]">For the Month of</span>
                <div className="flex-1 border-b border-blue-900 border-dashed pb-0.5 font-bold">
                  {formattedMonth}
                </div>
              </div>
            </div>

            <div className="space-y-5">
              <div className="text-[8px] font-bold leading-tight space-y-1 text-gray-500 border-t border-blue-50 pt-3 italic">
                <p>1. Inform 30 days before vacating, or pay full month rent.</p>
                <p>2. Advance not refundable without notice.</p>
                <p>3. Maintenance charges ₹1000/- mandatory.</p>
                <p>4. Management not responsible for any valuables.</p>
              </div>

              <div className="flex justify-between items-end pt-2">
                <div className="border-[1.5px] border-blue-900 flex overflow-hidden rounded-sm shadow-sm">
                  <div className="bg-blue-900 text-white px-2 py-1 font-black text-base">₹</div>
                  <div className="px-4 py-1 font-black text-lg min-w-[100px] text-center">
                    {receipt.amount.toLocaleString('en-IN')}/-
                  </div>
                </div>

                <div className="text-center w-36">
                  <div className="h-10 flex items-end justify-center mb-1">
                    <span className="text-xl font-bold text-blue-900 pb-1" style={{ fontFamily: 'cursive' }}>Hari Kumar</span>
                  </div>
                  <div className="border-t border-blue-900 pt-1 font-black text-[8px] uppercase tracking-tighter">
                    Signature (HARI KUMAR)
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 border-t bg-white flex flex-col gap-2">
          <Button
            className="w-full bg-green-600 text-white hover:bg-green-700 py-3 rounded-lg shadow-md font-bold text-sm"
            onClick={handleShareOnWhatsApp}
            disabled={isSharing}
          >
            {isSharing ? <Loader2 size={18} className="animate-spin mr-2" /> : <Share2 size={18} className="mr-2" />}
            Share Directly to Resident
          </Button>
          <Button variant="secondary" onClick={onClose} className="w-full py-2.5 rounded-lg text-xs font-medium">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};