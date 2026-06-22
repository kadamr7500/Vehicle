import React, { useState, useMemo } from "react";
import { ArrowRight, QrCode, ClipboardCheck, LayoutGrid, CheckCircle2, ShieldAlert, AlertCircle, RefreshCw, Calendar, Clock } from "lucide-react";
import { VehicleMaster, VehicleTransaction } from "../types";
import { dbStore } from "../dbStore";
import QrScanner from "./QrScanner";

interface VehicleInViewProps {
  vehicles: VehicleMaster[];
  transactions: VehicleTransaction[];
  onUpdateVehicles: (v: VehicleMaster[]) => void;
  onUpdateTransactions: (t: VehicleTransaction[]) => void;
  currentUser: any;
}

export default function VehicleInView({
  vehicles,
  transactions,
  onUpdateVehicles,
  onUpdateTransactions,
  currentUser,
}: VehicleInViewProps) {
  const [selectedVeh, setSelectedVeh] = useState<VehicleMaster | null>(null);

  // Identify active outbound transaction running for the chosen vehicle
  const activeTx = useMemo<VehicleTransaction | null>(() => {
    if (!selectedVeh) return null;
    return transactions.find((tx) => tx.vehicle_id === selectedVeh.id && tx.status === "OUT") || null;
  }, [selectedVeh, transactions]);

  // States
  const [remarks, setRemarks] = useState<string>("");
  const [alert, setAlert] = useState<{ type: "success" | "error" | "warn"; msg: string } | null>(null);

  // Eligible vehicles to return inside (status is currently OUT)
  const eligibleVehicles = useMemo(() => {
    return vehicles.filter((v) => v.status === "OUT");
  }, [vehicles]);

  // Format date helper
  const formatDateTime = (iso: string | null) => {
    if (!iso) return "";
    return new Date(iso).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  // Helper to accurately format duration string
  const calculateDurationStr = (outTimeISO: string, inTimeISO: string): string => {
    const diffMs = new Date(inTimeISO).getTime() - new Date(outTimeISO).getTime();
    if (diffMs <= 0) return "00h 01m";

    const diffHrs = diffMs / (1000 * 60 * 60);
    const hrs = Math.floor(diffHrs);
    const mins = Math.floor((diffHrs % 1) * 60);

    return `${hrs.toString().padStart(2, "0")}h ${mins.toString().padStart(2, "0")}m`;
  };

  // Handle Scan QR callback
  const handleQrLoad = (qrCodeText: string) => {
    setAlert(null);
    const matched = vehicles.find((v) => v.qr_code === qrCodeText);

    if (matched) {
      if (matched.status === "IN") {
        setAlert({
          type: "warn",
          msg: `Check-In Blocked: Vehicle ${matched.vehicle_number} is already in company yard. Try dispatching it OUT first!`,
        });
        dbStore.addAuditLog(currentUser.username, "WARN_ALREADY_IN", `Attempted duplicate inward return scan for inside vehicle: ${matched.vehicle_number}`);
        setSelectedVeh(null);
        return;
      }
      setSelectedVeh(matched);
      setAlert({
        type: "success",
        msg: `QR Code Authenticated: Active dispatch trip found for ${matched.vehicle_number}. Ready for checkout return.`,
      });
    } else {
      setAlert({
        type: "error",
        msg: `Invalid QR Code: "${qrCodeText}" - Vehicle not registered in master system.`,
      });
      setSelectedVeh(null);
    }
  };

  // Manual search selector trigger
  const handleManualSelect = (idStr: string) => {
    setAlert(null);
    if (!idStr) {
      setSelectedVeh(null);
      return;
    }

    const matched = vehicles.find((v) => v.id === parseInt(idStr));
    if (matched) {
      if (matched.status === "IN") {
        setAlert({
          type: "warn",
          msg: `Duplicate Entry Blocked: Vehicle ${matched.vehicle_number} is already parked inside the company.`,
        });
        setSelectedVeh(null);
        return;
      }
      setSelectedVeh(matched);
      setAlert(null);
    }
  };

  // Submit Inward Return (Return back IN)
  const handleCheckIn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVeh || !activeTx) {
      setAlert({ type: "error", msg: "Invalid action. Please select a vehicle with an active out-trip log." });
      return;
    }

    // Secondary security check
    if (selectedVeh.status === "IN") {
      setAlert({ type: "error", msg: "This vehicle is already checked inside. Return is completed." });
      return;
    }

    const inTimeISO = new Date().toISOString();
    const outTimeISO = activeTx.out_time || inTimeISO;
    const tripDuration = calculateDurationStr(outTimeISO, inTimeISO);

    // 1. Complete transaction record
    const updatedTxs = transactions.map((t) => {
      if (t.id === activeTx.id) {
        return {
          ...t,
          in_time: inTimeISO,
          total_duration: tripDuration,
          remarks: remarks.trim() ? `${t.remarks} | Return remarks: ${remarks.trim()}` : t.remarks,
          status: "IN" as const // transaction complete
        };
      }
      return t;
    });

    // 2. Change master vehicle status to IN (inside plant / available again)
    const updatedVehicles = vehicles.map((v) => {
      if (v.id === selectedVeh.id) {
        return { ...v, status: "IN" as const };
      }
      return v;
    });

    // 3. Save to database
    onUpdateTransactions(updatedTxs);
    onUpdateVehicles(updatedVehicles);

    // Save History & Audit logs
    dbStore.addHistory(
      selectedVeh.id, 
      "IN", 
      currentUser.username, 
      `Inward return completed. Spent ${tripDuration} outside with Supplier: ${activeTx.supplier_name || "N/A"}.`
    );
    dbStore.addAuditLog(
      currentUser.username, 
      "GATE_IN", 
      `Authorized return of vehicle: ${selectedVeh.vehicle_number} from supplier: ${activeTx.supplier_name || "N/A"}`
    );

    setAlert({
      type: "success",
      msg: `Return Authorized! Vehicle ${selectedVeh.vehicle_number} marked inside plant at ${new Date(inTimeISO).toLocaleTimeString()} (Trip Duration: ${tripDuration}).`,
    });

    // Reset components form states
    setSelectedVeh(null);
    setRemarks("");
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="border-b border-slate-200 pb-5">
        <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          INWARD RETURN MONITOR (VEHICLE IN)
        </h1>
        <p className="text-xs text-slate-500 font-sans mt-0.5">
          Mark returning vehicles as IN (checked back into our yard) to log their return timestamp, complete active trip logs, and calculate time spent with supplier.
        </p>
      </div>

      {/* Notifications Alert Panel */}
      {alert && (
        <div
          id="gate-in-notification-banner"
          className={`px-4 py-3 rounded-xl flex items-start gap-3 border text-xs leading-relaxed ${
            alert.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : alert.type === "warn"
              ? "bg-amber-50 border-amber-200 text-amber-800"
              : "bg-rose-50 border-rose-200 text-rose-850"
          }`}
        >
          {alert.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          ) : alert.type === "warn" ? (
            <ShieldAlert className="w-5 h-5 text-amber-600 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
          )}
          <div className="font-sans font-bold">
            {alert.msg}
          </div>
        </div>
      )}

      {/* Primary QR Scanning Section */}
      <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl">
        <div className="flex items-center gap-2 mb-4">
          <QrCode className="w-5 h-5 text-indigo-600" />
          <h2 className="text-sm font-extrabold text-slate-900 tracking-wider uppercase font-mono">
            HARDWARE COM PORT SERIAL SCANNER LINK (VEHICLE IN RETURN)
          </h2>
        </div>
        <QrScanner onScanSuccess={handleQrLoad} activeMode="IN" />
      </div>

      {/* Workflow split grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Manual selection lookup column */}
        <div className="lg:col-span-4 bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
          <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100">
            <LayoutGrid className="w-4 h-4 text-blue-600" />
            <h3 className="text-xs font-black text-slate-850 tracking-wider uppercase">
              Vehicles on Outer Trips
            </h3>
          </div>

          <div className="space-y-4">
            <p className="text-xxs text-slate-500 leading-normal font-sans">
              Choose from the index profile directory of vehicles currently outside the premises with suppliers.
            </p>

            <div>
              <label className="block text-xxs font-black text-slate-400 uppercase tracking-widest mb-1.5 font-mono">
                Vehicles currently OUT
              </label>
              <select
                id="manual-vehicle-select-in"
                value={selectedVeh ? selectedVeh.id : ""}
                onChange={(e) => handleManualSelect(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-blue-500 text-slate-900 font-mono font-bold uppercase cursor-pointer"
              >
                <option value="">-- Choose registration --</option>
                {eligibleVehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.vehicle_number} ({v.driver_name})
                  </option>
                ))}
              </select>
            </div>

            {eligibleVehicles.length === 0 && (
              <p className="text-xxxs text-emerald-600 font-bold border border-emerald-100 bg-emerald-50 p-2 rounded text-center">
                * Note: All fleet vehicles are currently inside company.
              </p>
            )}
          </div>
        </div>

        {/* Transaction details entry form */}
        <div className="lg:col-span-8 bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
          <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100">
            <ClipboardCheck className="w-4 h-4 text-emerald-600" />
            <h3 className="text-xs font-black text-slate-850 tracking-wider uppercase">
              Inward Return Documentation
            </h3>
          </div>

          {!selectedVeh ? (
            <div className="text-center py-12 bg-slate-50 border border-dashed border-slate-200 rounded-xl">
              <p className="text-xs font-bold text-slate-400 uppercase">Awaiting vehicle return scan</p>
              <p className="text-xxs text-slate-400 mt-1 max-w-xs mx-auto font-sans leading-relaxed">
                Aim the secure pass towards the scan console or choose a vehicle from the active outbound directory on the left to confirm cargo returns.
              </p>
            </div>
          ) : !activeTx ? (
            <div className="p-5 bg-rose-50 border border-rose-100 rounded-xl space-y-2">
              <span className="font-extrabold text-xs text-rose-800 uppercase block">No active dispatch log found!</span>
              <p className="text-xxs text-rose-700 leading-relaxed font-sans">
                Wait! Although vehicle <strong>{selectedVeh.vehicle_number}</strong> is flagged OUT, we did not find an active transaction ticket in local records database.
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    // Create an emergency transaction on the fly
                    const emergencyTx: VehicleTransaction = {
                      id: transactions.length > 0 ? Math.max(...transactions.map(t => t.id)) + 1 : 1,
                      vehicle_id: selectedVeh.id,
                      purpose: "Unscheduled Supplier Trip",
                      department: "Security Gatehouse",
                      out_time: new Date(Date.now() - 3600000).toISOString(), // mock 1 hour ago
                      in_time: null,
                      total_duration: null,
                      remarks: "Emergency manual trip generation",
                      status: "OUT",
                      supplier_name: "Unknown Supplier"
                    };
                    onUpdateTransactions([...transactions, emergencyTx]);
                  }}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded text-xxs font-black uppercase tracking-wider cursor-pointer font-mono"
                >
                  Generate Emergency Outward Ticket
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleCheckIn} className="space-y-5">
              
              {/* Loaded vehicle snapshot */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-sky-50 border border-sky-150 rounded-xl p-4 text-xs">
                <div>
                  <span className="text-xxs text-slate-400 font-bold uppercase block font-sans">Plate Number</span>
                  <span className="font-black text-slate-900 uppercase font-mono">{selectedVeh.vehicle_number}</span>
                </div>
                <div>
                  <span className="text-xxs text-slate-400 font-bold uppercase block font-sans">Driver Name</span>
                  <span className="font-bold text-slate-800 truncate block">{selectedVeh.driver_name}</span>
                </div>
                <div>
                  <span className="text-xxs text-slate-400 font-bold block uppercase font-sans">DISPATCHED TO</span>
                  <span className="font-bold text-indigo-700 block truncate font-mono uppercase bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded text-xxs mt-0.5">
                    {activeTx.supplier_name || "N/A"}
                  </span>
                </div>
                <div>
                  <span className="text-xxs text-slate-400 font-bold uppercase block font-sans">DISPATCH TIME</span>
                  <span className="font-mono font-bold text-slate-800 mt-0.5 block">
                    {formatDateTime(activeTx.out_time)}
                  </span>
                </div>
              </div>

              {/* OUT TO WHICH SUPPLIER (Preview detail) */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xxs text-slate-650 space-y-1">
                <div className="flex items-center gap-1.5 text-slate-800 font-bold mb-1">
                  <Calendar className="w-3.5 h-3.5 text-blue-600" />
                  <span>Outbound Trip Parameters Details:</span>
                </div>
                <div>
                  <span className="font-semibold">Supplier/Vendor Destination:</span> <span className="font-bold text-slate-900 uppercase">{activeTx.supplier_name}</span>
                </div>
                <div>
                  <span className="font-semibold">Original Purpose:</span> {activeTx.purpose}
                </div>
                <div>
                  <span className="font-semibold">Dispatch Remarks:</span> "{activeTx.remarks || 'No dispatch remarks.'}"
                </div>
              </div>

              {/* Duration spent outside indicator ticker */}
              <div className="p-3 bg-[#EEF2F6] border border-slate-250 text-xxs rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-600 animate-spin duration-1000 origin-center" />
                  <div>
                    <span className="block font-black text-slate-800 tracking-wide uppercase font-mono">Elapsed Trip Duration</span>
                    <span className="text-[10px] text-slate-500 font-sans">Total elapsed time outside manufacturing gates</span>
                  </div>
                </div>
                <span className="text-sm font-mono font-black text-slate-900 bg-white border border-slate-300 px-3 py-1 rounded-lg">
                  {calculateDurationStr(activeTx.out_time || "", new Date().toISOString())}
                </span>
              </div>

              <div>
                <label className="block text-xxs font-black text-slate-400 uppercase tracking-wider mb-1.5 font-mono">
                  Inward return remarks / return weight / checks
                </label>
                <textarea
                  placeholder="Carrier cargo checks, scrap receipts matches invoice, empty/loaded status confirmed at gate counter..."
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs focus:outline-none focus:border-blue-500 h-22 text-slate-800 font-sans font-medium"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end">
                <button
                  type="submit"
                  id="btn-gate-in-commit"
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xxs font-black uppercase tracking-widest flex items-center gap-1.5 cursor-pointer shadow-sm transition"
                >
                  <span>Authorize Gate Return IN</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

            </form>
          )}

        </div>

      </div>

    </div>
  );
}
