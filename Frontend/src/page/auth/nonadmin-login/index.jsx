import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { NonAdminLogin, forgotPassword } from "./service";
import useNonAdminSession from "@/sessions/useNonAdminSession";
import useEmployeeSession from "@/sessions/employeeSession";
import useAdminSession    from "@/sessions/adminSession";
import { syncLanguageFromSession } from "@/i18n/syncLanguage";
import userBgIllustration from "@/assets/user-bg.png";
import "./style.css";
import empLogo from "@/assets/emp.png";
import userIcon from "@/assets/user-setting.png";
// ── shadcn/ui components ──────────────────────────────────────────────────
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

// ── Lucide React icons ────────────────────────────────────────────────────
import { Eye, EyeOff, AlertCircle, Loader2, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogClose,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";

/* ========================================================================
   NonAdmin Login Component
   ======================================================================== */
export const Login = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { setNonAdmin } = useNonAdminSession();
  const { setEmployee } = useEmployeeSession();
  const { setAdmin }    = useAdminSession();

  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const [rememberMe, setRememberMe] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMsg, setForgotMsg] = useState({ type: "", text: "" });

  const handleForgotSubmit = async () => {
    if (!forgotEmail.trim()) return;
    setForgotLoading(true);
    setForgotMsg({ type: "", text: "" });
    const res = await forgotPassword(forgotEmail.trim());
    setForgotLoading(false);
    if (res?.code === 200) {
      setForgotMsg({ type: "success", text: res.msg || t("auth_reset_link_sent") });
      setForgotEmail("");
    } else {
      setForgotMsg({ type: "error", text: res?.msg || res?.message || t("auth_reset_link_failed") });
    }
  };

  // ── Original handleSubmit — untouched ──────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = await NonAdminLogin({ email, password });

      if (result.error) {
        setError(result.error);
        return;
      }

      if (!result?.data || result.code !== 200) {
        setError(result.message || t("auth_login_failed"));
        return;
      }

      // Route based on role flags in the API response.
      // Employees → employee session + employee dashboard.
      // Managers / teamleads → non-admin session (dashboard TBD).
      // Mirror Laravel logic: route by role string, not boolean flags
      const role = (result.role || "").toLowerCase().replace(/\s+/g, "");
      syncLanguageFromSession();
      if (role === "employee") {
        setEmployee(result);
        navigate("/employee/dashboard");
      } else if (result.is_admin) {
        setAdmin(result);
        navigate("/admin/dashboard");
      } else {
        setNonAdmin(result);
        navigate("/non-admin/dashboard");
      }
    } catch (err) {
      setError(t("auth_unexpected_error"));
      // eslint-disable-next-line no-console
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  // ───────────────────────────────────────────────────────────────────────

  return (
    <div
      className="relative min-h-screen flex flex-col overflow-hidden"
      style={{
        backgroundImage: `url(${userBgIllustration})`,
        backgroundSize: "cover",
        backgroundPosition: "left center",
        backgroundRepeat: "no-repeat",
      }}
    >
      {/* Subtle tint overlay */}
      <div className="absolute inset-0 bg-sky-50/20 pointer-events-none z-0" />

      {/* ── Header ────────────────────────────────────────────────────── */}
      <header className="animate-fade-down relative z-10 flex items-center justify-between px-8 py-5">
        <div className="flex items-center gap-3">
          <img src={empLogo} alt="" className="w-40" />
        </div>
      </header>

      {/* ── Main ──────────────────────────────────────────────────────── */}
      <main className="relative z-10 flex flex-1  items-center justify-end px-6 sm:px-16 lg:px-24 pb-12 max-w-[1700px]">
        <div className="flex flex-col items-center justify-center max-w-[500px] w-full gap-4">
          <div
            className="animate-card-rise relative w-full  rounded-[63px] overflow-hidden px-12 py-10"
            style={{
              background: "rgba(255,255,255,0.92)",
              backdropFilter: "blur(24px)",
              WebkitBackdropFilter: "blur(24px)",
              boxShadow:
                "0 0 0 1px rgba(92,225,253,0.14), 0 4px 24px rgba(32,121,253,0.1), 0 20px 60px rgba(32,121,253,0.14)",
            }}
          >
            {/* ── Avatar Icon ── */}
            <div className="flex justify-center mb-5">
              <img src={userIcon} alt="icon" className="w-10" />
            </div>

            {/* Title */}
            <div className="text-center mb-7">
              <h2 className="text-[20px] font-bold tracking-tight text-[#0f1e3a]">
                {t("auth_login_to_account")}
              </h2>
            </div>

            {/* ── Error banner — same condition as original ── */}
            {error && (
              <div className="animate-fade-in flex items-center gap-2 mb-5 px-3.5 py-2.5 rounded-xl text-[13px] text-red-700 bg-red-50 border border-red-200 border-l-[3px] border-l-red-400">
                <AlertCircle size={16} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* ── Form — onSubmit unchanged ── */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* ── Email field ── */}
              <div className="space-y-1.5">
                <Label
                  htmlFor="email"
                  className="text-[13px] font-semibold text-[#3a5a7a]"
                >
                  {t("auth_email_address")}
                </Label>

                <Input
                  id="email"
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setFocusedField("email")}
                  onBlur={() => setFocusedField(null)}
                  required
                  placeholder={t("auth_enter_email_address")}
                  className={`
                  emp-input px-4 h-11 rounded-xl text-sm text-[#1a2a4a]
                  bg-white/80 placeholder:text-[#aac4d8] border-[1.5px]
                  transition-all duration-200
                  ${error ? "border-red-300 emp-input-error" : "border-[#e0eef5]"}
                `}
                />
              </div>

              {/* ── Password field ── */}
              <div className="space-y-1.5">
                <Label
                  htmlFor="password"
                  className="text-[13px] font-semibold text-[#3a5a7a]"
                >
                  {t("password")}
                </Label>

                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setFocusedField("password")}
                    onBlur={() => setFocusedField(null)}
                    required
                    placeholder={t("auth_enter_password")}
                    className={`
                    emp-input px-4 pr-11 h-11 rounded-xl text-sm text-[#1a2a4a]
                    bg-white/80 placeholder:text-[#aac4d8] border-[1.5px]
                    transition-all duration-200
                    ${error ? "border-red-300 emp-input-error" : "border-[#e0eef5]"}
                  `}
                  />

                  {/* Eye toggle */}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    tabIndex={-1}
                    aria-label={
                      showPassword ? t("auth_hide_password") : t("auth_show_password")
                    }
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8
                    text-[#9bbdce] hover:text-[#2079FD] hover:bg-transparent
                    transition-colors duration-200"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </Button>
                </div>
              </div>

              {/* ── Remember me + Forgot password ── */}
              <div className="flex items-center justify-between">
                <Label htmlFor="rememberMe" className="flex items-center gap-2 cursor-pointer select-none">
                  <Checkbox
                    id="rememberMe"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-[#c8dde9] accent-[#2079FD] cursor-pointer"
                  />
                  <span className="text-[13px] font-semibold text-[#3a5a7a]">{t("auth_remember_password")}</span>
                </Label>
                <Button
                  type="button"
                  variant="ghost"
                  className="h-auto p-0 text-[13px] font-semibold text-[#2079FD]
                  hover:text-[#2079FD] hover:bg-transparent hover:underline
                  transition-opacity duration-200"
                  onClick={() => { setForgotEmail(""); setForgotMsg({ type: "", text: "" }); setForgotOpen(true); }}
                >
                  {t("auth_forgot_password")}
                </Button>
              </div>

              {/* ── Submit — shadcn Button ── */}
              <div className="pt-1">
                <Button
                  type="submit"
                  disabled={loading}
                  className="login-btn w-full h-11 rounded-xl text-[15px] font-bold text-white border-none transition-all duration-300 disabled:opacity-75 disabled:cursor-not-allowed bg-gradient-to-b from-[#5CE1FD] to-[#2079FD]"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 size={17} className="animate-spin" />
                      {t("auth_logging_in")}
                    </span>
                  ) : (
                    t("auth_log_in")
                  )}
                </Button>
              </div>
            </form>

            {/* ── Admin Login — centered ── */}
            <div className="flex justify-center mt-4">
              <Button
                type="button"
                variant="ghost"
                className="h-auto p-0 text-[13px] font-bold text-[#2079FD]
                hover:text-[#2079FD] hover:bg-transparent hover:underline"
                onClick={() => navigate("/admin-login")}
              >
                {t("auth_admin_login_question")}
              </Button>
            </div>
          </div>
          <span className="text-xs text-[#9bbdce]">© {new Date().getFullYear()} – EmpMonitor</span>
        </div>
        {/* ── Login Card ──────────────────────────────────────────────── */}
      </main>

      {/* ── Forgot Password Modal ── */}
      <Dialog open={forgotOpen} onOpenChange={setForgotOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-[500px] rounded-2xl p-0 border-0 shadow-2xl overflow-hidden gap-0 [&>button:last-child]:hidden">
          <div
            className="px-6 py-4 flex items-center justify-between"
            style={{ background: "linear-gradient(135deg, #2079FD 0%, #5CE1FD 100%)" }}
          >
            <h2 className="text-white text-lg font-bold">{t("auth_forgot_password_title")}</h2>
            <DialogClose className="text-white hover:text-white/80 transition-colors focus:outline-none">
              <X className="h-5 w-5" />
            </DialogClose>
          </div>

          <div className="px-6 pt-6 pb-4 space-y-4">
            <Label className="text-[15px] font-semibold text-gray-800">
              {t("auth_email_address")}
            </Label>
            <Input
              type="email"
              placeholder={t("auth_enter_email")}
              value={forgotEmail}
              onChange={(e) => setForgotEmail(e.target.value)}
              className="h-12 rounded-xl border-gray-300 text-sm px-4 placeholder:text-gray-400"
            />
            <p className="text-[13px] text-gray-500">
              {t("auth_email_privacy")}
            </p>
            {forgotMsg.text && (
              <p className={`text-[13px] font-medium ${forgotMsg.type === "success" ? "text-green-600" : "text-red-500"}`}>
                {forgotMsg.text}
              </p>
            )}
          </div>

          <div className="px-6 py-4 flex items-center justify-end gap-3">
            <DialogClose asChild>
              <Button className="h-10 px-6 rounded-full bg-gray-300 hover:bg-gray-400 text-gray-700 text-[14px] font-semibold shadow-none">
                {t("close")}
              </Button>
            </DialogClose>
            <Button
              onClick={handleForgotSubmit}
              disabled={!forgotEmail.trim() || forgotLoading}
              className="h-10 px-6 rounded-full bg-blue-500 hover:bg-blue-600 text-white text-[14px] font-semibold disabled:opacity-50"
            >
              {forgotLoading ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> {t("auth_sending")}</> : t("submit")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
