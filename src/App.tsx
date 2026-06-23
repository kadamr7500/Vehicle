import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpLeft,
  Clock3,
  Eye,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  Truck,
  X,
} from "lucide-react";
import { dbStore } from "./dbStore";
import { User as UserType, UserRole, VehicleMaster, VehicleTransaction, VehicleHistory, SystemConfig } from "./types";

// Page Views
import LoginView from "./components/LoginView";
import Logo from "./components/Logo";

const DashboardView = lazy(() => import("./components/DashboardView"));
const VehicleMasterView = lazy(() => import("./components/VehicleMasterView"));
const VehicleInView = lazy(() => import("./components/VehicleInView"));
const VehicleOutView = lazy(() => import("./components/VehicleOutView"));
const LiveStatusView = lazy(() => import("./components/LiveStatusView"));
const ReportsView = lazy(() => import("./components/ReportsView"));
const SettingsView = lazy(() => import("./components/SettingsView"));

type NavItem = {
  title: string;
  icon: typeof LayoutDashboard;
  roles: UserRole[];
};

const NAV_ITEMS: NavItem[] = [
  { title: "Dashboard", icon: LayoutDashboard, roles: ["Admin", "Supervisor", "Operator"] },
  { title: "Vehicle Master", icon: Truck, roles: ["Admin", "Supervisor", "Operator"] },
  { title: "Vehicle IN", icon: ArrowDownRight, roles: ["Admin", "Supervisor", "Operator"] },
  { title: "Vehicle OUT", icon: ArrowUpLeft, roles: ["Admin", "Supervisor", "Operator"] },
  { title: "Live Status", icon: Eye, roles: ["Admin", "Supervisor", "Operator"] },
  { title: "Reports", icon: FileText, roles: ["Admin", "Supervisor", "Operator"] },
  { title: "Settings", icon: Settings, roles: ["Admin"] },
];

