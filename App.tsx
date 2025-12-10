import React, { useState, useEffect, useRef } from 'react';
import { Floor, Receipt, ViewState, AppSettings } from './types';
import { Dashboard } from './components/Dashboard';
import { ReceiptsManager } from './components/ReceiptsManager';
import { BaseModal } from './components/BaseModal';
import { LayoutDashboard, ReceiptText, Building2, Settings, Download, Upload, Trash2, Save, Smartphone, Share, PlusSquare, MoreVertical, Github, QrCode, Link as LinkIcon, AlertCircle, PenTool, Image as ImageIcon } from 'lucide-react';
import { Button } from './components/Button';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ViewState>('dashboard');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);
  const [customQrUrl, setCustomQrUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const signatureInputRef = useRef<HTMLInputElement>(null);
  
  // PWA Install State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);

  // Capture the PWA install prompt & Get URL
  useEffect(() => {
    const url = window.location.href;
    setCustomQrUrl(url);

    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);
  
  // Initialize state from local storage or defaults
  const [floors, setFloors] = useState<Floor[]>(() => {
    const saved = localStorage.getItem('hari_pg_floors');
    return saved ? JSON.parse(saved) : [];
  });

  const [receipts, setReceipts] = useState<Receipt[]>(() => {
    const saved = localStorage.getItem('hari_pg_receipts');
    return saved ? JSON.parse(saved) : [];
  });

  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('hari_pg_settings');
    return saved ? JSON.parse(saved) : {
      pgName: "Hari PG",
      pgSubtitle: "Luxury Men's Hostel & Accommodation",
      address: "29, PR Layout, Chandra Layout, Marathahalli, Bengaluru",
      phone: "+91 9010646051"
    };
  });

  // Persistence
  useEffect(() => {
    localStorage.setItem('hari_pg_floors', JSON.stringify(floors));
  }, [floors]);

  useEffect(() => {
    localStorage.setItem('hari_pg_receipts', JSON.stringify(receipts));
  }, [receipts]);

  useEffect(() => {
    localStorage.setItem('hari_pg_settings', JSON.stringify(settings));
  }, [settings]);

  // --- Handlers ---

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        setIsInstallable(false);
        setIsInstallModalOpen(false);
      }
    }
  };

  const handleDownloadData = () => {
    const data = {
      floors,
      receipts,
      settings,
      exportDate: new Date().toISOString(),
      appName: "Hari PG Manager"
    };
    
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `hari_pg_backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleImportData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const parsedData = JSON.parse(content);
        
        if (parsedData.floors && Array.isArray(parsedData.floors)) {
          setFloors(parsedData.floors);
        }
        if (parsedData.receipts && Array.isArray(parsedData.receipts)) {
          setReceipts(parsedData.receipts);
        }
        if (parsedData.settings) {
          setSettings(parsedData.settings);
        }
        
        alert("Data restored successfully!");
        setIsSettingsOpen(false);
      } catch (error) {
        alert("Failed to load data. Invalid file format.");
        console.error(error);
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSignatureUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Limit size to 500KB to prevent localStorage quota issues
    if (file.size > 500000) {
      alert("Image is too large. Please upload an image smaller than 500KB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      setSettings(prev => ({ ...prev, signatureImage: base64 }));
    };
    reader.readAsDataURL(file);
  };

  const removeSignature = () => {
    setSettings(prev => ({ ...prev, signatureImage: undefined }));
    if (signatureInputRef.current) signatureInputRef.current.value = '';
  };

  const handleResetApp = () => {
    const confirmText = prompt("Type 'DELETE' to confirm deleting ALL app data (Floors, Residents, Receipts). This cannot be undone.");
    if (confirmText === 'DELETE') {
      setFloors([]);
      setReceipts([]);
      // We don't delete settings to keep PG name configuration
      localStorage.removeItem('hari_pg_floors');
      localStorage.removeItem('hari_pg_receipts');
      alert("App data has been reset.");
      setIsSettingsOpen(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
      {/* Navbar */}
      <nav className="bg-blue-700 text-white shadow-lg sticky top-0 z-40 no-print select-none">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <Building2 className="h-8 w-8 text-blue-200" />
              <span className="font-bold text-xl tracking-tight hidden sm:inline">{settings.pgName} Manager</span>
              <span className="font-bold text-xl tracking-tight sm:hidden">{settings.pgName}</span>
            </div>
            
            <div className="flex items-center space-x-2 sm:space-x-3">
              <button
                onClick={() => setIsInstallModalOpen(true)}
                className="hidden sm:flex items-center px-3 py-2 rounded-md text-sm font-medium text-blue-100 hover:bg-blue-600 transition-colors"
                title="Install App"
              >
                <Smartphone size={18} className="mr-2" />
                <span>Install App</span>
              </button>

              <button
                onClick={() => setIsInstallModalOpen(true)}
                className="sm:hidden p-2 rounded-md text-blue-100 hover:bg-blue-600 transition-colors"
                title="Install App"
              >
                <Smartphone size={20} />
              </button>

              <div className="h-6 w-px bg-blue-500 mx-1"></div>

              <button
                onClick={() => setActiveTab('dashboard')}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center ${
                  activeTab === 'dashboard' 
                    ? 'bg-blue-800 text-white' 
                    : 'text-blue-100 hover:bg-blue-600'
                }`}
              >
                <LayoutDashboard size={18} className="mr-2 hidden sm:inline" />
                <span className="sm:hidden">Home</span>
                <span className="hidden sm:inline">Dashboard</span>
              </button>
              <button
                onClick={() => setActiveTab('receipts')}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center ${
                  activeTab === 'receipts' 
                    ? 'bg-blue-800 text-white' 
                    : 'text-blue-100 hover:bg-blue-600'
                }`}
              >
                <ReceiptText size={18} className="mr-2 hidden sm:inline" />
                <span className="sm:hidden">Bills</span>
                <span className="hidden sm:inline">Receipts</span>
              </button>
              <button
                onClick={() => setIsSettingsOpen(true)}
                className="p-2 rounded-md text-blue-100 hover:bg-blue-600 transition-colors"
                title="Settings & Data"
              >
                <Settings size={20} />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 no-print pb-24">
        {activeTab === 'dashboard' ? (
          <Dashboard floors={floors} setFloors={setFloors} receipts={receipts} />
        ) : (
          <ReceiptsManager receipts={receipts} setReceipts={setReceipts} settings={settings} />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-auto py-6 no-print">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center text-gray-500 text-sm">
          <p>© {new Date().getFullYear()} {settings.pgName} Management System. All rights reserved.</p>
          <div className="flex items-center space-x-4 mt-2 md:mt-0">
            <a 
              href="https://github.com" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="flex items-center hover:text-blue-600 transition-colors"
            >
              <Github size={16} className="mr-1.5" />
              <span>Source Code</span>
            </a>
          </div>
        </div>
      </footer>

      {/* Install App Modal */}
      <BaseModal
        isOpen={isInstallModalOpen}
        onClose={() => setIsInstallModalOpen(false)}
        title="Get Mobile App"
      >
        <div className="space-y-4">
           {/* QR Code Section */}
           <div className="hidden md:flex flex-col items-center justify-center p-4 bg-gray-50 rounded-lg border border-gray-200">
             <div className="flex items-center space-x-2 mb-3 text-gray-800 font-semibold">
                <QrCode size={20} />
                <span>Scan to Open on Phone</span>
             </div>
             
             {customQrUrl && (
               <div className="bg-white p-2 rounded shadow-sm border mb-3">
                 <img 
                   src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(customQrUrl)}`}
                   alt="App QR Code"
                   className="w-32 h-32"
                 />
               </div>
             )}
             
             <div className="w-full max-w-[280px] space-y-2">
                <label className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider block mb-1">
                  App URL
                </label>
                <div className="flex items-center space-x-1 border border-gray-300 rounded-md px-2 py-1 bg-white">
                  <LinkIcon size={12} className="text-gray-400" />
                  <input 
                    type="text" 
                    value={customQrUrl}
                    onChange={(e) => setCustomQrUrl(e.target.value)}
                    className="flex-1 text-xs text-gray-700 focus:outline-none"
                    placeholder="https://your-public-url.com"
                  />
                </div>
             </div>
           </div>

           <div className="flex flex-col items-center justify-center p-4 bg-blue-50 rounded-lg">
              <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center mb-2">
                 <Building2 size={24} className="text-blue-600" />
              </div>
              <h3 className="font-bold text-gray-900">{settings.pgName} Manager</h3>
           </div>

           {isInstallable ? (
              <Button 
                onClick={handleInstallClick} 
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 text-lg"
              >
                Install App Now
              </Button>
           ) : (
              <div className="space-y-5 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="p-3 bg-blue-50 text-blue-800 text-sm rounded">
                   To install, open this page in <strong>Chrome (Android)</strong> or <strong>Safari (iOS)</strong>.
                </div>
              </div>
           )}
           
           <div className="pt-2">
            <Button variant="secondary" className="w-full" onClick={() => setIsInstallModalOpen(false)}>
              Close
            </Button>
           </div>
        </div>
      </BaseModal>

      {/* Settings Modal */}
      <BaseModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        title="App Settings"
      >
        <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-1">
          
          {/* PG Details Section */}
          <div className="space-y-4">
            <h4 className="font-medium text-gray-800 flex items-center border-b pb-2">
              <Building2 size={18} className="mr-2 text-blue-600" /> PG Details
            </h4>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">PG Name</label>
              <input 
                type="text"
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                value={settings.pgName}
                onChange={(e) => setSettings({...settings, pgName: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subtitle / Tagline</label>
              <input 
                type="text"
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                value={settings.pgSubtitle}
                onChange={(e) => setSettings({...settings, pgSubtitle: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
              <textarea 
                rows={2}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
                value={settings.address}
                onChange={(e) => setSettings({...settings, address: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
              <input 
                type="text"
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                value={settings.phone}
                onChange={(e) => setSettings({...settings, phone: e.target.value})}
              />
            </div>
          </div>

          {/* Signature Upload */}
          <div className="space-y-4">
            <h4 className="font-medium text-gray-800 flex items-center border-b pb-2">
              <PenTool size={18} className="mr-2 text-purple-600" /> Authorized Signature
            </h4>
            
            <div className="flex flex-col items-center p-4 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
              {settings.signatureImage ? (
                <div className="relative w-full text-center">
                  <img src={settings.signatureImage} alt="Signature" className="max-h-24 mx-auto mb-3" />
                  <Button variant="danger" size="sm" onClick={removeSignature} className="w-full">
                    <Trash2 size={14} className="mr-2" /> Remove Signature
                  </Button>
                </div>
              ) : (
                <div className="text-center w-full">
                  <ImageIcon size={32} className="mx-auto text-gray-400 mb-2" />
                  <p className="text-xs text-gray-500 mb-3">Upload signature image (transparent PNG recommended)</p>
                  <input
                    type="file"
                    ref={signatureInputRef}
                    onChange={handleSignatureUpload}
                    accept="image/*"
                    className="hidden"
                  />
                  <Button variant="secondary" size="sm" onClick={() => signatureInputRef.current?.click()} className="w-full">
                    <Upload size={14} className="mr-2" /> Upload Image
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Backup Section */}
          <div className="space-y-4 pt-4 border-t">
            <h4 className="font-medium text-blue-800 flex items-center">
              <Save size={18} className="mr-2" /> Backup & Restore
            </h4>
            <div className="flex space-x-2">
              <Button onClick={handleDownloadData} size="sm" className="flex-1">
                <Download size={14} className="mr-2" /> Backup
              </Button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImportData}
                accept=".json"
                className="hidden"
              />
              <Button 
                variant="secondary" 
                size="sm"
                className="flex-1"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload size={14} className="mr-2" /> Restore
              </Button>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="pt-4 border-t">
             <Button variant="ghost" className="w-full text-red-600 hover:bg-red-50 hover:text-red-700 justify-start px-0" onClick={handleResetApp}>
              <Trash2 size={16} className="mr-2" /> Reset All App Data
            </Button>
          </div>
        </div>
      </BaseModal>
    </div>
  );
};

export default App;