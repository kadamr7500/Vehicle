import React, { useState, useRef } from "react";
import {
  Settings, ShieldCheck, Download, Upload, Trash2, CheckCircle2,
  AlertCircle, Clock, QrCode, Plus, X, Database,
  Truck, Building2, ListTodo, ShieldAlert, Timer,
  User, CalendarDays, Smartphone
} from "lucide-react";
import { SystemConfig, VehicleMaster } from "../types";
import { dbStore } from "../dbStore";
import QrScanner from "./QrScanner";

interface SettingsViewProps {
  config: SystemConfig;
  onUpdateConfig: (conf: SystemConfig) => void;
  currentUser: any;
  onResetDatabase: () => void;
  vehicles: VehicleMaster[];
}

export default function SettingsView({
  config,
  onUpdateConfig,
  currentUser,
  onResetDatabase,
  vehicles,
}: SettingsViewProps) {
  const [overstay, setOverstay] = useState<number>(config.overstayHours);
  const [backupCheck, setBackupCheck] = useState<boolean>(config.autoBackupEnabled);
  const [shift, setShift] = useState<"A" | "B" | "C">(config.shiftSchedule);

  const [purposes, setPurposes] = useState<string[]>(() => dbStore.getPurposes());
  const [departments, setDepartments] = useState<string[]>(() => dbStore.getDepartments());
  const [newPurpose, setNewPurpose] = useState<string>("");
  const [newDepartment, setNewDepartment] = useState<string>("");

  const handleAddPurpose = (e: React.FormEvent) => {
    e.preventDefault();
    const val = newPurpose.trim();
    if (!val) return;
    if (purposes.includes(val)) {
      setMessage({ type: "error", text: "This purpose option already exists." });
      return;
    }
    const updated = [...purposes, val];
    setPurposes(updated);
    dbStore.savePurposes(updated);
    setNewPurpose("");
    dbStore.addAuditLog(currentUser.username, "ADD_PURPOSE", `Added new dispatch purpose: "${val}"`);
    setMessage({ type: "success", text: `Added dispatch purpose: "${val}"` });
  };

  const handleRemovePurpose = (item: string) => {
    if (purposes.length <= 1) {
      setMessage({ type: "error", text: "At least one dispatch purpose option is required." });
      return;
    }
    const updated = purposes.filter(p => p !== item);
    setPurposes(updated);
    dbStore.savePurposes(updated);
    dbStore.addAuditLog(currentUser.username, "REMOVE_PURPOSE", `Removed dispatch purpose: "${item}"`);
    setMessage({ type: "success", text: `Removed dispatch purpose: "${item}"` });
  };

  const handleAddDepartment = (e: React.FormEvent) => {
    e.preventDefault();
    const val = newDepartment.trim();
    if (!val) return;
    if (departments.includes(val)) {
      setMessage({ type: "error", text: "This department option already exists." });
      return;
    }
    const updated = [...departments, val];
    setDepartments(updated);
    dbStore.saveDepartments(updated);
    setNewDepartment("");
    dbStore.addAuditLog(currentUser.username, "ADD_DEPARTMENT", `Added new department: "${val}"`);
    setMessage({ type: "success", text: `Added department: "${val}"` });
  };

  const handleRemoveDepartment = (item: string) => {
    if (departments.length <= 1) {
      setMessage({ type: "error", text: "At least one department option is required." });
      return;
    }
    const updated = departments.filter(d => d !== item);
    setDepartments(updated);
    dbStore.saveDepartments(updated);
    dbStore.addAuditLog(currentUser.username, "REMOVE_DEPARTMENT", `Removed department: "${item}"`);
    setMessage({ type: "success", text: `Removed department: "${item}"` });
  };

  const [selectedVehicleId, setSelectedVehicleId] = useState<string>("");
  const [downloading, setDownloading] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const auditLogs = dbStore.getAuditLogs().sort((a, b) => b.id - a.id);
  const selectedVehicle = vehicles.find(v => v.id === parseInt(selectedVehicleId));

  const handleDownloadQR = async () => {
    if (!selectedVehicle) return;
    setDownloading(true);
    const qrValue = selectedVehicle.qr_code;
    const vehicleNo = selectedVehicle.vehicle_number;

    try {
      const qrImg = new Image();
      qrImg.crossOrigin = "anonymous";
      const qrLoaded = new Promise<HTMLImageElement>((resolve, reject) => {
        qrImg.onload = () => resolve(qrImg);
        qrImg.onerror = (e) => reject(e);
      });
      qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrValue)}`;
      const loadedImg = await qrLoaded;

      const width = 400, height = 630;
      const canvas = document.createElement("canvas");
      canvas.width = width; canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);
      ctx.lineWidth = 4; ctx.strokeStyle = "#0f172a"; ctx.strokeRect(12, 12, width - 24, height - 24);
      ctx.lineWidth = 1; ctx.strokeStyle = "#94a3b8"; ctx.strokeRect(18, 18, width - 36, height - 36);

      ctx.textAlign = "center";
      ctx.font = "bold 16px system-ui, sans-serif"; ctx.fillStyle = "#1e3a8a"; ctx.fillText("VEHICLE ENTRY GATE PASS", width / 2, 46);
      ctx.font = "bold 8.5px monospace"; ctx.fillStyle = "#64748b"; ctx.fillText("INDUSTRIAL GATEHOUSE SECURITY SYSTEM", width / 2, 62);
      ctx.beginPath(); ctx.moveTo(30, 75); ctx.lineTo(width - 30, 75); ctx.strokeStyle = "#e2e8f0"; ctx.lineWidth = 1.5; ctx.stroke();

      const qrSize = 190, qrX = (width - qrSize) / 2, qrY = 95;
      ctx.drawImage(loadedImg, qrX, qrY, qrSize, qrSize);
      ctx.font = "bold 10px monospace"; ctx.fillStyle = "#475569"; ctx.fillText(`SYSTEM ID: ${qrValue}`, width / 2, 305);

      const boxX = 30, boxY = 320, boxW = width - 60, boxH = 46;
      ctx.fillStyle = "#f1f5f9"; ctx.fillRect(boxX, boxY, boxW, boxH);
      ctx.lineWidth = 1.5; ctx.strokeStyle = "#cbd5e1"; ctx.strokeRect(boxX, boxY, boxW, boxH);
      ctx.font = "extrabold 23px monospace"; ctx.fillStyle = "#0f172a"; ctx.textBaseline = "middle";
      ctx.fillText(vehicleNo.toUpperCase(), width / 2, boxY + boxH / 2);
      ctx.textBaseline = "alphabetic";

      const gridStartY = 398, keyX = 42, valX = width - 42;
      const rows = [
        { label: "DRIVER NAME", value: selectedVehicle.driver_name },
        { label: "CONTACT NO", value: selectedVehicle.driver_mobile || "N/A" },
        { label: "TRANSPORTER", value: selectedVehicle.transporter },
        { label: "VEHICLE TYPE", value: selectedVehicle.vehicle_type.toUpperCase() },
        { label: "GENERATED ON", value: new Date(selectedVehicle.created_date).toLocaleString() },
      ];
      let curY = gridStartY;
      rows.forEach((r, i) => {
        if (i % 2 === 0) { ctx.fillStyle = "#f8fafc"; ctx.fillRect(boxX, curY - 14, boxW, 20); }
        ctx.textAlign = "left"; ctx.font = "bold 9px monospace"; ctx.fillStyle = "#64748b"; ctx.fillText(r.label, keyX, curY);
        ctx.textAlign = "right"; ctx.font = "bold 10px system-ui, sans-serif"; ctx.fillStyle = "#0f172a";
        let vt = r.value;
        const maxW = 205;
        if (ctx.measureText(vt).width > maxW) { while (ctx.measureText(vt + "...").width > maxW && vt.length) vt = vt.slice(0, -1); vt += "..."; }
        ctx.fillText(vt, valX, curY);
        ctx.beginPath(); ctx.moveTo(boxX, curY + 6); ctx.lineTo(width - boxX, curY + 6); ctx.strokeStyle = "#e2e8f0"; ctx.lineWidth = 1; ctx.stroke();
        curY += 24;
      });

      ctx.beginPath(); ctx.moveTo(35, height - 48); ctx.lineTo(width - 35, height - 48); ctx.strokeStyle = "#cbd5e1"; ctx.lineWidth = 1; ctx.setLineDash([4, 4]); ctx.stroke(); ctx.setLineDash([]);
      ctx.textAlign = "center"; ctx.font = "bold 8px monospace"; ctx.fillStyle = "#94a3b8"; ctx.fillText("VALID SECURITY GATE PASS \u2022 PLEASE SHOW AT EXIT POINTS", width / 2, height - 28);

      const link = document.createElement("a");
      link.href = canvas.toDataURL("image/png");
      link.download = `QR_PASS_${vehicleNo.replace(/\s+/g, "_")}.png`;
      document.body.appendChild(link); link.click(); document.body.removeChild(link);
      dbStore.addAuditLog(currentUser.username, "QR_PASS_DOWNLOAD", `Downloaded gate QR pass for vehicle ${vehicleNo}`);
    } catch {
      const width = 400, height = 630;
      const canvas = document.createElement("canvas");
      canvas.width = width; canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, width, height);
      ctx.lineWidth = 4; ctx.strokeStyle = "#0f172a"; ctx.strokeRect(12, 12, width - 24, height - 24);
      ctx.lineWidth = 1; ctx.strokeStyle = "#94a3b8"; ctx.strokeRect(18, 18, width - 36, height - 36);
      ctx.textAlign = "center"; ctx.font = "bold 16px system-ui, sans-serif"; ctx.fillStyle = "#1e3a8a"; ctx.fillText("VEHICLE ENTRY GATE PASS (OFFLINE)", width / 2, 46);
      ctx.font = "bold 8.5px monospace"; ctx.fillStyle = "#64748b"; ctx.fillText("INDUSTRIAL GATEHOUSE SECURITY SYSTEM", width / 2, 62);
      ctx.beginPath(); ctx.moveTo(30, 75); ctx.lineTo(width - 30, 75); ctx.strokeStyle = "#e2e8f0"; ctx.lineWidth = 1.5; ctx.stroke();

      ctx.fillStyle = "#0F172A";
      for (let x = 110; x < 290; x += 9) {
        for (let y = 100; y < 280; y += 9) {
          const fTL = x < 155 && y < 145, fTR = x > 245 && y < 145, fBL = x < 155 && y > 235;
          if (fTL || fTR || fBL) {
            const cx = Math.floor((x - 110) / 9), cy = Math.floor((y - 100) / 9);
            if ((cx === 0 || cx === 5 || cy === 0 || cy === 5) && fTL) ctx.fillRect(x, y, 8, 8);
            else if ((cx === 14 || cx === 19 || cy === 0 || cy === 5) && fTR) ctx.fillRect(x, y, 8, 8);
            else if ((cx === 0 || cx === 5 || cy === 14 || cy === 19) && fBL) ctx.fillRect(x, y, 8, 8);
            else if (cx > 1 && cx < 4 && cy > 1 && cy < 4 && fTL) ctx.fillRect(x, y, 8, 8);
            else if (cx > 15 && cx < 18 && cy > 1 && cy < 4 && fTR) ctx.fillRect(x, y, 8, 8);
            else if (cx > 1 && cx < 4 && cy > 15 && cy < 18 && fBL) ctx.fillRect(x, y, 8, 8);
          } else { const h = (x * 17 + y * 31 + qrValue.length) % 100; if (h > 45) ctx.fillRect(x, y, 8, 8); }
        }
      }
      ctx.font = "bold 10px monospace"; ctx.fillStyle = "#475569"; ctx.fillText(`SYSTEM ID: ${qrValue}`, width / 2, 305);
      const boxX = 30, boxY = 320, boxW = width - 60, boxH = 46;
      ctx.fillStyle = "#f1f5f9"; ctx.fillRect(boxX, boxY, boxW, boxH);
      ctx.lineWidth = 1.5; ctx.strokeStyle = "#cbd5e1"; ctx.strokeRect(boxX, boxY, boxW, boxH);
      ctx.font = "extrabold 23px monospace"; ctx.fillStyle = "#0f172a"; ctx.textBaseline = "middle";
      ctx.fillText(vehicleNo.toUpperCase(), width / 2, boxY + boxH / 2); ctx.textBaseline = "alphabetic";
      const gridStartY = 398, keyX = 42, valX = width - 42;
      const rows = [
        { label: "DRIVER NAME", value: selectedVehicle.driver_name },
        { label: "CONTACT NO", value: selectedVehicle.driver_mobile || "N/A" },
        { label: "TRANSPORTER", value: selectedVehicle.transporter },
        { label: "VEHICLE TYPE", value: selectedVehicle.vehicle_type.toUpperCase() },
        { label: "GENERATED ON", value: new Date(selectedVehicle.created_date).toLocaleString() },
      ];
      let curY = gridStartY;
      rows.forEach((r, i) => {
        if (i % 2 === 0) { ctx.fillStyle = "#f8fafc"; ctx.fillRect(boxX, curY - 14, boxW, 20); }
        ctx.textAlign = "left"; ctx.font = "bold 9px monospace"; ctx.fillStyle = "#64748b"; ctx.fillText(r.label, keyX, curY);
        ctx.textAlign = "right"; ctx.font = "bold 10px system-ui, sans-serif"; ctx.fillStyle = "#0f172a";
        let vt = r.value; const maxW = 205;
        if (ctx.measureText(vt).width > maxW) { while (ctx.measureText(vt + "...").width > maxW && vt.length) vt = vt.slice(0, -1); vt += "..."; }
        ctx.fillText(vt, valX, curY);
        ctx.beginPath(); ctx.moveTo(boxX, curY + 6); ctx.lineTo(width - boxX, curY + 6); ctx.strokeStyle = "#e2e8f0"; ctx.lineWidth = 1; ctx.stroke();
        curY += 24;
      });
      ctx.beginPath(); ctx.moveTo(35, height - 48); ctx.lineTo(width - 35, height - 48); ctx.strokeStyle = "#cbd5e1"; ctx.lineWidth = 1; ctx.setLineDash([4, 4]); ctx.stroke(); ctx.setLineDash([]);
      ctx.textAlign = "center"; ctx.font = "bold 8px monospace"; ctx.fillStyle = "#94a3b8"; ctx.fillText("VALID SECURITY GATE PASS \u2022 PLEASE SHOW AT EXIT POINTS", width / 2, height - 28);
      const link = document.createElement("a"); link.href = canvas.toDataURL("image/png");
      link.download = `QR_PASS_${vehicleNo.replace(/\s+/g, "_")}.png`;
      document.body.appendChild(link); link.click(); document.body.removeChild(link);
      dbStore.addAuditLog(currentUser.username, "QR_PASS_DOWNLOAD", `Downloaded local offline pass for vehicle ${vehicleNo}`);
    } finally { setDownloading(false); }
  };

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    if (overstay <= 0 || overstay > 24) {
      setMessage({ type: "error", text: "Overstay hours must be within 1 to 24 hours." });
      return;
    }
    onUpdateConfig({ overstayHours: overstay, autoBackupEnabled: backupCheck, shiftSchedule: shift, darkMode: config.darkMode });
    dbStore.addAuditLog(currentUser.username, "UPDATE_CONFIG", `Saved config. Overstay: ${overstay}hrs. Shift: ${shift}`);
    setMessage({ type: "success", text: "Configuration saved successfully." });
  };

  const handleReset = () => {
    if (confirm("WARNING: This will permanently delete all vehicle entries, transactions, and audit trails. Reset to factory defaults?")) {
      onResetDatabase();
      dbStore.addAuditLog(currentUser.username, "RESET_DB", "Database reset requested by admin.");
      setMessage({ type: "success", text: "Database reset to factory defaults." });
    }
  };

  const handleDownloadBackup = () => {
    try {
      const dump = dbStore.exportBackupData();
      const blob = new Blob([dump], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url; link.download = `VMS_BACKUP_${new Date().toISOString().split("T")[0]}.json`;
      link.click();
      dbStore.addAuditLog(currentUser.username, "DB_BACKUP_DOWNLOAD", "Operator downloaded database backup.");
    } catch { setMessage({ type: "error", text: "Backup failed." }); }
  };

  const handleUploadRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessage(null);
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const ok = dbStore.restoreBackupData(text);
      if (ok) { setMessage({ type: "success", text: "Database restored. Reloading..." }); setTimeout(() => window.location.reload(), 1500); }
      else setMessage({ type: "error", text: "Invalid backup file structure." });
    };
    reader.readAsText(file);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-8 pb-10">

      {/* Header */}
      <div className="overflow-hidden rounded-[2rem] border border-slate-800/70 bg-slate-950 shadow-2xl shadow-slate-300/70">
        <div className="relative p-5 sm:p-6 lg:p-7">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.30),_transparent_24rem),radial-gradient(circle_at_bottom_right,_rgba(16,185,129,0.18),_transparent_22rem)]" />
          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="mt-1 flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-white ring-1 ring-white/15">
                <Settings className="h-7 w-7" />
              </div>
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.26em] text-blue-300">Administration Console</p>
                <h1 className="mt-1 text-2xl font-black tracking-tight text-white sm:text-3xl">System Configuration</h1>
                <p className="mt-2 max-w-3xl text-sm font-medium leading-relaxed text-slate-300">
                  Manage plant thresholds, scanner hardware, QR passes, backup utilities, dispatch dropdowns, and audit controls.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:min-w-[320px]">
              <div className="rounded-2xl border border-white/10 bg-white/[0.07] p-4 backdrop-blur">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Vehicles</p>
                <p className="mt-1 text-3xl font-black text-white">{vehicles.length}</p>
              </div>
              <div className="rounded-2xl border border-blue-400/20 bg-blue-400/10 p-4 backdrop-blur">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-300">Audit Logs</p>
                <p className="mt-1 text-3xl font-black text-blue-100">{auditLogs.length}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Alert Banner */}
      {message && (
        <div
          className={`flex items-center gap-3 px-5 py-3.5 rounded-xl border text-sm ${message.type === "success"
            ? "bg-emerald-50 border-emerald-200 text-emerald-800"
            : "bg-red-50 border-red-200 text-red-800"
            }`}
        >
          {message.type === "success" ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
          <span className="font-semibold">{message.text}</span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">

        {/* ===== LEFT COLUMN ===== */}
        <div className="space-y-8">

          {/* --- CARD: Plant Threshold Variables --- */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm">
            <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100">
              <div className="w-9 h-9 rounded-lg bg-blue-600/10 flex items-center justify-center">
                <Timer className="w-4.5 h-4.5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-800">Plant Threshold Variables</h2>
                <p className="text-xs text-slate-500">Overstay limits, shift schedule, backup preferences</p>
              </div>
            </div>
            <div className="p-6">
              <form onSubmit={handleSaveConfig} className="space-y-6">
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    <Clock className="w-3.5 h-3.5" />
                    Overstay Duration Limit (Hours)
                  </label>
                  <input
                    type="number" min="1" max="24" id="overstay-hours-input"
                    value={overstay}
                    onChange={e => setOverstay(parseInt(e.target.value) || 4)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                  <p className="text-xs text-slate-400 mt-1.5">Vehicles inside beyond this limit trigger overstay alerts on the dashboard.</p>
                </div>
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                    <CalendarDays className="w-3.5 h-3.5" />
                    Active Shift Schedule
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {([
                      { id: "A", label: "A Shift", time: "06:30 - 15:00" },
                      { id: "B", label: "B Shift", time: "15:00 - 23:50" },
                      { id: "C", label: "C Shift", time: "23:50 - 06:30" }
                    ] as const).map(s => (
                      <button key={s.id} type="button" onClick={() => setShift(s.id)}
                        className={`text-center rounded-xl border transition-all cursor-pointer py-3.5 px-2 ${shift === s.id
                          ? "bg-slate-900 border-slate-800 text-white shadow-lg"
                          : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                          }`}>
                        <div className={`text-[11px] font-black uppercase tracking-wider ${shift === s.id ? "text-blue-400" : "text-slate-400"}`}>{s.label}</div>
                        <div className="text-[10px] font-mono font-bold mt-1">{s.time}</div>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-between py-3 px-4 bg-slate-50 rounded-xl border border-slate-100">
                  <div>
                    <div className="text-sm font-semibold text-slate-700">Automatic Local Backup</div>
                    <p className="text-xs text-slate-400 mt-0.5">Auto-compile database export on each gate checkout</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={backupCheck} onChange={e => setBackupCheck(e.target.checked)} className="sr-only peer" />
                    <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                <div className="flex justify-end pt-2 border-t border-slate-100">
                  <button type="submit" id="btn-save-sys-config" className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer transition-all">
                    Save Configuration
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* --- CARD: Scanner Hardware Connection --- */}
          <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xl shadow-slate-200/70">
            <div className="border-b border-slate-200 bg-gradient-to-r from-slate-50 via-white to-blue-50/80 px-6 py-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600/10 text-blue-600">
                    <QrCode className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-sm font-black uppercase tracking-[0.16em] text-slate-900">Scanner Hardware Connection</h2>
                    <p className="mt-1 text-xs font-semibold text-slate-500">Central COM port station for gate scanner setup and test scans.</p>
                  </div>
                </div>
                <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-blue-700">
                  IN / OUT status only
                </span>
              </div>
            </div>
            <div className="bg-slate-50/60 p-4 sm:p-6">
              <QrScanner onScanSuccess={() => setMessage({ type: "success", text: "Scanner test scan received successfully." })} activeMode="IN" />
            </div>
          </div>

          {/* --- CARD: Vehicle QR Code Pass Downloader --- */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm">
            <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100">
              <div className="w-9 h-9 rounded-lg bg-cyan-600/10 flex items-center justify-center">
                <QrCode className="w-4.5 h-4.5 text-cyan-600" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-800">Vehicle QR Code Pass Downloader</h2>
                <p className="text-xs text-slate-500">Generate and download secure gate pass stickers</p>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                <Truck className="w-3.5 h-3.5 inline mr-1.5" />
                Select Vehicle
              </label>
              <select value={selectedVehicleId} onChange={e => setSelectedVehicleId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 text-slate-800">
                <option value="">— Choose a vehicle —</option>
                {vehicles.map(v => (
                  <option key={v.id} value={v.id}>{v.vehicle_number} — {v.vehicle_type} — {v.driver_name}</option>
                ))}
              </select>
              {selectedVehicle && (
                <div className="space-y-3">
                  <div className="flex items-center gap-4 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                    <div className="flex-1 min-w-0">
                      <div className="text-lg font-bold text-slate-800 font-mono uppercase">{selectedVehicle.vehicle_number}</div>
                      <div className="flex items-center gap-4 mt-2 text-sm text-slate-500 flex-wrap">
                        <span className="flex items-center gap-1"><User className="w-3.5 h-3.5" /> {selectedVehicle.driver_name}</span>
                        <span className="flex items-center gap-1"><Smartphone className="w-3.5 h-3.5" /> {selectedVehicle.driver_mobile || "N/A"}</span>
                      </div>
                      <div className="text-xs text-slate-400 font-mono mt-1.5">QR: {selectedVehicle.qr_code}</div>
                    </div>
                    <div className="shrink-0 bg-white p-2 rounded-lg border border-slate-200">
                      <img src={`https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(selectedVehicle.qr_code)}`} alt="QR" className="w-16 h-16 object-contain" referrerPolicy="no-referrer" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white border border-slate-200 rounded-lg p-3">
                      <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Transporter</div>
                      <div className="text-sm font-semibold text-slate-800 truncate">{selectedVehicle.transporter}</div>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-lg p-3">
                      <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Vehicle Type</div>
                      <div className="text-sm font-semibold text-slate-800">{selectedVehicle.vehicle_type}</div>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-lg p-3">
                      <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Gate Status</div>
                      <span className={`inline-block px-2.5 py-0.5 rounded text-xs font-bold uppercase ${selectedVehicle.status === "IN" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-slate-100 text-slate-500 border border-slate-200"
                        }`}>{selectedVehicle.status}</span>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-lg p-3">
                      <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Registered On</div>
                      <div className="text-sm font-semibold text-slate-800">{new Date(selectedVehicle.created_date).toLocaleDateString()}</div>
                    </div>
                  </div>
                  <button type="button" disabled={!selectedVehicle || downloading} onClick={handleDownloadQR}
                    className="w-full py-3 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed text-white rounded-xl text-sm font-bold transition-all cursor-pointer flex items-center justify-center gap-2 shadow-sm hover:shadow-md">
                    <Download className="w-4 h-4" />
                    <span>{downloading ? "Generating Pass..." : "Download QR Gate Pass"}</span>
                  </button>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* ===== RIGHT COLUMN ===== */}
        <div className="space-y-8">

          {/* --- CARD: Database Utilities & Backups --- */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm">
            <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100">
              <div className="w-9 h-9 rounded-lg bg-indigo-600/10 flex items-center justify-center">
                <Database className="w-4.5 h-4.5 text-indigo-600" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-800">Database Utilities & Backups</h2>
                <p className="text-xs text-slate-500">Export, restore, or reset the system database</p>
              </div>
            </div>
            <div className="p-6 space-y-5">
              <p className="text-sm text-slate-500 leading-relaxed">Download a complete JSON backup of your database, restore from a previous backup file, or reset all data to factory defaults.</p>
              <div className="grid grid-cols-2 gap-4">
                <button onClick={handleDownloadBackup} id="btn-download-db-json" className="flex items-center justify-center gap-2.5 py-4 px-4 text-sm font-bold rounded-xl border-2 border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition-all cursor-pointer hover:shadow-sm">
                  <Download className="w-5 h-5" /> Download Backup
                </button>
                <button onClick={() => fileInputRef.current?.click()} id="btn-upload-db-json" className="flex items-center justify-center gap-2.5 py-4 px-4 text-sm font-bold rounded-xl border-2 border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition-all cursor-pointer hover:shadow-sm">
                  <Upload className="w-5 h-5" /> Restore Backup
                </button>
                <input type="file" ref={fileInputRef} onChange={handleUploadRestore} accept=".json" className="hidden" />
              </div>
              <div className="pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-rose-50 border border-rose-200 flex items-center justify-center shrink-0">
                      <ShieldAlert className="w-5 h-5 text-rose-500" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-rose-700">Factory Data Wipe</div>
                      <p className="text-xs text-slate-400">Destructive action — resets all data to factory defaults</p>
                    </div>
                  </div>
                  <button onClick={handleReset} id="btn-reset-db" className="shrink-0 flex items-center gap-2 px-5 py-2.5 bg-rose-50 hover:bg-rose-100 border-2 border-rose-200 text-rose-700 font-bold rounded-xl text-xs tracking-wider cursor-pointer transition-all hover:shadow-sm">
                    <Trash2 className="w-4 h-4" /> Reset Database
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* --- CARD: Dispatch Form Option Settings --- */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm">
            <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100">
              <div className="w-9 h-9 rounded-lg bg-orange-600/10 flex items-center justify-center">
                <ListTodo className="w-4.5 h-4.5 text-orange-600" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-800">Dispatch Form Option Settings</h2>
                <p className="text-xs text-slate-500">Manage dispatch purpose and department dropdowns</p>
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-6">
                {/* Purpose of Dispatch */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Truck className="w-4 h-4 text-orange-600" />
                      <span className="text-sm font-bold text-slate-700">Purpose of Dispatch</span>
                    </div>
                    <span className="text-xs font-bold text-orange-700 bg-orange-50 border border-orange-200 rounded-full px-2.5 py-0.5">{purposes.length}</span>
                  </div>
                  <form onSubmit={handleAddPurpose} className="flex gap-2 mb-3">
                    <input type="text" value={newPurpose} onChange={e => setNewPurpose(e.target.value)}
                      placeholder="Add new purpose..."
                      className="flex-1 bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500" />
                    <button type="submit" className="px-3.5 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 shrink-0">
                      <Plus className="w-3.5 h-3.5" /> Add
                    </button>
                  </form>
                  <div className="border border-slate-200 rounded-xl bg-white">
                    {purposes.length === 0 ? (
                      <div className="text-center py-8 text-sm text-slate-400">No purposes added yet.</div>
                    ) : (
                      <div className="divide-y divide-slate-100 max-h-[200px] overflow-y-auto">
                        {purposes.map((p, idx) => (
                          <div key={idx} className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 transition-colors">
                            <span className="flex items-center justify-center w-6 h-6 rounded bg-slate-100 text-xs font-bold text-slate-500 shrink-0 font-mono">{idx + 1}</span>
                            <span className="flex-1 text-sm font-medium text-slate-700 truncate">{p}</span>
                            <button type="button" onClick={() => handleRemovePurpose(p)}
                              className="flex items-center justify-center w-7 h-7 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 shrink-0" title="Remove">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Dispatching Department */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-orange-600" />
                      <span className="text-sm font-bold text-slate-700">Dispatching Department</span>
                    </div>
                    <span className="text-xs font-bold text-orange-700 bg-orange-50 border border-orange-200 rounded-full px-2.5 py-0.5">{departments.length}</span>
                  </div>
                  <form onSubmit={handleAddDepartment} className="flex gap-2 mb-3">
                    <input type="text" value={newDepartment} onChange={e => setNewDepartment(e.target.value)}
                      placeholder="Add new department..."
                      className="flex-1 bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500" />
                    <button type="submit" className="px-3.5 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 shrink-0">
                      <Plus className="w-3.5 h-3.5" /> Add
                    </button>
                  </form>
                  <div className="border border-slate-200 rounded-xl bg-white">
                    {departments.length === 0 ? (
                      <div className="text-center py-8 text-sm text-slate-400">No departments added yet.</div>
                    ) : (
                      <div className="divide-y divide-slate-100 max-h-[200px] overflow-y-auto">
                        {departments.map((d, idx) => (
                          <div key={idx} className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 transition-colors">
                            <span className="flex items-center justify-center w-6 h-6 rounded bg-slate-100 text-xs font-bold text-slate-500 shrink-0 font-mono">{idx + 1}</span>
                            <span className="flex-1 text-sm font-medium text-slate-700 truncate">{d}</span>
                            <button type="button" onClick={() => handleRemoveDepartment(d)}
                              className="flex items-center justify-center w-7 h-7 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 shrink-0" title="Remove">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* --- CARD: Operator Audit Logs (full width below) --- */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-600/10 flex items-center justify-center">
              <ShieldCheck className="w-4.5 h-4.5 text-amber-600" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800">Operator Audit Logs</h2>
              <p className="text-xs text-slate-500">System activity and security trail</p>
            </div>
          </div>
          <span className="text-xs px-3 py-1 rounded-full bg-slate-100 text-slate-500 font-bold">{auditLogs.length} entries</span>
        </div>
        <div className="max-h-[500px] overflow-y-auto p-4 space-y-2">
          {auditLogs.length === 0 ? (
            <div className="text-center py-16 text-sm text-slate-400">No audit log entries yet.</div>
          ) : (
            auditLogs.map(log => (
              <div key={log.id} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl hover:border-slate-300 transition-colors">
                <div className="flex items-center justify-between gap-3 mb-1.5">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${log.action.includes("RESET") || log.action.includes("FAILED")
                    ? "bg-red-50 text-red-600 border border-red-100"
                    : log.action.includes("GATE") || log.action.includes("QR")
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                      : log.action.includes("LOGIN") || log.action.includes("LOGOUT")
                        ? "bg-blue-50 text-blue-700 border border-blue-100"
                        : "bg-slate-100 text-slate-600 border border-slate-200"
                    }`}>{log.action}</span>
                  <span className="text-[10px] text-slate-400 shrink-0 font-mono">
                    {new Date(log.timestamp).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                  </span>
                </div>
                <p className="text-sm font-medium text-slate-700 leading-snug">{log.details}</p>
                <p className="text-xs text-slate-400 mt-1.5">
                  by <span className="font-bold text-slate-500">{log.username}</span>
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
