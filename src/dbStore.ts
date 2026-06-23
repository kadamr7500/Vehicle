import { User, VehicleMaster, VehicleTransaction, VehicleHistory, AuditLog, SystemConfig } from "./types";

// Safe storage helpers with in-memory fallbacks to prevent SecurityError in sandboxed iframes
const memoryStorage: Record<string, string> = {};
const memorySessionStorage: Record<string, string> = {};

export const safeLocalStorage = {
  getItem(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      return memoryStorage[key] || null;
    }
  },
  setItem(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      memoryStorage[key] = value;
    }
  },
  removeItem(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      delete memoryStorage[key];
    }
  }
};

export const safeSessionStorage = {
  getItem(key: string): string | null {
    try {
      return sessionStorage.getItem(key);
    } catch (e) {
      return memorySessionStorage[key] || null;
    }
  },
  setItem(key: string, value: string): void {
    try {
      sessionStorage.setItem(key, value);
    } catch (e) {
      memorySessionStorage[key] = value;
    }
  },
  removeItem(key: string): void {
    try {
      sessionStorage.removeItem(key);
    } catch (e) {
      delete memorySessionStorage[key];
    }
  }
};

// Base Mock Data Seeds
const DEFAULT_USERS: User[] = [
  { id: 1, username: "admin", password: "admin123", role: "Admin" },
  { id: 2, username: "operator", password: "operator123", role: "Operator" },
  { id: 3, username: "supervisor", password: "supervisor123", role: "Supervisor" }
];

const DEFAULT_VEHICLES: VehicleMaster[] = [
  {
    id: 1,
    vehicle_number: "MH-12-PQ-9876",
    vehicle_type: "Truck-Multi Axle",
    driver_name: "John Doe",
    driver_mobile: "9876543210",
    transporter: "SafeExpress Logistics",
    qr_code: "VEH-MH12PQ9876",
    status: "IN",
    created_date: "2026-06-10T10:00:00-07:00"
  },
  {
    id: 2,
    vehicle_number: "DL-3C-AB-1234",
    vehicle_type: "Container 20ft",
    driver_name: "Bruce Wayne",
    driver_mobile: "9999999999",
    transporter: "Wayne Enterprises Carrier",
    qr_code: "VEH-DL3CAB1234",
    status: "IN",
    created_date: "2026-06-12T11:30:00-07:00"
  },
  {
    id: 3,
    vehicle_number: "HR-26-XY-4567",
    vehicle_type: "Tanker - Chemical",
    driver_name: "Clark Kent",
    driver_mobile: "8888888888",
    transporter: "Metropolis Transport",
    qr_code: "VEH-HR26XY4567",
    status: "IN",
    created_date: "2026-06-15T09:15:00-07:00"
  },
  {
    id: 4,
    vehicle_number: "KA-51-ZZ-5555",
    vehicle_type: "Lorry",
    driver_name: "Diana Prince",
    driver_mobile: "7777777777",
    transporter: "Themyscira Freights",
    qr_code: "VEH-KA51ZZ5555",
    status: "OUT",
    created_date: "2026-06-17T14:20:00-07:00"
  },
  {
    id: 5,
    vehicle_number: "MH-02-EE-8888",
    vehicle_type: "Pickup Truck",
    driver_name: "Peter Parker",
    driver_mobile: "6666666666",
    transporter: "Daily Bugle Dist",
    qr_code: "VEH-MH02EE8888",
    status: "OUT",
    created_date: "2026-06-18T08:00:00-07:00"
  }
];

// Helper to calculate ISO timestamps relative to static current date: 2026-06-22T08:46:33-07:00
const relativeTime = (hoursAgo: number, minutesAgo: number = 0): string => {
  const baseTime = new Date("2026-06-22T08:46:33-07:00");
  baseTime.setHours(baseTime.getHours() - hoursAgo);
  baseTime.setMinutes(baseTime.getMinutes() - minutesAgo);
  return baseTime.toISOString();
};

