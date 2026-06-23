import { useState, useEffect, useRef } from "react";
import {
  LayoutDashboard,
  Truck,
  ArrowDownRight,
  ArrowUpLeft,
  Eye,
  FileText,
  Settings,
  LogOut,
  ShieldCheck,
  User,
  KeyRound,
  FileJson,
  Database
} from "lucide-react";
import { dbStore, safeSessionStorage } from "./dbStore";
import { User as UserType, VehicleMaster, VehicleTransaction, VehicleHistory, SystemConfig } from "./types";
import { useSerialScanner } from "./hooks/useSerialScanner";

// Page Views
import LoginView from "./components/LoginView";
import Logo from "./components/Logo";
import DashboardView from "./components/DashboardView";
import VehicleMasterView from "./components/VehicleMasterView";
import VehicleInView from "./components/VehicleInView";
import VehicleOutView from "./components/VehicleOutView";
import SqlConsoleView from "./components/SqlConsoleView";
import LiveStatusView from "./components/LiveStatusView";
import ReportsView from "./components/ReportsView";
import SettingsView from "./components/SettingsView";
import ToastContainer, { OverstayToast } from "./components/ToastNotification";

if (typeof window !== "undefined" && !(window as any).appStartTimestamp) {
  (window as any).appStartTimestamp = Date.now();
}

