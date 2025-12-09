import React, { useState, useEffect, useRef } from 'react';
import { Floor, Receipt, ViewState } from './types';
import { Dashboard } from './components/Dashboard';
import { ReceiptsManager } from './components/ReceiptsManager';
import { BaseModal } from './components/BaseModal';
import { LayoutDashboard, ReceiptText, Building2, Settings, Download, Upload, Trash2, Save, Smartphone, Share, PlusSquare, MoreVertical, Github, QrCode, Link as LinkIcon, AlertCircle } from 'lucide-react';
import { Button } from './components/Button';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ViewState>('dashboard');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);
  // Removed unused currentUrl state to fix build error
  const [customQrUrl, setCustomQrUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
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

  // Persistence
  useEffect(() => {
    localStorage.setItem('hari_pg_floors', JSON.stringify(floors));
  }, [floors]);

  useEffect(() => {
    localStorage.setItem('hari_pg_receipts', JSON.stringify(receipts));
  }, [receipts]);

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

  const handleResetApp = () => {
    const confirmText = prompt("Type 'DELETE' to confirm deleting ALL app data (Floors, Residents, Receipts). This cannot be undone.");
    if (confirmText === 'DELETE') {
      setFloors([]);
      setReceipts([]);
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
              <span className="font-bold text-xl tracking-tight hidden sm:inline">Hari PG Manager</span>
              <span className="font-bold text-xl tracking-tight sm:hidden">Hari PG</span>
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
          <Dashboard floors={floors} setFloors={setFloors} />
        ) : (
          <ReceiptsManager receipts={receipts} setReceipts={setReceipts} />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-auto py-6 no-print">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center text-gray-500 text-sm">
          <p>© {new Date().getFullYear()} Hari PG Management System. All rights reserved.</p>
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
           {/* QR Code Section - Visible on Desktop/Tablet to help transfer to mobile */}
           <div className="hidden md:flex flex-col items-center justify-center p-4 bg-gray-50 rounded-lg border border-gray-200">
             <div className="flex items-center space-x-2 mb-3 text-gray-800 font-semibold">
                <QrCode size={20} />
                <span>Scan to Open on Phone</span>
             </div>
             
             {/* Editable URL Logic */}
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
                  App URL (Edit if you see 404)
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
                <div className="flex items-start space-x-2 bg-amber-50 p-2 rounded border border-amber-100">
                  <AlertCircle size={14} className="text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-[10px] text-amber-700 leading-tight">
                    <strong>Getting a 404 Error?</strong> The current preview link is private. You must <strong>deploy</strong> this code to a public host (like Vercel, Netlify) to access it on your phone.
                  </p>
                </div>
             </div>
           </div>

           <div className="flex flex-col items-center justify-center p-4 bg-blue-50 rounded-lg">
              <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center mb-2">
                 <Building2 size={24} className="text-blue-600" />
              </div>
              <h3 className="font-bold text-gray-900">Hari PG Manager</h3>
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
                {/* iOS Section */}
                <div>
                  <h5 className="font-bold flex items-center text-gray-800 mb-2 border-b pb-2">
                    <span className="text-xl mr-2">🍎</span> iOS (iPhone/iPad)
                  </h5>
                  <div className="space-y-3 pl-1 text-sm">
                    <div className="flex items-start">
                      <span className="bg-gray-100 text-gray-600 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mr-2 flex-shrink-0 mt-0.5">1</span>
                      <p className="text-gray-600">
                        Tap the <span className="font-bold text-blue-600 inline-flex items-center">Share <Share size={12} className="ml-1" /></span> button in Safari.
                      </p>
                    </div>
                    <div className="flex items-start">
                      <span className="bg-gray-100 text-gray-600 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mr-2 flex-shrink-0 mt-0.5">2</span>
                      <p className="text-gray-600">
                        Scroll down and tap <span className="font-bold inline-flex items-center text-gray-800">Add to Home Screen <PlusSquare size={12} className="ml-1" /></span>.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Android Section */}
                <div>
                  <h5 className="font-bold flex items-center text-gray-800 mb-2 border-b pb-2">
                    <span className="text-xl mr-2">🤖</span> Android (Chrome)
                  </h5>
                  <div className="space-y-3 pl-1 text-sm">
                    <div className="flex items-start">
                      <span className="bg-gray-100 text-gray-600 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mr-2 flex-shrink-0 mt-0.5">1</span>
                      <p className="text-gray-600">
                        Tap the <span className="font-bold text-gray-700 inline-flex items-center">Menu <MoreVertical size={12} className="ml-1" /></span> (3 dots) icon at the top right.
                      </p>
                    </div>
                    <div className="flex items-start">
                      <span className="bg-gray-100 text-gray-600 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mr-2 flex-shrink-0 mt-0.5">2</span>
                      <p className="text-gray-600">
                        Select <span className="font-bold text-gray-800">Install App</span> or <span className="font-bold text-gray-800">Add to Home screen</span>.
                      </p>
                    </div>
                  </div>
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

      {/* Settings Modal - Simplified */}
      <BaseModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        title="App Settings & Data"
      >
        <div className="space-y-6">
          {/* Backup Section */}
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
            <h4 className="font-medium text-blue-800 mb-2 flex items-center">
              <Save size={18} className="mr-2" /> Backup & Restore
            </h4>
            <p className="text-sm text-blue-600 mb-4">
              Download your data to keep it safe, or transfer it to another device.
            </p>
            <div className="flex flex-col space-y-3">
              <Button onClick={handleDownloadData} className="w-full">
                <Download size={16} className="mr-2" /> Download Backup File
              </Button>
              
              <div className="relative">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImportData}
                  accept=".json"
                  className="hidden"
                  id="import-file"
                />
                <Button 
                  variant="secondary" 
                  className="w-full"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload size={16} className="mr-2" /> Restore from File
                </Button>
              </div>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="border-t pt-4">
            <h4 className="font-medium text-red-800 mb-2 flex items-center">
              <Trash2 size={18} className="mr-2" /> Delete Data
            </h4>
            <p className="text-sm text-gray-600 mb-4">
              Permanently delete all floors, rooms, and receipts to start fresh.
            </p>
            <Button variant="danger" className="w-full" onClick={handleResetApp}>
              Reset App (Delete All)
            </Button>
          </div>
        </div>
      </BaseModal>
    </div>
  );
};

export default App;