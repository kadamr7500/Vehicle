import { useState } from "react";
import { Download, FileSpreadsheet, FileText, Search, Calendar, RefreshCw, Layers } from "lucide-react";
import { VehicleMaster, VehicleTransaction, VehicleHistory } from "../types";
import { buildReportDatasets, exportReportToExcel, exportReportToPdf } from "../utils/reportUtils";

interface ReportsViewProps {
  vehicles: VehicleMaster[];
  transactions: VehicleTransaction[];
  histories: VehicleHistory[];
  overstayHoursThreshold: number;
}

type ReportType = "daily" | "monthly" | "pending" | "overstay" | "history" | "trip_frequency";

export default function ReportsView({
  vehicles,
  transactions,
  histories,
  overstayHoursThreshold,
}: ReportsViewProps) {
  const [activeReport, setActiveReport] = useState<ReportType>("daily");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Build the current dataset dynamically using our reporting service
  const currentReportData = buildReportDatasets(
    activeReport,
    vehicles,
    transactions,
    histories,
    overstayHoursThreshold
  );

  // Filter rows locally if search query is provided
  const filteredRows = currentReportData.rows.filter((row) => {
    if (!searchQuery.trim()) return true;
    return row.some((field) =>
      String(field).toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const triggerPdfDownload = () => {
    exportReportToPdf(
      currentReportData.title,
      currentReportData.headers,
      filteredRows,
      `VMS_Report_${activeReport}_${new Date().toISOString().split("T")[0]}`,
      currentReportData.subtitle
    );
  };

  const triggerExcelDownload = () => {
    exportReportToExcel(
      currentReportData.title,
      currentReportData.headers,
      filteredRows,
      `VMS_Report_${activeReport}_${new Date().toISOString().split("T")[0]}`
    );
  };

  const reportMeta = {
    daily: {
      label: "Daily Dispatch Reports",
      desc: "Complete checklist of outward dispatches and inward returns performed today.",
    },
    monthly: {
      label: "Monthly Dispatch Ledger",
      desc: "Historical logging of carrier timelines, dispatch goals, and supplier trips this month.",
    },
    pending: {
      label: "Pending Supplier Returns",
      desc: "Detailed audit of company vehicles currently on outstanding supplier dispatches.",
    },
    overstay: {
      label: "Supplier Overstay Alerts",
      desc: "Anomalies exceeding recommended transit times with suppliers.",
    },
    trip_frequency: {
      label: "Vehicle Trip Frequency",
      desc: "Comprehensive monitoring of vehicle trip counts, complete roundtrip cycles, and supplier coverage indexes.",
    },
    history: {
      label: "Operational Audit Trails",
      desc: "Security tracking logs monitoring every CRUD activity performed by personnel.",
    },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-slate-200 pb-5">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2 font-display">
          PLANT LOGISTICS REPORT CENTER
        </h1>
        <p className="text-xs text-slate-500 font-sans mt-0.5">
          Generate offsite analytics, filter transit histories, and export official plant records in Excel spreadsheet and audit-ready PDF formats.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Selecting Report List Sidebar Column */}
        <div className="lg:col-span-4 bg-white border border-slate-200 p-4 rounded-2xl shadow-sm space-y-3">
          <span className="text-xxs font-black text-slate-400 uppercase tracking-wider font-mono block pb-2 border-b border-slate-100 mb-2">
            Select system database table
          </span>
          {Object.entries(reportMeta).map(([key, meta]) => {
            const isSelected = activeReport === key;
            return (
              <button
                key={key}
                onClick={() => {
                  setActiveReport(key as ReportType);
                  setSearchQuery("");
                }}
                id={`btn-select-report-${key}`}
                className={`w-full text-left p-3.5 rounded-xl border transition cursor-pointer flex flex-col gap-1 ${
                  isSelected
                    ? "bg-slate-900 border-slate-950 text-white shadow-sm"
                    : "bg-white border-slate-200 hover:bg-slate-50 text-slate-700"
                }`}
              >
                <span className="text-xs font-black uppercase tracking-wide font-sans">
                  {meta.label}
                </span>
                <span className={`text-xxs font-medium block font-sans ${
                  isSelected ? "text-slate-300" : "text-slate-500"
                }`}>
                  {meta.desc}
                </span>
              </button>
            );
          })}
        </div>

        {/* Live Interactive Preview and download actions column */}
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl shadow-sm p-5 space-y-4">
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-slate-100">
            <div>
              <p className="text-xxs text-blue-600 font-black uppercase tracking-widest font-mono">Interactive preview</p>
              <h3 className="text-sm font-black text-slate-850 uppercase font-sans mt-0.5">
                {currentReportData.title}
              </h3>
              <p className="text-xxs text-slate-550 font-sans mt-0.5 italic">
                {currentReportData.subtitle}
              </p>
            </div>

            {/* Export buttons */}
            <div className="flex items-center gap-2 self-start md:self-center">
              <button
                onClick={triggerExcelDownload}
                id="btn-export-excel"
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xxs font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-xs transition"
                title="Download Excel Sheet"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Excel</span>
              </button>
              <button
                onClick={triggerPdfDownload}
                id="btn-export-pdf"
                className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xxs font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-xs transition"
                title="Download PDF Ledger"
              >
                <FileText className="w-4 h-4" />
                <span>PDF Ledger</span>
              </button>
            </div>
          </div>

          {/* Table Search tool bar */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search values dynamically in report preview below..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-xs focus:outline-none focus:border-blue-500 text-slate-800 font-sans font-medium"
              />
            </div>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="px-2 text-xxs font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                Reset
              </button>
            )}
            <span className="text-xxs font-mono shrink-0 font-bold bg-slate-100 text-slate-650 p-1.5 rounded border border-slate-200">
              COUNT: {filteredRows.length} RECORDS
            </span>
          </div>

          {/* Table Data Preview render */}
          <div className="border border-slate-200 rounded-xl overflow-hidden max-h-[380px] overflow-y-auto w-full">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 font-mono text-xxs font-black uppercase text-slate-400 tracking-wider">
                  {currentReportData.headers.map((hdr) => (
                    <th key={hdr} className="px-4 py-3 border-r last:border-0 border-slate-200">
                      {hdr}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150 text-slate-700 font-medium">
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={currentReportData.headers.length} className="text-center py-12 text-slate-400 bg-slate-50/50">
                      <span className="text-xs font-bold block mb-1">No Entries Matched</span>
                      <span className="text-xxs">Check your search query or perform database entries.</span>
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row, rowIdx) => (
                    <tr key={rowIdx} className="hover:bg-slate-50/70 transition-colors">
                      {row.map((cell, cellIdx) => (
                        <td key={cellIdx} className="px-4 py-2.5 border-r last:border-0 border-slate-150 break-words max-w-[180px]">
                          {typeof cell === "string" && cell.includes("CRITICAL") ? (
                            <span className="px-1.5 py-0.5 rounded text-rose-700 bg-rose-50 border border-rose-100 font-bold font-mono text-xxs break-normal">
                              {cell}
                            </span>
                          ) : typeof cell === "string" && (cell === "IN" || cell === "Inside Plant") ? (
                            <span className="px-1.5 py-0.5 rounded text-emerald-700 bg-emerald-50 border border-emerald-100 font-bold text-xxs">
                              {cell}
                            </span>
                          ) : typeof cell === "string" && (cell === "OUT" || cell === "Checked Out") ? (
                            <span className="px-1.5 py-0.5 rounded text-slate-500 bg-slate-50 border border-slate-150 text-xxs">
                              {cell}
                            </span>
                          ) : (
                            String(cell)
                          )}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

        </div>

      </div>

    </div>
  );
}
