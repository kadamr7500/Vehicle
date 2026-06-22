import React, { useState, useRef } from "react";
import { Settings, ShieldCheck, Download, Upload, Trash2, CheckCircle2, AlertCircle, FileJson, Clock, Moon, QrCode } from "lucide-react";
import { SystemConfig, AuditLog, User, VehicleMaster } from "../types";
import { dbStore } from "../dbStore";

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
  const [themeMode, setThemeMode] = useState<boolean>(config.darkMode);
  
  // Custom states for dynamic options management
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
    setMessage({ type: "success", text: `Successfully added dispatch purpose: "${val}"` });
  };

  const handleRemovePurpose = (item: string) => {
    if (purposes.length <= 1) {
      setMessage({ type: "error", text: "At least one dispatch purpose option is required by the gatehouse." });
      return;
    }
    const updated = purposes.filter(p => p !== item);
    setPurposes(updated);
    dbStore.savePurposes(updated);
    dbStore.addAuditLog(currentUser.username, "REMOVE_PURPOSE", `Removed dispatch purpose: "${item}"`);
    setMessage({ type: "success", text: `Successfully removed dispatch purpose: "${item}"` });
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
    setMessage({ type: "success", text: `Successfully added department: "${val}"` });
  };

  const handleRemoveDepartment = (item: string) => {
    if (departments.length <= 1) {
      setMessage({ type: "error", text: "At least one department option is required by the gatehouse." });
      return;
    }
    const updated = departments.filter(d => d !== item);
    setDepartments(updated);
    dbStore.saveDepartments(updated);
    dbStore.addAuditLog(currentUser.username, "REMOVE_DEPARTMENT", `Removed department: "${item}"`);
    setMessage({ type: "success", text: `Successfully removed department: "${item}"` });
  };

  // Custom vehicle selection state for QR passes download
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>("");
  const [downloading, setDownloading] = useState<boolean>(false);
  
  // File upload restore ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Load audit logs dynamically
  const auditLogs = dbStore.getAuditLogs().sort((a, b) => b.id - a.id); // reverse chronological

  const selectedVehicle = vehicles.find(v => v.id === parseInt(selectedVehicleId));

  const handleDownloadQR = async () => {
    if (!selectedVehicle) return;
    setDownloading(true);
    
    const qrValue = selectedVehicle.qr_code;
    const vehicleNo = selectedVehicle.vehicle_number;
    
    try {
      // 1. Fetch QR Image or create Image element
      const qrImg = new Image();
      qrImg.crossOrigin = "anonymous";
      
      const qrLoaded = new Promise<HTMLImageElement>((resolve, reject) => {
        qrImg.onload = () => resolve(qrImg);
        qrImg.onerror = (e) => reject(e);
      });
      
      // Use the premium QR code service
      qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrValue)}`;
      
      const loadedImg = await qrLoaded;
      
      // Create beautifully details packed 400x630 card layout canvas
      const width = 400;
      const height = 630;
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      
      if (ctx) {
        // Pure White Background
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);

        // Bold double boundaries
        ctx.lineWidth = 4;
        ctx.strokeStyle = "#0f172a";
        ctx.strokeRect(12, 12, width - 24, height - 24);

        ctx.lineWidth = 1;
        ctx.strokeStyle = "#94a3b8";
        ctx.strokeRect(18, 18, width - 36, height - 36);

        // Header Texts
        ctx.textAlign = "center";
        ctx.font = "bold 16px system-ui, -apple-system, sans-serif";
        ctx.fillStyle = "#1e3a8a";
        ctx.fillText("VEHICLE ENTRY GATE PASS", width / 2, 46);

        ctx.font = "bold 8.5px monospace";
        ctx.fillStyle = "#64748b";
        ctx.fillText("INDUSTRIAL GATEHOUSE SECURITY SYSTEM", width / 2, 62);

        // Divider
        ctx.beginPath();
        ctx.moveTo(30, 75);
        ctx.lineTo(width - 30, 75);
        ctx.strokeStyle = "#e2e8f0";
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Draw Loaded Online QR Code
        const qrSize = 190;
        const qrX = (width - qrSize) / 2;
        const qrY = 95;
        ctx.drawImage(loadedImg, qrX, qrY, qrSize, qrSize);

        // System Code underneath QR
        ctx.font = "bold 10px monospace";
        ctx.fillStyle = "#475569";
        ctx.fillText(`SYSTEM ID: ${qrValue}`, width / 2, 305);

        // Vehicle Plate Box
        const boxX = 30;
        const boxY = 320;
        const boxW = width - 60;
        const boxH = 46;

        ctx.fillStyle = "#f1f5f9";
        ctx.fillRect(boxX, boxY, boxW, boxH);
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = "#cbd5e1";
        ctx.strokeRect(boxX, boxY, boxW, boxH);

        // Vehicle Number Text
        ctx.font = "extrabold 23px monospace";
        ctx.fillStyle = "#0f172a";
        ctx.textBaseline = "middle";
        ctx.fillText(vehicleNo.toUpperCase(), width / 2, boxY + boxH / 2);
        ctx.textBaseline = "alphabetic";

        // Details Block
        const gridStartY = 398;
        const keyX = 42;
        const valX = width - 42;

        const metadataRows = [
          { label: "DRIVER NAME", value: selectedVehicle.driver_name },
          { label: "CONTACT NO", value: selectedVehicle.driver_mobile || "N/A" },
          { label: "TRANSPORTER", value: selectedVehicle.transporter },
          { label: "VEHICLE TYPE", value: selectedVehicle.vehicle_type.toUpperCase() },
          { label: "GENERATED ON", value: new Date(selectedVehicle.created_date).toLocaleString() },
        ];

        let currentY = gridStartY;
        metadataRows.forEach((row, idx) => {
          if (idx % 2 === 0) {
            ctx.fillStyle = "#f8fafc";
            ctx.fillRect(boxX, currentY - 14, boxW, 20);
          }

          ctx.textAlign = "left";
          ctx.font = "bold 9px monospace";
          ctx.fillStyle = "#64748b";
          ctx.fillText(row.label, keyX, currentY);

          ctx.textAlign = "right";
          ctx.font = "bold 10px system-ui, -apple-system, sans-serif";
          ctx.fillStyle = "#0f172a";

          const maxValW = 205;
          let valText = row.value;
          if (ctx.measureText(valText).width > maxValW) {
            while (ctx.measureText(valText + "...").width > maxValW && valText.length > 0) {
              valText = valText.substring(0, valText.length - 1);
            }
            valText += "...";
          }
          ctx.fillText(valText, valX, currentY);

          ctx.beginPath();
          ctx.moveTo(boxX, currentY + 6);
          ctx.lineTo(width - boxX, currentY + 6);
          ctx.strokeStyle = "#e2e8f0";
          ctx.lineWidth = 1;
          ctx.stroke();

          currentY += 24;
        });

        // Bottom footer line
        ctx.beginPath();
        ctx.moveTo(35, height - 48);
        ctx.lineTo(width - 35, height - 48);
        ctx.strokeStyle = "#cbd5e1";
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.textAlign = "center";
        ctx.font = "bold 8px monospace";
        ctx.fillStyle = "#94a3b8";
        ctx.fillText("VALID SECURITY GATE PASS • PLEASE SHOW AT EXIT POINTS", width / 2, height - 28);

        const localImgUrl = canvas.toDataURL("image/png");
        const link = document.createElement("a");
        link.href = localImgUrl;
        link.download = `QR_PASS_${vehicleNo.replace(/\s+/g, "_")}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }

      dbStore.addAuditLog(currentUser.username, "QR_PASS_DOWNLOAD", `Downloaded gate QR pass for vehicle ${vehicleNo}`);
    } catch (error) {
      console.error("Online QR download failed, falling back to local canvas drawing", error);
      
      // Offline safe fallback with mock matrix and also FULL detailed fields listed perfectly under it
      const canvas = document.createElement("canvas");
      const width = 400;
      const height = 630;
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);

        // Security frame
        ctx.lineWidth = 4;
        ctx.strokeStyle = "#0f172a";
        ctx.strokeRect(12, 12, width - 24, height - 24);

        ctx.lineWidth = 1;
        ctx.strokeStyle = "#94a3b8";
        ctx.strokeRect(18, 18, width - 36, height - 36);

        // Offline Header
        ctx.textAlign = "center";
        ctx.font = "bold 16px system-ui, -apple-system, sans-serif";
        ctx.fillStyle = "#1e3a8a";
        ctx.fillText("VEHICLE ENTRY GATE PASS (OFFLINE)", width / 2, 46);

        ctx.font = "bold 8.5px monospace";
        ctx.fillStyle = "#64748b";
        ctx.fillText("INDUSTRIAL GATEHOUSE SECURITY SYSTEM", width / 2, 62);

        ctx.beginPath();
        ctx.moveTo(30, 75);
        ctx.lineTo(width - 30, 75);
        ctx.strokeStyle = "#e2e8f0";
        ctx.lineWidth = 1.5;
        ctx.stroke();
        
        // Offline Dynamic QR Mock Matrix
        ctx.fillStyle = "#0F172A";
        for (let x = 110; x < 290; x += 9) {
          for (let y = 100; y < 280; y += 9) {
            const inFinderTL = (x < 155 && y < 145);
            const inFinderTR = (x > 245 && y < 145);
            const inFinderBL = (x < 155 && y > 235);
            
            if (inFinderTL || inFinderTR || inFinderBL) {
              const cellX = Math.floor((x - 110) / 9);
              const cellY = Math.floor((y - 100) / 9);
              if ((cellX === 0 || cellX === 5 || cellY === 0 || cellY === 5) && inFinderTL) {
                ctx.fillRect(x, y, 8, 8);
              } else if ((cellX === 14 || cellX === 19 || cellY === 0 || cellY === 5) && inFinderTR) {
                ctx.fillRect(x, y, 8, 8);
              } else if ((cellX === 0 || cellX === 5 || cellY === 14 || cellY === 19) && inFinderBL) {
                ctx.fillRect(x, y, 8, 8);
              } else if ((cellX > 1 && cellX < 4 && cellY > 1 && cellY < 4) && inFinderTL) {
                ctx.fillRect(x, y, 8, 8);
              } else if ((cellX > 15 && cellX < 18 && cellY > 1 && cellY < 4) && inFinderTR) {
                ctx.fillRect(x, y, 8, 8);
              } else if ((cellX > 1 && cellX < 4 && cellY > 15 && cellY < 18) && inFinderBL) {
                ctx.fillRect(x, y, 8, 8);
              }
            } else {
              const combinedHash = (x * 17 + y * 31 + qrValue.length) % 100;
              if (combinedHash > 45) {
                ctx.fillRect(x, y, 8, 8);
              }
            }
          }
        }
        
        // System Code underneath QR
        ctx.font = "bold 10px monospace";
        ctx.fillStyle = "#475569";
        ctx.fillText(`SYSTEM ID: ${qrValue}`, width / 2, 305);

        // Vehicle Plate Box
        const boxX = 30;
        const boxY = 320;
        const boxW = width - 60;
        const boxH = 46;

        ctx.fillStyle = "#f1f5f9";
        ctx.fillRect(boxX, boxY, boxW, boxH);
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = "#cbd5e1";
        ctx.strokeRect(boxX, boxY, boxW, boxH);

        // Vehicle Number Text
        ctx.font = "extrabold 23px monospace";
        ctx.fillStyle = "#0f172a";
        ctx.textBaseline = "middle";
        ctx.fillText(vehicleNo.toUpperCase(), width / 2, boxY + boxH / 2);
        ctx.textBaseline = "alphabetic";

        // Details Block
        const gridStartY = 398;
        const keyX = 42;
        const valX = width - 42;

        const metadataRows = [
          { label: "DRIVER NAME", value: selectedVehicle.driver_name },
          { label: "CONTACT NO", value: selectedVehicle.driver_mobile || "N/A" },
          { label: "TRANSPORTER", value: selectedVehicle.transporter },
          { label: "VEHICLE TYPE", value: selectedVehicle.vehicle_type.toUpperCase() },
          { label: "GENERATED ON", value: new Date(selectedVehicle.created_date).toLocaleString() },
        ];

        let currentY = gridStartY;
        metadataRows.forEach((row, idx) => {
          if (idx % 2 === 0) {
            ctx.fillStyle = "#f8fafc";
            ctx.fillRect(boxX, currentY - 14, boxW, 20);
          }

          ctx.textAlign = "left";
          ctx.font = "bold 9px monospace";
          ctx.fillStyle = "#64748b";
          ctx.fillText(row.label, keyX, currentY);

          ctx.textAlign = "right";
          ctx.font = "bold 10px system-ui, -apple-system, sans-serif";
          ctx.fillStyle = "#0f172a";

          const maxValW = 205;
          let valText = row.value;
          if (ctx.measureText(valText).width > maxValW) {
            while (ctx.measureText(valText + "...").width > maxValW && valText.length > 0) {
              valText = valText.substring(0, valText.length - 1);
            }
            valText += "...";
          }
          ctx.fillText(valText, valX, currentY);

          ctx.beginPath();
          ctx.moveTo(boxX, currentY + 6);
          ctx.lineTo(width - boxX, currentY + 6);
          ctx.strokeStyle = "#e2e8f0";
          ctx.lineWidth = 1;
          ctx.stroke();

          currentY += 24;
        });

        // Bottom footer line
        ctx.beginPath();
        ctx.moveTo(35, height - 48);
        ctx.lineTo(width - 35, height - 48);
        ctx.strokeStyle = "#cbd5e1";
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.textAlign = "center";
        ctx.font = "bold 8px monospace";
        ctx.fillStyle = "#94a3b8";
        ctx.fillText("VALID SECURITY GATE PASS • PLEASE SHOW AT EXIT POINTS", width / 2, height - 28);
        
        const localImgUrl = canvas.toDataURL("image/png");
        const link = document.createElement("a");
        link.href = localImgUrl;
        link.download = `QR_PASS_${vehicleNo.replace(/\s+/g, "_")}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        dbStore.addAuditLog(currentUser.username, "QR_PASS_DOWNLOAD", `Downloaded local offline pass for vehicle ${vehicleNo}`);
      }
    } finally {
      setDownloading(false);
    }
  };

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (overstay <= 0 || overstay > 24) {
      setMessage({ type: "error", text: "Overstay hours must be within 1 to 24 hours limits." });
      return;
    }

    const nextConfig: SystemConfig = {
      overstayHours: overstay,
      autoBackupEnabled: backupCheck,
      shiftSchedule: shift,
      darkMode: themeMode,
    };

    onUpdateConfig(nextConfig);
    dbStore.addAuditLog(currentUser.username, "UPDATE_CONFIG", `Saved system threshold config. Overstay: ${overstay} hrs. Shift: ${shift}`);
    setMessage({ type: "success", text: "Global configurations successfully applied." });
  };

  const handleReset = () => {
    if (confirm("WARNING: Doing this will delete all vehicle entries, transactions, and audit trails permanently! Reset back to seeded factory configurations?")) {
      onResetDatabase();
      dbStore.addAuditLog(currentUser.username, "RESET_DB", "Database reset requested by admin.");
      setMessage({ type: "success", text: "System database restored back to initial seeding." });
    }
  };

  const handleDownloadBackup = () => {
    try {
      const dump = dbStore.exportBackupData();
      const blob = new Blob([dump], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `VMS_DB_BACKUP_${new Date().toISOString().split("T")[0]}.json`;
      link.click();
      dbStore.addAuditLog(currentUser.username, "DB_BACKUP_DOWNLOAD", "Operator downloaded database file.");
    } catch (e) {
      console.error(e);
      setMessage({ type: "error", text: "Backup compilation failed." });
    }
  };

  const handleUploadRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessage(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const success = dbStore.restoreBackupData(text);
      if (success) {
        setMessage({ type: "success", text: "Database successfully parsed and restored from file. Reloading..." });
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        setMessage({ type: "error", text: "Invalid Backup JSON file structure. Could not restore database." });
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-slate-200 pb-5">
        <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          SYSTEM PARAMETERS & CONFIGURATIONS
        </h1>
        <p className="text-xs text-slate-500 font-sans mt-0.5">
          Define global plant capacities, manage server backups, restore security files, and view operations logs.
        </p>
      </div>

      {message && (
        <div
          id="config-message-banner"
          className={`p-3 rounded-xl flex items-center gap-2 text-xs border ${
            message.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          )}
          <span className="font-sans font-bold">{message.text}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Hand: Config Panel forms */}
        <div className="lg:col-span-6 space-y-6">
          
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <Settings className="w-4.5 h-4.5 text-blue-600" />
              <h3 className="text-xs font-black text-slate-800 tracking-wider uppercase">
                Plant threshold variables
              </h3>
            </div>

            <form onSubmit={handleSaveConfig} className="space-y-4">
              <div>
                <label className="block text-xxs font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1 font-mono">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  <span>Stay duration warning limit (Hours)</span>
                </label>
                <input
                  type="number"
                  min="1"
                  max="24"
                  id="overstay-hours-input"
                  value={overstay}
                  onChange={(e) => setOverstay(parseInt(e.target.value) || 4)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-blue-500 font-mono text-slate-800 font-bold"
                  required
                />
                <span className="text-xxxs text-slate-400 block mt-1 font-sans">
                  Vehicles staying inside the plant beyond this threshold trigger Crimson Red anomaly warning items.
                </span>
              </div>

              <div>
                <label className="block text-xxs font-black text-slate-400 uppercase tracking-widest mb-1.5 font-mono">
                  ACTIVE SCHEDULE SHIFT
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {([
                    { id: "A", name: "A Shift", time: "6:30 AM - 3:00 PM" },
                    { id: "B", name: "B Shift", time: "3:00 PM - 11:50 PM" },
                    { id: "C", name: "C Shift", time: "11:50 PM - 6:30 AM" }
                  ] as const).map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setShift(s.id)}
                      className={`p-3 text-left rounded-xl border transition cursor-pointer flex flex-col justify-between gap-1.5 ${
                        shift === s.id
                          ? "bg-slate-900 border-slate-950 text-white shadow-sm"
                          : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100/80"
                      }`}
                    >
                      <span className={`text-xxs font-black uppercase tracking-wider ${shift === s.id ? "text-blue-400" : "text-slate-500"}`}>
                        {s.name}
                      </span>
                      <span className="text-[10px] font-mono font-bold">
                        {s.time}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between">
                <div>
                  <span className="text-xxs font-black text-slate-400 uppercase tracking-widest block font-mono">Automatic Local Backup</span>
                  <span className="text-xxxs text-slate-400 font-sans block mt-0.5">Auto compile database exports on each gate checkout.</span>
                </div>
                <input
                  type="checkbox"
                  checked={backupCheck}
                  onChange={(e) => setBackupCheck(e.target.checked)}
                  className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded cursor-pointer"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end">
                <button
                  type="submit"
                  id="btn-save-sys-config"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xxs font-black uppercase tracking-widest cursor-pointer shadow-xs transition"
                >
                  Apply configurations
                </button>
              </div>
            </form>
          </div>

          {/* Dynamic Dropdown Options Management Panel */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 space-y-5">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <Settings className="w-4.5 h-4.5 text-blue-600" />
              <h3 className="text-xs font-black text-slate-800 tracking-wider uppercase">
                Dispatch Form Option Settings
              </h3>
            </div>

            <p className="text-xxs text-slate-550 leading-relaxed font-sans">
              Add or remove dispatch purposes and plant dispatching departments. Changes apply instantly to new outbound dispatch entries and live status filters.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Purpose of Dispatch Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest font-mono">
                    Purpose of Dispatch
                  </span>
                  <span className="text-[9px] bg-blue-50 text-blue-750 px-1.5 py-0.2 rounded font-mono font-bold border border-blue-200">
                    {purposes.length} Options
                  </span>
                </div>

                {/* Add Purpose form */}
                <form onSubmit={handleAddPurpose} className="flex gap-2">
                  <input
                    type="text"
                    value={newPurpose}
                    onChange={(e) => setNewPurpose(e.target.value)}
                    placeholder="e.g., Supplier Dispatch Delivery"
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xxs focus:outline-none focus:border-blue-500 font-sans font-semibold text-slate-800"
                  />
                  <button
                    type="submit"
                    className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xxs font-black uppercase tracking-wider transition cursor-pointer"
                  >
                    Add
                  </button>
                </form>

                {/* Purpose list container */}
                <div className="border border-slate-150 rounded-xl max-h-48 overflow-y-auto divide-y divide-slate-110 bg-slate-50/50">
                  {purposes.map((p, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 hover:bg-white transition group">
                      <span className="text-xxs font-bold text-slate-700 font-sans truncate pr-2" title={p}>
                        {p}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemovePurpose(p)}
                        className="text-slate-400 hover:text-rose-650 p-1 rounded hover:bg-rose-50 transition opacity-80 group-hover:opacity-100 shrink-0"
                        title="Remove Option"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Dispatching Department Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest font-mono">
                    Dispatching Department
                  </span>
                  <span className="text-[9px] bg-slate-100 text-slate-755 pr-1.5 py-0.2 rounded font-mono font-bold border border-slate-200">
                    {departments.length} Options
                  </span>
                </div>

                {/* Add Department form */}
                <form onSubmit={handleAddDepartment} className="flex gap-2">
                  <input
                    type="text"
                    value={newDepartment}
                    onChange={(e) => setNewDepartment(e.target.value)}
                    placeholder="e.g., Stores & Warehouse"
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xxs focus:outline-none focus:border-blue-500 font-sans font-semibold text-slate-800"
                  />
                  <button
                    type="submit"
                    className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xxs font-black uppercase tracking-wider transition cursor-pointer"
                  >
                    Add
                  </button>
                </form>

                {/* Department list container */}
                <div className="border border-slate-150 rounded-xl max-h-48 overflow-y-auto divide-y divide-slate-110 bg-slate-50/50">
                  {departments.map((d, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 hover:bg-white transition group">
                      <span className="text-xxs font-bold text-slate-700 font-sans truncate pr-2" title={d}>
                        {d}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveDepartment(d)}
                        className="text-slate-400 hover:text-rose-655 p-1 rounded hover:bg-rose-50 transition opacity-80 group-hover:opacity-100 shrink-0"
                        title="Remove Option"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Database Backup & Cleaners panels */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <FileJson className="w-4.5 h-4.5 text-emerald-600" />
              <h3 className="text-xs font-black text-slate-800 tracking-wider uppercase">
                Database utilities & Backups
              </h3>
            </div>

            <p className="text-xxs text-slate-550 leading-relaxed font-sans">
              Save or upload structured JSON databases directly. This lets you backup work, restore from past checkpoints, or factory-reset indicators immediately.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {/* Download JSON Backup */}
              <button
                onClick={handleDownloadBackup}
                id="btn-download-db-json"
                className="flex items-center justify-center gap-1.5 p-3 text-xxs font-black uppercase rounded-xl border border-slate-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 tracking-wider transition cursor-pointer"
              >
                <Download className="w-4 h-4 shrink-0" />
                <span>Download Backup</span>
              </button>

              {/* Upload JSON Restore */}
              <button
                onClick={() => fileInputRef.current?.click()}
                id="btn-upload-db-json"
                className="flex items-center justify-center gap-1.5 p-3 text-xxs font-black uppercase rounded-xl border border-slate-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 tracking-wider transition cursor-pointer"
              >
                <Upload className="w-4 h-4 shrink-0" />
                <span>Restore Database</span>
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleUploadRestore}
                accept=".json"
                className="hidden"
              />
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <div>
                <span className="text-xxs font-black text-rose-600 uppercase tracking-widest block font-mono">Factory data wipe</span>
                <span className="text-xxxs text-slate-400 font-sans block mt-0.5">Destructive action! Restore system to pristine mock-seeds.</span>
              </div>
              <button
                onClick={handleReset}
                id="btn-reset-db"
                className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold uppercase rounded-xl text-xxs tracking-wider cursor-pointer transition flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Format DB</span>
              </button>
            </div>
          </div>

          {/* Vehicle QR Code Pass Downloader Card */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <QrCode className="w-4.5 h-4.5 text-blue-600 animate-pulse" />
              <h3 className="text-xs font-black text-slate-800 tracking-wider uppercase">
                Vehicle QR Code passes Downloader
              </h3>
            </div>

            <p className="text-xxs text-slate-550 leading-relaxed font-sans">
              Select any registered vehicle in the active fleet below to generate and pull its secure pass sticker immediately. Printable in multiple formats.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 font-mono">
                  Select Registered Vehicle
                </label>
                <select
                  value={selectedVehicleId}
                  onChange={(e) => setSelectedVehicleId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-blue-500 font-mono text-slate-800 font-bold outline-none"
                >
                  <option value="">-- Choose fleet vehicle number --</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.vehicle_number} ({v.vehicle_type} - {v.driver_name})
                    </option>
                  ))}
                </select>
              </div>

              {selectedVehicle && (
                <div className="space-y-3 animate-fadeIn">
                  <div className="p-3 bg-[#F8FAFC] border border-slate-200 rounded-xl flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-slate-800 font-mono truncate uppercase">
                        {selectedVehicle.vehicle_number}
                      </div>
                      <div className="text-xxs text-slate-505 font-sans mt-0.5 mt-1">
                        Driver: <span className="font-semibold text-slate-700">{selectedVehicle.driver_name}</span>
                      </div>
                      <div className="text-xxxs text-slate-400 font-mono mt-0.5 truncate uppercase">
                        QR: {selectedVehicle.qr_code}
                      </div>
                    </div>

                    <div className="shrink-0 flex flex-col items-center gap-1 bg-white p-2 rounded-lg border border-slate-250">
                      <img 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=80&80&data=${encodeURIComponent(selectedVehicle.qr_code)}`} 
                        alt="Pass Code"
                        className="w-14 h-14 object-contain"
                        referrerPolicy="no-referrer"
                      />
                      <span className="text-[8px] font-mono font-bold text-slate-400">PREVIEW</span>
                    </div>
                  </div>

                  {/* Complete details table below QR Code */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
                    <span className="text-[9px] font-black font-mono text-slate-400 uppercase tracking-widest block border-b border-slate-200 pb-1">
                      Vehicle Security Details
                    </span>
                    <div className="grid grid-cols-2 gap-2 text-xxs bg-white p-2.5 rounded-lg border border-slate-100">
                      <div>
                        <span className="text-slate-400 font-bold block uppercase text-[8px] font-mono">Driver Mobile</span>
                        <span className="font-mono text-slate-700 font-bold">{selectedVehicle.driver_mobile || "N/A"}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 font-bold block uppercase text-[8px] font-mono">Transporter</span>
                        <span className="font-sans text-slate-700 font-semibold truncate block" title={selectedVehicle.transporter}>{selectedVehicle.transporter}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 font-bold block uppercase text-[8px] font-mono">Vehicle Type</span>
                        <span className="font-sans text-slate-700 font-semibold">{selectedVehicle.vehicle_type}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 font-bold block uppercase text-[8px] font-mono">Gate Status</span>
                        <span className={`inline-block px-1 rounded text-[9px] font-bold uppercase ${
                          selectedVehicle.status === "IN" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
                        }`}>{selectedVehicle.status}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <button
                type="button"
                disabled={!selectedVehicle || downloading}
                onClick={handleDownloadQR}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-100 disabled:text-slate-400 text-white rounded-xl text-xxs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm disabled:cursor-not-allowed"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{downloading ? "Compiling pass..." : "Download QR Pass Image"}</span>
              </button>
            </div>
          </div>

        </div>

        {/* Right Hand: System Audit Logs viewer */}
        <div className="lg:col-span-6 bg-white border border-slate-200 rounded-2xl shadow-sm p-5 flex flex-col h-[520px]">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100 mb-4 shrink-0 justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4.5 h-4.5 text-blue-600" />
              <h3 className="text-xs font-black text-slate-850 tracking-wider uppercase">
                Operator Audit logs trails
              </h3>
            </div>
            <span className="text-xxs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-mono font-bold">
              {auditLogs.length} Entries
            </span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin">
            {auditLogs.map((log) => (
              <div
                key={log.id}
                className="p-3 bg-slate-50 border border-slate-200 hover:border-slate-350 rounded-xl text-xxs flex flex-col justify-between gap-1"
              >
                <div className="flex items-center justify-between font-mono">
                  <span className={`px-1.5 py-0.5 rounded font-black uppercase text-xxxs ${
                    log.action.includes("RESET") || log.action.includes("FAILED")
                      ? "bg-rose-50 text-rose-600 border border-rose-100"
                      : log.action.includes("GATE")
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                      : "bg-slate-100 text-slate-650"
                  }`}>
                    {log.action}
                  </span>
                  <span className="text-xxxs text-slate-400">
                    {new Date(log.timestamp).toLocaleString("en-US", { hour: "numeric", minute: "numeric", second: "numeric" })}
                  </span>
                </div>
                <div className="text-slate-800 font-bold font-sans mt-0.5">
                  {log.details}
                </div>
                <div className="text-xxxs text-slate-400 font-sans">
                  Checked by: <span className="font-bold underline">{log.username}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
