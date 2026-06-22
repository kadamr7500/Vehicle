import { jsPDF } from "jspdf";
import "jspdf-autotable";
import * as XLSX from "xlsx";
import { VehicleMaster, VehicleTransaction, VehicleHistory } from "../types";

// PDF Column Definitions
const PDF_COLORS = {
  primary: [15, 23, 42], // Slate 900
  secondary: [30, 41, 59], // Slate 800
  accent: [37, 99, 235], // Blue 600
  green: [16, 185, 129], // Emerald 500
  text: [51, 65, 85], // Slate 700
};

// Formats a date string to readable locale time
const formatDate = (isoStr: string | null): string => {
  if (!isoStr) return "-";
  return new Date(isoStr).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
};

export const exportReportToExcel = (
  reportTitle: string,
  headers: string[],
  rows: any[][],
  fileName: string
) => {
  try {
    // Flatten rows into actual json objects keyed by headers
    const excelData = rows.map((row) => {
      const obj: { [key: string]: any } = {};
      headers.forEach((hdr, idx) => {
        obj[hdr] = row[idx];
      });
      return obj;
    });

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();

    // Auto-fit column widths
    const max_len = headers.map((hdr) => hdr.length);
    excelData.forEach((row) => {
      headers.forEach((hdr, idx) => {
        const val = row[hdr] ? String(row[hdr]).length : 0;
        if (val > max_len[idx]) {
          max_len[idx] = val;
        }
      });
    });
    worksheet["!cols"] = max_len.map((len) => ({ wch: Math.min(len + 3, 40) }));

    XLSX.utils.book_append_sheet(workbook, worksheet, reportTitle.substring(0, 30));
    XLSX.writeFile(workbook, `${fileName}.xlsx`);
  } catch (error) {
    console.error("Excel generation failed:", error);
    alert("Excel Export Failed: " + (error as Error).message);
  }
};

export const exportReportToPdf = (
  reportTitle: string,
  headers: string[],
  rows: any[][],
  fileName: string,
  subtitle: string = "Industrial Vehicle Tracking Report"
) => {
  try {
    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    });

    // Outer Frame border decoration
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.rect(5, 5, 287, 200);

    // Title Block
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(PDF_COLORS.primary[0], PDF_COLORS.primary[1], PDF_COLORS.primary[2]);
    doc.text(reportTitle, 12, 18);

    doc.setFont("Helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139); // Slate-500
    doc.text(subtitle, 12, 24);

    // Timestamp Box (right aligned)
    doc.setFontSize(8);
    doc.setFont("Courier", "normal");
    doc.text(`Generated: ${new Date().toLocaleString()}`, 215, 16);
    doc.text(`System ID: VMS_SECURE_NODE_1`, 215, 20);
    doc.text(`Authorization: Official Audit`, 215, 24);

    // Divider Line
    doc.setDrawColor(37, 99, 235); // Blue Accent
    doc.setLineWidth(1.2);
    doc.line(12, 28, 285, 28);

    // Auto Table Generation
    (doc as any).autoTable({
      head: [headers],
      body: rows,
      startY: 32,
      margin: { left: 12, right: 12 },
      theme: "grid",
      headStyles: {
        fillColor: PDF_COLORS.primary,
        textColor: [255, 255, 255],
        fontSize: 9,
        fontStyle: "bold",
        halign: "left",
      },
      bodyStyles: {
        fontSize: 8,
        textColor: PDF_COLORS.text,
        cellPadding: 3,
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252], // slate-50
      },
      columnStyles: {
        0: { fontStyle: "bold" },
        // auto wrap and custom configs can go here
      },
      didDrawPage: (data: any) => {
        // Footer decoration on each page
        const pageCount = doc.getNumberOfPages();
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.5);
        doc.line(12, 195, 285, 195);

        doc.setFont("Helvetica", "normal");
        doc.setFontSize(8);
        doc.text("VEHICLE IN/OUT MANAGEMENT SYSTEM • PLANT CENTRAL WORKSPACE", 12, 199);
        doc.text(`Page ${data.pageNumber} of ${pageCount}`, 265, 199);
      },
    });

    doc.save(`${fileName}.pdf`);
  } catch (error) {
    console.error("PDF generation failed:", error);
    alert("PDF Export Failed: " + (error as Error).message);
  }
};

