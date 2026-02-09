
import React, { useState, useEffect, useRef } from 'react';
import { Floor, Receipt, ViewState, AppSettings } from './types';
import { Dashboard } from './components/Dashboard';
import { ReceiptsManager } from './components/ReceiptsManager';
import { AuthScreen } from './components/AuthScreen';
import { BaseModal } from './components/BaseModal';
import { Building2, Settings, Cloud, Loader2, LogOut, Edit2, Trash2, RefreshCw, Download, Upload, FileJson } from 'lucide-react';
import { Button } from './components/Button';

const safeParse = (data: string | null, fallback: any) => {
  if (!data) return fallback;
  try {
    return JSON.parse(data);
  } catch (e) {
    return fallback;
  }
};

const App: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    return sessionStorage.getItem('hari_pg_auth') === 'true';
  });
  
  const [activeTab, setActiveTab] = useState<ViewState>('dashboard');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isEditingSignature, setIsEditingSignature] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [settings, setSettings] = useState<AppSettings>(() => {
    const v3 = localStorage.getItem('hari_pg_v3_settings');
    if (v3) return safeParse(v3, {
      pgName: "Hari PG",
      managerName: "Hari Kumar",
      pgSubtitle: "Luxury Accommodation",
      address: "29, PR Layout, Marathahalli, Bengaluru",
      phone: "+91 9010646051"
    });
    return {
      pgName: "Hari PG",
      managerName: "Hari Kumar",
      pgSubtitle: "Luxury Accommodation",
      address: "29, PR Layout, Marathahalli, Bengaluru",
      phone: "+91 9010646051"
    };
  });

  const [floors, setFloors] = useState<Floor[]>(() => {
    const v3 = localStorage.getItem('hari_pg_v3_floors');
    return safeParse(v3, []);
  });

  const [receipts, setReceipts] = useState<Receipt[]>(() => {
    const v3 = localStorage.getItem('hari_pg_v3_receipts');
    return safeParse(v3, []);
  });

  useEffect(() => {
    localStorage.setItem('hari_pg_v3_floors', JSON.stringify(floors));
    localStorage.setItem('hari_pg_v3_receipts', JSON.stringify(receipts));
    localStorage.setItem('hari_pg_v3_settings', JSON.stringify(settings));
  }, [floors, receipts, settings]);

  const handleLogin = () => {
    sessionStorage.setItem('hari_pg_auth', 'true');
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    if (confirm("Log out?")) {
      sessionStorage.removeItem('hari_pg_auth');
      setIsLoggedIn(false);
    }
  };

  const handleFactoryReset = async () => {
    const confirmText = prompt("Type 'REMOVE' to delete all data and uninstall the app service worker.");
    if (confirmText === 'REMOVE') {
      localStorage.clear();
      sessionStorage.clear();
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          await registration.unregister();
        }
      }
      alert("App data removed. The page will now reload.");
      window.location.reload();
    }
  };

  // --- DATA RECOVERY FUNCTIONS ---

  const handleCloudUpload = async () => {
    if (!settings.jsonBinId || !settings.jsonBinSecret) return alert("Cloud keys missing in settings.");
    setIsSyncing(true);
    try {
      const response = await fetch(`https://api.jsonbin.io/v3/b/${settings.jsonBinId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-Master-Key': settings.jsonBinSecret },
        body: JSON.stringify({ floors, receipts, settings, updatedAt: new Date().toISOString() })
      });
      if (response.ok) alert("✅ Data successfully backed up to cloud!");
      else alert("❌ Upload failed. Check keys.");
    } catch { alert("❌ Network error during sync."); } finally { setIsSyncing(false); }
  };

  const handleCloudDownload = async () => {
    if (!settings.jsonBinId || !settings.jsonBinSecret) return alert("Cloud keys missing. Cannot recover.");
    if (!confirm("This will overwrite current data with the cloud backup. Proceed?")) return;
    setIsSyncing(true);
    try {
      const response = await fetch(`https://api.jsonbin.io/v3/b/${settings.jsonBinId}/latest`, {
        method: 'GET',
        headers: { 'X-Master-Key': settings.jsonBinSecret }
      });
      const data = (await response.json()).record;
      if (data.floors) setFloors(data.floors);
      if (data.receipts) setReceipts(data.receipts);
      if (data.settings) {
        setSettings(prev => ({ 
          ...data.settings, 
          jsonBinId: prev.jsonBinId, 
          jsonBinSecret: prev.jsonBinSecret 
        }));
      }
      alert("✅ Data successfully recovered from cloud!");
      setIsSettingsOpen(false);
    } catch { alert("❌ Recovery failed. Check your keys or connection."); } finally { setIsSyncing(false); }
  };

  const handleExportData = () => {
    const dataStr = JSON.stringify({ floors, receipts, settings, exportDate: new Date().toISOString() }, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `HariPG_Backup_${new Date().toLocaleDateString().replace(/\//g, '-')}.json`;
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const handleImportData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        if (json.floors && json.receipts) {
          if (confirm("Restore all data from this file? Current data will be replaced.")) {
            setFloors(json.floors);
            setReceipts(json.receipts);
            if (json.settings) setSettings(prev => ({ ...json.settings, jsonBinId: prev.jsonBinId, jsonBinSecret: prev.jsonBinSecret }));
            alert("✅ Data successfully restored from file!");
          }
        } else {
          alert("Invalid backup file format.");
        }
      } catch { alert("Error reading file."); }
    };
    reader.readAsText(file);
  };

  const handleDeleteSignature = () => {
    if (confirm("Clear current signature?")) {
      setSettings(prev => ({...prev, managerName: ''}));
      setIsEditingSignature(false);
    }
  };

  if (!isLoggedIn) return <AuthScreen onLogin={handleLogin} />;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <nav className="bg-blue-700 text-white shadow-lg sticky top-0 z-40 no-print">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Building2 className="h-7 w-7" />
            <span className="font-bold text-lg">{settings.pgName}</span>
          </div>
          <div className="flex items-center space-x-2">
            <button onClick={() => setActiveTab('dashboard')} className={`px-4 py-2 rounded text-sm font-medium transition-colors ${activeTab === 'dashboard' ? 'bg-blue-800' : 'hover:bg-blue-600'}`}>Dashboard</button>
            <button onClick={() => setActiveTab('receipts')} className={`px-4 py-2 rounded text-sm font-medium transition-colors ${activeTab === 'receipts' ? 'bg-blue-800' : 'hover:bg-blue-600'}`}>Receipts</button>
            <button onClick={() => setIsSettingsOpen(true)} className="p-2 hover:bg-blue-600 rounded transition-colors" title="Settings"><Settings size={20} /></button>
            <button onClick={handleLogout} className="p-2 hover:bg-red-600 rounded transition-colors"><LogOut size={20} /></button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-8 no-print pb-24">
        {activeTab === 'dashboard' ? (
          <Dashboard floors={floors} setFloors={setFloors} receipts={receipts} />
        ) : (
          <ReceiptsManager receipts={receipts} setReceipts={setReceipts} settings={settings} />
        )}
      </main>

      <BaseModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} title="Settings & Data Recovery">
        <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-1">
          
          <div className="space-y-4">
            <h4 className="font-bold text-sm text-gray-800 border-b pb-1">PG Profile</h4>
            <div className="space-y-3">
              <input placeholder="PG Name" className="w-full border rounded px-3 py-2 text-sm" value={settings.pgName} onChange={e => setSettings({...settings, pgName: e.target.value})} />
              <textarea placeholder="Address" className="w-full border rounded px-3 py-2 text-sm h-16 resize-none" value={settings.address} onChange={e => setSettings({...settings, address: e.target.value})} />
              <input placeholder="Phone" className="w-full border rounded px-3 py-2 text-sm" value={settings.phone} onChange={e => setSettings({...settings, phone: e.target.value})} />
            </div>
          </div>

          <div className="bg-white border rounded-xl p-4 shadow-sm space-y-3">
            <div className="flex justify-between items-center">
              <h4 className="font-bold text-gray-800 text-sm flex items-center"><Edit2 size={16} className="mr-2 text-blue-600" /> Manage Signature</h4>
              <div className="flex space-x-1">
                <button onClick={() => setIsEditingSignature(!isEditingSignature)} className={`p-1.5 rounded ${isEditingSignature ? 'bg-blue-600 text-white' : 'text-blue-600 hover:bg-blue-50'}`}><Edit2 size={16} /></button>
                <button onClick={handleDeleteSignature} className="p-1.5 text-red-500 hover:bg-red-50 rounded"><Trash2 size={16} /></button>
              </div>
            </div>
            {isEditingSignature ? (
              <input autoFocus placeholder="Manager's Name" className="w-full border-2 border-blue-100 rounded px-3 py-2 text-sm font-bold focus:border-blue-500 outline-none" value={settings.managerName || ''} onChange={e => setSettings({...settings, managerName: e.target.value})} />
            ) : (
              <div className="py-4 bg-gray-50 rounded-lg border-2 border-dashed flex flex-col items-center">
                <span className="text-[10px] uppercase font-bold text-gray-400 mb-1">Receipt Signature:</span>
                <span className="text-2xl text-blue-900 italic font-bold" style={{ fontFamily: 'cursive' }}>{settings.managerName || 'Management'}</span>
              </div>
            )}
          </div>

          <div className="bg-blue-50 p-4 rounded-lg space-y-3 border border-blue-100">
             <h4 className="font-bold text-blue-800 text-sm flex items-center"><Cloud size={18} className="mr-2" /> Cloud Recovery</h4>
             <div className="space-y-2">
                <input placeholder="Bin ID" className="w-full border rounded px-2 py-1.5 text-xs" value={settings.jsonBinId || ''} onChange={e => setSettings({...settings, jsonBinId: e.target.value})} />
                <input type="password" placeholder="Access Key" className="w-full border rounded px-2 py-1.5 text-xs" value={settings.jsonBinSecret || ''} onChange={e => setSettings({...settings, jsonBinSecret: e.target.value})} />
             </div>
             <div className="grid grid-cols-2 gap-2">
                <Button size="sm" onClick={handleCloudUpload} className="text-xs" disabled={isSyncing}>Backup</Button>
                <Button size="sm" variant="secondary" onClick={handleCloudDownload} className="text-xs bg-white text-blue-700 border-blue-200" disabled={isSyncing}>
                  {isSyncing ? <Loader2 size={12} className="animate-spin" /> : "Recover Data"}
                </Button>
             </div>
          </div>

          <div className="bg-emerald-50 p-4 rounded-lg space-y-3 border border-emerald-100">
             <h4 className="font-bold text-emerald-800 text-sm flex items-center"><FileJson size={18} className="mr-2" /> Manual Data Backup</h4>
             <div className="grid grid-cols-2 gap-2">
                <Button size="sm" variant="secondary" className="bg-white text-emerald-700 border-emerald-200 text-xs" onClick={handleExportData}>
                  <Download size={14} className="mr-1" /> Export .json
                </Button>
                <Button size="sm" variant="secondary" className="bg-white text-emerald-700 border-emerald-200 text-xs" onClick={() => fileInputRef.current?.click()}>
                  <Upload size={14} className="mr-1" /> Import .json
                </Button>
             </div>
             <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={handleImportData} />
          </div>

          <div className="pt-4 border-t">
             <button onClick={handleFactoryReset} className="w-full flex items-center justify-center text-red-600 text-[10px] font-black tracking-widest py-3 hover:bg-red-50 rounded border-2 border-dashed border-red-200 uppercase transition-all">
               <RefreshCw size={14} className="mr-2" /> Uninstall & Factory Reset
             </button>
          </div>
          
          <Button variant="secondary" className="w-full font-bold" onClick={() => setIsSettingsOpen(false)}>Close Settings</Button>
        </div>
      </BaseModal>
    </div>
  );
};

export default App;