const PAGE_TITLES: Record<string, string> = {
  Dashboard: "Overview of gate activity and vehicle movement",
  "Vehicle Master": "Manage registered vehicles, drivers, and QR identities",
  "Vehicle IN": "Record returning vehicles and close active trips",
  "Vehicle OUT": "Dispatch vehicles with destination and purpose details",
  "Live Status": "Monitor vehicles currently inside or outside the plant",
  Reports: "Review movement history, exports, and audit-ready records",
  Settings: "Configure system thresholds, backups, and master options",
};

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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const allowedNavItems = useMemo(() => {
    if (!currentUser) return [];
    return NAV_ITEMS.filter((item) => item.roles.includes(currentUser.role));
  }, [currentUser]);

  const activeNavItem = allowedNavItems.find((item) => item.title === activePage);
  const activeSubtitle = PAGE_TITLES[activePage] ?? "Secure vehicle movement workspace";

  const headerStats = useMemo(() => {
    const vehiclesInside = vehicles.filter((vehicle) => vehicle.status === "IN").length;
    const activeTrips = transactions.filter((tx) => tx.status === "OUT" && !tx.in_time).length;
    const overdueTrips = transactions.filter((tx) => {
      if (tx.status !== "OUT" || !tx.out_time || tx.in_time) return false;
      const elapsedHours = (Date.now() - new Date(tx.out_time).getTime()) / (1000 * 60 * 60);
      return elapsedHours > config.overstayHours;
    }).length;

    return [
      { label: "Inside", value: vehiclesInside, icon: Truck, tone: "text-blue-600 bg-blue-50 border-blue-100" },
      { label: "Active trips", value: activeTrips, icon: Clock3, tone: "text-indigo-600 bg-indigo-50 border-indigo-100" },
      { label: "Overstay", value: overdueTrips, icon: AlertTriangle, tone: "text-amber-600 bg-amber-50 border-amber-100" },
    ];
  }, [config.overstayHours, transactions, vehicles]);

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
        sessionStorage.removeItem("vms_active_user");
      }
    }
  }, []);

  useEffect(() => {
    if (currentUser && allowedNavItems.length > 0 && !activeNavItem) {
      setActivePage("Dashboard");
    }
  }, [activeNavItem, allowedNavItems.length, currentUser]);

  useEffect(() => {
    if (!isSidebarOpen) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsSidebarOpen(false);
      }
    };

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [isSidebarOpen]);

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

  const handleNavigate = (page: string) => {
    setActivePage(page);
    setIsSidebarOpen(false);
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
    setActivePage("Dashboard");
    setIsSidebarOpen(false);
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
            onNavigate={handleNavigate}
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

  const ContentIcon = activeNavItem?.icon ?? LayoutDashboard;
  const useCompactContentShell = activePage === "Dashboard" || activePage === "Live Status" || activePage === "Reports";

  return (
    <div className="min-h-screen overflow-hidden bg-[#f4f7fb] font-sans text-slate-800">
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_10%_0%,_rgba(37,99,235,0.20),_transparent_30rem),radial-gradient(circle_at_90%_12%,_rgba(16,185,129,0.14),_transparent_24rem),linear-gradient(135deg,_#f8fafc_0%,_#eef4ff_45%,_#f8fafc_100%)]" />
      <div className="fixed inset-x-0 top-0 pointer-events-none h-64 bg-gradient-to-b from-white/80 to-transparent" />

      {isSidebarOpen && (
        <button
          type="button"
          aria-label="Close navigation overlay"
          className="fixed inset-0 z-30 bg-slate-950/50 backdrop-blur-sm lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <div className="relative flex min-h-screen">
        {/* LEFT SIDEBAR: responsive command navigation */}
        <aside
          id="app-sidebar"
          className={`fixed inset-y-0 left-0 z-40 flex w-[18rem] -translate-x-full flex-col justify-between overflow-hidden border-r border-white/10 bg-slate-950 text-slate-300 shadow-2xl shadow-slate-950/40 transition-transform duration-300 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${isSidebarOpen ? "translate-x-0" : ""
            }`}
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.24),_transparent_18rem),radial-gradient(circle_at_bottom_right,_rgba(16,185,129,0.14),_transparent_16rem),linear-gradient(180deg,_rgba(15,23,42,0)_0%,_rgba(2,6,23,0.74)_100%)]" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-blue-400/40 to-transparent" />

          <div className="relative min-h-0 flex-1 overflow-y-auto">
            {/* Logo Brand Header */}
            <div className="border-b border-white/10 bg-gradient-to-br from-white/[0.10] to-transparent p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <Logo theme="dark" height="38px" className="w-full max-w-[205px]" />
                  <p className="mt-3 text-xs font-semibold leading-relaxed text-slate-400">
                    Gate operations, vehicle movement, and reports in one secure workspace.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-emerald-300">
                      <Activity className="h-3 w-3" />
                      Secure Control Gate
                    </div>
                    <div className="inline-flex items-center rounded-full border border-blue-400/20 bg-blue-400/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-blue-200">
                      Shift {config.shiftSchedule}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  aria-label="Close navigation"
                  onClick={() => setIsSidebarOpen(false)}
                  className="rounded-xl border border-white/10 p-2 text-slate-400 transition hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-blue-400/70 lg:hidden"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="px-4 pb-2 pt-4">
              <div className="flex items-center justify-between px-1">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">Main Menu</p>
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-bold text-slate-400">
                  {allowedNavItems.length} modules
                </span>
              </div>
            </div>

            {/* Nav Items List */}
            <nav className="space-y-1.5 px-4 pb-5" aria-label="Primary navigation">
              {allowedNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = activePage === item.title;

                return (
                  <button
                    key={item.title}
                    onClick={() => handleNavigate(item.title)}
                    id={`nav-link-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
                    aria-current={isActive ? "page" : undefined}
                    className={`group relative flex w-full items-center gap-3 overflow-hidden rounded-2xl px-3.5 py-3 text-left text-sm font-semibold tracking-wide transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400/70 ${isActive
                      ? "bg-white text-slate-950 shadow-xl shadow-blue-950/25 ring-1 ring-white/40"
                      : "text-slate-400 hover:bg-white/[0.08] hover:text-white"
                      }`}
                  >
                    {isActive && <span className="absolute inset-y-2 left-0 w-1 rounded-r-full bg-blue-500" />}
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition ${isActive
                        ? "bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25"
                        : "bg-white/5 text-slate-400 ring-1 ring-white/5 group-hover:bg-white/10 group-hover:text-white"
                        }`}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate">{item.title}</span>
                      <span className={`mt-0.5 block text-[10px] font-bold uppercase tracking-[0.16em] ${isActive ? "text-blue-600" : "text-slate-600 group-hover:text-slate-400"}`}>
                        {isActive ? "Selected" : "Open"}
                      </span>
                    </span>
                    <span className={`h-2 w-2 rounded-full transition ${isActive ? "bg-blue-500" : "bg-slate-700 group-hover:bg-blue-400"}`} />
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Footer info: User Snapshot */}
          <div className="relative border-t border-white/10 bg-slate-950/90 p-4">
            <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-4 shadow-inner shadow-white/5">
              <div className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Logged in user</div>
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-blue-400/20 bg-gradient-to-br from-blue-500 to-indigo-600 text-sm font-black uppercase text-white shadow-lg shadow-blue-950/40 select-none">
                  {currentUser.username[0]}
                </div>
                <div className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold text-white">
                    {currentUser.username}
                  </span>
                  <span className="mt-1 inline-flex rounded-full bg-slate-800 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-300">
                    {currentUser.role}
                  </span>
                </div>
              </div>

              <button
                onClick={handleLogout}
                id="btn-gate-logout"
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-rose-400/20 bg-rose-500/10 px-3 py-2.5 text-[11px] font-black uppercase tracking-[0.16em] text-rose-300 transition hover:border-rose-300/40 hover:bg-rose-500/20 hover:text-rose-200 focus:outline-none focus:ring-2 focus:ring-rose-300/70"
              >
                <LogOut className="h-4 w-4" />
                <span>Terminal sign-out</span>
              </button>
            </div>
          </div>
        </aside>

        {/* RIGHT SIDE MAIN CONTENT LAYOUT AREA */}
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 border-b border-white/70 bg-white/85 px-4 py-3 shadow-sm shadow-slate-200/70 backdrop-blur-xl lg:px-8">
            <div className="mx-auto flex max-w-[1500px] flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <button
                  type="button"
                  aria-label="Open navigation"
                  aria-controls="app-sidebar"
                  aria-expanded={isSidebarOpen}
                  onClick={() => setIsSidebarOpen(true)}
                  className="rounded-2xl border border-slate-200 bg-white p-2.5 text-slate-600 shadow-sm transition hover:border-blue-200 hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400/70 lg:hidden"
                >
                  <Menu className="h-5 w-5" />
                </button>
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-600 shadow-sm max-sm:hidden">
                  <ContentIcon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-blue-600">Vehicle Control System</p>
                  <h1 className="truncate text-xl font-black tracking-tight text-slate-950 sm:text-2xl">{activePage}</h1>
                  <p className="mt-1 hidden max-w-2xl text-sm font-medium text-slate-500 sm:block">{activeSubtitle}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 sm:flex sm:items-center sm:justify-end">
                {headerStats.map((stat) => {
                  const Icon = stat.icon;

                  return (
                    <div
                      key={stat.label}
                      className={`flex items-center gap-2 rounded-2xl border px-3 py-2 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${stat.tone}`}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <div className="min-w-0">
                        <div className="text-sm font-black leading-none sm:text-base">{stat.value}</div>
                        <div className="mt-0.5 truncate text-[10px] font-bold uppercase tracking-wide opacity-80">{stat.label}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </header>

          <main className="min-w-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6 lg:max-h-screen lg:px-8 lg:py-8">
            <div className="mx-auto mb-5 max-w-[1500px] overflow-hidden rounded-[2rem] border border-white/80 bg-slate-950 shadow-xl shadow-slate-200/70">
              <div className="relative p-5 sm:p-6">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.30),_transparent_25rem),radial-gradient(circle_at_bottom_right,_rgba(16,185,129,0.16),_transparent_22rem)]" />
                <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.26em] text-blue-300">Industrial Gate Command Center</p>
                    <h2 className="mt-1 text-2xl font-black tracking-tight text-white sm:text-3xl">Vehicle Movement Operations</h2>
                    <p className="mt-2 max-w-3xl text-sm font-medium leading-relaxed text-slate-300">
                      Real-time dispatch, inward return, overstay monitoring, and audit reporting for plant logistics teams.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-200">Live System</span>
                    <span className="rounded-full border border-blue-400/20 bg-blue-400/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-blue-200">Shift {config.shiftSchedule}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mx-auto mb-5 grid max-w-[1500px] grid-cols-1 gap-3 md:grid-cols-3">
              {headerStats.map((stat) => {
                const Icon = stat.icon;

                return (
                  <div
                    key={`main-${stat.label}`}
                    className={`rounded-3xl border bg-white/90 p-5 shadow-lg shadow-slate-200/60 backdrop-blur transition hover:-translate-y-0.5 hover:shadow-xl ${stat.tone}`}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.18em] opacity-80">{stat.label}</p>
                        <p className="mt-2 text-3xl font-black leading-none">{stat.value}</p>
                      </div>
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/70 shadow-sm">
                        <Icon className="h-5 w-5" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mx-auto mb-5 grid max-w-[1500px] grid-cols-1 gap-3 md:grid-cols-3">
              <button
                type="button"
                onClick={() => handleNavigate("Vehicle OUT")}
                className="group rounded-3xl border border-white/80 bg-white/90 p-5 text-left shadow-lg shadow-slate-200/60 backdrop-blur transition hover:-translate-y-0.5 hover:shadow-xl"
              >
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-200">
                  <ArrowUpLeft className="h-5 w-5" />
                </div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Quick Dispatch</p>
                <p className="mt-1 text-sm font-bold text-slate-900 group-hover:text-blue-700">Create vehicle OUT record</p>
              </button>
              <button
                type="button"
                onClick={() => handleNavigate("Vehicle IN")}
                className="group rounded-3xl border border-white/80 bg-white/90 p-5 text-left shadow-lg shadow-slate-200/60 backdrop-blur transition hover:-translate-y-0.5 hover:shadow-xl"
              >
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-200">
                  <ArrowDownRight className="h-5 w-5" />
                </div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Fast Return</p>
                <p className="mt-1 text-sm font-bold text-slate-900 group-hover:text-emerald-700">Close active vehicle trip</p>
              </button>
              <button
                type="button"
                onClick={() => handleNavigate("Reports")}
                className="group rounded-3xl border border-white/80 bg-white/90 p-5 text-left shadow-lg shadow-slate-200/60 backdrop-blur transition hover:-translate-y-0.5 hover:shadow-xl"
              >
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-lg shadow-slate-300">
                  <FileText className="h-5 w-5" />
                </div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Audit Center</p>
                <p className="mt-1 text-sm font-bold text-slate-900 group-hover:text-slate-700">Review and export reports</p>
              </button>
            </div>

            <div
              className={`mx-auto max-w-[1500px] ${useCompactContentShell
                ? "space-y-6"
                : "rounded-[2rem] border border-white/80 bg-white/80 p-4 shadow-xl shadow-slate-200/70 backdrop-blur sm:p-6 lg:p-8"
                }`}
            >
              <Suspense
                fallback={
                  <div className="flex min-h-[320px] items-center justify-center rounded-[2rem] border border-white/80 bg-white/80 p-8 shadow-xl shadow-slate-200/70 backdrop-blur">
                    <div className="text-center">
                      <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-blue-100 border-t-blue-600" />
                      <p className="text-sm font-bold text-slate-600">Loading {activePage}...</p>
                    </div>
                  </div>
                }
              >
                {renderActivePage()}
              </Suspense>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