// Generator helpers mapping specific report requirements:
export const buildReportDatasets = (
  type: "daily" | "monthly" | "history" | "pending" | "overstay" | "trip_frequency",
  vehicles: VehicleMaster[],
  transactions: VehicleTransaction[],
  histories: VehicleHistory[],
  overstayHoursThreshold: number = 4
) => {
  const now = new Date("2026-06-22T08:46:33-07:00");
  const todayStr = "2026-06-22";

  // Helper mapping maps vehicle details
  const getVehicleData = (vid: number) => {
    return vehicles.find((v) => v.id === vid) || {
      vehicle_number: "UNKNOWN",
      vehicle_type: "-",
      driver_name: "-",
      driver_mobile: "-",
      transporter: "-",
    };
  };

  switch (type) {
    case "daily": {
      // Transactions logged today (either checked out today or checked back in today)
      const todayTxs = transactions.filter((tx) => {
        const outDate = tx.out_time ? tx.out_time.split("T")[0] : "";
        const inDate = tx.in_time ? tx.in_time.split("T")[0] : "";
        return outDate === todayStr || inDate === todayStr;
      });

      const headers = [
        "Vehicle Number",
        "Vehicle Type",
        "Driver Name",
        "Destination Supplier",
        "Purpose",
        "Department",
        "Dispatch Time (OUT)",
        "Return Time (IN)",
        "Trip Duration",
        "Current Status",
      ];

      const rows = todayTxs.map((tx) => {
        const v = getVehicleData(tx.vehicle_id);
        return [
          v.vehicle_number,
          v.vehicle_type,
          v.driver_name,
          tx.supplier_name || "N/A",
          tx.purpose,
          tx.department,
          formatDate(tx.out_time),
          formatDate(tx.in_time),
          tx.total_duration || "Active Outside Plant",
          tx.status === "OUT" ? "OUT (With Supplier)" : "IN (Returned)",
        ];
      });

      return { headers, rows, title: "DAILY VEHICLE DISPATCH REPORT", subtitle: `Logs for company dispatch and return activities on date: ${todayStr}` };
    }

    case "monthly": {
      // Transactions logged this current month (June 2026)
      const currentMonthStr = "2026-06";
      const monthlyTxs = transactions.filter((tx) => {
        const outMonth = tx.out_time ? tx.out_time.substring(0, 7) : "";
        const inMonth = tx.in_time ? tx.in_time.substring(0, 7) : "";
        return outMonth === currentMonthStr || inMonth === currentMonthStr;
      });

      const headers = [
        "Vehicle Number",
        "Transporter",
        "Driver Mobile",
        "Destination Supplier",
        "Purpose of Dispatch",
        "Dispatch Time (OUT)",
        "Return Time (IN)",
        "Trip State",
      ];

      const rows = monthlyTxs.map((tx) => {
        const v = getVehicleData(tx.vehicle_id);
        return [
          v.vehicle_number,
          v.transporter,
          v.driver_mobile,
          tx.supplier_name || "N/A",
          tx.purpose,
          formatDate(tx.out_time),
          formatDate(tx.in_time),
          tx.status === "OUT" ? "Active Outside" : `Completed in ${tx.total_duration || "-"}`,
        ];
      });

      return { headers, rows, title: "MONTHLY DISPATCH AND SUPPLIER TRIP LOGS", subtitle: `Full logistical transaction logs for month: ${currentMonthStr}` };
    }

    case "pending": {
      // Vehicles currently checked OUT with suppliers (waiting to return)
      const pendingTxs = transactions.filter((tx) => tx.status === "OUT");

      const headers = [
        "Vehicle Number",
        "Type",
        "Driver Name",
        "Supplier Destination",
        "Purpose Of Visit",
        "Dispatching Department",
        "Dispatched OUT Time",
        "Current Remarks",
      ];

      const rows = pendingTxs.map((tx) => {
        const v = getVehicleData(tx.vehicle_id);
        return [
          v.vehicle_number,
          v.vehicle_type,
          v.driver_name,
          tx.supplier_name || "N/A",
          tx.purpose,
          tx.department,
          formatDate(tx.out_time),
          tx.remarks || "No pending issues",
        ];
      });

      return { headers, rows, title: "PENDING OUTWARD DISPATCHES AUDIT", subtitle: "Vehicles currently deployed outside with suppliers and vendors" };
    }

    case "overstay": {
      // Vehicles currently checked OUT and have stayed longer than threshold outside company
      const activeOutTxs = transactions.filter((tx) => tx.status === "OUT");
      const overstayTxs = activeOutTxs.filter((tx) => {
        if (!tx.out_time) return false;
        const outTime = new Date(tx.out_time).getTime();
        const diffHrs = (now.getTime() - outTime) / (1000 * 60 * 60);
        return diffHrs > overstayHoursThreshold;
      });

      const headers = [
        "Vehicle Number",
        "Driver Name",
        "Contact Number",
        "Destination Supplier",
        "Department In Charge",
        "Dispatched OUT Time",
        "Time Elapsed Outside",
        "Alert Level",
      ];

      const rows = overstayTxs.map((tx) => {
        const v = getVehicleData(tx.vehicle_id);
        const outTime = tx.out_time ? new Date(tx.out_time).getTime() : now.getTime();
        const diffHrs = (now.getTime() - outTime) / (1000 * 60 * 60);
        const formattedStay = `${Math.floor(diffHrs)}h ${Math.floor((diffHrs % 1) * 60)}m`;

        return [
          v.vehicle_number,
          v.driver_name,
          v.driver_mobile,
          tx.supplier_name || "N/A",
          tx.department,
          formatDate(tx.out_time),
          formattedStay,
          diffHrs > 8 ? "CRITICAL (Over 8 hrs)" : "WARNING (Over 4 hrs)",
        ];
      });

      return { headers, rows, title: "VEHICLE OVERSTAY EXCEPTION ALERTS", subtitle: `Dispatched vehicles exceeding estimated transit time limit of ${overstayHoursThreshold} Hours with external suppliers` };
    }

    case "history": {
      const headers = [
        "Ref ID",
        "Vehicle Number",
        "Action Type",
        "Action Timestamp",
        "Operator Username",
        "System Remarks",
      ];

      const rows = histories.map((h) => {
        const v = getVehicleData(h.vehicle_id);
        return [
          `#HIST-${h.id}`,
          v.vehicle_number,
          h.action_type,
          formatDate(h.action_time),
          h.username,
          h.remarks,
        ];
      });

      return { headers, rows, title: "VEHICLE AUDIT TRAIL AND LOG ARCHIVES", subtitle: "Chronological security guard logs of entry authorization activities" };
    }

    case "trip_frequency": {
      const headers = [
        "Vehicle Number",
        "Vehicle Type",
        "Driver Name",
        "Transporter / Fleet",
        "Total Trips Started",
        "Completed Cycles",
        "Active Trips (OUT)",
        "Today's Trips (Jun 22)",
        "Most Frequent Destination",
        "Current Location Status",
      ];

      const rows = vehicles.map((v) => {
        const vehicleTxs = transactions.filter((tx) => tx.vehicle_id === v.id);
        const totalTrips = vehicleTxs.length;
        const completedCycles = vehicleTxs.filter((tx) => tx.status === "IN").length;
        const activeTrips = vehicleTxs.filter((tx) => tx.status === "OUT").length;
        
        const todayTxs = vehicleTxs.filter(
          (tx) => tx.out_time && tx.out_time.split("T")[0] === todayStr
        );
        const todayTripsCount = todayTxs.length;

        // Calculate most frequent destination
        const destinationCounts: { [key: string]: number } = {};
        vehicleTxs.forEach((tx) => {
          if (tx.supplier_name) {
            destinationCounts[tx.supplier_name] = (destinationCounts[tx.supplier_name] || 0) + 1;
          }
        });
        let mostFrequentDest = "-";
        let maxCount = 0;
        Object.entries(destinationCounts).forEach(([dest, count]) => {
          if (count > maxCount) {
            maxCount = count;
            mostFrequentDest = `${dest} (${count}x)`;
          }
        });

        return [
          v.vehicle_number,
          v.vehicle_type,
          v.driver_name,
          v.transporter,
          `${totalTrips} Dispatches`,
          `${completedCycles} Cycles`,
          `${activeTrips} Active`,
          `${todayTripsCount} Today`,
          mostFrequentDest,
          v.status === "IN" ? "Inside Plant" : "Outside Plant",
        ];
      });

      return {
        headers,
        rows,
        title: "VEHICLE TRIP FREQUENCY ANALYSIS REPORT",
        subtitle: "Audit view tracking trip frequencies, completed IN/OUT cycles, and dispatch active performance per fleet vehicle.",
      };
    }
  }
};
