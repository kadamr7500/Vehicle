import { useEffect, useState } from "react";
import { QrCode } from "lucide-react";

type ScannerStatus = "linked" | "linking" | "offline";

const STORAGE_KEY = "vms_scanner_status";

function readScannerStatus(): ScannerStatus {
    if (typeof window === "undefined") return "offline";
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored === "linked" || stored === "linking" || stored === "offline" ? stored : "offline";
}

export default function ScannerStatusBadge() {
    const [status, setStatus] = useState<ScannerStatus>(() => readScannerStatus());

    useEffect(() => {
        const syncStatus = () => setStatus(readScannerStatus());
        syncStatus();
        window.addEventListener("storage", syncStatus);
        window.addEventListener("vms-scanner-status", syncStatus);
        const interval = window.setInterval(syncStatus, 1500);

        return () => {
            window.removeEventListener("storage", syncStatus);
            window.removeEventListener("vms-scanner-status", syncStatus);
            window.clearInterval(interval);
        };
    }, []);

    const isLinked = status === "linked";
    const isLinking = status === "linking";

    return (
        <div className={`rounded-2xl border p-4 ${isLinked ? "border-emerald-100 bg-emerald-50" : isLinking ? "border-amber-100 bg-amber-50" : "border-slate-200 bg-slate-50"}`}>
            <div className="flex items-center justify-between gap-3">
                <div>
                    <p className={`text-[10px] font-black uppercase tracking-[0.18em] ${isLinked ? "text-emerald-700" : isLinking ? "text-amber-700" : "text-slate-500"}`}>
                        Scanner Status
                    </p>
                    <p className={`mt-1 text-lg font-black ${isLinked ? "text-emerald-900" : isLinking ? "text-amber-900" : "text-slate-900"}`}>
                        {isLinked ? "Connected" : isLinking ? "Linking" : "Offline"}
                    </p>
                </div>
                <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${isLinked ? "bg-emerald-600 text-white" : isLinking ? "bg-amber-500 text-white" : "bg-slate-200 text-slate-500"}`}>
                    <QrCode className="h-4 w-4" />
                </div>
            </div>
            <p className="mt-2 text-[10px] font-semibold text-slate-500">
                Manage scanner connection from Settings.
            </p>
        </div>
    );
}
