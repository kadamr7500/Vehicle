import React, { useState } from "react";
import { KeyRound, ShieldAlert, CheckCircle2, UserCheck, RefreshCw } from "lucide-react";
import { dbStore } from "../dbStore";
import { User, UserRole } from "../types";
import Logo from "./Logo";

interface LoginViewProps {
  onLoginSuccess: (user: User) => void;
}

export default function LoginView({ onLoginSuccess }: LoginViewProps) {
  const [tab, setTab] = useState<"login" | "change_password">("login");
  const [username, setUsername] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [role, setRole] = useState<UserRole>("Operator");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Password change fields
  const [changeUser, setChangeUser] = useState<string>("");
  const [oldPassword, setOldPassword] = useState<string>("");
  const [newPassword, setNewPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!username.trim() || !password.trim()) {
      setErrorMessage("Please fill out both username and password fields.");
      return;
    }

    const users = dbStore.getUsers();
    const matchedUser = users.find(
      (u) =>
        u.username.toLowerCase() === username.trim().toLowerCase() &&
        u.password === password &&
        u.role === role
    );

    if (matchedUser) {
      dbStore.addAuditLog(matchedUser.username, "LOGIN", `Successful login as ${matchedUser.role}.`);
      onLoginSuccess(matchedUser);
    } else {
      setErrorMessage("Invalid credentials or mismatching user role selection.");
      dbStore.addAuditLog("guest", "LOGIN_FAILED", `Username: "${username}", Selected Role: "${role}"`);
    }
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!changeUser.trim() || !oldPassword.trim() || !newPassword.trim()) {
      setErrorMessage("All details are required to complete password resetting.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage("New password confirmation does not match.");
      return;
    }

    if (newPassword.length < 4) {
      setErrorMessage("New password must contain at least 4 characters.");
      return;
    }

    const users = dbStore.getUsers();
    const matchedIdx = users.findIndex(
      (u) => u.username.toLowerCase() === changeUser.trim().toLowerCase() && u.password === oldPassword
    );

    if (matchedIdx !== -1) {
      users[matchedIdx].password = newPassword;
      dbStore.saveUsers(users);
      dbStore.addAuditLog(users[matchedIdx].username, "PASSWORD_CHANGE", "Password successfully changed.");
      setSuccessMessage("Password successfully changed! You can log in now.");
      setTab("login");
      setUsername(users[matchedIdx].username);
      setPassword("");
      // Reset inputs
      setChangeUser("");
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } else {
      setErrorMessage("Current username or password did not match records.");
    }
  };

  // Helper helper to auto-fill seeded credentials for demo convenience
  const fillCredentials = (demoUser: string) => {
    setUsername(demoUser);
    setPassword(`${demoUser}123`);
    if (demoUser === "admin") setRole("Admin");
    if (demoUser === "operator") setRole("Operator");
    if (demoUser === "supervisor") setRole("Supervisor");
  };

  return (
    <div className="min-h-screen bg-[#070A13] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden font-sans">
      {/* Decorative Blueprint & Glowing Tech Background Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#131a30_1px,transparent_1px),linear-gradient(to_bottom,#131a30_1px,transparent_1px)] bg-[size:3.5rem_3.5rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-40 pointer-events-none"></div>
      
      {/* Background glow flares */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none animate-pulse duration-[8s]" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-rose-600/5 rounded-full blur-3xl pointer-events-none animate-pulse duration-[12s]" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 text-center space-y-2">
        <div className="flex justify-center mb-4 transform hover:scale-105 transition-transform duration-300">
          <Logo theme="dark" height="54px" />
        </div>
        <h2 className="text-center text-2xl font-bold tracking-widest text-slate-100 uppercase font-display">
          PLANT GATE ACCESS
        </h2>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 border border-slate-800">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
          <span className="text-[9px] text-slate-400 uppercase tracking-widest font-mono font-bold">
            SECURE TERMINAL GATEWAY v2.0
          </span>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-[#0D1424]/95 backdrop-blur-md py-8 px-6 sm:px-10 rounded-3xl shadow-2xl border border-slate-800/80">
          
          {/* Custom Navigation Tab Headers */}
          <div className="flex border-b border-slate-800/80 mb-6 pb-1">
            <button
              onClick={() => {
                setTab("login");
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              id="tab-select-login"
              className={`flex-1 text-center pb-3 text-xs font-black uppercase tracking-widest transition-all duration-200 cursor-pointer ${
                tab === "login"
                  ? "border-b-2 border-blue-500 text-blue-400 font-extrabold font-display"
                  : "text-slate-500 hover:text-slate-300 font-medium"
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => {
                setTab("change_password");
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              id="tab-select-change-password"
              className={`flex-1 text-center pb-3 text-xs font-black uppercase tracking-widest transition-all duration-200 cursor-pointer ${
                tab === "change_password"
                  ? "border-b-2 border-blue-500 text-blue-400 font-extrabold font-display"
                  : "text-slate-500 hover:text-slate-300 font-medium"
              }`}
            >
              Reset passcode
            </button>
          </div>

          {/* Feedback banners */}
          {errorMessage && (
            <div id="login-error-banner" className="mb-5 bg-rose-500/10 border border-rose-500/25 text-rose-400 text-xs rounded-2xl p-3.5 flex items-start gap-2.5 animate-shake">
              <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span className="font-medium">{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div id="login-success-banner" className="mb-5 bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs rounded-2xl p-3.5 flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span className="font-medium">{successMessage}</span>
            </div>
          )}

          {tab === "login" ? (
            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-xxs font-black text-slate-400 uppercase tracking-widest mb-2 font-mono">
                  Select Authorization Level
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(["Admin", "Operator", "Supervisor"] as UserRole[]).map((r) => {
                    const isSelected = role === r;
                    let colorTheme = "border-blue-500/40 text-blue-400 bg-blue-500/5";
                    if (r === "Admin") colorTheme = "border-amber-500/40 text-amber-400 bg-amber-500/5";
                    if (r === "Supervisor") colorTheme = "border-emerald-500/40 text-emerald-400 bg-emerald-500/5";
                    return (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setRole(r)}
                        className={`py-2 px-1 text-center rounded-xl text-xs font-black border transition-all duration-200 cursor-pointer ${
                          isSelected
                            ? `${colorTheme} scale-102 ring-1 ring-offset-0 ring-offset-transparent ring-slate-800`
                            : "border-slate-800 bg-[#090D18] text-slate-500 hover:bg-[#0E1528] hover:text-slate-300"
                        }`}
                      >
                        {r}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xxs font-black text-slate-400 uppercase tracking-widest mb-1.5 font-mono">
                  Operator Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-[#080C16] border border-slate-800 focus:border-blue-500/80 rounded-xl px-4 py-3 text-slate-100 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/30 transition-all font-medium placeholder:text-slate-600"
                  placeholder="e.g. admin, operator"
                  required
                />
              </div>

              <div>
                <label className="block text-xxs font-black text-slate-400 uppercase tracking-widest mb-1.5 font-mono">
                  Terminal Keycode
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#080C16] border border-slate-800 focus:border-blue-500/80 rounded-xl px-4 py-3 text-slate-100 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/30 transition-all font-medium placeholder:text-slate-600"
                  placeholder="••••••••"
                  required
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  id="btn-login-submit"
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 px-4 rounded-xl text-xs uppercase tracking-widest cursor-pointer transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20 active:scale-98"
                >
                  <UserCheck className="w-4 h-4" />
                  <span className="font-display">Authenticate terminal</span>
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-xxs font-black text-slate-400 uppercase tracking-widest mb-1.5 font-mono">
                  Target Account Username
                </label>
                <input
                  type="text"
                  value={changeUser}
                  onChange={(e) => setChangeUser(e.target.value)}
                  className="w-full bg-[#080C16] border border-slate-800 focus:border-blue-500/80 rounded-xl px-4 py-2.5 text-slate-100 text-sm focus:outline-none transition font-medium"
                  placeholder="Enter username"
                  required
                />
              </div>

              <div>
                <label className="block text-xxs font-black text-slate-400 uppercase tracking-widest mb-1.5 font-mono">
                  Old Keycode
                </label>
                <input
                  type="password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  className="w-full bg-[#080C16] border border-slate-800 focus:border-blue-500/80 rounded-xl px-4 py-2.5 text-slate-100 text-sm focus:outline-none transition font-medium"
                  placeholder="Current password"
                  required
                />
              </div>

              <div>
                <label className="block text-xxs font-black text-slate-400 uppercase tracking-widest mb-1.5 font-mono">
                  New Passcode
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-[#080C16] border border-slate-800 focus:border-blue-500/80 rounded-xl px-4 py-2.5 text-slate-100 text-sm focus:outline-none transition font-medium"
                  placeholder="Minimum 4 characters"
                  required
                />
              </div>

              <div>
                <label className="block text-xxs font-black text-slate-400 uppercase tracking-widest mb-1.5 font-mono">
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-[#080C16] border border-slate-800 focus:border-blue-500/80 rounded-xl px-4 py-2.5 text-slate-100 text-sm focus:outline-none transition font-medium"
                  placeholder="Confirm matches"
                  required
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  id="btn-pwd-change-submit"
                  className="w-full bg-orange-600 hover:bg-orange-500 text-white font-bold py-3 px-4 rounded-xl text-xs uppercase tracking-widest cursor-pointer transition flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span className="font-display">Update credentials</span>
                </button>
              </div>
            </form>
          )}

          {/* Seed Quick Links for Easy Interactive Trial */}
          <div className="mt-8 pt-6 border-t border-slate-800/80 text-center">
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-3 font-mono">
              PRE-CONFIGURED TERMINAL KEYS:
            </span>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => fillCredentials("admin")}
                className="py-2 px-1 bg-[#090D18] border border-slate-800 hover:border-amber-500/40 hover:bg-amber-500/5 rounded-xl text-[10px] text-amber-400 hover:text-amber-300 font-black font-mono transition-all duration-200 cursor-pointer"
                title="Fill Admin Credentials"
              >
                ADMIN
              </button>
              <button
                type="button"
                onClick={() => fillCredentials("operator")}
                className="py-2 px-1 bg-[#090D18] border border-slate-800 hover:border-cyan-500/40 hover:bg-cyan-500/5 rounded-xl text-[10px] text-cyan-400 hover:text-cyan-300 font-black font-mono transition-all duration-200 cursor-pointer"
                title="Fill Operator Credentials"
              >
                OPERATOR
              </button>
              <button
                type="button"
                onClick={() => fillCredentials("supervisor")}
                className="py-2 px-1 bg-[#090D18] border border-slate-800 hover:border-emerald-500/40 hover:bg-emerald-500/5 rounded-xl text-[10px] text-emerald-400 hover:text-emerald-300 font-black font-mono transition-all duration-200 cursor-pointer"
                title="Fill Supervisor Credentials"
              >
                SUPERVISOR
              </button>
            </div>
            <span className="text-[9px] text-slate-600 block mt-3 font-mono font-medium">
              *Autofilled keycodes will be user + "123"
            </span>
          </div>

        </div>
      </div>
    </div>
  );
}
