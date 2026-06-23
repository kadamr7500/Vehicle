import React, { useState, useMemo } from "react";
import { ArrowRight, QrCode, ClipboardCheck, LayoutGrid, CheckCircle2, ShieldAlert, AlertCircle, RefreshCw, Calendar, Clock, RadioTower, ScanLine } from "lucide-react";
import { VehicleMaster, VehicleTransaction } from "../types";
import { dbStore } from "../dbStore";
import ScannerStatusBadge from "./ScannerStatusBadge";

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
      <div className="overflow-hidden rounded-[2rem] border border-slate-800/70 bg-slate-950 shadow-2xl shadow-slate-300/70">
        <div className="relative p-5 sm:p-6 lg:p-7">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.32),_transparent_24rem),radial-gradient(circle_at_bottom_right,_rgba(59,130,246,0.22),_transparent_22rem)]" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-lg shadow-emerald-950/30 ring-1 ring-white/15">
                <RadioTower className="h-7 w-7" />
              </div>
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.26em] text-emerald-300">Vehicle IN Command Desk</p>
                <h1 className="mt-1 text-2xl font-black tracking-tight text-white sm:text-3xl">
                  Return Authorization & Trip Closure
                </h1>
                <p className="mt-2 max-w-3xl text-sm font-medium leading-relaxed text-slate-300">
                  Fast inward processing for vehicles returning from suppliers, with controlled manual fallback and scanner status visibility.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:min-w-[340px]">
              <div className="rounded-2xl border border-white/10 bg-white/[0.07] p-4 backdrop-blur">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Awaiting Return</p>
                <p className="mt-1 text-3xl font-black text-white">{eligibleVehicles.length}</p>
              </div>
              <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4 backdrop-blur">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-300">Operation</p>
                <p className="mt-1 text-3xl font-black text-emerald-100">IN</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Notifications Alert Panel */}
      {alert && (
        <div
          id="gate-in-notification-banner"
          className={`px-4 py-3 rounded-xl flex items-start gap-3 border text-xs leading-relaxed ${alert.type === "success"
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

      {/* Inbound scanner status experience */}
      <div className="overflow-hidden rounded-[2rem] border border-emerald-200/80 bg-white shadow-xl shadow-emerald-100/70">
        <div className="relative border-b border-emerald-100 bg-gradient-to-r from-emerald-950 via-emerald-900 to-slate-900 px-5 py-5 text-white sm:px-6">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(16,185,129,0.35),_transparent_18rem)]" />
          <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-400 text-emerald-950 shadow-lg shadow-emerald-950/30">
                <ScanLine className="h-6 w-6" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-200">Inbound Scanner Lane</p>
                <h2 className="mt-1 text-lg font-black tracking-tight text-white">Gate Entry & Material Receipt Verification</h2>
                <p className="mt-1 max-w-3xl text-xs font-semibold leading-relaxed text-emerald-100/80">
                  Use this inbound desk for returning vehicles, supplier validation, material receipt checks, and final entry status confirmation.
                </p>
              </div>
            </div>
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-300/30 bg-emerald-300/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-100">
              <QrCode className="h-3.5 w-3.5" />
              Connection managed in Settings
            </div>
          </div>
        </div>
        <div className="grid gap-3 p-5 md:grid-cols-4">
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-700">Entry Status</p>
            <p className="mt-1 text-lg font-black text-emerald-950">Inbound</p>
            <p className="mt-2 text-[10px] font-semibold text-emerald-700/80">Ready for gate entry</p>
          </div>
          <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-700">Validation</p>
            <p className="mt-1 text-lg font-black text-blue-950">Supplier Return</p>
            <p className="mt-2 text-[10px] font-semibold text-blue-700/80">Match active out-trip</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Receipt Check</p>
            <p className="mt-1 text-lg font-black text-slate-900">Material IN</p>
            <p className="mt-2 text-[10px] font-semibold text-slate-500">Remarks before closure</p>
          </div>
          <ScannerStatusBadge />
        </div>
      </div>

      {/* Workflow split grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        {/* Manual selection lookup column */}
        <div className="lg:col-span-4 overflow-hidden rounded-[2rem] border border-white bg-white/95 shadow-xl shadow-slate-200/70 backdrop-blur">
          <div className="border-b border-slate-100 bg-slate-50/80 p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <LayoutGrid className="w-4 h-4 text-emerald-600" />
                <h3 className="text-xs font-black text-slate-850 tracking-wider uppercase">
                  Vehicles on Outer Trips
                </h3>
              </div>
              <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-black text-emerald-700">{eligibleVehicles.length}</span>
            </div>
          </div>
          <div className="p-5">

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
        </div>

        {/* Transaction details entry form */}
        <div className="lg:col-span-8 overflow-hidden rounded-[2rem] border border-white bg-white/95 shadow-xl shadow-slate-200/70 backdrop-blur">
          <div className="border-b border-slate-100 bg-slate-50/80 p-5">
            <div className="flex items-center gap-2">
              <ClipboardCheck className="w-4 h-4 text-emerald-600" />
              <h3 className="text-xs font-black text-slate-850 tracking-wider uppercase">
                Inward Return Documentation
              </h3>
            </div>
          </div>
          <div className="p-5">

            {!selectedVeh ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-14 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-slate-400 shadow-sm">
                  <QrCode className="h-6 w-6" />
                </div>
                <p className="text-sm font-black uppercase tracking-[0.16em] text-slate-500">Awaiting vehicle return</p>
                <p className="mx-auto mt-2 max-w-md text-xs font-medium leading-relaxed text-slate-400">
                  Scan from the centralized Settings scanner station or choose a vehicle from the outbound directory to close the supplier trip.
                </p>
              </div>
            ) : !activeTx ? (
              <div className="space-y-3 rounded-2xl border border-rose-200 bg-rose-50 p-5 shadow-sm">
                <span className="block text-xs font-black uppercase tracking-[0.14em] text-rose-800">No active dispatch log found</span>
                <p className="text-xs font-semibold leading-relaxed text-rose-700">
                  Vehicle <strong>{selectedVeh.vehicle_number}</strong> is flagged OUT, but no active transaction ticket exists in the local database.
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
                <div className="grid grid-cols-1 gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4 text-xs sm:grid-cols-2 xl:grid-cols-4">
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
                <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-650">
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
                <div className="flex flex-col gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-xs sm:flex-row sm:items-center sm:justify-between">
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
                    className="h-24 w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs font-medium text-slate-800 transition focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/10"
                  />
                </div>

                <div className="flex justify-end border-t border-slate-100 pt-4">
                  <button
                    type="submit"
                    id="btn-gate-in-commit"
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-6 py-3.5 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-emerald-200 transition hover:bg-emerald-500 sm:w-auto"
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

    </div>
  );
}