const DEFAULT_TRANSACTIONS: VehicleTransaction[] = [
  {
    id: 1,
    vehicle_id: 1,
    purpose: "Material Delivery",
    department: "Plant Production Floor",
    out_time: relativeTime(8, 0),
    in_time: relativeTime(6, 0),
    total_duration: "02h 00m",
    remarks: "Delivered metal components. Returned empty.",
    status: "IN",
    supplier_name: "Tata Steel Yard"
  },
  {
    id: 2,
    vehicle_id: 2,
    purpose: "Raw Material Collection",
    department: "Quality & Safety Lab",
    out_time: relativeTime(5, 0),
    in_time: relativeTime(4, 0),
    total_duration: "01h 00m",
    remarks: "Picked up chemical testing kits.",
    status: "IN",
    supplier_name: "Reliance Logistics Division"
  },
  {
    id: 3,
    vehicle_id: 3,
    purpose: "Machine Spares Dispatch",
    department: "Maintenance Workshop",
    out_time: relativeTime(3, 0),
    in_time: relativeTime(2, 0),
    total_duration: "01h 00m",
    remarks: "Supplied drilling equipment parts.",
    status: "IN",
    supplier_name: "Mahindra Auto Spares"
  },
  {
    id: 4,
    vehicle_id: 4,
    purpose: "Plastic Waste Recycling",
    department: "Stores & Warehouse",
    out_time: relativeTime(2, 0),
    in_time: null,
    total_duration: null,
    remarks: "Out for delivering plastic scrap to recycler.",
    status: "OUT",
    supplier_name: "Rushi Polymers Ltd."
  },
  {
    id: 5,
    vehicle_id: 5,
    purpose: "Stationery Pickup",
    department: "Admin Main Office",
    out_time: relativeTime(5, 30), // Sent 5.5 hours ago, still has not returned! (Overstay on trip)
    in_time: null,
    total_duration: null,
    remarks: "Collecting registers and catalog packages.",
    status: "OUT",
    supplier_name: "Kadamb Traders"
  }
];

const DEFAULT_HISTORY: VehicleHistory[] = [
  {
    id: 1,
    vehicle_id: 1,
    action_type: "CREATE",
    action_time: "2026-06-10T10:00:00-07:00",
    username: "admin",
    remarks: "Initial register in master catalog."
  },
  {
    id: 2,
    vehicle_id: 1,
    action_type: "IN",
    action_time: relativeTime(5, 30),
    username: "operator",
    remarks: "Plant Entry Approved under Raw Materials."
  },
  {
    id: 3,
    vehicle_id: 2,
    action_type: "IN",
    action_time: relativeTime(3, 10),
    username: "operator",
    remarks: "Chemical tanker loading access granted."
  },
  {
    id: 4,
    vehicle_id: 3,
    action_type: "IN",
    action_time: relativeTime(0, 45),
    username: "operator",
    remarks: "Parts delivery entry."
  },
  {
    id: 5,
    vehicle_id: 4,
    action_type: "IN",
    action_time: relativeTime(24, 0),
    username: "operator",
    remarks: "Arrival for warehouse cleanup."
  },
  {
    id: 6,
    vehicle_id: 4,
    action_type: "OUT",
    action_time: relativeTime(21, 30),
    username: "supervisor",
    remarks: "Scrap dispatch checked, material verified. Plant Exit Approved."
  }
];

const DEFAULT_AUDIT_LOGS: AuditLog[] = [
  {
    id: 1,
    username: "admin",
    action: "SYSTEM_START",
    timestamp: relativeTime(48, 0),
    details: "Industrial server session restarted successfully."
  },
  {
    id: 2,
    username: "operator",
    action: "LOGIN",
    timestamp: relativeTime(6, 0),
    details: "Shift Operator started login credentials checked."
  }
];

