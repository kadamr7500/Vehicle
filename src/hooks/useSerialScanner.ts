import { useState, useEffect, useRef, useCallback } from "react";

export interface SerialConfig {
  baudRate: number;
  dataBits: number; // 7, 8
  stopBits: number; // 1, 2
  parity: "none" | "even" | "odd";
  flowControl: "none" | "hardware";
}

export interface SerialTerminalLine {
  timestamp: string;
  type: "system" | "data_rx" | "success" | "error" | "wedge";
  text: string;
}

export function useSerialScanner(onScanSuccess: (code: string) => void, storagePrefix: string = "inlet") {
  const [serialSupported, setSerialSupported] = useState<boolean>(false);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [errorConst, setErrorConst] = useState<string | null>(null);
  const [terminalLogs, setTerminalLogs] = useState<SerialTerminalLine[]>([]);
  const [lastCode, setLastCode] = useState<string | null>(null);

  const [config, setConfig] = useState<SerialConfig>(() => {
    try {
      const saved = localStorage.getItem(`vms_scanner_${storagePrefix}_config`);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {
      baudRate: 9600,
      dataBits: 8,
      stopBits: 1,
      parity: "none",
      flowControl: "none",
    };
  });

  const saveConfig = useCallback((newConfig: SerialConfig) => {
    setConfig(newConfig);
    try {
      localStorage.setItem(`vms_scanner_${storagePrefix}_config`, JSON.stringify(newConfig));
    } catch (e) {}
  }, [storagePrefix]);

  const [portRef_state, setPortRefState] = useState<any>(null); // helper state to trigger render on disconnect
  const portRef = useRef<any>(null);
  const readerRef = useRef<any>(null);
  const keepReadingRef = useRef<boolean>(true);

  const [availablePorts, setAvailablePorts] = useState<any[]>([]);
  const [selectedPortIndex, setSelectedPortIndex] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(`vms_scanner_${storagePrefix}_port_idx`);
      if (saved) return parseInt(saved);
    } catch (e) {}
    return -1;
  });

  const selectPortIndex = useCallback((idx: number) => {
    setSelectedPortIndex(idx);
    try {
      localStorage.setItem(`vms_scanner_${storagePrefix}_port_idx`, String(idx));
    } catch (e) {}
  }, [storagePrefix]);

  const refreshPorts = useCallback(async () => {
    if (typeof window !== "undefined" && "serial" in navigator) {
      try {
        const ports = await (navigator as any).serial.getPorts();
        setAvailablePorts(ports);
        if (ports.length > 0 && selectedPortIndex === -1) {
          setSelectedPortIndex(0);
        }
      } catch (err: any) {
        console.warn("Serial access not allowed by browser layout/iframe permission policy:", err);
        const errStr = String(err.message || "").toLowerCase();
        if (err.name === "SecurityError" || errStr.includes("disallowed") || errStr.includes("policy") || errStr.includes("permission")) {
          setErrorConst("This application is currently running inside an iframe, which restricts physical serial port (COM/USB) access. Please click the 'Open in new tab' (↗) button at the top right of the screen if you'd like to link live scanner guns. Interactive simulation and keyboard wedge inputs are fully operational here!");
        }
      }
    }
  }, [selectedPortIndex]);

  // Check support on load
  useEffect(() => {
    if (typeof window !== "undefined" && "serial" in navigator) {
      setSerialSupported(true);
      refreshPorts();
    } else {
      setSerialSupported(false);
    }
  }, [refreshPorts]);

  const addLog = useCallback((type: SerialTerminalLine["type"], text: string) => {
    const newLine: SerialTerminalLine = {
      timestamp: new Date().toLocaleTimeString(),
      type,
      text,
    };
    setTerminalLogs((prev) => [newLine, ...prev.slice(0, 49)]);
  }, []);

  const disconnect = useCallback(async () => {
    keepReadingRef.current = false;
    
    if (readerRef.current) {
      try {
        await readerRef.current.cancel();
      } catch (e) {
        console.error("Error canceling reader:", e);
      }
    }

    if (portRef.current) {
      try {
        await portRef.current.close();
      } catch (e) {
        console.error("Error closing port:", e);
      }
    }

    portRef.current = null;
    readerRef.current = null;
    setIsConnected(false);
    setIsConnecting(false);
    addLog("system", "COM Port interface closed.");
  }, [addLog]);

  // Serial incoming stream reader loop logic
  const startReading = useCallback(async (port: any) => {
    const textDecoder = new TextDecoder("utf-8");
    let buffer = "";

    try {
      while (port && keepReadingRef.current) {
        const readable = port.readable;
        if (!readable) {
          await new Promise((resolve) => setTimeout(resolve, 300));
          continue;
        }

        const reader = readable.getReader();
        readerRef.current = reader;

        try {
          while (keepReadingRef.current) {
            const { value, done } = await reader.read();
            if (done) {
              break;
            }

            const chunk = textDecoder.decode(value);
            buffer += chunk;

            // Trigger scanner feed logs
            const chunkClean = chunk.replace(/[\r\n]+/g, " ").trim();
            if (chunkClean) {
              addLog("data_rx", `RAW RX: "${chunkClean}"`);
            }

            // Scanners send lines ending with \r carriage returns or \n line feeds
            if (buffer.includes("\n") || buffer.includes("\r")) {
              const lines = buffer.split(/[\r\n]+/);
              
              // If the buffer ends with a delimiter, all segments are complete
              const endsWithLineBreak = /[\r\n]$/.test(buffer);
              const completedSegments = endsWithLineBreak ? lines : lines.slice(0, lines.length - 1);

              for (const line of completedSegments) {
                const cleanCode = line.trim();
                if (cleanCode.length > 0) {
                  setLastCode(cleanCode);
                  onScanSuccess(cleanCode);
                  addLog("success", `SUCCESSFULLY PARSED PASSPORT CODE: "${cleanCode}"`);
                }
              }

              // Retain incomplete chunk
              buffer = endsWithLineBreak ? "" : lines[lines.length - 1];
            }
          }
        } catch (readErr: any) {
          console.error("Read iteration error:", readErr);
          addLog("error", `Read error: ${readErr.message || "Loss of hardware stream."}`);
        } finally {
          reader.releaseLock();
          readerRef.current = null;
        }
      }
    } catch (e: any) {
      console.error("Grand serial reader loop error", e);
      addLog("error", `Global listener error: ${e.message || "COM stream terminated."}`);
    }
  }, [addLog, onScanSuccess]);

  const connect = useCallback(async () => {
    if (!serialSupported) {
      setErrorConst("Web Serial is unsupported on this browser.");
      return;
    }

    setErrorConst(null);
    setIsConnecting(true);

    try {
      let port;
      if (selectedPortIndex >= 0 && selectedPortIndex < availablePorts.length) {
        addLog("system", `Connecting to previously authorized COM port #${selectedPortIndex + 1}...`);
        port = availablePorts[selectedPortIndex];
      } else {
        addLog("system", "Prompting user to select hardware COM Port...");
        port = await (navigator as any).serial.requestPort();
        setTimeout(() => refreshPorts(), 1000);
      }
      portRef.current = port;

      addLog("system", `Attempting COM link: Baud=${config.baudRate} bps, DataBits=${config.dataBits}, Parity=${config.parity}, StopBits=${config.stopBits}...`);
      
      await port.open({
        baudRate: config.baudRate,
        dataBits: config.dataBits,
        stopBits: config.stopBits,
        parity: config.parity,
        flowControl: config.flowControl,
      });

      setIsConnected(true);
      setIsConnecting(false);
      keepReadingRef.current = true;
      addLog("system", `COM link established with external QR Scanner hardware at ${config.baudRate} baud rate.`);

      // Launch background reader listener
      startReading(port);
    } catch (err: any) {
      console.error("Web Serial connection exception:", err);
      setIsConnecting(false);
      setIsConnected(false);

      const errStr = String(err.message || "").toLowerCase();
      let readableMsg = err.message || "Failed to link COM port.";

      if (
        err.name === "SecurityError" || 
        errStr.includes("permission") ||
        errStr.includes("policy") ||
        errStr.includes("disallowed") ||
        errStr.includes("requestporton")
      ) {
        readableMsg = "The browser sandboxed iframe has locked down hardware serial link access permissions. Please click the 'Open in new tab' (↗) button at the top right of the screen to permit physical USB/COM hardware connectivity. Fallback to simulated scans or keyboard wedge inputs are fully active.";
      } else if (errStr.includes("user gesture")) {
        readableMsg = "Selection prompt must be triggered by direct user gesture. Click link again.";
      } else if (errStr.includes("already open") || errStr.includes("busy")) {
        readableMsg = "This COM port is already opened by another software utility or system module.";
      }

      setErrorConst(readableMsg);
      addLog("error", `Connection Failed: ${readableMsg}`);
    }
  }, [config, serialSupported, addLog, startReading, selectedPortIndex, availablePorts, refreshPorts]);

  // Inject Simulated Code manually
  const injectSimulatedScan = useCallback((code: string) => {
    const cleanCode = code.trim();
    setLastCode(cleanCode);
    onScanSuccess(cleanCode);
    addLog("wedge", `SIMULATOR SCAN INJECTED: Pass data "${cleanCode}"`);
  }, [addLog, onScanSuccess]);

  // Inject keyboard wedge stream
  const feedKeyboardWedge = useCallback((text: string) => {
    const cleanCode = text.trim();
    if (!cleanCode) return;
    setLastCode(cleanCode);
    onScanSuccess(cleanCode);
    addLog("wedge", `KEYBOARD WEDGE HARWARE SCAN: "${cleanCode}" parsed.`);
  }, [addLog, onScanSuccess]);

  // Auto clean up
  useEffect(() => {
    return () => {
      keepReadingRef.current = false;
    };
  }, []);

  return {
    serialSupported,
    isConnected,
    isConnecting,
    errorConst,
    terminalLogs,
    lastCode,
    config,
    setConfig: saveConfig,
    connect,
    disconnect,
    injectSimulatedScan,
    feedKeyboardWedge,
    availablePorts,
    selectedPortIndex,
    setSelectedPortIndex: selectPortIndex,
    refreshPorts,
  };
}
