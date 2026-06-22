import { useState, useMemo } from "react";
import { Database, Play, CheckCircle2, AlertCircle, Copy, HelpCircle, Table, Terminal, RefreshCw, FileText } from "lucide-react";
import alasql from "alasql";
import { VehicleMaster, VehicleTransaction, VehicleHistory, AuditLog, User } from "../types";
import { dbStore } from "../dbStore";

interface SqlConsoleViewProps {
  vehicles: VehicleMaster[];
  transactions: VehicleTransaction[];
  histories: VehicleHistory[];
  currentUser: User;
  onUpdateVehicles: (v: VehicleMaster[]) => void;
  onUpdateTransactions: (t: VehicleTransaction[]) => void;
  onRefreshAll: () => void;
}

export default function SqlConsoleView({
  vehicles,
  transactions,
  histories,
  currentUser,
  onUpdateVehicles,
  onUpdateTransactions,
  onRefreshAll,
}: SqlConsoleViewProps) {
  const [sqlQuery, setSqlQuery] = useState<string>(
    "SELECT vehicle_number, vehicle_type, driver_name, status FROM vehicles WHERE status = 'OUT';"
  );
  const [queryResult, setQueryResult] = useState<any[] | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [affectedCount, setAffectedCount] = useState<number | null>(null);
  const [executionTimeMs, setExecutionTimeMs] = useState<number | null>(null);
  const [activeSchemaTab, setActiveSchemaTab] = useState<string>("vehicles");

  // Schema definitions for the user guides
  const schemas = {
    vehicles: [
      { column: "id", type: "number", desc: "Unique Record ID (Primary Key)" },
      { column: "vehicle_number", type: "string", desc: "Reg Plate Number (e.g. MH-12-PQ-9876)" },
      { column: "vehicle_type", type: "string", desc: "Vehicle category / carriage class" },
      { column: "driver_name", type: "string", desc: "Operator Driver Name" },
      { column: "driver_mobile", type: "string", desc: "Mobile contact number" },
      { column: "transporter", type: "string", desc: "Shipping vendor brand" },
      { column: "status", type: "string", desc: "Status inside facilities: 'IN' or 'OUT'" },
      { column: "created_date", type: "string", desc: "Registration date timestamp" },
    ],
    transactions: [
      { column: "id", type: "number", desc: "Transaction instance unique index ID" },
      { column: "vehicle_id", type: "number", desc: "Pointer ID references vehicles table" },
      { column: "purpose", type: "string", desc: "Freight purpose (Material delivery, scrap)" },
      { column: "department", type: "string", desc: "Authorized facility sector department" },
      { column: "out_time", type: "string", desc: "Dispatch timestamp (Plant EXIT)" },
      { column: "in_time", type: "string", desc: "Arrival timestamp (Plant ENTER)" },
      { column: "total_duration", type: "string", desc: "Formatted travel duration (e.g. '02h 15m')" },
      { column: "remarks", type: "string", desc: "Incident logs or checkout memos" },
      { column: "status", type: "string", desc: "Active dispatch status: 'IN' or 'OUT'" },
      { column: "supplier_name", type: "string", desc: "Recipient supplier destination name" },
    ],
    history: [
      { column: "id", type: "number", desc: "Audit flow index ID" },
      { column: "vehicle_id", type: "number", desc: "Referenced vehicle ID" },
      { column: "action_type", type: "string", desc: "Action code: 'CREATE', 'IN', 'OUT'" },
      { column: "action_time", type: "string", desc: "Event recorded timestamp" },
      { column: "username", type: "string", desc: "Supervisor operator account username" },
      { column: "remarks", type: "string", desc: "Verification checklist comments" },
    ],
    audit_logs: [
      { column: "id", type: "number", desc: "Event log identifier" },
      { column: "username", type: "string", desc: "Associated user" },
      { column: "action", type: "string", desc: "Trigger action category" },
      { column: "timestamp", type: "string", desc: "Strict system timestamp" },
      { column: "details", type: "string", desc: "Extended contextual records" },
    ]
  };

  // SQL Presets for direct click-to-run functionality
  const presets = [
    {
      title: "Active vehicles parked INSIDE plant",
      query: "SELECT vehicle_number, driver_name, transporter, status FROM vehicles WHERE status = 'IN';",
    },
    {
      title: "Count total trips completed by each vehicle",
      query: "SELECT b.vehicle_number, COUNT(*) AS trip_count\nFROM transactions a\nJOIN vehicles b ON a.vehicle_id = b.id\nGROUP BY b.vehicle_number\nORDER BY trip_count DESC;",
    },
    {
      title: "Find out-of-plant vehicles (Active Supplier Dispatches)",
      query: "SELECT a.id, b.vehicle_number, a.supplier_name, a.purpose, a.out_time\nFROM transactions a\nJOIN vehicles b ON a.vehicle_id = b.id\nWHERE a.status = 'OUT';",
    },
    {
      title: "Register a new vehicle into the master table via SQL",
      query: "INSERT INTO vehicles (id, vehicle_number, vehicle_type, driver_name, driver_mobile, transporter, status, created_date)\nVALUES (6, 'MH-14-EU-1122', 'Container 40ft', 'Amar Singh', '9890212354', 'Express Logistics Inc', 'IN', '2026-06-22T10:00:00-07:00');",
    },
    {
      title: "Mark a delivery transaction manually as completed/IN",
      query: "UPDATE transactions\nSET status = 'IN', in_time = '2026-06-22T11:00:00-07:00', total_duration = '01h 45m', remarks = 'Gate return completed manually via SQL console'\nWHERE id = 4;",
    }
  ];

  const executeSql = () => {
    setErrorMessage(null);
    setQueryResult(null);
    setAffectedCount(null);
    const startTime = performance.now();

    try {
      // 1. Prepare dynamic source arrays from dbStore
      const currentVehicles = dbStore.getVehicles();
      const currentTransactions = dbStore.getTransactions();
      const currentHistory = dbStore.getHistory();
      const currentLogs = dbStore.getAuditLogs();
      const currentUsers = dbStore.getUsers();

      // Clear tables inside alaSQL engine to guarantee fresh state
      alasql("DROP TABLE IF EXISTS vehicles");
      alasql("DROP TABLE IF EXISTS transactions");
      alasql("DROP TABLE IF EXISTS history");
      alasql("DROP TABLE IF EXISTS audit_logs");
      alasql("DROP TABLE IF EXISTS users");

      alasql("CREATE TABLE vehicles");
      alasql("CREATE TABLE transactions");
      alasql("CREATE TABLE history");
      alasql("CREATE TABLE audit_logs");
      alasql("CREATE TABLE users");

      // Inject current records
      alasql("INSERT INTO vehicles SELECT * FROM ?", [currentVehicles]);
      alasql("INSERT INTO transactions SELECT * FROM ?", [currentTransactions]);
      alasql("INSERT INTO history SELECT * FROM ?", [currentHistory]);
      alasql("INSERT INTO audit_logs SELECT * FROM ?", [currentLogs]);
      alasql("INSERT INTO users SELECT * FROM ?", [currentUsers]);

      // 2. Resolve statement type (Read versus Update/Insert/Delete)
      const cleanQuery = sqlQuery.trim();
      const isMutation = /^(INSERT|UPDATE|DELETE)/i.test(cleanQuery);

      const rawResult = alasql(cleanQuery);
      const endTime = performance.now();
      setExecutionTimeMs(parseFloat((endTime - startTime).toFixed(2)));

      if (isMutation) {
        // Mutation yields standard affected rows count
        const affected = typeof rawResult === "number" ? rawResult : Array.isArray(rawResult) ? rawResult.length : 1;
        setAffectedCount(affected);

        // Fetch back mutated stores from memory engine and run state synchronization!
        const modifiedVehicles = alasql("SELECT * FROM vehicles") as any as VehicleMaster[];
        const modifiedTransactions = alasql("SELECT * FROM transactions") as any as VehicleTransaction[];
        const modifiedHistory = alasql("SELECT * FROM history") as any as VehicleHistory[];
        const modifiedLogs = alasql("SELECT * FROM audit_logs") as any as AuditLog[];

        // Sync with local Storage using callbacks
        onUpdateVehicles(modifiedVehicles);
        onUpdateTransactions(modifiedTransactions);
        
        dbStore.saveHistory(modifiedHistory);
        dbStore.saveAuditLogs(modifiedLogs);

        // Record a dedicated audit entry for the SQL transaction
        dbStore.addAuditLog(
          currentUser.username,
          "SQL_QUERY_EXECUTION",
          `Manually executed updating SQL: ${cleanQuery.substring(0, 80)}... Affected rows: ${affected}`
        );

        setQueryResult([{ "SQL Mutation Success": "Query completed perfectly in engine.", "Rows Affected": affected }]);
        onRefreshAll();
      } else {
        // Read statement (SELECT)
        if (Array.isArray(rawResult)) {
          setQueryResult(rawResult);
        } else {
          setQueryResult([rawResult]);
        }
      }
    } catch (err: any) {
      setErrorMessage(err?.message || "SQL Syntax parsing error. Please check table names and commas.");
    }
  };

  const loadPreset = (query: string) => {
    setSqlQuery(query);
  };

  const tableHeaders = useMemo(() => {
    if (!queryResult || queryResult.length === 0) return [];
    // Extract unique keys from all records to handle irregular rows
    const keysSet = new Set<string>();
    queryResult.forEach(item => {
      if (item && typeof item === "object") {
        Object.keys(item).forEach(key => keysSet.add(key));
      }
    });
    return Array.from(keysSet);
  }, [queryResult]);

  return (
    <div className="space-y-6">
      
      {/* Header Info */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-sm font-black text-slate-900 tracking-wider uppercase font-sans flex items-center gap-2">
            <Database className="w-5 h-5 text-[#D91E27]" />
            <span>LOCAL SQL RUNNER & DIRECT DATA CONSOLE</span>
          </h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
            Query in-memory tables directly. Mutators (INSERT, UPDATE) persist instantly to localStorage!
          </p>
        </div>
        <div className="flex gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black text-blue-700 bg-blue-50 border border-blue-100 uppercase tracking-widest">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
            VMS Storage: Live SQL Active
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Column 1 & 2: SQL Terminal Area */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-[#0F172A] border border-slate-950 rounded-2xl overflow-hidden shadow-md">
            
            {/* Terminal Tab Header */}
            <div className="bg-slate-900 p-3.5 border-b border-slate-950 flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-300">
                <Terminal className="w-4 h-4 text-[#D91E27]" />
                <span className="text-[10px] font-black tracking-widest uppercase font-mono">SQL COMMAND EDITOR & COMPILER</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
              </div>
            </div>

            {/* Code Textarea Area */}
            <div className="p-4 bg-[#0B0F19] relative">
              <textarea
                value={sqlQuery}
                onChange={(e) => setSqlQuery(e.target.value)}
                rows={7}
                placeholder="Write SELECT, INSERT or UPDATE statements here..."
                className="w-full text-xs font-mono bg-transparent text-emerald-400 focus:outline-none resize-y border-0 leading-relaxed tracking-wider placeholder:text-slate-600 selection:bg-slate-800"
              />
            </div>

            {/* Run controls footer */}
            <div className="bg-slate-900 px-4 py-3 border-t border-slate-950 flex justify-between items-center">
              <span className="text-[9px] font-mono font-bold text-slate-500 uppercase tracking-wider">
                Ready to execute against local memory database
              </span>
              <button
                onClick={executeSql}
                className="inline-flex items-center gap-2 bg-[#D91E27] hover:bg-rose-700 text-white px-4 py-2 rounded-xl text-xxs font-black uppercase tracking-wider cursor-pointer shadow-md shadow-rose-600/10 transition active:scale-95"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                Execute Query (F5)
              </button>
            </div>

          </div>

          {/* Preset Templates */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
            <h3 className="text-[10px] font-black text-slate-400 tracking-wider uppercase font-mono flex items-center gap-1.5">
              <Copy className="w-3.5 h-3.5" />
              <span>PRESET SQL IN-MEMORY CONTEXT TEMPLATES</span>
            </h3>
            <div className="flex flex-col gap-2">
              {presets.map((p, index) => (
                <button
                  key={index}
                  onClick={() => loadPreset(p.query)}
                  className="w-full text-left p-2.5 rounded-lg bg-slate-50 border border-slate-100 hover:bg-slate-100 transition flex items-start gap-2.5 group cursor-pointer text-xs"
                >
                  <span className="bg-slate-200 group-hover:bg-[#D91E27] group-hover:text-white transition w-5 h-5 rounded-md flex items-center justify-center font-mono font-bold text-[10px] text-slate-600 shrink-0">
                    {index + 1}
                  </span>
                  <div className="space-y-0.5">
                    <p className="font-bold text-slate-700 group-hover:text-slate-900 transition leading-none">
                      {p.title}
                    </p>
                    <code className="text-[9px] font-mono text-slate-400 block truncate max-w-lg">
                      {p.query.replace(/\n/g, " ")}
                    </code>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Column 3: Active Schema Model Navigator */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs flex flex-col justify-between">
          <div>
            <div className="p-4 border-b border-slate-100">
              <h3 className="text-[10px] font-black text-slate-400 tracking-wider uppercase font-mono flex items-center gap-1.5">
                <Table className="w-4 h-4 text-slate-500" />
                <span>LOCAL DATABASE SCHEMAS</span>
              </h3>
              <p className="text-[10px] text-slate-400 font-sans mt-0.5">
                Inspect local schemas to formulate correct column names for querying.
              </p>
            </div>

            {/* Scheme selectors tabs */}
            <div className="grid grid-cols-4 bg-slate-50 border-b border-slate-100 p-1">
              {Object.keys(schemas).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveSchemaTab(tab)}
                  className={`py-1 text-center font-mono text-[9px] font-bold uppercase rounded transition cursor-pointer ${
                    activeSchemaTab === tab
                      ? "bg-slate-900 text-white shadow-xxs"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Schema table presentation */}
            <div className="p-3 max-h-[300px] overflow-y-auto">
              <table className="w-full text-left text-[10px]">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-black uppercase">
                    <th className="py-2">COLUMN</th>
                    <th className="py-2">TYPE</th>
                    <th className="py-2">DESCRIPTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 font-sans">
                  {schemas[activeSchemaTab as keyof typeof schemas].map((c) => (
                    <tr key={c.column} className="hover:bg-slate-50/50">
                      <td className="py-2 font-mono font-bold text-slate-800">{c.column}</td>
                      <td className="py-2 font-mono text-[9px] text-[#D91E27] font-semibold">{c.type}</td>
                      <td className="py-2 text-slate-500">{c.desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Quick Note block */}
          <div className="p-4 bg-rose-50 border-t border-rose-100">
            <div className="flex gap-2 text-[10px] text-amber-800 leading-relaxed font-sans font-medium">
              <HelpCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <div>
                <strong className="block uppercase text-slate-800 font-bold mb-0.5">Mutations Safeguard:</strong>
                Insert, update, and delete actions directly modify local application indices. Write regular transaction updates safely.
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* SQL Result Console Section */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        
        {/* Result Header */}
        <div className="bg-slate-50 px-5 py-4 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div>
            <h3 className="text-xxs font-black text-slate-400 tracking-wider uppercase font-mono flex items-center gap-1.5">
              <Terminal className="w-4 h-4 text-[#D91E27]" />
              <span>SQL COMPILER TERMINAL RESPONSE</span>
            </h3>
            {executionTimeMs !== null && (
              <p className="text-[10px] text-slate-500 mt-1">
                Completed in <strong className="font-mono text-[#D91E27]">{executionTimeMs} ms</strong>
                {affectedCount !== null && (
                  <span> • Affected <strong className="font-mono text-[#D91E27]">{affectedCount} row(s)</strong></span>
                )}
              </p>
            )}
          </div>
        </div>

        {/* Output state containers */}
        <div className="p-5 overflow-x-auto min-h-[140px]">
          {errorMessage && (
            <div className="flex gap-3 bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl text-xs font-medium">
              <AlertCircle className="w-4.5 h-4.5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <span className="block font-black uppercase tracking-wider text-red-900 mb-1">SQL PARSE/SYNTAX ERROR DETECTED</span>
                <code className="font-mono bg-red-100/50 px-1.5 py-0.5 rounded text-red-900 text-xxs leading-loose">{errorMessage}</code>
              </div>
            </div>
          )}

          {!errorMessage && queryResult === null && (
            <div className="flex flex-col items-center justify-center py-6 text-slate-400 gap-2">
              <HelpCircle className="w-8 h-8 text-slate-300" />
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">No Query Executed Yet</p>
              <p className="text-[10px] text-slate-400 max-w-sm text-center font-medium">
                Type an SQL query in the dark terminal field above and click "Execute Query" to see tabular compiler metrics back.
              </p>
            </div>
          )}

          {!errorMessage && queryResult !== null && queryResult.length === 0 && (
            <div className="flex flex-col items-center justify-center py-6 text-slate-400 gap-1.5">
              <CheckCircle2 className="w-8 h-8 text-blue-500" />
              <p className="text-xs font-bold uppercase tracking-wider text-slate-700">Empty Result Set</p>
              <p className="text-[10px] text-slate-400 font-medium">
                The search query successfully completed but returned 0 rows matching.
              </p>
            </div>
          )}

          {!errorMessage && queryResult !== null && queryResult.length > 0 && (
            <div className="overflow-x-auto border border-slate-150 rounded-xl">
              <table className="w-full text-left font-sans text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-150 text-[10px] text-slate-500 font-black uppercase tracking-wider">
                    {tableHeaders.map((head) => (
                      <th key={head} className="px-4 py-3 font-mono">
                        {head}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {queryResult.map((row, rIndex) => (
                    <tr key={rIndex} className="hover:bg-slate-50/40 transition">
                      {tableHeaders.map((col) => {
                        const val = row[col];
                        let renderedVal = "";
                        if (val === null || val === undefined) {
                          renderedVal = "NULL";
                        } else if (typeof val === "object") {
                          renderedVal = JSON.stringify(val);
                        } else {
                          renderedVal = String(val);
                        }
                        return (
                          <td key={col} className={`px-4 py-2.5 font-mono text-[11px] ${val === null ? "text-slate-400 italic font-semibold" : "text-slate-800"}`}>
                            {renderedVal}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