const DEFAULT_CONFIG: SystemConfig = {
  overstayHours: 4,
  autoBackupEnabled: true,
  shiftSchedule: "A",
  darkMode: false
};

// Local storage management class
class VehicleDb {
  private key(name: string): string {
    return `vms_${name}`;
  }

  constructor() {
    this.init();
  }

  private init() {
    if (!safeLocalStorage.getItem(this.key("users"))) {
      safeLocalStorage.setItem(this.key("users"), JSON.stringify(DEFAULT_USERS));
    }
    if (!safeLocalStorage.getItem(this.key("vehicles"))) {
      safeLocalStorage.setItem(this.key("vehicles"), JSON.stringify(DEFAULT_VEHICLES));
    }
    if (!safeLocalStorage.getItem(this.key("transactions"))) {
      safeLocalStorage.setItem(this.key("transactions"), JSON.stringify(DEFAULT_TRANSACTIONS));
    }
    if (!safeLocalStorage.getItem(this.key("history"))) {
      safeLocalStorage.setItem(this.key("history"), JSON.stringify(DEFAULT_HISTORY));
    }
    if (!safeLocalStorage.getItem(this.key("audit_logs"))) {
      safeLocalStorage.setItem(this.key("audit_logs"), JSON.stringify(DEFAULT_AUDIT_LOGS));
    }
    if (!safeLocalStorage.getItem(this.key("config"))) {
      safeLocalStorage.setItem(this.key("config"), JSON.stringify(DEFAULT_CONFIG));
    }
    if (!safeLocalStorage.getItem(this.key("purpose_options"))) {
      safeLocalStorage.setItem(this.key("purpose_options"), JSON.stringify([
        "Supplier Dispatch Delivery",
        "Customer Product Delivery",
        "Raw Material Return",
        "Urgent Repair / Refurbishment",
        "Subcontracting job work",
        "Scrap Disposal Departure",
        "Administrative Transport",
        "Other Outward Trip"
      ]));
    }
    if (!safeLocalStorage.getItem(this.key("department_options"))) {
      safeLocalStorage.setItem(this.key("department_options"), JSON.stringify([
        "Stores & Warehouse",
        "Plant Production Floor",
        "Quality & Safety Lab",
        "Maintenance Workshop",
        "Sales & Logistics",
        "Admin Main Office"
      ]));
    }
  }

  // Generic Get and Set
  private get<T>(name: string): T[] {
    const data = safeLocalStorage.getItem(this.key(name));
    return data ? JSON.parse(data) : [];
  }

  private set<T>(name: string, value: T[]) {
    safeLocalStorage.setItem(this.key(name), JSON.stringify(value));
  }

  // Users
  getUsers(): User[] {
    return this.get<User>("users");
  }

  saveUsers(users: User[]) {
    this.set<User>("users", users);
  }

  // Vehicles
  getVehicles(): VehicleMaster[] {
    return this.get<VehicleMaster>("vehicles");
  }

  saveVehicles(vehicles: VehicleMaster[]) {
    this.set<VehicleMaster>("vehicles", vehicles);
  }

  // Transactions
  getTransactions(): VehicleTransaction[] {
    return this.get<VehicleTransaction>("transactions");
  }

  saveTransactions(txs: VehicleTransaction[]) {
    this.set<VehicleTransaction>("transactions", txs);
  }

  // History
  getHistory(): VehicleHistory[] {
    return this.get<VehicleHistory>("history");
  }

  saveHistory(hist: VehicleHistory[]) {
    this.set<VehicleHistory>("history", hist);
  }

  // Audit Logs
  getAuditLogs(): AuditLog[] {
    return this.get<AuditLog>("audit_logs");
  }

  saveAuditLogs(logs: AuditLog[]) {
    this.set<AuditLog>("audit_logs", logs);
  }

