export type UserRole = "Admin" | "Operator" | "Supervisor";

export interface User {
  id: number;
  username: string;
  password?: string;
  role: UserRole;
}

export interface VehicleMaster {
  id: number;
  vehicle_number: string;
  vehicle_type: string;
  driver_name: string;
  driver_mobile: string;
  transporter: string;
  qr_code: string; // The text content inside the QR code
  status: "OUT" | "IN"; // Current location status
  created_date: string; // ISO String
}

export interface VehicleTransaction {
  id: number;
  vehicle_id: number;
  purpose: string;
  department: string;
  in_time: string | null; // ISO String - return time (null when vehicle is OUT)
  out_time: string | null; // ISO String - dispatch/exit time
  total_duration: string | null; // e.g. "02:15:30" or duration in text
  remarks: string;
  status: "IN" | "OUT"; // "OUT" means active outbound trip, "IN" means completed trip (returned to company)
  supplier_name?: string; // The supplier/vendor the vehicle was sent to
}

export interface VehicleHistory {
  id: number;
  vehicle_id: number;
  action_type: string; // "IN", "OUT", "CREATE", "EDIT", "DELETE"
  action_time: string; // ISO String
  username: string;
  remarks: string;
}

export interface AuditLog {
  id: number;
  username: string;
  action: string;
  timestamp: string;
  details: string;
}

// Support configurations
export interface SystemConfig {
  overstayHours: number; // default 4
  autoBackupEnabled: boolean;
  shiftSchedule: "A" | "B" | "C";
  darkMode: boolean;
}
