import { useState, useEffect } from "react";
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
import { dbStore } from "./dbStore";
import { User as UserType, VehicleMaster, VehicleTransaction, VehicleHistory, SystemConfig } from "./types";

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

  // Load database on initial mounting
  useEffect(() => {
    setVehicles(dbStore.getVehicles());
    setTransactions(dbStore.getTransactions());
    setHistories(dbStore.getHistory());
    setConfig(dbStore.getConfig());

    // Check if session exists in memory
    const storedSession = sessionStorage.getItem("vms_active_user");
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
    sessionStorage.setItem("vms_active_user", JSON.stringify(user));
  };

  const handleLogout = () => {
    if (currentUser) {
      dbStore.addAuditLog(currentUser.username, "LOGOUT", `Standard terminal session logout completed. `);
    }
    setCurrentUser(null);
    sessionStorage.removeItem("vms_active_user");
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
          />
        );
      default:
        return <div className="text-sm font-sans text-slate-500">Page not found view.</div>;
    }
  };

  // If the user session has not initiated, show the gate credential login directly
  if (!currentUser) {
    return <LoginView onLoginSuccess={handleLoginSuccess} />;
  }

  // Define sidebar menu options mapping roles
  // Admin -> everything
  // Supervisor -> everything except Settings/format DB
  // Operator -> Dashboard, Master, IN, OUT, Live Status, Reports
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
      <aside className="w-full md:w-64 bg-[#0F172A] text-slate-300 flex flex-col justify-between shrink-0 border-r border-slate-800 z-20">
        <div>
          {/* Logo Brand Header */}
          <div className="p-6 border-b border-slate-700/50 flex flex-col items-center justify-center gap-2">
            <Logo theme="dark" height="34px" className="w-full" />
            <div className="w-full text-center">
              <span className="text-[9px] text-slate-400 font-mono tracking-widest font-bold block uppercase">
                SECURE CONTROL GATE
              </span>
            </div>
          </div>

          {/* Nav Items List */}
          <nav className="flex-1 p-4 space-y-2">
            {sidebarNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = activePage === item.title;

              return (
                <button
                  key={item.title}
                  onClick={() => setActivePage(item.title)}
                  id={`nav-link-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-xs font-semibold tracking-wide transition-colors duration-150 cursor-pointer ${
                    isActive
                      ? "bg-blue-600/10 text-blue-400 border-l-2 border-blue-500"
                      : "text-slate-400 hover:bg-slate-800/70 hover:text-slate-200"
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${
                    isActive ? "text-blue-400" : "text-slate-500"
                  }`} />
                  <span>{item.title}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer info: User Snapshot */}
        <div className="p-6 border-t border-slate-700/50 bg-[#0B0F19]">
          <div className="text-[10px] uppercase font-bold text-slate-500 mb-2">Logged in user</div>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center shrink-0 text-slate-300 font-bold text-xs select-none uppercase">
              {currentUser.username[0]}
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-sm text-white font-medium truncate block">
                {currentUser.username}
              </span>
              <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                {currentUser.role}
              </span>
            </div>
          </div>

          <button
            onClick={handleLogout}
            id="btn-gate-logout"
            className="w-full py-2 px-3 bg-red-950/20 border border-red-900/40 hover:bg-red-900/30 text-rose-400 text-[10px] font-bold uppercase tracking-wider rounded transition cursor-pointer flex items-center justify-center gap-2"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Terminal sign-out</span>
          </button>
        </div>
      </aside>

      {/* RIGHT SIDE MAIN CONTENT LAYOUT AREA */}
      <main className="flex-1 min-w-0 p-6 md:p-8 overflow-y-auto max-h-screen bg-[#F8FAFC]">
        <div className="max-w-7xl mx-auto space-y-8">
          {renderActivePage()}
        </div>
      </main>

    </div>
  );
}
