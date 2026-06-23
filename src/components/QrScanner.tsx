import React, { useState } from "react";
import { RefreshCw, AlertCircle, Play, Square, Sparkles, Terminal, Cpu, Info, CheckSquare, Settings } from "lucide-react";
import { dbStore } from "../dbStore";
import { useSerialScanner, SerialConfig } from "../hooks/useSerialScanner";

interface QrScannerProps {
  onScanSuccess: (qrCodeText: string) => void;
  activeMode: "IN" | "OUT";
}

export default function QrScanner({ onScanSuccess, activeMode }: QrScannerProps) {
  const {
    serialSupported,
    isConnected,
    isConnecting,
    errorConst,
    terminalLogs,
    lastCode,
    config,
    setConfig,
    connect,
    disconnect,
    injectSimulatedScan,
    feedKeyboardWedge,
    availablePorts,
    selectedPortIndex,
    setSelectedPortIndex,
    refreshPorts,
  } = useSerialScanner(onScanSuccess);

  // Keyboard wedge temporary buffer
  const [wedgeInput, setWedgeInput] = useState<string>("");
  const [showAdvancedSettings, setShowAdvancedSettings] = useState<boolean>(false);

  // Load registered vehicles for physical/live testing simulation
  const vehicles = dbStore.getVehicles();

  // Filter vehicles depending on standard workflow simulation
  // IN scan: only vehicles who are currently OUT
  // OUT scan: only vehicles who are currently IN
  const filteredVehicles = vehicles.filter((v) => {
    if (activeMode === "IN") {
      return v.status === "OUT";
    } else {
      return v.status === "IN";
    }
  });

  // Handle Keyboard Wedge Submit
  const handleWedgeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanIn = wedgeInput.trim();
    if (!cleanIn) return;
    feedKeyboardWedge(cleanIn);
    setWedgeInput("");
  };

  const handleConfigChange = (key: keyof SerialConfig, val: any) => {
    setConfig((prev) => ({
      ...prev,
      [key]: val,
    }));
  };

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">

      {/* SERIAL PORT SCANNER CONNECTION CONTROL CENTER PANEL */}
      <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xl shadow-slate-200/70 flex flex-col min-h-[560px]">

        {/* Card Header with Connection Indicator */}
        <div className="relative overflow-hidden bg-slate-950 px-5 py-5 shrink-0">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(37,99,235,0.34),_transparent_18rem)]" />
          <div className="relative flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-500 text-white shadow-lg shadow-blue-950/30">
                <Cpu className="w-5 h-5" />
              </div>
              <div>
                <span className="text-sm font-black text-white tracking-widest uppercase">
                  Web Serial COM Port Link
                </span>
                <p className="mt-1 text-[11px] font-semibold text-slate-400">Direct scanner-gun hardware bridge</p>
              </div>
            </div>
            <div className={`flex items-center gap-2 rounded-full border px-3 py-1.5 ${isConnected ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200" : "border-slate-700 bg-white/5 text-slate-300"}`}>
              <span className={`w-2.5 h-2.5 rounded-full ${isConnected ? "bg-emerald-400 animate-pulse" : isConnecting ? "bg-amber-400 animate-pulse" : "bg-slate-500"}`} />
              <span className="text-[10px] font-black uppercase tracking-[0.16em]">
                {isConnected ? "Hardware Linked" : isConnecting ? "Linking" : "Offline"}
              </span>
            </div>
          </div>
        </div>

        {/* Card Content Area split to options and live serial buffer logs */}
        <div className="flex-1 overflow-y-auto p-5 flex flex-col justify-between space-y-5 bg-gradient-to-b from-white to-slate-50/80">

          <div className="space-y-4 flex-1">

            <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4">
              <p className="text-xs text-slate-600 font-sans leading-relaxed">
                Connect external industrial <strong>COM port QR scanners</strong> or barcode reader guns. Serial bus capture gives fast, camera-free return scans for gate operators.
              </p>
            </div>

            {/* If serial API is unsupported or has permission errors inside iframe */}
            {errorConst && (
              <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl p-3 flex items-start gap-2 animate-fade-in border-dashed">
                <AlertCircle className="w-4.5 h-4.5 text-rose-600 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-bold">Hardware COM Interface Notice:</span>
                  <p className="text-xxs leading-normal text-rose-700">
                    {errorConst}
                  </p>
                </div>
              </div>
            )}

            {/* Connection configuration controls form elements */}
            <div className="p-4 bg-white border border-slate-200 rounded-2xl space-y-4 shadow-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

                {/* Port Selection Dropdown */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xxs font-black text-slate-400 uppercase tracking-widest font-mono">
                      Select COM Serial Port
                    </label>
                    <button
                      type="button"
                      onClick={() => refreshPorts()}
                      title="Scan Active Ports"
                      className="text-[9px] font-sans font-black uppercase text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5 cursor-pointer"
                    >
                      <RefreshCw className="w-2.5 h-2.5 inline-block" />
                      <span>Scan</span>
                    </button>
                  </div>
                  <select
                    value={selectedPortIndex}
                    onChange={(e) => setSelectedPortIndex(parseInt(e.target.value))}
                    disabled={isConnected}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xxs font-bold font-mono outline-none disabled:bg-slate-100 disabled:text-slate-400 cursor-pointer"
                  >
                    <option value="-1">🔌 Prompt New Port / Gun...</option>
                    {availablePorts.map((port, idx) => (
                      <option key={idx} value={idx}>
                        COM Port #{idx + 1} (Authorized)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xxs font-black text-slate-400 uppercase tracking-widest mb-1 font-mono">Baud rate speed</label>
                  <select
                    value={config.baudRate}
                    onChange={(e) => handleConfigChange("baudRate", parseInt(e.target.value))}
                    disabled={isConnected}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xxs font-bold font-mono outline-none disabled:bg-slate-100 disabled:text-slate-400 cursor-pointer"
                  >
                    <option value="4800">4800 bps</option>
                    <option value="9600">9600 bps (Standard Default)</option>
                    <option value="19200">19200 bps</option>
                    <option value="38400">38400 bps</option>
                    <option value="57600">57600 bps</option>
                    <option value="115200">115200 bps (High-Speed)</option>
                  </select>
                </div>

              </div>

              <div className="flex justify-end pt-1">
                {!isConnected ? (
                  <button
                    type="button"
                    onClick={connect}
                    disabled={isConnecting}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-350 text-white rounded-xl text-xxs font-black uppercase tracking-widest cursor-pointer transition shadow-lg shadow-blue-200 flex items-center justify-center gap-1 font-sans"
                  >
                    {isConnecting ? "Requesting COM Link..." : "Link Selected COM Port"}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={disconnect}
                    className="w-full py-2.5 bg-rose-600 hover:bg-rose-550 text-white rounded-xl text-xxs font-black uppercase tracking-widest cursor-pointer transition shadow-lg shadow-rose-200 flex items-center justify-center gap-1 font-sans"
                  >
                    <span>Disconnect Active Port</span>
                  </button>
                )}
              </div>

              {/* Advanced Hardware Configuration */}
              <div>
                <button
                  type="button"
                  onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
                  className="inline-flex items-center gap-1 text-[9px] font-bold text-indigo-600 hover:text-indigo-700 font-mono uppercase tracking-wider"
                >
                  <Settings className="w-3 h-3" />
                  <span>{showAdvancedSettings ? "Hide" : "Show"} Advanced Serial Parameters</span>
                </button>

                {showAdvancedSettings && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-2.5 pt-2 border-t border-slate-205/60 text-left">
                    <div>
                      <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Data Bits</span>
                      <select
                        value={config.dataBits}
                        onChange={(e) => handleConfigChange("dataBits", parseInt(e.target.value))}
                        disabled={isConnected}
                        className="w-full bg-white border border-slate-200 rounded px-1 py-0.5 text-[9px] font-mono font-black"
                      >
                        <option value="7">7 Bits</option>
                        <option value="8">8 Bits</option>
                      </select>
                    </div>

                    <div>
                      <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Stop Bits</span>
                      <select
                        value={config.stopBits}
                        onChange={(e) => handleConfigChange("stopBits", parseInt(e.target.value))}
                        disabled={isConnected}
                        className="w-full bg-white border border-slate-200 rounded px-1 py-0.5 text-[9px] font-mono font-black"
                      >
                        <option value="1">1 Bit</option>
                        <option value="2">2 Bits</option>
                      </select>
                    </div>

                    <div>
                      <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Parity checksum</span>
                      <select
                        value={config.parity}
                        onChange={(e) => handleConfigChange("parity", e.target.value)}
                        disabled={isConnected}
                        className="w-full bg-white border border-slate-200 rounded px-1 py-0.5 text-[9px] font-mono font-black"
                      >
                        <option value="none">None</option>
                        <option value="even">Even</option>
                        <option value="odd">Odd</option>
                      </select>
                    </div>

                    <div>
                      <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Flow Control</span>
                      <select
                        value={config.flowControl}
                        onChange={(e) => handleConfigChange("flowControl", e.target.value)}
                        disabled={isConnected}
                        className="w-full bg-white border border-slate-200 rounded px-1 py-0.5 text-[9px] font-mono font-black"
                      >
                        <option value="none">None</option>
                        <option value="hardware">Hardware</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {!serialSupported && (
                <p className="text-[9px] text-amber-600 font-medium font-sans">
                  * Browsers like Chrome or Edge required to activate navigator.serial APIs in full scale.
                </p>
              )}
            </div>

            {/* Keyboard wedge block fallback - absolute guarantee of hardware support */}
            <form onSubmit={handleWedgeSubmit} className="space-y-2 rounded-2xl border border-indigo-100 bg-indigo-50/70 p-4">
              <label className="block text-xxs font-black text-indigo-605 uppercase tracking-widest font-mono text-indigo-600">
                Keyboard Wedge Scanner Feed input
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={wedgeInput}
                  onChange={(e) => setWedgeInput(e.target.value)}
                  placeholder="Focus cursor here and request hardware scan via QR scanner gun..."
                  className="w-full bg-[#EEF2F6] border border-indigo-200 text-slate-850 rounded-lg px-3 py-2 text-xxs focus:outline-none focus:border-indigo-500 font-sans font-semibold placeholder:text-slate-400"
                />
                <button
                  type="submit"
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white font-mono rounded text-[9px] font-black uppercase tracking-wider cursor-pointer"
                >
                  FEED
                </button>
              </div>
              <span className="text-xxxs block text-slate-400 font-sans leading-relaxed">
                * Many handheld scanners emulate keyboards by typing characters directly. Keep your cursor inside this field to trigger data captures without device connection popups.
              </span>
            </form>

          </div>

          {/* Terminal Console Debug Log feedback */}
          <div className="space-y-2 pt-4 border-t border-slate-200 shrink-0">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-wide font-mono flex items-center gap-1 justify-between">
              <span className="flex items-center gap-1">
                <Terminal className="w-3.5 h-3.5 text-blue-500" /> Web Serial COM Diagnostics Terminal
              </span>
              <span className="bg-slate-100 border border-slate-205 text-slate-500 px-1 rounded text-[8px] font-bold">
                Buffer size: {terminalLogs.length}
              </span>
            </span>
            <div className="bg-slate-950 p-3 rounded-2xl font-mono text-[9px] h-28 overflow-y-auto space-y-1 text-left shadow-inner shadow-black/40 ring-1 ring-slate-800">
              {terminalLogs.length === 0 ? (
                <div className="text-slate-600 italic font-mono">[Terminal offline. Awaiting connection or in-memory injection scan]</div>
              ) : (
                terminalLogs.map((log, idx) => {
                  let colorClass = "text-slate-400";
                  if (log.type === "system") colorClass = "text-sky-400";
                  if (log.type === "data_rx") colorClass = "text-amber-400";
                  if (log.type === "success") colorClass = "text-emerald-400 font-bold";
                  if (log.type === "error") colorClass = "text-rose-400 font-semibold";
                  if (log.type === "wedge") colorClass = "text-indigo-400";

                  return (
                    <div key={idx} className={`truncate font-mono font-medium flex items-start gap-1.5 ${colorClass}`}>
                      <span className="text-slate-600 font-semibold select-none">[{log.timestamp}]</span>
                      <span className="whitespace-pre-wrap flex-1 leading-normal">{log.text}</span>
                    </div>
                  );
                })
              )}
            </div>
            {lastCode && (
              <div className="text-xxs font-bold text-slate-800 flex items-center gap-1 mt-1 justify-between select-all">
                <span>RECENT SUCCESS: <strong className="font-mono underline text-blue-600 font-black">{lastCode}</strong></span>
                <span className="text-[9px] font-mono font-bold uppercase bg-blue-50 text-blue-650 px-1.5 py-0.2 rounded border border-blue-200">
                  MATCHED READY
                </span>
              </div>
            )}
          </div>

        </div>

      </div>

      {/* SIMULATOR COMPONENT */}
      <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xl shadow-slate-200/70 flex flex-col min-h-[560px]">
        <div className="bg-gradient-to-r from-slate-50 to-indigo-50 px-5 py-5 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-600 animate-pulse" />
            <h3 className="text-sm font-bold text-slate-800 tracking-wide uppercase font-sans">
              Interactive physical QR simulator
            </h3>
          </div>
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xxs font-bold uppercase bg-indigo-50 text-indigo-700 border border-indigo-200`}>
            Select {activeMode}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          <p className="text-xs text-slate-500 mb-4 leading-relaxed font-sans">
            In physical factories, drivers scan their secure badges at the gate post. Since local dev runtimes do not have these QR devices linked, <strong>click any vehicle card below</strong> to simulate a hardware scan over COM:
          </p>

          {filteredVehicles.length === 0 ? (
            <div className="h-[340px] flex flex-col items-center justify-center border border-dashed border-slate-200 rounded-xl bg-slate-50/50 text-center p-6">
              <p className="text-xs font-black text-slate-700 uppercase tracking-wider">No Vehicles Ready for {activeMode}</p>
              <p className="text-xxs text-slate-400 mt-1 max-w-[280px] leading-relaxed">
                {activeMode === "IN"
                  ? "All vehicles are currently parked inside. Register new vehicles or dispatch them OUT to enable simulated gate arrivals scan."
                  : "No vehicles are currently inside. Authorize vehicle entries to enable simulated gate departure scans."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-4">
              {filteredVehicles.map((vehicle) => (
                <div
                  key={vehicle.id}
                  onClick={() => injectSimulatedScan(vehicle.qr_code)}
                  id={`simulator-card-${vehicle.id}`}
                  className="p-4 border border-slate-200 hover:border-indigo-400 rounded-2xl bg-white hover:bg-indigo-50/40 cursor-pointer shadow-sm hover:shadow-lg transition duration-200 group flex flex-col justify-between text-left"
                >
                  <div className="text-left">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-mono text-xs font-black text-slate-800 group-hover:text-indigo-600 transition-colors uppercase">
                        {vehicle.vehicle_number}
                      </span>
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-505 font-mono uppercase font-bold shrink-0 border border-slate-200/50">
                        {vehicle.vehicle_type.split(" ")[0]}
                      </span>
                    </div>
                    <div className="text-xxxs text-slate-505 mt-1 font-sans">
                      <span className="font-bold text-slate-400 uppercase font-mono">Driver:</span> <span className="font-semibold text-slate-700">{vehicle.driver_name}</span>
                    </div>
                    <div className="text-xxxs text-slate-400 font-sans mt-0.5">
                      <span className="font-bold text-slate-400 uppercase font-mono">PASS QR:</span> <code className="font-mono text-slate-600 font-bold bg-slate-50 border border-slate-200/40 px-1 py-0.2 rounded">{vehicle.qr_code}</code>
                    </div>
                  </div>
                  <div className="mt-3.5 text-[9px] font-black text-indigo-600 group-hover:text-indigo-700 flex items-center gap-1 uppercase tracking-wider font-mono">
                    <RefreshCw className="w-3 h-3 animate-spin duration-1000 origin-center hidden group-hover:inline-block font-mono shrink-0" />
                    <span>EMULATE COM INTERFACE INPUT</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
