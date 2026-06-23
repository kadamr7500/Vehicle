import { VehicleMaster, VehicleTransaction, VehicleHistory } from "../types";

type ReportType = "daily" | "monthly" | "history" | "pending" | "overstay" | "trip_frequency";

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

// Generator helpers mapping specific report requirements.
export const buildReportDatasets = (
    type: ReportType,
    vehicles: VehicleMaster[],
    transactions: VehicleTransaction[],
    histories: VehicleHistory[],
    overstayHoursThreshold: number = 4
) => {
    const now = new Date("2026-06-22T08:46:33-07:00");
    const todayStr = "2026-06-22";

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
                const todayTxs = vehicleTxs.filter((tx) => tx.out_time && tx.out_time.split("T")[0] === todayStr);
                const todayTripsCount = todayTxs.length;

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