  // Config
  getConfig(): SystemConfig {
    const data = safeLocalStorage.getItem(this.key("config"));
    return data ? JSON.parse(data) : DEFAULT_CONFIG;
  }

  saveConfig(conf: SystemConfig) {
    safeLocalStorage.setItem(this.key("config"), JSON.stringify(conf));
  }

  // Purpose Options
  getPurposes(): string[] {
    const data = safeLocalStorage.getItem(this.key("purpose_options"));
    return data ? JSON.parse(data) : [];
  }

  savePurposes(purposes: string[]) {
    safeLocalStorage.setItem(this.key("purpose_options"), JSON.stringify(purposes));
  }

  // Department Options
  getDepartments(): string[] {
    const data = safeLocalStorage.getItem(this.key("department_options"));
    return data ? JSON.parse(data) : [];
  }

  saveDepartments(departments: string[]) {
    safeLocalStorage.setItem(this.key("department_options"), JSON.stringify(departments));
  }

  // Convenience functions
  addHistory(vehicle_id: number, action_type: string, username: string, remarks: string) {
    const hists = this.getHistory();
    const newHist: VehicleHistory = {
      id: hists.length > 0 ? Math.max(...hists.map(h => h.id)) + 1 : 1,
      vehicle_id,
      action_type,
      action_time: new Date().toISOString(),
      username,
      remarks
    };
    hists.push(newHist);
    this.saveHistory(hists);
  }

  addAuditLog(username: string, action: string, details: string) {
    const logs = this.getAuditLogs();
    const newLog: AuditLog = {
      id: logs.length > 0 ? Math.max(...logs.map(l => l.id)) + 1 : 1,
      username,
      action,
      timestamp: new Date().toISOString(),
      details
    };
    logs.push(newLog);
    this.saveAuditLogs(logs);
  }

  // Backup & Restore
  exportBackupData(): string {
    const data = {
      users: this.getUsers(),
      vehicles: this.getVehicles(),
      transactions: this.getTransactions(),
      history: this.getHistory(),
      audit_logs: this.getAuditLogs(),
      config: this.getConfig(),
      purpose_options: this.getPurposes(),
      department_options: this.getDepartments(),
      backup_date: new Date().toISOString(),
      system: "Vehicle IN OUT Management System"
    };
    return JSON.stringify(data, null, 2);
  }

  restoreBackupData(jsonString: string): boolean {
    try {
      const parsed = JSON.parse(jsonString);
      if (parsed.system !== "Vehicle IN OUT Management System") {
        return false;
      }
      if (parsed.users) this.saveUsers(parsed.users);
      if (parsed.vehicles) this.saveVehicles(parsed.vehicles);
      if (parsed.transactions) this.saveTransactions(parsed.transactions);
      if (parsed.history) this.saveHistory(parsed.history);
      if (parsed.audit_logs) this.saveAuditLogs(parsed.audit_logs);
      if (parsed.config) this.saveConfig(parsed.config);
      if (parsed.purpose_options) this.savePurposes(parsed.purpose_options);
      if (parsed.department_options) this.saveDepartments(parsed.department_options);
      this.addAuditLog("system", "RESTORE_DB", "Database restored successfully from backup file.");
      return true;
    } catch (e) {
      console.error("Restore failed:", e);
      return false;
    }
  }

  resetToDefault() {
    safeLocalStorage.removeItem(this.key("users"));
    safeLocalStorage.removeItem(this.key("vehicles"));
    safeLocalStorage.removeItem(this.key("transactions"));
    safeLocalStorage.removeItem(this.key("history"));
    safeLocalStorage.removeItem(this.key("audit_logs"));
    safeLocalStorage.removeItem(this.key("config"));
    safeLocalStorage.removeItem(this.key("purpose_options"));
    safeLocalStorage.removeItem(this.key("department_options"));
    this.init();
    this.addAuditLog("system", "RESET_DB", "Database reset to factory default values.");
  }
}

export const dbStore = new VehicleDb();
