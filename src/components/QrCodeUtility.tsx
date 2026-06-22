import { useRef } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { Printer, Download, QrCode } from "lucide-react";
import { VehicleMaster } from "../types";

interface QrLabelProps {
  vehicle: VehicleMaster;
}

export default function QrCodeUtility({ vehicle }: QrLabelProps) {
  const canvasRef = useRef<HTMLDivElement>(null);

  const handleDownload = () => {
    const qrCanvas = document.getElementById(`qr-canvas-${vehicle.id}`) as HTMLCanvasElement;
    if (!qrCanvas) return;

    // Create high-resolution card dimensions
    const width = 400;
    const height = 630;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // 1. Solid pure white background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);

    // 2. Bold security borders
    ctx.lineWidth = 4;
    ctx.strokeStyle = "#0f172a";
    ctx.strokeRect(12, 12, width - 24, height - 24);

    // Inner thin border
    ctx.lineWidth = 1;
    ctx.strokeStyle = "#94a3b8";
    ctx.strokeRect(18, 18, width - 36, height - 36);

    // 3. Header Texts
    ctx.textAlign = "center";
    ctx.font = "bold 16px system-ui, -apple-system, sans-serif";
    ctx.fillStyle = "#1e3a8a";
    ctx.fillText("VEHICLE ENTRY GATE PASS", width / 2, 46);

    ctx.font = "bold 8.5px monospace";
    ctx.fillStyle = "#64748b";
    ctx.fillText("INDUSTRIAL GATEHOUSE SECURITY SYSTEM", width / 2, 62);

    // Header dividing line
    ctx.beginPath();
    ctx.moveTo(30, 75);
    ctx.lineTo(width - 30, 75);
    ctx.strokeStyle = "#e2e8f0";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // 4. Center and draw QR Code
    const qrSize = 190;
    const qrX = (width - qrSize) / 2;
    const qrY = 95;
    ctx.drawImage(qrCanvas, qrX, qrY, qrSize, qrSize);

    // ID Tag text below QR Code
    ctx.font = "bold 10px monospace";
    ctx.fillStyle = "#475569";
    ctx.fillText(`SYSTEM ID: ${vehicle.qr_code}`, width / 2, 305);

    // 5. Draw Vehicle Number Box
    const boxX = 30;
    const boxY = 320;
    const boxW = width - 60;
    const boxH = 46;

    // Box Slate Fill
    ctx.fillStyle = "#f1f5f9";
    ctx.fillRect(boxX, boxY, boxW, boxH);
    // Box Slate Outline
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = "#cbd5e1";
    ctx.strokeRect(boxX, boxY, boxW, boxH);

    // Vehicle Plate Number Text
    ctx.font = "extrabold 23px monospace";
    ctx.fillStyle = "#0f172a";
    ctx.textBaseline = "middle";
    ctx.fillText(vehicle.vehicle_number.toUpperCase(), width / 2, boxY + boxH / 2);
    ctx.textBaseline = "alphabetic"; // Restore

    // 6. Metadata Info Grid Block
    const gridStartY = 398;
    const keyX = 42;
    const valX = width - 42;

    const metadataRows = [
      { label: "DRIVER NAME", value: vehicle.driver_name },
      { label: "CONTACT NO", value: vehicle.driver_mobile || "N/A" },
      { label: "TRANSPORTER", value: vehicle.transporter },
      { label: "VEHICLE TYPE", value: vehicle.vehicle_type.toUpperCase() },
      { label: "GENERATED ON", value: new Date(vehicle.created_date).toLocaleString() },
    ];

    let currentY = gridStartY;
    metadataRows.forEach((row, idx) => {
      // Background rows to make text pop
      if (idx % 2 === 0) {
        ctx.fillStyle = "#f8fafc";
        ctx.fillRect(boxX, currentY - 14, boxW, 20);
      }

      // Key Label (Left alignment)
      ctx.textAlign = "left";
      ctx.font = "bold 9px monospace";
      ctx.fillStyle = "#64748b";
      ctx.fillText(row.label, keyX, currentY);

      // Value text (Right alignment with automatic trim to avoid box overflow)
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

      // Bottom Row Border separating details nicely
      ctx.beginPath();
      ctx.moveTo(boxX, currentY + 6);
      ctx.lineTo(width - boxX, currentY + 6);
      ctx.strokeStyle = "#e2e8f0";
      ctx.lineWidth = 1;
      ctx.stroke();

      currentY += 24;
    });

    // 7. Footer dashed section decoration
    ctx.beginPath();
    ctx.moveTo(35, height - 48);
    ctx.lineTo(width - 35, height - 48);
    ctx.strokeStyle = "#cbd5e1";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.stroke();
    ctx.setLineDash([]); // clear dash state

    ctx.textAlign = "center";
    ctx.font = "bold 8px monospace";
    ctx.fillStyle = "#94a3b8";
    ctx.fillText("VALID SECURITY GATE PASS • PLEASE SHOW AT EXIT POINTS", width / 2, height - 28);

    // Save output pass image
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `PASS_${vehicle.vehicle_number.replace(/[^a-zA-Z0-9]/g, "_")}.png`;
    a.click();
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    // Get the base64 image from the canvas
    const canvas = document.getElementById(`qr-canvas-${vehicle.id}`) as HTMLCanvasElement;
    const qrDataUrl = canvas ? canvas.toDataURL("image/png") : "";

    printWindow.document.write(`
      <html>
        <head>
          <title>Print QR Label - ${vehicle.vehicle_number}</title>
          <style>
            body {
              font-family: 'Inter', sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              padding: 40px;
              text-align: center;
            }
            .label-card {
              border: 3px double #0f172a;
              border-radius: 12px;
              padding: 24px;
              width: 380px;
              background: #fff;
              box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            }
            .header {
              font-size: 14px;
              font-weight: 700;
              color: #1e3a8a;
              text-transform: uppercase;
              letter-spacing: 1px;
              margin-bottom: 4px;
              border-bottom: 2px solid #e2e8f0;
              padding-bottom: 8px;
            }
            .subheader {
              font-size: 11px;
              color: #64748b;
              margin-bottom: 16px;
            }
            .qr-wrapper {
              margin: 16px 0;
            }
            .vehicle-no {
              font-size: 28px;
              font-weight: 800;
              color: #0f172a;
              letter-spacing: 1.5px;
              margin: 8px 0;
              padding: 4px;
              background-color: #f1f5f9;
              border-radius: 6px;
              border: 1px solid #cbd5e1;
            }
            .info-grid {
              font-size: 11px;
              color: #334155;
              text-align: left;
              margin-top: 12px;
              background-color: #f8fafc;
              padding: 10px;
              border-radius: 6px;
            }
            .info-row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 4px;
            }
            .info-label {
              font-weight: 600;
              color: #64748b;
            }
            .info-value {
              font-weight: 700;
              color: #0f172a;
            }
            .footer {
              margin-top: 16px;
              font-size: 9px;
              color: #94a3b8;
              border-top: 1px dashed #cbd5e1;
              padding-top: 8px;
            }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <div class="label-card">
            <div class="header">VEHICLE ENTRY GATE PASS</div>
            <div class="subheader">INDUSTRIAL SECURITY SYSTEM QR</div>
            <div class="qr-wrapper">
              <img src="${qrDataUrl}" width="180" height="180" alt="QR Code" />
            </div>
            <div class="vehicle-no">${vehicle.vehicle_number}</div>
            <div class="info-grid">
              <div class="info-row">
                <span class="info-label">Driver:</span>
                <span class="info-value">${vehicle.driver_name}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Transporter:</span>
                <span class="info-value">${vehicle.transporter}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Mobile:</span>
                <span class="info-value">${vehicle.driver_mobile}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Type:</span>
                <span class="info-value">${vehicle.vehicle_type}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Generated:</span>
                <span class="info-value">${new Date(vehicle.created_date).toLocaleString()}</span>
              </div>
            </div>
            <div class="footer">SYSTEM ID: ${vehicle.qr_code} • SECURE PASS</div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div id={`qr-card-${vehicle.id}`} className="p-4 border border-slate-200 rounded-xl bg-white flex flex-col items-center shadow-sm">
      <div className="flex items-center justify-between w-full mb-3">
        <span className="text-xs font-semibold text-slate-400 font-mono">
          ID: {vehicle.qr_code}
        </span>
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xxs font-bold uppercase ${
          vehicle.status === "IN" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-slate-50 text-slate-700 border border-slate-200"
        }`}>
          {vehicle.status}
        </span>
      </div>

      <div ref={canvasRef} className="bg-slate-50 p-3 rounded-lg border border-slate-100 flex items-center justify-center cursor-pointer mb-3" onClick={handleDownload} title="Click to download QR image">
        <QRCodeCanvas
          id={`qr-canvas-${vehicle.id}`}
          value={vehicle.qr_code}
          size={120}
          bgColor={"#ffffff"}
          fgColor={"#0f172a"}
          level={"H"}
          includeMargin={false}
        />
      </div>

      <div className="text-center w-full mb-3">
        <div className="text-sm font-extrabold text-slate-900 tracking-wide font-mono uppercase bg-slate-100 py-1 px-2 rounded border border-slate-200">
          {vehicle.vehicle_number}
        </div>
        <div className="mt-2 text-left bg-slate-50 border border-slate-200 rounded-lg p-2.5 space-y-1">
          <div className="flex justify-between items-center text-[10px] border-b border-slate-100 pb-1">
            <span className="font-semibold text-slate-400 font-mono uppercase">Driver Name</span>
            <span className="font-bold text-slate-850 font-sans">{vehicle.driver_name}</span>
          </div>
          <div className="flex justify-between items-center text-[10px] border-b border-slate-100 pb-1">
            <span className="font-semibold text-slate-400 font-mono uppercase">Mobile No</span>
            <span className="font-bold text-slate-700 font-mono">{vehicle.driver_mobile || "N/A"}</span>
          </div>
          <div className="flex justify-between items-center text-[10px] border-b border-slate-100 pb-1">
            <span className="font-semibold text-slate-400 font-mono uppercase">Transporter</span>
            <span className="font-bold text-slate-800 font-sans truncate max-w-[120px]" title={vehicle.transporter}>
              {vehicle.transporter}
            </span>
          </div>
          <div className="flex justify-between items-center text-[10px]">
            <span className="font-semibold text-slate-400 font-mono uppercase">Vehicle Type</span>
            <span className="font-bold text-slate-700 font-mono text-[9px] uppercase">{vehicle.vehicle_type}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 w-full">
        <button
          onClick={handleDownload}
          id={`btn-download-qr-${vehicle.id}`}
          className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 transition-all cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Save</span>
        </button>
        <button
          onClick={handlePrint}
          id={`btn-print-qr-${vehicle.id}`}
          className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition-all cursor-pointer"
        >
          <Printer className="w-3.5 h-3.5" />
          <span>Print</span>
        </button>
      </div>
    </div>
  );
}
