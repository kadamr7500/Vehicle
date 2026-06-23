import React, { useState, useMemo } from "react";
import { Plus, Search, Trash2, Edit3, QrCode, X, Check, Eye } from "lucide-react";
import { VehicleMaster } from "../types";
import { dbStore } from "../dbStore";
import QrCodeUtility from "./QrCodeUtility";

interface VehicleMasterViewProps {
  vehicles: VehicleMaster[];
  onUpdateVehicles: (updated: VehicleMaster[]) => void;
  currentUser: any;
}

export default function VehicleMasterView({
  vehicles,
  onUpdateVehicles,
  currentUser,
}: VehicleMasterViewProps) {
  const [search, setSearch] = useState<string>("");
  const [filterType, setFilterType] = useState<string>("ALL");
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleMaster | null>(null);
  
  // Modal states
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [editingVehicle, setEditingVehicle] = useState<VehicleMaster | null>(null);

  // Form Fields
  const [vehNo, setVehNo] = useState<string>("");
  const [vehType, setVehType] = useState<string>("Truck-Multi Axle");
  const [driver, setDriver] = useState<string>("");
  const [mobile, setMobile] = useState<string>("");
  const [transporter, setTransporter] = useState<string>("");
  const [formError, setFormError] = useState<string | null>(null);

  // Filter types available
  const vehicleTypes = ["Truck-Multi Axle", "Container 20ft", "Container 40ft", "Tanker - Chemical", "Lorry", "Pickup Truck", "Dumper Cargo"];

  // Open modal for adding
  const handleOpenAdd = () => {
    setEditingVehicle(null);
    setVehNo("");
    setVehType("Truck-Multi Axle");
    setDriver("");
    setMobile("");
    setTransporter("");
    setFormError(null);
    setIsFormOpen(true);
  };

  // Open modal for editing
  const handleOpenEdit = (v: VehicleMaster) => {
    setEditingVehicle(v);
    setVehNo(v.vehicle_number);
    setVehType(v.vehicle_type);
    setDriver(v.driver_name);
    setMobile(v.driver_mobile);
    setTransporter(v.transporter);
    setFormError(null);
    setIsFormOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Validation
    const cleanVehNo = vehNo.trim().toUpperCase();
    if (!cleanVehNo || !driver.trim() || !mobile.trim() || !transporter.trim()) {
      setFormError("All input details are mandatory.");
      return;
    }

    if (!/^[a-zA-Z0-9- ]+$/.test(cleanVehNo)) {
      setFormError("Vehicle number can only contain alphanumeric keys and dashes.");
      return;
    }

    // Check duplicates
    const isDuplicate = vehicles.some((v) => {
      if (editingVehicle && v.id === editingVehicle.id) return false;
      return v.vehicle_number.replace(/\s+/g, "").toUpperCase() === cleanVehNo.replace(/\s+/g, "");
    });

    if (isDuplicate) {
      setFormError(`Vehicle Number ${cleanVehNo} is already registered.`);
      return;
    }

    let nextVehicles: VehicleMaster[] = [];

    if (editingVehicle) {
      // Edit
      nextVehicles = vehicles.map((v) => {
        if (v.id === editingVehicle.id) {
          return {
            ...v,
            vehicle_number: cleanVehNo,
            vehicle_type: vehType,
            driver_name: driver.trim(),
            driver_mobile: mobile.trim(),
            transporter: transporter.trim(),
          };
        }
        return v;
      });
      dbStore.addAuditLog(currentUser.username, "VEHICLE_EDIT", `Modified master registered details for vehicle: ${cleanVehNo}`);
      dbStore.addHistory(editingVehicle.id, "EDIT", currentUser.username, "Modified specifications in vehicle catalog.");
    } else {
      // Add
      const nextId = vehicles.length > 0 ? Math.max(...vehicles.map((v) => v.id)) + 1 : 1;
      const cleanQr = `VEH-${cleanVehNo.replace(/[^a-zA-Z0-9]/g, "")}`;
      const newVeh: VehicleMaster = {
        id: nextId,
        vehicle_number: cleanVehNo,
        vehicle_type: vehType,
        driver_name: driver.trim(),
        driver_mobile: mobile.trim(),
        transporter: transporter.trim(),
        qr_code: cleanQr,
        status: "OUT",
        created_date: new Date().toISOString(),
      };
      nextVehicles = [...vehicles, newVeh];
      dbStore.addAuditLog(currentUser.username, "VEHICLE_ADD", `Registered new vehicle: ${cleanVehNo}`);
      // Write to history immediately as well
      dbStore.addHistory(newVeh.id, "CREATE", currentUser.username, "Added new vehicle master log entry.");
    }

    onUpdateVehicles(nextVehicles);
    setIsFormOpen(false);
  };

  const handleDelete = (id: number, number: string) => {
    if (confirm(`Are you absolutely sure you want to delete vehicle: ${number}? This will wipe its records from master logs.`)) {
      const remaining = vehicles.filter((v) => v.id !== id);
      onUpdateVehicles(remaining);
      dbStore.addAuditLog(currentUser.username, "VEHICLE_DEL", `Removed registered vehicle: ${number}`);
      if (selectedVehicle?.id === id) {
        setSelectedVehicle(null);
      }
    }
  };

  // Filter vehicles depending on Search & Selection
  const filteredVehicles = useMemo(() => {
    return vehicles.filter((v) => {
      const matchSearch =
        v.vehicle_number.toLowerCase().includes(search.toLowerCase()) ||
        v.driver_name.toLowerCase().includes(search.toLowerCase()) ||
        v.transporter.toLowerCase().includes(search.toLowerCase());

      const matchType = filterType === "ALL" || v.vehicle_type === filterType;

      return matchSearch && matchType;
    });
  }, [vehicles, search, filterType]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2 font-display">
            VEHICLE MASTER DIRECTORY
          </h1>
          <p className="text-xs text-slate-500 font-sans mt-0.5">
            Maintain permanent registries of driver associations, operators, vehicle types, and active gate passes.
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          id="btn-register-vehicle-master"
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 self-start cursor-pointer shadow-xs transition"
        >
          <Plus className="w-4 h-4" />
          <span>Register Vehicle</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Search & Master table lists */}
        <div className="lg:col-span-8 space-y-4">
          
          {/* Filtering Header Panel */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col md:flex-row md:items-center gap-4 shadow-xxs">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by license plate, driver, transporter..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-xs focus:outline-none focus:border-blue-500 font-sans text-slate-800"
              />
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xxs font-black text-slate-400 uppercase tracking-wider font-mono">Type:</span>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none font-medium text-slate-700"
              >
                <option value="ALL">All Categories</option>
                {vehicleTypes.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Table container */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-5 py-4 text-xxs font-black uppercase text-slate-400 tracking-wider font-mono">License Plate</th>
                    <th className="px-5 py-4 text-xxs font-black uppercase text-slate-400 tracking-wider font-mono">Driver info</th>
                    <th className="px-5 py-4 text-xxs font-black uppercase text-slate-400 tracking-wider font-mono">Transporter / Type</th>
                    <th className="px-5 py-4 text-xxs font-black uppercase text-slate-400 tracking-wider font-mono">Loc Status</th>
                    <th className="px-5 py-4 text-right text-xxs font-black uppercase text-slate-400 tracking-wider font-mono">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredVehicles.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-10 text-slate-400 bg-slate-50/50">
                        <span className="text-xs font-bold block mb-1">No Entries Tracked</span>
                        <span className="text-xxs">Try adjusting your filters or search keywords.</span>
                      </td>
                    </tr>
                  ) : (
                    filteredVehicles.map((v) => (
                      <tr key={v.id} className="hover:bg-slate-50 transition duration-150">
                        <td className="px-5 py-3">
                          <span className="font-mono text-xs font-black text-slate-900 uppercase">
                            {v.vehicle_number}
                          </span>
                          <span className="text-xxs text-slate-400 block mt-0.5">ID: {v.qr_code}</span>
                        </td>
                        <td className="px-5 py-3">
                          <span className="text-xs font-bold text-slate-800 block">{v.driver_name}</span>
                          <span className="text-xxs text-slate-500 block font-mono">{v.driver_mobile}</span>
                        </td>
                        <td className="px-5 py-3">
                          <span className="text-xs text-slate-600 block truncate max-w-[150px]">{v.transporter}</span>
                          <span className="inline-block px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded text-xxs font-mono text-slate-500 mt-0.5">
                            {v.vehicle_type}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xxs font-bold uppercase ${
                            v.status === "IN" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-slate-50 text-slate-700 border border-slate-200"
                          }`}>
                            {v.status === "IN" ? "Inside Plant" : "Checked Out"}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right">
                          <div className="inline-flex gap-1">
                            <button
                              onClick={() => setSelectedVehicle(v)}
                              id={`btn-view-qr-${v.id}`}
                              className="p-1.5 text-slate-500 hover:text-blue-600 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                              title="View Gate Pass QR"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleOpenEdit(v)}
                              id={`btn-edit-veh-${v.id}`}
                              className="p-1.5 text-slate-500 hover:text-blue-600 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                              title="Update details"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(v.id, v.vehicle_number)}
                              id={`btn-del-veh-${v.id}`}
                              className="p-1.5 text-slate-500 hover:text-rose-600 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                              title="De-register"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* QR Printing and Preview Column */}
        <div className="lg:col-span-4 bg-slate-50 border border-slate-200 rounded-2xl shadow-sm p-4">
          <div className="flex items-center justify-between gap-1 border-b border-slate-200 pb-3 mb-4">
            <h3 className="text-xs font-black text-slate-700 tracking-widest uppercase flex items-center gap-1.5">
              <QrCode className="w-4 h-4 text-blue-600" />
              <span>Gate ticket preview</span>
            </h3>
            {selectedVehicle && (
              <button
                onClick={() => setSelectedVehicle(null)}
                className="text-xs text-slate-500 hover:text-slate-700 border border-slate-200 px-2 py-0.5 rounded bg-white font-medium shadow-xxs"
              >
                Clear
              </button>
            )}
          </div>

          {selectedVehicle ? (
            <QrCodeUtility vehicle={selectedVehicle} />
          ) : (
            <div className="text-center p-8 bg-white border border-slate-200 border-dashed rounded-xl flex flex-col items-center justify-center min-h-[300px]">
              <div className="p-3 bg-slate-50 text-slate-400 rounded-full mb-3 border border-slate-100">
                <QrCode className="w-8 h-8" />
              </div>
              <h4 className="text-xs font-bold text-slate-700 uppercase">NO VEHICLE TAPPED</h4>
              <p className="text-xxs text-slate-400 mt-1 max-w-[180px] mx-auto font-sans">
                Tapping the eye action icon on any vehicle record will load its printable high-definition security tag barcode here.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Register/Update Modal Form */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 w-full max-w-md rounded-2xl shadow-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <h3 className="text-xs font-black text-slate-800 tracking-widest uppercase">
                {editingVehicle ? "Update specifications" : "Register fleet vehicle"}
              </h3>
              <button
                onClick={() => setIsFormOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-full cursor-pointer hover:bg-slate-100"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-4">
              {formError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xxs p-2.5 rounded-lg flex items-center gap-1.5">
                  <X className="w-4 h-4 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-xxs font-black text-slate-400 uppercase tracking-wider mb-1">
                  License plate / registration *
                </label>
                <input
                  type="text"
                  placeholder="e.g. MH-12-PQ-9876"
                  value={vehNo}
                  onChange={(e) => setVehNo(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-blue-500 font-mono text-slate-800 uppercase"
                  required
                />
              </div>

              <div>
                <label className="block text-xxs font-black text-slate-400 uppercase tracking-wider mb-1">
                  Vehicle catalog category *
                </label>
                <select
                  value={vehType}
                  onChange={(e) => setVehType(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-blue-500 text-slate-800 font-medium"
                >
                  {vehicleTypes.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xxs font-black text-slate-400 uppercase tracking-wider mb-1">
                  Driver Full Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. John Doe"
                  value={driver}
                  onChange={(e) => setDriver(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-blue-500 text-slate-800 font-medium"
                  required
                />
              </div>

              <div>
                <label className="block text-xxs font-black text-slate-400 uppercase tracking-wider mb-1">
                  Driver Mobile Contact *
                </label>
                <input
                  type="tel"
                  placeholder="e.g. 9876543210"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-blue-500 font-mono text-slate-800"
                  required
                />
              </div>

              <div>
                <label className="block text-xxs font-black text-slate-400 uppercase tracking-wider mb-1">
                  Transporter Company / Agency *
                </label>
                <input
                  type="text"
                  placeholder="e.g. SafeExpress Logistics"
                  value={transporter}
                  onChange={(e) => setTransporter(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-blue-500 text-slate-800 font-medium"
                  required
                />
              </div>

              <div className="pt-4 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-3.5 py-2 hover:bg-slate-100 border border-slate-200 rounded-lg text-xxs font-bold uppercase text-slate-600 cursor-pointer"
                >
                  Discard
                </button>
                <button
                  type="submit"
                  id="btn-modal-save-vehicle"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xxs font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer transition"
                >
                  <Check className="w-4.5 h-4.5" />
                  <span>{editingVehicle ? "Update" : "Save"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
