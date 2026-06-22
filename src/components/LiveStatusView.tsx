import { useState, useEffect, useMemo } from "react";
import { Clock, RefreshCw, AlertTriangle, ArrowRight, ShieldAlert, Sparkles, Filter, Building2 } from "lucide-react";
import { VehicleMaster, VehicleTransaction } from "../types";
import { dbStore } from "../dbStore";

interface LiveStatusViewProps {
  vehicles: VehicleMaster[];
  transactions: VehicleTransaction[];
  overstayHoursThreshold: number;
}

export default function LiveStatusView({
  vehicles,
  transactions,
  overstayHoursThreshold,
}: LiveStatusViewProps) {
  // Use local state for current time to enable live ticking / auto-refreshing!
  const [currentTime, setCurrentTime] = useState<Date>(new Date("2026-06-22T08:46:33-07:00"));
  const [secondsRemaining, setSecondsRemaining] = useState<number>(30);
  const [filterDept, setFilterDept] = useState<string>("ALL");

  // Filter department selections dynamically loaded from dbStore
  const departments = useMemo(() => {
    return dbStore.getDepartments();
  }, []);

  // Auto-refresh timer logic (every 30 seconds)
  useEffect(() => {
    const timer = setInterval(() => {
      // Tick seconds remaining
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          // Increment the system time by 30 seconds and reset progress bar
          setCurrentTime(new Date());
          return 30;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const triggerManualRefresh = () => {
    setCurrentTime(new Date());
    setSecondsRemaining(30);
  };

  // Get active outer trips matched with vehicle master details
  const activeOuterTrips = useMemo(() => {
    // Under reversed design, active trips are transactions with status === "OUT"
    const outsideTxs = transactions.filter((tx) => tx.status === "OUT");
    
    return outsideTxs.map((tx) => {
      const v = vehicles.find((v) => v.id === tx.vehicle_id) || {
        vehicle_number: "UNKNOWN",
        vehicle_type: "Unknown Payload",
        driver_name: "Unregistered",
        driver_mobile: "-",
        transporter: "Unknown",
        qr_code: "N/A"
      };

      const outDate = tx.out_time ? new Date(tx.out_time) : new Date();
      const stayMs = currentTime.getTime() - outDate.getTime();
      const stayHrs = Math.max(0, stayMs / (1000 * 60 * 60));

      // Calculate alert colors based on rules:
      // Green = Below 2 hours
      // Yellow = 2-4 hours
      // Red = Above 4 hours (threshold)
      let colorClass = "bg-emerald-50 text-emerald-700 border-emerald-200";
      let textIndicator = "ON TIMELINE (< 2 hrs)";
      let tag = "green";

      if (stayHrs >= 2 && stayHrs < overstayHoursThreshold) {
        colorClass = "bg-[#FFF9E6] text-amber-700 border-amber-200";
        textIndicator = "MODERATE DELAY (2-4 hrs)";
        tag = "yellow";
      } else if (stayHrs >= overstayHoursThreshold) {
        colorClass = "bg-rose-50 text-rose-700 border-rose-200 animate-pulse";
        textIndicator = `CRITICAL OVERSTAY (> ${overstayHoursThreshold} hrs)`;
        tag = "red";
      }

      // Format stay text
      const hrsPart = Math.floor(stayHrs);
      const minsPart = Math.floor((stayHrs % 1) * 60);
      const formattedStay = `${hrsPart.toString().padStart(2, "0")}h ${minsPart.toString().padStart(2, "0")}m`;

      return {
        tx,
        v,
        stayHrs,
        formattedStay,
        colorClass,
        textIndicator,
        tag
      };
    }).filter((item) => filterDept === "ALL" || item.tx.department === filterDept);
  }, [vehicles, transactions, currentTime, filterDept, overstayHoursThreshold]);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            ACTIVE SUPPLIER DISPATCH STATUS MONITOR
          </h1>
          <p className="text-xs text-slate-500 font-sans mt-0.5">
            Real-time tracking of all fleet transport vehicles currently dispatched outside to suppliers and vendors, color-coded by trip duration stay thresholds.
          </p>
        </div>

        {/* Refresh progress indicators */}
        <div className="flex items-center gap-3 self-start md:self-center">
          <div className="text-right">
            <span className="text-xxs font-mono font-bold text-slate-500 block">
              Auto refreshing in {secondsRemaining}s
            </span>
            <div className="w-28 bg-slate-200 h-1 rounded-full overflow-hidden mt-1 border border-slate-300">
              <div
                style={{ width: `${(secondsRemaining / 30) * 105}%` }}
                className="bg-blue-600 h-full transition-all duration-1000 ease-linear"
              />
            </div>
          </div>
          <button
            onClick={triggerManualRefresh}
            id="btn-manual-refresh-live"
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 rounded-lg transition shrink-0 cursor-pointer"
            title="Refresh logs now"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Statistics alerts panel */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border border-slate-200 rounded-xl p-4 bg-slate-50/50">
        <div className="flex gap-2.5 items-start p-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0 mt-1" />
          <div>
            <h4 className="text-xxs font-black text-slate-500 uppercase tracking-wider font-mono">NORMAL transit STATUS</h4>
            <p className="text-slate-800 text-xs font-bold font-sans mt-0.5 font-mono">Below 2 Hours</p>
            <p className="text-xxs text-slate-400 mt-1 font-sans">Undergoing unloading / material transfers at supplier yard.</p>
          </div>
        </div>
        <div className="flex gap-2.5 items-start p-2 border-t md:border-t-0 md:border-l border-slate-200 md:pl-4">
          <div className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0 mt-1 animate-ping" />
          <div>
            <h4 className="text-xxs font-black text-slate-500 uppercase tracking-wider font-mono">WARNING alert STATUS</h4>
            <p className="text-slate-800 text-xs font-bold font-sans mt-0.5 font-mono">2 - 4 Hours Stay</p>
            <p className="text-xxs text-slate-400 mt-1 font-sans">Slight transit or paperwork delays. Supervisor attention advised.</p>
          </div>
        </div>
        <div className="flex gap-2.5 items-start p-2 border-t md:border-t-0 md:border-l border-slate-200 md:pl-4">
          <div className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0 mt-1 animate-pulse" />
          <div>
            <h4 className="text-xxs font-black text-slate-500 uppercase tracking-wider font-mono">CRITICAL return WARNING</h4>
            <p className="text-slate-800 text-xs font-bold font-sans mt-0.5 font-mono">Above {overstayHoursThreshold} Hours</p>
            <p className="text-xxs text-slate-400 mt-1 font-sans">Extremely delayed supplier return. Gate operator check-up is high priority.</p>
          </div>
        </div>
      </div>

      {/* Live Filtering and Listings Grid */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        
        {/* Department Filters Bar */}
        <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <span className="text-xxs font-black text-slate-500 uppercase tracking-wider font-mono flex items-center gap-1.5">
            <Filter className="w-4 h-4 text-slate-400" />
            <span>Filter Dispatching Department:</span>
          </span>
          <div className="flex flex-wrap gap-1">
            <button
              onClick={() => setFilterDept("ALL")}
              className={`px-3 py-1 text-xxs font-bold uppercase rounded-lg border transition cursor-pointer ${
                filterDept === "ALL"
                  ? "bg-slate-900 border-slate-950 text-white shadow-xxs"
                  : "bg-white border-slate-200 text-slate-600 hover:bg-slate-100"
              }`}
            >
              All Departments
            </button>
            {departments.map((dept) => (
              <button
                key={dept}
                onClick={() => setFilterDept(dept)}
                className={`px-3 py-1 text-xxs font-bold uppercase rounded-lg border transition cursor-pointer ${
                  filterDept === dept
                    ? "bg-slate-900 border-slate-950 text-white shadow-xxs"
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-100"
                }`}
              >
                {dept.split(" ")[0]} ({activeOuterTrips.filter(el => el.tx.department === dept).length})
              </button>
            ))}
          </div>
        </div>

        {/* Live Status Listings */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-slate-55 border-b border-slate-200 text-slate-400">
                <th className="px-5 py-4 text-xxs font-black uppercase tracking-wider font-mono">License Plate</th>
                <th className="px-5 py-4 text-xxs font-black uppercase tracking-wider font-mono">Driver & Contact</th>
                <th className="px-5 py-4 text-xxs font-black uppercase tracking-wider font-mono">Destination Supplier</th>
                <th className="px-5 py-4 text-xxs font-black uppercase tracking-wider font-mono">Dispatch Out Time</th>
                <th className="px-5 py-4 text-xxs font-black uppercase tracking-wider font-mono">Duration Outside</th>
                <th className="px-5 py-4 text-xxs font-black uppercase tracking-wider font-mono">Tracking State</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-705">
              {activeOuterTrips.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-16 text-slate-400 bg-slate-50/10">
                    <div className="max-w-xs mx-auto">
                      <Sparkles className="w-8 h-8 text-emerald-500 mx-auto mb-2 animate-bounce" />
                      <span className="text-xs font-bold text-slate-700 block uppercase">All fleet vehicles in company yard</span>
                      <span className="text-xxs text-slate-400 mt-1 block font-sans">
                        No active vehicles are currently outside on outstanding supplier dispatches! Open the "Vehicle Out" menu to dispatch.
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                activeOuterTrips.map(({ tx, v, formattedStay, colorClass, textIndicator }) => (
                  <tr key={tx.id} className="hover:bg-slate-50 transition duration-150">
                    {/* License Plate */}
                    <td className="px-5 py-3.5">
                      <span className="font-mono text-xs font-black text-slate-900 uppercase">
                        {v.vehicle_number}
                      </span>
                      <span className="block text-xxs text-slate-450 mt-0.5">{v.vehicle_type}</span>
                    </td>
                    {/* Driver */}
                    <td className="px-5 py-3.5">
                      <span className="text-xs font-bold text-slate-800 block">{v.driver_name}</span>
                      <span className="text-[10px] text-slate-500 block font-mono">{v.driver_mobile}</span>
                    </td>
                    {/* Destination Supplier */}
                    <td className="px-5 py-3.5 text-xs">
                      <span className="font-mono font-black text-indigo-700 block uppercase bg-indigo-50 border border-indigo-100 rounded px-2 py-0.5 w-fit">
                        {tx.supplier_name || "N/A"}
                      </span>
                      <span className="text-xxs text-slate-500 italic block mt-0.5">"{tx.purpose}"</span>
                    </td>
                    {/* Dispatch Out Time */}
                    <td className="px-5 py-3.5 text-xs font-mono">
                      <span className="block font-bold text-slate-850">
                        {tx.out_time ? new Date(tx.out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "-"}
                      </span>
                      <span className="block text-xxs text-slate-400">
                        {tx.out_time ? new Date(tx.out_time).toLocaleDateString([], { month: "short", day: "numeric" }) : "-"}
                      </span>
                    </td>
                    {/* Outside Time */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-slate-400" />
                        <span className="font-mono text-xs font-extrabold text-slate-950">
                          {formattedStay}
                        </span>
                      </div>
                    </td>
                    {/* Alert Level Pill */}
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded text-xxs font-black tracking-wide uppercase border ${colorClass}`}>
                        {textIndicator}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
