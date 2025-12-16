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

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ receipt, onClose, settings }) => {
  const [isSharing, setIsSharing] = useState(false);

  const handlePrint = () => {
    window.print();
  };

  const handleShareImage = async () => {
    setIsSharing(true);
    const element = document.querySelector('.print-area') as HTMLElement;
    
    if (element) {
      try {
        // Generate image from the DOM element
        // Cast options to 'any' because the @types/html2canvas definition might miss the 'scale' property
        const canvas = await html2canvas(element, { 
          scale: 2, // Higher resolution
          backgroundColor: '#ffffff',
          logging: false,
          useCORS: true 
        } as any);

        // Convert canvas to blob
        canvas.toBlob(async (blob) => {
          if (!blob) {
            setIsSharing(false);
            return;
          }

          const fileName = `Receipt_${receipt.residentName.replace(/\s+/g, '_')}.png`;
          const file = new File([blob], fileName, { type: 'image/png' });

          // Check if the browser supports sharing files (Mobile/Tablet usually do)
          // Type cast navigator to any to avoid TypeScript errors with canShare
          const nav = navigator as any;
          if (nav.canShare && nav.canShare({ files: [file] })) {
            try {
              await nav.share({
                files: [file],
                title: 'Rent Receipt',
                text: `Rent Receipt for ${receipt.residentName}`
              });
            } catch (err) {
              console.error('Share cancelled or failed', err);
            }
          } else {
            // Fallback for Desktop: Download the image and prompt user
            const link = document.createElement('a');
            link.href = canvas.toDataURL('image/png');
            link.download = fileName;
            link.click();
            alert("Image downloaded! Please attach this image manually in WhatsApp.");
            
            // Open WhatsApp Web
            const cleanMobile = receipt.mobileNumber.replace(/\D/g, '');
            const targetNumber = cleanMobile.length >= 10 
              ? (cleanMobile.length === 10 ? `91${cleanMobile}` : cleanMobile) 
              : '';
            
            if (targetNumber) {
               window.open(`https://wa.me/${targetNumber}?text=Please+find+the+receipt+attached.`, '_blank');
            } else {
               window.open(`https://wa.me/?text=Please+find+the+receipt+attached.`, '_blank');
            }
          }
        }, 'image/png');
      } catch (error) {
        console.error("Error generating receipt image:", error);
        alert("Could not generate image. Please try downloading PDF instead.");
      }
    }
    setIsSharing(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 no-print">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header - No Print */}
        <div className="p-4 border-b flex justify-between items-center bg-gray-50">
          <h3 className="font-semibold text-gray-800">Receipt Preview</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto flex-1 bg-gray-100">
          {/* Printable Area - Identified by class for print media query */}
          <div className="print-area bg-white border-2 border-gray-800 p-8 rounded-sm text-gray-900 relative shadow-sm">
            
            <div className="text-center mb-6 relative z-10">
              <h1 className="text-3xl font-bold uppercase tracking-wider mb-2">{settings.pgName}</h1>
              <p className="text-sm text-gray-600">{settings.pgSubtitle}</p>
              <p className="text-xs text-gray-500 mt-1">{settings.address}</p>
              <p className="text-xs text-gray-500">Tel: {settings.phone}</p>
            </div>

            <div className="border-t-2 border-b-2 border-gray-200 py-4 mb-6 relative z-10">
              <div className="flex justify-between items-center">
                <span className="font-bold text-lg">RENT RECEIPT</span>
                <div className="text-right">
                    <div className="text-sm text-gray-600">Date: {new Date(receipt.date).toLocaleDateString()}</div>
                    <div className="text-xs text-gray-500 mt-1 font-semibold uppercase bg-gray-100 px-2 py-0.5 rounded inline-block">
                        {receipt.paymentMethod || 'Cash'}
                    </div>
                </div>
              </div>
            </div>

            <div className="space-y-4 text-sm relative z-10">
              <div className="grid grid-cols-3 gap-4">
                <span className="text-gray-600 font-medium">Received From:</span>
                <span className="col-span-2 font-bold text-lg border-b border-dashed border-gray-300 pb-1">
                  {receipt.residentName}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <span className="text-gray-600 font-medium">Room Number:</span>
                <span className="col-span-2 font-semibold border-b border-dashed border-gray-300 pb-1">
                  {receipt.roomNumber}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <span className="text-gray-600 font-medium">Mobile No:</span>
                <span className="col-span-2 font-semibold border-b border-dashed border-gray-300 pb-1">
                  {receipt.mobileNumber}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-4 items-center">
                <span className="text-gray-600 font-medium">Amount:</span>
                <span className="col-span-2 font-bold text-xl text-gray-900 border-b border-dashed border-gray-300 pb-1">
                  ₹ {receipt.amount.toLocaleString('en-IN')}
                </span>
              </div>

              {receipt.notes && (
                <div className="grid grid-cols-3 gap-4">
                  <span className="text-gray-600 font-medium">Description:</span>
                  <span className="col-span-2 text-gray-700 italic border-b border-dashed border-gray-300 pb-1">
                    {receipt.notes}
                  </span>
                </div>
              )}
            </div>

            <div className="mt-12 flex justify-between items-end relative z-10">
              <div className="text-xs text-gray-400">
                <p>Generated by {settings.pgName} App</p>
              </div>
              <div className="text-center flex flex-col items-center">
                <div className="h-16 w-32 mb-1 flex items-end justify-center">
                  {settings.signatureImage ? (
                    <img src={settings.signatureImage} alt="Signature" className="max-h-full max-w-full object-contain" />
                  ) : (
                    <div className="border-b border-gray-400 w-full h-full"></div>
                  )}
                </div>
                <p className="text-lg font-serif italic mt-1 font-bold">Hari Kumar</p>
                <p className="text-[10px] text-gray-500 uppercase mt-1">Authorized Signature</p>
              </div>
            </div>
          </div>
          
          <div className="text-center mt-4 text-xs text-gray-500">
             <p>Use "Share on WhatsApp" to send this receipt image.</p>
          </div>
        </div>

        {/* Footer Actions - No Print */}
        <div className="p-4 border-t bg-gray-50 flex justify-end space-x-2">
           <Button 
             className="bg-green-600 text-white hover:bg-green-700 focus:ring-green-500 border-transparent disabled:opacity-70" 
             onClick={handleShareImage}
             disabled={isSharing}
           >
            {isSharing ? <Loader2 size={16} className="animate-spin mr-2" /> : <Share2 size={16} className="mr-2" />} 
            Share on WhatsApp
          </Button>
          <Button variant="secondary" onClick={onClose}>Close</Button>
          <Button onClick={handlePrint} variant="ghost" size="sm" className="hidden sm:inline-flex">
            <Printer size={16} />
          </Button>
        </div>
      </div>
    </div>
  );
};