export default function App() {
  // Session Authentication State
  const [currentUser, setCurrentUser] = useState<UserType | null>(null);

  // Core database tables states
  const [vehicles, setVehicles] = useState<VehicleMaster[]>([]);
  const [transactions, setTransactions] = useState<VehicleTransaction[]>([]);
  const [histories, setHistories] = useState<VehicleHistory[]>([]);
  const [config, setConfig] = useState<SystemConfig>({
    overstayHours: 4,
    autoBackupEnabled: true,
    shiftSchedule: "A",
    darkMode: false,
  });

  // Navigation page state
  const [activePage, setActivePage] = useState<string>("Dashboard");

  // Instantiating background serial scanner connections
  const [lastInwardScan, setLastInwardScan] = useState<string | null>(null);
  const [lastOutwardScan, setLastOutwardScan] = useState<string | null>(null);

  const inletScanner = useSerialScanner((code) => {
    setLastInwardScan(code);
  }, "inlet");

  const outletScanner = useSerialScanner((code) => {
    setLastOutwardScan(code);
  }, "outlet");

  // Real-time overstay alert checks
  const [activeToasts, setActiveToasts] = useState<OverstayToast[]>([]);
  const alertedTransactions = useRef<Set<number>>(new Set());

  useEffect(() => {
    const checkOverstays = () => {
      if (transactions.length === 0) return;

      const appLoadTime = (window as any).appStartTimestamp || Date.now();
      const seedBase = new Date("2026-06-22T08:46:33-07:00").getTime();
      const elapsed = Date.now() - appLoadTime;
      const simulatedNow = seedBase + elapsed;

      const currentOverstayTxMap = new Map<number, { durationText: string }>();

      transactions.forEach((tx) => {
        if (tx.status !== "OUT" || !tx.out_time) return;

        const departureTime = new Date(tx.out_time).getTime();
        const isSeeded = departureTime < new Date("2026-06-23T00:00:00Z").getTime();
        
        const referenceNow = isSeeded ? simulatedNow : Date.now();
        const stayHours = (referenceNow - departureTime) / (1000 * 60 * 60);

        if (stayHours > config.overstayHours) {
          const stayHrsInt = Math.floor(stayHours);
          const stayMins = Math.floor((stayHours % 1) * 60);
          currentOverstayTxMap.set(tx.id, {
            durationText: `${stayHrsInt}h ${stayMins}m`
          });
        }
      });

      // 1. Automatically clear/update toasts that are no longer overstaying
      setActiveToasts((prev) => {
        const filtered = prev.filter((toast) => {
          const match = toast.id.match(/^overstay-(\d+)-/);
          if (!match) return true;
          const txId = parseInt(match[1]);
          
          const isOverstaying = currentOverstayTxMap.has(txId);
          if (!isOverstaying) {
            alertedTransactions.current.delete(txId);
          }
          return isOverstaying;
        });

        // Update the duration text of existing toasts so they increment in real-time
        return filtered.map((toast) => {
          const match = toast.id.match(/^overstay-(\d+)-/);
          if (!match) return toast;
          const txId = parseInt(match[1]);
          const latestInfo = currentOverstayTxMap.get(txId);
          if (latestInfo && latestInfo.durationText !== toast.durationText) {
            return { ...toast, durationText: latestInfo.durationText };
          }
          return toast;
        });
      });

      // 2. Trigger new toast alerts
      const newToasts: OverstayToast[] = [];
      currentOverstayTxMap.forEach((info, txId) => {
        if (!alertedTransactions.current.has(txId)) {
          alertedTransactions.current.add(txId);
          
          const tx = transactions.find((t) => t.id === txId);
          if (!tx) return;
          const v = vehicles.find((veh) => veh.id === tx.vehicle_id);

          newToasts.push({
            id: `overstay-${txId}-${Date.now()}`,
            vehicleNumber: v?.vehicle_number || "Unknown Vehicle",
            driverName: v?.driver_name || "Unknown Driver",
            supplierName: tx.supplier_name || "Unknown Supplier",
            durationText: info.durationText,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
          });
        }
      });

      if (newToasts.length > 0) {
        setActiveToasts((prev) => [...prev, ...newToasts]);
      }
    };

    checkOverstays();

    const timer = setInterval(checkOverstays, 2000);
    return () => clearInterval(timer);
  }, [transactions, vehicles, config.overstayHours]);

  const handleDismissToast = (id: string) => {
    setActiveToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Load database on initial mounting
  useEffect(() => {
    setVehicles(dbStore.getVehicles());
    setTransactions(dbStore.getTransactions());
    setHistories(dbStore.getHistory());
    setConfig(dbStore.getConfig());

    // Check if session exists in memory
    const storedSession = safeSessionStorage.getItem("vms_active_user");
    if (storedSession) {
      try {
        setCurrentUser(JSON.parse(storedSession));
      } catch (e) {
        console.error("Session parse error", e);
      }
    }
  }, []);

  // Update handlers
  const handleUpdateVehicles = (updated: VehicleMaster[]) => {
    dbStore.saveVehicles(updated);
    setVehicles(updated);
  };

  const handleUpdateTransactions = (updated: VehicleTransaction[]) => {
    dbStore.saveTransactions(updated);
    setTransactions(updated);
  };

  const handleUpdateConfig = (updated: SystemConfig) => {
    dbStore.saveConfig(updated);
    setConfig(updated);
  };

  const handleResetDatabase = () => {
    dbStore.resetToDefault();
    setVehicles(dbStore.getVehicles());
    setTransactions(dbStore.getTransactions());
    setHistories(dbStore.getHistory());
    setConfig(dbStore.getConfig());
  };

  const handleLoginSuccess = (user: UserType) => {
    setCurrentUser(user);
    safeSessionStorage.setItem("vms_active_user", JSON.stringify(user));
  };

  const handleLogout = () => {
    if (currentUser) {
      dbStore.addAuditLog(currentUser.username, "LOGOUT", `Standard terminal session logout completed. `);
    }
    setCurrentUser(null);
    safeSessionStorage.removeItem("vms_active_user");
  };

  // Safe navigation renderer
  const renderActivePage = () => {
    switch (activePage) {
      case "Dashboard":
        return (
          <DashboardView
            vehicles={vehicles}
            transactions={transactions}
            onNavigate={(p) => setActivePage(p)}
            overstayHoursThreshold={config.overstayHours}
          />
        );
      case "Vehicle Master":
        return (
          <VehicleMasterView
            vehicles={vehicles}
            onUpdateVehicles={handleUpdateVehicles}
            currentUser={currentUser}
          />
        );
      case "Vehicle IN":
        return (
          <VehicleInView
            vehicles={vehicles}
            transactions={transactions}
            onUpdateVehicles={handleUpdateVehicles}
            onUpdateTransactions={handleUpdateTransactions}
            currentUser={currentUser}
            lastInwardScan={lastInwardScan}
            onClearInwardScan={() => setLastInwardScan(null)}
            inletScannerState={inletScanner}
          />
        );
      case "Vehicle OUT":
        return (
          <VehicleOutView
            vehicles={vehicles}
            transactions={transactions}
            onUpdateVehicles={handleUpdateVehicles}
            onUpdateTransactions={handleUpdateTransactions}
            currentUser={currentUser}
            lastOutwardScan={lastOutwardScan}
            onClearOutwardScan={() => setLastOutwardScan(null)}
            outletScannerState={outletScanner}
          />
        );
      case "Live Status":
        return (
          <LiveStatusView
            vehicles={vehicles}
            transactions={transactions}
            overstayHoursThreshold={config.overstayHours}
          />
        );
      case "Reports":
        return (
          <ReportsView
            vehicles={vehicles}
            transactions={transactions}
            histories={histories}
            overstayHoursThreshold={config.overstayHours}
          />
        );
      case "Local SQL Console":
        return (
          <SqlConsoleView
            vehicles={vehicles}
            transactions={transactions}
            histories={histories}
            currentUser={currentUser}
            onUpdateVehicles={handleUpdateVehicles}
            onUpdateTransactions={handleUpdateTransactions}
            onRefreshAll={() => {
              setVehicles(dbStore.getVehicles());
              setTransactions(dbStore.getTransactions());
              setHistories(dbStore.getHistory());
            }}
          />
        );
      case "Settings":
        return (
          <SettingsView
            config={config}
            onUpdateConfig={handleUpdateConfig}
            currentUser={currentUser}
            onResetDatabase={handleResetDatabase}
            vehicles={vehicles}
            inletScanner={inletScanner}
            outletScanner={outletScanner}
          />
        );
      default:
        return <div className="text-sm font-sans text-slate-500">Page not found view.</div>;
    }
  };

  // Digital Clock state
  const [liveTime, setLiveTime] = useState<Date>(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setLiveTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // If the user session has not initiated, show the gate credential login directly
  if (!currentUser) {
    return <LoginView onLoginSuccess={handleLoginSuccess} />;
  }

  // Define sidebar menu options mapping roles
  const sidebarNavItems = [
    { title: "Dashboard", icon: LayoutDashboard },
    { title: "Vehicle Master", icon: Truck },
    { title: "Vehicle IN", icon: ArrowDownRight },
    { title: "Vehicle OUT", icon: ArrowUpLeft },
    { title: "Live Status", icon: Eye },
    { title: "Reports", icon: FileText },
    { title: "Settings", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col md:flex-row relative font-sans text-slate-800">
      
      {/* LEFT SIDEBAR: GEOMETRIC DARK INDUSTRIAL PANEL */}
      <aside className="w-full md:w-64 bg-[#0B0F19] text-slate-300 flex flex-col justify-between shrink-0 border-r border-slate-800/80 z-20">
        <div>
          {/* Logo Brand Header */}
          <div className="p-5 border-b border-slate-800/60 bg-[#090D15] flex flex-col items-center justify-center gap-1">
            <Logo theme="dark" height="28px" className="w-full" />
            <div className="w-full text-center mt-1">
              <span className="text-[8.5px] text-blue-400 font-mono tracking-widest font-black block uppercase">
                AUTOMATED GATE v2.0
              </span>
            </div>
          </div>

          {/* Nav Items List */}
          <nav className="flex-1 p-4 space-y-1.5">
            {sidebarNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = activePage === item.title;

              return (
                <button
                  key={item.title}
                  onClick={() => setActivePage(item.title)}
                  id={`nav-link-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold tracking-wide transition-all duration-150 cursor-pointer ${
                    isActive
                      ? "bg-blue-600 text-white shadow-md shadow-blue-900/10"
                      : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 shrink-0`} />
                    <span>{item.title}</span>
                  </div>
                  {/* Quick indicator alerts directly on nav items */}
                  {item.title === "Vehicle IN" && lastInwardScan && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                  )}
                  {item.title === "Vehicle OUT" && lastOutwardScan && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer info: User Snapshot */}
        <div className="p-5 border-t border-slate-800/60 bg-[#070A11]">
          <div className="text-[8px] uppercase font-mono font-black tracking-widest text-slate-500 mb-2">Gate Officer</div>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8.5 h-8.5 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 text-blue-400 font-black text-sm select-none uppercase">
              {currentUser?.username?.[0] || "?"}
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-xs text-slate-100 font-bold truncate block">
                {currentUser?.username || "Guest"}
              </span>
              <span className="text-[9px] text-slate-400 font-mono block mt-0.5 uppercase tracking-wider">
                {currentUser?.role || "Operator"} ID
              </span>
            </div>
          </div>

          <button
            onClick={handleLogout}
            id="btn-gate-logout"
            className="w-full py-2.5 px-3 border border-slate-800 hover:bg-slate-800/50 text-slate-400 hover:text-rose-400 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>TERMINAL EXIT</span>
          </button>
        </div>
      </aside>

      {/* RIGHT SIDE MAIN CONTENT LAYOUT AREA */}
      <main className="flex-1 min-w-0 flex flex-col h-screen overflow-hidden bg-[#F8FAFC]">
        {/* Dynamic Industrial Grade Top Status bar */}
        <header className="bg-white border-b border-slate-150 px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4 shrink-0 shadow-xs">
          
          {/* Plant identifier snapshot */}
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
              <Database className="w-4.5 h-4.5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-black text-slate-800 uppercase tracking-widest font-mono">NORTH GATE TERMINAL</span>
                <span className="text-[8px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold font-sans uppercase border border-emerald-150">
                  SYSTEM ONLINE
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium font-sans">
                Active Schedule Shift: <strong className="font-bold text-slate-600">Shift {config.shiftSchedule}</strong> • Operator: {currentUser?.username || "Guest"}
              </p>
            </div>
          </div>

          {/* Live Scanner Connections Status Row & Clock */}
          <div className="flex flex-wrap items-center gap-4">
            
            {/* Live Dual Scanner Monitors */}
            <div className="flex items-center gap-3 bg-slate-50 border border-slate-200/80 rounded-2xl p-2 px-3 text-xxs font-mono">
              {/* Inlet Gate Scanner */}
              <button 
                onClick={() => setActivePage("Settings")}
                className="flex items-center gap-2 text-left hover:opacity-80 transition cursor-pointer"
                title="Config Gate-In Scanner"
              >
                <div className="w-2.5 h-2.5 rounded-full relative shrink-0">
                  <span className={`absolute inset-0 rounded-full ${inletScanner.isConnected ? "bg-emerald-500 animate-ping" : ""}`} />
                  <span className={`absolute inset-0.5 rounded-full ${inletScanner.isConnected ? "bg-emerald-500" : "bg-slate-350"}`} />
                </div>
                <div>
                  <span className="text-slate-400 block font-mono text-[8px] uppercase font-black leading-none">IN SCANNER</span>
                  <span className="font-bold text-slate-700 text-[9.5px]">
                    {inletScanner.isConnected ? "LIVE (COM)" : "OFFLINE"}
                  </span>
                </div>
              </button>

              <div className="w-px h-6 bg-slate-200" />

              {/* Outlet Gate Scanner */}
              <button 
                onClick={() => setActivePage("Settings")}
                className="flex items-center gap-2 text-left hover:opacity-80 transition cursor-pointer"
                title="Config Gate-Out Scanner"
              >
                <div className="w-2.5 h-2.5 rounded-full relative shrink-0">
                  <span className={`absolute inset-0 rounded-full ${outletScanner.isConnected ? "bg-rose-500 animate-ping" : ""}`} />
                  <span className={`absolute inset-0.5 rounded-full ${outletScanner.isConnected ? "bg-rose-500" : "bg-slate-350"}`} />
                </div>
                <div>
                  <span className="text-slate-400 block font-mono text-[8px] uppercase font-black leading-none">OUT SCANNER</span>
                  <span className="font-bold text-slate-700 text-[9.5px]">
                    {outletScanner.isConnected ? "LIVE (COM)" : "OFFLINE"}
                  </span>
                </div>
              </button>
            </div>

            {/* Dynamic Clock Widget */}
            <div className="bg-[#0B0F19] text-white p-2 px-4 rounded-2xl flex items-center gap-2.5 border border-slate-900 shadow-sm font-mono shrink-0">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse shrink-0" />
              <span className="text-xs font-black text-slate-100 tracking-wider">
                {liveTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              </span>
              <span className="text-[9px] text-slate-400 font-bold tracking-widest hidden sm:inline uppercase">
                {liveTime.toLocaleDateString([], { day: "2-digit", month: "short" })}
              </span>
            </div>

          </div>

        </header>

        {/* Content Container Panel scrollable securely inside layout */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            {renderActivePage()}
          </div>
        </div>
      </main>

      <ToastContainer toasts={activeToasts} onDismiss={handleDismissToast} />
    </div>
  );
}
