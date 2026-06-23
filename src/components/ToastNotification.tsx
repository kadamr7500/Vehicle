import { motion, AnimatePresence } from "motion/react";
import { AlertTriangle, X, Clock, MapPin, User, ShieldAlert } from "lucide-react";

export interface OverstayToast {
  id: string;
  vehicleNumber: string;
  driverName: string;
  supplierName: string;
  durationText: string;
  timestamp: string;
}

interface ToastContainerProps {
  toasts: OverstayToast[];
  onDismiss: (id: string) => void;
}

export default function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  return (
    <div 
      id="overstay-toast-container" 
      className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm w-full px-4 sm:px-0 pointer-events-none"
    >
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            id={`toast-${toast.id}`}
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, transition: { duration: 0.15 } }}
            layout
            className="pointer-events-auto w-full bg-[#0F172A] border border-red-500/30 hover:border-red-500/50 rounded-2xl shadow-xl shadow-red-950/20 overflow-hidden flex flex-col transition duration-200"
          >
            {/* Top Danger Bar Indicator */}
            <div className="bg-gradient-to-r from-red-600 via-rose-600 to-red-700 px-4 py-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-white animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-widest text-white font-mono">
                  SECURITY ANOMALY DETECTED
                </span>
              </div>
              <button
                onClick={() => onDismiss(toast.id)}
                id={`toast-dismiss-${toast.id}`}
                className="text-white/80 hover:text-white hover:bg-white/10 rounded-lg p-1 transition cursor-pointer"
                title="Dismiss Alert"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Content Body */}
            <div className="p-4 space-y-3">
              
              {/* Header Info: Plate No & Duration */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-xxxs font-black text-slate-500 uppercase tracking-widest font-mono">
                    VEHICLE PLATE
                  </span>
                  <h4 className="text-sm font-black text-white font-mono tracking-tight uppercase">
                    {toast.vehicleNumber}
                  </h4>
                </div>
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-1.5 px-3 flex flex-col items-end">
                  <span className="text-[8px] font-black text-red-400 uppercase tracking-wider font-mono">
                    OVERSTAY
                  </span>
                  <span className="text-xs font-black text-red-500 font-mono animate-pulse">
                    {toast.durationText}
                  </span>
                </div>
              </div>

              {/* Grid Metadata */}
              <div className="grid grid-cols-2 gap-2 border-t border-slate-800/80 pt-2.5 text-xxs font-mono">
                <div className="flex items-center gap-1.5 text-slate-400 min-w-0">
                  <User className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <div className="truncate">
                    <span className="text-[8px] text-slate-500 block uppercase leading-none font-black">DRIVER</span>
                    <span className="font-bold text-slate-300 truncate block">{toast.driverName}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-slate-400 min-w-0">
                  <MapPin className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <div className="truncate">
                    <span className="text-[8px] text-slate-500 block uppercase leading-none font-black">SUPPLIER</span>
                    <span className="font-bold text-indigo-300 truncate block uppercase">{toast.supplierName}</span>
                  </div>
                </div>
              </div>

              {/* Footer status bar details */}
              <div className="flex items-center justify-between border-t border-slate-800/50 pt-2 text-[9px] text-slate-500 font-mono">
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-600" />
                  <span>ALERT INITIATED: {toast.timestamp}</span>
                </div>
                <span className="text-red-500/80 font-black animate-pulse">● OUT LIMIT EXCEEDED</span>
              </div>

            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
