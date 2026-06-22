import React, { useState, useMemo } from "react";
import { ArrowLeft, QrCode, ClipboardCheck, Clock, CheckCircle2, ShieldAlert, AlertCircle, Building2 } from "lucide-react";
import { VehicleMaster, VehicleTransaction } from "../types";
import { dbStore } from "../dbStore";
import QrScanner from "./QrScanner";

interface VehicleOutViewProps {
  vehicles: VehicleMaster[];
  transactions: VehicleTransaction[];
  onUpdateVehicles: (v: VehicleMaster[]) => void;
  onUpdateTransactions: (t: VehicleTransaction[]) => void;
  currentUser: any;
}

export default function VehicleOutView({
  vehicles,
  transactions,
  onUpdateVehicles,
  onUpdateTransactions,
  currentUser,
}: VehicleOutViewProps) {
  const [selectedVeh, setSelectedVeh] = useState<VehicleMaster | null>(null);
  
  // Under reversed flow, checking OUT starts a new trip.
  // So the vehicle must currently be inside the plant ("IN") to be dispatched outside.
  const eligibleVehicles = useMemo(() => {
    return vehicles.filter((v) => v.status === "IN");
  }, [vehicles]);

  // Dynamic Options
  const purposeOptions = useMemo(() => dbStore.getPurposes(), []);
  const departmentOptions = useMemo(() => dbStore.getDepartments(), []);

  // Form Fields
  const [supplierName, setSupplierName] = useState<string>("");
  const [purpose, setPurpose] = useState<string>(purposeOptions[0] || "Supplier Dispatch Delivery");
  const [department, setDepartment] = useState<string>(departmentOptions[0] || "Stores & Warehouse");
  const [remarks, setRemarks] = useState<string>("");
  const [alert, setAlert] = useState<{ type: "success" | "error" | "warn"; msg: string } | null>(null);

  // Handle scanned QR Code text loader
  const handleQrLoad = (qrCodeText: string) => {
    setAlert(null);
    const matched = vehicles.find((v) => v.qr_code === qrCodeText);

    if (matched) {
      if (matched.status === "OUT") {
        setAlert({
          type: "warn",
          msg: `Check-Out Blocked: Vehicle ${matched.vehicle_number} has already been dispatched OUT of our company! It must return (IN) first.`,
        });
        dbStore.addAuditLog(currentUser.username, "WARN_ALREADY_OUT", `Attempted outbound dispatch for already out vehicle: ${matched.vehicle_number}`);
        setSelectedVeh(null);
        return;
      }
      setSelectedVeh(matched);
      setSupplierName("");
      setAlert({
        type: "success",
        msg: `Vehicle Identified: Loaded profile card for ${matched.vehicle_number}. You can now authorize dispatch parameters.`,
      });
    } else {
      setAlert({
        type: "error",
        msg: `Unrecognized Pass: QR payload "${qrCodeText}" has no matching registered owner.`,
      });
      setSelectedVeh(null);
    }
  };

  // Manual select index selector
  const handleManualSelect = (idStr: string) => {
    setAlert(null);
    if (!idStr) {
      setSelectedVeh(null);
      return;
    }

    const matched = vehicles.find((v) => v.id === parseInt(idStr));
    if (matched) {
      if (matched.status === "OUT") {
        setAlert({
          type: "warn",
          msg: `Check-Out Blocked: Vehicle ${matched.vehicle_number} is currently OUT with a supplier/vendor.`,
        });
        setSelectedVeh(null);
        return;
      }
      setSelectedVeh(matched);
      setSupplierName("");
    }
  };

  // Clear Checkout gates (Submit Outgoing Dispatch)
  const handleCheckOutSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVeh) {
      setAlert({ type: "error", msg: "Invalid checkout submission. Please select or scan a vehicle first." });
      return;
    }

    const cleanSupplier = supplierName.trim();
    if (!cleanSupplier) {
      setAlert({ type: "error", msg: "Please specify the Supplier / Vendor name where the vehicle is being sent." });
      return;
    }

    // Secondary security check
    if (selectedVeh.status === "OUT") {
      setAlert({ type: "error", msg: "This vehicle has already left the company. Duplicate outbound entries are blocked." });
      return;
    }

    const outISO = new Date().toISOString();

    // 1. Create a new transaction representing the outbound trip
    const nextTxId = transactions.length > 0 ? Math.max(...transactions.map((t) => t.id)) + 1 : 1;
    const newTx: VehicleTransaction = {
      id: nextTxId,
      vehicle_id: selectedVeh.id,
      purpose,
      department,
      out_time: outISO,
      in_time: null, // returns later
      total_duration: null,
      remarks: remarks.trim(),
      status: "OUT", // active outbound trip
      supplier_name: cleanSupplier
    };

    // 2. Change master vehicle status to OUT (on a trip)
    const updatedVehicles = vehicles.map((v) => {
      if (v.id === selectedVeh.id) {
        return { ...v, status: "OUT" as const };
      }
      return v;
    });

    // 3. Save updates to database states
    const updatedTxs = [...transactions, newTx];
    onUpdateTransactions(updatedTxs);
    onUpdateVehicles(updatedVehicles);

    // Save Audit and History logs
    dbStore.addHistory(selectedVeh.id, "OUT", currentUser.username, `Dispatched OUT to Supplier: ${cleanSupplier}. Purpose: ${purpose}.`);
    dbStore.addAuditLog(currentUser.username, "GATE_OUT", `Approved outbound trip to ${cleanSupplier} for vehicle: ${selectedVeh.vehicle_number}`);

    setAlert({
      type: "success",
      msg: `Dispatch Approved! Vehicle ${selectedVeh.vehicle_number} sent OUT to ${cleanSupplier} at ${new Date(outISO).toLocaleTimeString()}.`,
    });

    // Reset components form states
    setSelectedVeh(null);
    setSupplierName("");
    setRemarks("");
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="border-b border-slate-200 pb-5">
        <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          COMPANY DISPATCH CENTER (VEHICLE OUT)
        </h1>
        <p className="text-xs text-slate-500 font-sans mt-0.5">
          Mark vehicle as leaving our company premise to deliver goods, materials, or run trips to a specific supplier / vendor.
        </p>
      </div>

      {/* Notifications Alert Banner */}
      {alert && (
        <div
          id="gate-out-notification-banner"
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

      {/* QR scanning framework panel */}
      <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl">
        <div className="flex items-center gap-2 mb-4">
          <QrCode className="w-5 h-5 text-rose-600" />
          <h2 className="text-sm font-extrabold text-slate-900 tracking-wider uppercase font-mono">
            HARDWARE COM PORT SERIAL SCANNER LINK (VEHICLE OUT DISPATCH)
          </h2>
        </div>
        <QrScanner onScanSuccess={handleQrLoad} activeMode="OUT" />
      </div>

      {/* Workflow split grids */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Manual selection lookup index */}
        <div className="lg:col-span-4 bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
          <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100">
            <Building2 className="w-4 h-4 text-blue-600" />
            <h3 className="text-xs font-black text-slate-850 tracking-wider uppercase">
              Vehicles Inside Company
            </h3>
          </div>

          <div className="space-y-4">
            <p className="text-xxs text-slate-500 leading-normal font-sans">
              To dispatch manually click on any vehicle currently parked inside company premises.
            </p>

            <div>
              <label className="block text-xxs font-black text-slate-400 uppercase tracking-widest mb-1.5 font-mono">
                Available inside company
              </label>
              <select
                id="manual-vehicle-select-out"
                value={selectedVeh ? selectedVeh.id : ""}
                onChange={(e) => handleManualSelect(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-blue-500 text-slate-900 font-mono font-bold uppercase cursor-pointer"
              >
                <option value="">-- Select license number --</option>
                {eligibleVehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.vehicle_number} ({v.driver_name})
                  </option>
                ))}
              </select>
            </div>

            {eligibleVehicles.length === 0 && (
              <p className="text-xxxs text-rose-550 font-bold border border-rose-100 bg-rose-50 p-2 rounded text-center font-sans tracking-wide">
                * Note: All fleet vehicles are currently OUT. Register new masters or wait for returns!
              </p>
            )}
          </div>
        </div>

        {/* Transaction details entry form */}
        <div className="lg:col-span-8 bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
          <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100">
            <ClipboardCheck className="w-4 h-4 text-rose-600" />
            <h3 className="text-xs font-black text-slate-850 tracking-wider uppercase">
              Dispatch Verification Ticket
            </h3>
          </div>

          {!selectedVeh ? (
            <div className="text-center py-12 bg-slate-50 border border-dashed border-slate-200 rounded-xl">
              <p className="text-xs font-bold text-slate-400 uppercase">Awaiting vehicle selection</p>
              <p className="text-xxs text-slate-400 mt-1 max-w-xs mx-auto font-sans leading-relaxed">
                Scan vehicle QR pass or search among vehicles parked inside company premises to register outbound travel parameters.
              </p>
            </div>
          ) : (
            <form onSubmit={handleCheckOutSubmit} className="space-y-5">
              
              {/* Loaded vehicle snapshot info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs">
                <div>
                  <span className="text-xxs text-slate-400 font-bold block uppercase font-sans">Active Plate</span>
                  <span className="font-mono font-black text-slate-900 uppercase">{selectedVeh.vehicle_number}</span>
                </div>
                <div>
                  <span className="text-xxs text-slate-400 font-bold block uppercase font-sans">Driver Contact</span>
                  <span className="font-bold text-slate-800 block truncate">{selectedVeh.driver_name}</span>
                  <span className="font-mono text-xxs text-slate-500">{selectedVeh.driver_mobile}</span>
                </div>
                <div>
                  <span className="text-xxs text-slate-400 font-bold block uppercase font-sans">Vehicle Type</span>
                  <span className="font-bold text-slate-800 break-words">{selectedVeh.vehicle_type}</span>
                </div>
                <div>
                  <span className="text-xxs text-slate-400 font-bold block uppercase font-sans">Transporter</span>
                  <span className="font-bold text-indigo-700 block truncate">{selectedVeh.transporter}</span>
                </div>
              </div>

              {/* OUT TO WHICH SUPPLIER (CRITICAL FIRST CLASS INPUT FOR THE COMPANY) */}
              <div>
                <label className="block text-xxs font-black text-indigo-600 uppercase tracking-widest mb-1.5 font-mono">
                  SUPPLIER / VENDOR NAME (Kise supplier ke pas bheja hai?) *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={supplierName}
                    onChange={(e) => setSupplierName(e.target.value)}
                    placeholder="Type supplier company name (e.g. Tata Steel Yard, Reliance Industries, Rushi Polymers)..."
                    className="w-full bg-[#EEF2F6] border-2 border-indigo-200 text-slate-850 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-indigo-500 font-sans font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xxs font-black text-slate-400 uppercase tracking-wider mb-1.5 font-mono">
                    Purpose of Dispatch *
                  </label>
                  <select
                    id="select-purpose-out"
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-blue-500 text-slate-850 font-semibold"
                  >
                    {purposeOptions.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xxs font-black text-slate-400 uppercase tracking-wider mb-1.5 font-mono">
                    Dispatching Department *
                  </label>
                  <select
                    id="select-dept-out"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-blue-500 text-slate-850 font-semibold"
                  >
                    {departmentOptions.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xxs font-black text-slate-400 uppercase tracking-wider mb-1.5 font-mono">
                  General Dispatch Remarks / Goods Details
                </label>
                <textarea
                  placeholder="Invoice references, quantity, loading parameters, expected delivery buffer..."
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs focus:outline-none focus:border-blue-500 h-20 text-slate-850 font-sans font-medium"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end">
                <button
                  type="submit"
                  id="btn-gate-out-commit"
                  className="px-6 py-3 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xxs font-black uppercase tracking-widest flex items-center gap-1.5 cursor-pointer shadow-sm transition"
                >
                  <span>Authorize Company Dispatch OUT</span>
                  <ArrowCheckInBtn />
                </button>
              </div>

            </form>
          )}

        </div>

      </div>

    </div>
  );
}

function ArrowCheckInBtn() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 16l4-4m0 0l-4-4m4 4H7" />
    </svg>
  );
}
