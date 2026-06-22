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
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden font-sans">
      {/* Decorative Blueprint Background Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-30 pointer-events-none"></div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 text-center">
        <div className="flex justify-center mb-6">
          <Logo theme="dark" height="60px" />
        </div>
        <h2 className="text-center text-xl font-black tracking-widest text-[#D91E27] uppercase font-sans">
          Plant Gate Access
        </h2>
        <p className="mt-1.5 text-center text-[10px] text-slate-400 uppercase tracking-widest max-w-xs mx-auto">
          Vehicle Dispatch & Return Center
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-slate-900/90 backdrop-blur-md py-8 px-6 sm:px-10 rounded-2xl shadow-2xl border border-slate-800">
          
          {/* Custom Navigation Tab Headers */}
          <div className="flex border-b border-slate-800 mb-6 pb-1">
            <button
              onClick={() => {
                setTab("login");
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              id="tab-select-login"
              className={`flex-1 text-center pb-2.5 text-xs font-black uppercase tracking-wider transition ${
                tab === "login"
                  ? "border-b-2 border-blue-500 text-white"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              System login
            </button>
            <button
              onClick={() => {
                setTab("change_password");
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              id="tab-select-change-password"
              className={`flex-1 text-center pb-2.5 text-xs font-black uppercase tracking-wider transition ${
                tab === "change_password"
                  ? "border-b-2 border-blue-500 text-white"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              Reset passcode
            </button>
          </div>

          {/* Feedback banners */}
          {errorMessage && (
            <div id="login-error-banner" className="mb-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl p-3 flex.items-start gap-2.5 flex">
              <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div id="login-success-banner" className="mb-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-xl p-3 flex items-start gap-2.5 flex">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          {tab === "login" ? (
            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-xxs font-black text-slate-400 uppercase tracking-widest mb-1.5">
                  Access Level / Role
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(["Admin", "Operator", "Supervisor"] as UserRole[]).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRole(r)}
                      className={`py-2 px-1 text-center rounded-lg text-xs font-bold border transition transition-colors cursor-pointer ${
                        role === r
                          ? "bg-blue-600/10 border-blue-500 text-blue-400"
                          : "border-slate-800 bg-slate-950 text-slate-400 hover:bg-slate-900"
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xxs font-black text-slate-400 uppercase tracking-widest mb-1.5">
                  Operator Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl px-4 py-2.5 text-slate-100 text-sm focus:outline-none transition"
                  placeholder="e.g. admin, operator"
                  required
                />
              </div>

              <div>
                <label className="block text-xxs font-black text-slate-400 uppercase tracking-widest mb-1.5">
                  Terminal Keycode
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl px-4 py-2.5 text-slate-100 text-sm focus:outline-none transition"
                  placeholder="••••••••"
                  required
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  id="btn-login-submit"
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-4 rounded-xl text-xs uppercase tracking-widest cursor-pointer transition flex items-center justify-center gap-2"
                >
                  <UserCheck className="w-4 h-4" />
                  <span>Authenticate terminal</span>
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-xxs font-black text-slate-400 uppercase tracking-widest mb-1">
                  Target Account Username
                </label>
                <input
                  type="text"
                  value={changeUser}
                  onChange={(e) => setChangeUser(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl px-4 py-2 text-slate-100 text-sm focus:outline-none transition"
                  placeholder="Enter username"
                  required
                />
              </div>

              <div>
                <label className="block text-xxs font-black text-slate-400 uppercase tracking-widest mb-1">
                  Old Keycode
                </label>
                <input
                  type="password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl px-4 py-2 text-slate-100 text-sm focus:outline-none transition"
                  placeholder="Current password"
                  required
                />
              </div>

              <div>
                <label className="block text-xxs font-black text-slate-400 uppercase tracking-widest mb-1">
                  New Passcode
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl px-4 py-2 text-slate-100 text-sm focus:outline-none transition"
                  placeholder="Minimum 4 characters"
                  required
                />
              </div>

              <div>
                <label className="block text-xxs font-black text-slate-400 uppercase tracking-widest mb-1">
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl px-4 py-2 text-slate-100 text-sm focus:outline-none transition"
                  placeholder="Confirm matches"
                  required
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  id="btn-pwd-change-submit"
                  className="w-full bg-orange-600 hover:bg-orange-500 text-white font-bold py-2.5 px-4 rounded-xl text-xs uppercase tracking-widest cursor-pointer transition flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Update credentials</span>
                </button>
              </div>
            </form>
          )}

          {/* Seed Quick Links for Easy Interactive Trial */}
          <div className="mt-8 pt-6 border-t border-slate-800 text-center">
            <span className="text-xxs font-black text-slate-500 uppercase tracking-wider block mb-3">
              DEMO GATE AUTOLINK CODES:
            </span>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => fillCredentials("admin")}
                className="py-1.5 px-0.5 bg-slate-950 border border-slate-800 rounded-lg text-xxs text-amber-400 hover:bg-slate-900 font-bold font-mono transition-colors cursor-pointer"
                title="Fill Admin Credentials"
              >
                ADMIN
              </button>
              <button
                type="button"
                onClick={() => fillCredentials("operator")}
                className="py-1.5 px-0.5 bg-slate-950 border border-slate-800 rounded-lg text-xxs text-cyan-400 hover:bg-slate-900 font-bold font-mono transition-colors cursor-pointer"
                title="Fill Operator Credentials"
              >
                OPERATOR
              </button>
              <button
                type="button"
                onClick={() => fillCredentials("supervisor")}
                className="py-1.5 px-0.5 bg-slate-950 border border-slate-800 rounded-lg text-xxs text-emerald-400 hover:bg-slate-900 font-bold font-mono transition-colors cursor-pointer"
                title="Fill Supervisor Credentials"
              >
                SUPERVISOR
              </button>
            </div>
            <span className="text-xxxs text-slate-600 block mt-3 font-sans">
              *Passwords are username + "123" (e.g. admin123, operator123)
            </span>
          </div>

        </div>
      </div>
    </div>
  );
}
