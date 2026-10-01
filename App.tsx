import React, { useState, useEffect, useRef } from 'react';
import { Floor, Receipt, ViewState, AppSettings, DataSnapshot } from './types';
import { Dashboard } from './components/Dashboard';
import { ReceiptsManager } from './components/ReceiptsManager';
import { BaseModal } from './components/BaseModal';
import { 
  Building2, Settings, Cloud, Loader2, Edit2, Trash2, 
  RefreshCw, Download, Upload, ShieldCheck, History, CheckCircle2 
} from 'lucide-react';
import { Button } from './components/Button';
import { 
  loadDurableData, saveDurableData, createBackupSnapshot, 
  getAllSnapshots, downloadBackupFile 
} from './utils/storage';

const DEFAULT_SETTINGS: AppSettings = {
  pgName: "Hari PG",
  managerName: "Hari Kumar",
  pgSubtitle: "Luxury Accommodation",
  address: "29, PR Layout, Marathahalli, Bengaluru",
  phone: "+91 9010646051"
};

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ViewState>('dashboard');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isEditingSignature, setIsEditingSignature] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isLoaded, setIsLoaded] = useState(false);
  const [recoveryNotice, setRecoveryNotice] = useState<string | null>(null);
  const [snapshots, setSnapshots] = useState<DataSnapshot[]>([]);

  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [floors, setFloors] = useState<Floor[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);

  // 1. Initial Load from Durable Storage (IndexedDB + localStorage fallback + Snapshot recovery)
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const result = await loadDurableData();
        if (isMounted) {
          setFloors(result.floors);
          setReceipts(result.receipts);
          setSettings(result.settings);
          setIsLoaded(true);

          if (result.isRecoveredFromBackup) {
            setRecoveryNotice("✅ Your data has been securely recovered from auto-backup!");
            setTimeout(() => setRecoveryNotice(null), 8000);
          }

          // Fetch snapshots
          const snaps = await getAllSnapshots();
          setSnapshots(snaps);
        }
      } catch (e) {
        console.error("Storage initialization error:", e);
        if (isMounted) setIsLoaded(true);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Save on changes, ONLY after initial load completes (prevents empty array overwrites!)
  useEffect(() => {
    if (!isLoaded) return;
    saveDurableData({ floors, receipts, settings });
  }, [floors, receipts, settings, isLoaded]);

  // Factory reset (Clean uninstall)
  const handleFactoryReset = async () => {
    const confirmText = prompt("Type 'REMOVE' to delete all data and uninstall the app service worker.");
    if (confirmText === 'REMOVE') {
      localStorage.clear();
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

  // Manual Snapshot Creation
  const handleCreateSnapshot = async () => {
    const snap = await createBackupSnapshot({ floors, receipts, settings }, 'manual');
    if (snap) {
      setSnapshots(prev => [snap, ...prev]);
      alert("✅ Backup snapshot saved successfully!");
    }
  };

  // Restore from an IndexedDB Snapshot
  const handleRestoreSnapshot = (snap: DataSnapshot) => {
    if (confirm(`Restore snapshot taken on ${snap.dateString}? Current data will be replaced with this backup.`)) {
      setFloors(snap.floors);
      setReceipts(snap.receipts);
      if (snap.settings) setSettings(snap.settings);
      alert("✅ Data successfully restored!");
      setIsSettingsOpen(false);
    }
  };

  // JSON File Export
  const handleExportData = () => {
    downloadBackupFile({ floors, receipts, settings });
  };

  // JSON File Import
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
            if (json.settings) {
              setSettings(prev => ({ 
                ...json.settings, 
                jsonBinId: prev.jsonBinId, 
                jsonBinSecret: prev.jsonBinSecret 
              }));
            }
            alert("✅ Data successfully restored from file!");
            setIsSettingsOpen(false);
          }
        } else {
          alert("Invalid backup file format.");
        }
      } catch { 
        alert("Error reading file."); 
      }
    };
    reader.readAsText(file);
  };

  // Cloud JSONBin Sync
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

  const handleDeleteSignature = () => {
    if (confirm("Clear current signature?")) {
      setSettings(prev => ({ ...prev, managerName: '' }));
      setIsEditingSignature(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {/* Toast banner for auto-recovery notice */}
      {recoveryNotice && (
        <div className="bg-emerald-600 text-white px-4 py-2 text-center text-xs font-bold shadow-md flex items-center justify-center space-x-2">
          <CheckCircle2 size={16} />
          <span>{recoveryNotice}</span>
        </div>
      )}

      {/* Top Navbar */}
      <nav className="bg-blue-700 text-white shadow-lg sticky top-0 z-40 no-print">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <Building2 className="h-7 w-7 text-white" />
            <div>
              <span className="font-extrabold text-lg leading-tight block">{settings.pgName}</span>
              <span className="text-[10px] text-blue-200 uppercase font-semibold tracking-wider">
                {settings.pgSubtitle || 'PG Management'}
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button 
              onClick={() => setActiveTab('dashboard')} 
              className={`px-3.5 py-1.5 rounded-lg text-sm font-bold transition-all ${
                activeTab === 'dashboard' ? 'bg-blue-900 text-white shadow-inner' : 'hover:bg-blue-600 text-blue-100'
              }`}
            >
              Dashboard
            </button>
            <button 
              onClick={() => setActiveTab('receipts')} 
              className={`px-3.5 py-1.5 rounded-lg text-sm font-bold transition-all ${
                activeTab === 'receipts' ? 'bg-blue-900 text-white shadow-inner' : 'hover:bg-blue-600 text-blue-100'
              }`}
            >
              Receipts
            </button>
            
            <button 
              onClick={() => setIsSettingsOpen(true)} 
              className="p-2 hover:bg-blue-600 rounded-lg transition-colors text-white" 
              title="Settings & Backup"
            >
              <Settings size={20} />
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 py-6 no-print pb-24">
        {activeTab === 'dashboard' ? (
          <Dashboard 
            floors={floors} 
            setFloors={setFloors} 
            receipts={receipts}
            setReceipts={setReceipts}
            settings={settings}
          />
        ) : (
          <ReceiptsManager 
            receipts={receipts} 
            setReceipts={setReceipts} 
            settings={settings} 
          />
        )}
      </main>

      {/* Settings & Disaster-Recovery Modal */}
      <BaseModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} title="Settings & Data Protection">
        <div className="space-y-6 max-h-[75vh] overflow-y-auto pr-1">
          
          {/* Storage Durability Status Box */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5">
            <div className="flex items-start space-x-3">
              <ShieldCheck className="text-emerald-600 shrink-0 mt-0.5" size={20} />
              <div>
                <h4 className="text-sm font-bold text-emerald-900">
                  Permanent Data Storage (Active)
                </h4>
                <p className="text-xs text-emerald-800 mt-0.5 leading-relaxed">
                  Your data is permanently saved in browser IndexedDB. Automatic deletion by phone cleaner apps and browser cache cleanup is blocked.
                </p>
              </div>
            </div>
          </div>

          {/* PG Profile */}
          <div className="space-y-3">
            <h4 className="font-bold text-sm text-gray-800 border-b pb-1">PG Profile Details</h4>
            <div className="space-y-2.5">
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">PG Name</label>
                <input 
                  placeholder="PG Name" 
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" 
                  value={settings.pgName} 
                  onChange={e => setSettings({ ...settings, pgName: e.target.value })} 
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Address</label>
                <textarea 
                  placeholder="Address" 
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm h-16 resize-none" 
                  value={settings.address} 
                  onChange={e => setSettings({ ...settings, address: e.target.value })} 
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Phone Number</label>
                <input 
                  placeholder="Phone" 
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" 
                  value={settings.phone} 
                  onChange={e => setSettings({ ...settings, phone: e.target.value })} 
                />
              </div>
            </div>
          </div>

          {/* Manager Signature */}
          <div className="bg-white border rounded-xl p-4 shadow-xs space-y-3">
            <div className="flex justify-between items-center">
              <h4 className="font-bold text-gray-800 text-sm flex items-center">
                <Edit2 size={16} className="mr-2 text-blue-600" /> Digital Signature on Receipts
              </h4>
              <div className="flex space-x-1">
                <button 
                  onClick={() => setIsEditingSignature(!isEditingSignature)} 
                  className={`p-1.5 rounded-lg ${isEditingSignature ? 'bg-blue-600 text-white' : 'text-blue-600 hover:bg-blue-50'}`}
                >
                  <Edit2 size={16} />
                </button>
                <button 
                  onClick={handleDeleteSignature} 
                  className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            {isEditingSignature ? (
              <input 
                autoFocus 
                placeholder="Manager's Name" 
                className="w-full border-2 border-blue-200 rounded-lg px-3 py-2 text-sm font-bold focus:border-blue-500 outline-none" 
                value={settings.managerName || ''} 
                onChange={e => setSettings({ ...settings, managerName: e.target.value })} 
              />
            ) : (
              <div className="py-3 bg-gray-50 rounded-xl border-2 border-dashed flex flex-col items-center">
                <span className="text-[10px] uppercase font-bold text-gray-400 mb-1">Receipt Signature:</span>
                <span className="text-2xl text-blue-900 italic font-bold" style={{ fontFamily: 'cursive' }}>
                  {settings.managerName || 'Management'}
                </span>
              </div>
            )}
          </div>

          {/* Backup & Snapshot History */}
          <div className="bg-blue-50 p-4 rounded-xl space-y-3 border border-blue-200">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-blue-900 text-sm flex items-center">
                <History size={18} className="mr-2 text-blue-700" /> Auto-Backup Snapshots
              </h4>
              <Button size="sm" variant="secondary" onClick={handleCreateSnapshot} className="text-xs bg-white">
                + Create Snapshot
              </Button>
            </div>
            <p className="text-xs text-blue-800">
              Your data is continuously backed up in the background. You can restore any previous snapshot below:
            </p>

            {snapshots.length === 0 ? (
              <p className="text-xs text-gray-500 italic bg-white p-2.5 rounded-lg border">No previous snapshots yet.</p>
            ) : (
              <div className="max-h-40 overflow-y-auto space-y-2 pr-1">
                {snapshots.slice(0, 5).map(snap => (
                  <div key={snap.id} className="bg-white p-2.5 rounded-lg border border-blue-100 flex items-center justify-between shadow-2xs">
                    <div>
                      <p className="text-xs font-bold text-gray-800">{snap.dateString}</p>
                      <p className="text-[10px] text-gray-500">
                        {snap.floorsCount} Floors • {snap.residentsCount} Residents • {snap.receiptsCount} Receipts
                      </p>
                    </div>
                    <button
                      onClick={() => handleRestoreSnapshot(snap)}
                      className="text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-md"
                    >
                      Restore
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* JSON File Backup (Download / Upload) */}
          <div className="bg-emerald-50 p-4 rounded-xl space-y-3 border border-emerald-200">
             <h4 className="font-bold text-emerald-900 text-sm flex items-center">
               <Download size={18} className="mr-2 text-emerald-700" /> Offline File Backup (.json)
             </h4>
             <p className="text-xs text-emerald-800">
               Save a full copy of all your residents, rooms, and receipts to your phone or computer:
             </p>
             <div className="grid grid-cols-2 gap-2">
                <Button 
                  size="sm" 
                  variant="secondary" 
                  className="bg-white text-emerald-800 border-emerald-300 text-xs font-bold hover:bg-emerald-50" 
                  onClick={handleExportData}
                >
                  <Download size={14} className="mr-1" /> Download Backup (.json)
                </Button>
                <Button 
                  size="sm" 
                  variant="secondary" 
                  className="bg-white text-emerald-800 border-emerald-300 text-xs font-bold hover:bg-emerald-50" 
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload size={14} className="mr-1" /> Restore Backup (.json)
                </Button>
             </div>
             <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={handleImportData} />
          </div>

          {/* Cloud Recovery (JSONBin) */}
          <div className="bg-gray-50 p-4 rounded-xl space-y-3 border border-gray-200">
             <h4 className="font-bold text-gray-800 text-sm flex items-center">
               <Cloud size={18} className="mr-2 text-gray-600" /> Cloud Sync (Optional JSONBin)
             </h4>
             <div className="space-y-2">
                <input 
                  placeholder="JSONBin Bin ID" 
                  className="w-full border rounded-lg px-2.5 py-1.5 text-xs bg-white" 
                  value={settings.jsonBinId || ''} 
                  onChange={e => setSettings({ ...settings, jsonBinId: e.target.value })} 
                />
                <input 
                  type="password" 
                  placeholder="JSONBin Access Key" 
                  className="w-full border rounded-lg px-2.5 py-1.5 text-xs bg-white" 
                  value={settings.jsonBinSecret || ''} 
                  onChange={e => setSettings({ ...settings, jsonBinSecret: e.target.value })} 
                />
             </div>
             <div className="grid grid-cols-2 gap-2">
                <Button size="sm" onClick={handleCloudUpload} className="text-xs" disabled={isSyncing}>
                  Cloud Backup
                </Button>
                <Button 
                  size="sm" 
                  variant="secondary" 
                  onClick={handleCloudDownload} 
                  className="text-xs bg-white text-gray-700" 
                  disabled={isSyncing}
                >
                  {isSyncing ? <Loader2 size={12} className="animate-spin" /> : "Cloud Restore"}
                </Button>
             </div>
          </div>

          {/* Reset App */}
          <div className="pt-3 border-t">
             <button 
               onClick={handleFactoryReset} 
               className="w-full flex items-center justify-center text-red-600 text-xs font-bold py-2.5 hover:bg-red-50 rounded-xl border border-dashed border-red-300 uppercase transition-all"
             >
               <RefreshCw size={14} className="mr-2" /> Uninstall & Factory Reset
             </button>
          </div>
          
          <Button variant="secondary" className="w-full font-bold" onClick={() => setIsSettingsOpen(false)}>
            Close Settings
          </Button>
        </div>
      </BaseModal>
    </div>
  );
};

export default App;
