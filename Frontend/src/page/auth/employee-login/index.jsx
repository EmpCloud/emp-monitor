import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { employeeLogin } from "./service";
import useEmployeeSession  from "../../../sessions/employeeSession";
import useNonAdminSession from "../../../sessions/useNonAdminSession";
import useAdminSession    from "../../../sessions/adminSession";
import { syncLanguageFromSession } from "@/i18n/syncLanguage";
import bgIllustration from "@/assets/login-bg.png";
import empLogo from "@/assets/emp.png";
import userIcon from "@/assets/user-setting.png";
import "../admin-login/style.css";

import { Input }  from "@/components/ui/input";
import { Label }  from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, AlertCircle, Loader2 } from "lucide-react";

export const EmployeeLogin = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { setEmployee } = useEmployeeSession();
  const { setNonAdmin } = useNonAdminSession();
  const { setAdmin }    = useAdminSession();

  const [email,        setEmail]        = useState("");
  const [password,     setPassword]     = useState("");
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = await employeeLogin({ email, password });

      // Service returns { success, code, data } on success or { error } on failure.
      if (result.error) {
        setError(result.error);
        return;
      }
      if (!result?.success || result.code !== 200 || !result?.data) {
        setError(result.message || t("auth_login_failed"));
        return;
      }

      // Route by role string (mirrors Laravel logic)
      const apiResponse = result.data;
      syncLanguageFromSession();
      const role = (apiResponse.role || "").toLowerCase().replace(/\s+/g, "");
      if (role === "employee") {
        setEmployee(apiResponse);
        navigate("/employee/dashboard");
      } else if (apiResponse.is_admin) {
        setAdmin(apiResponse);
        navigate("/admin/dashboard");
      } else {
        setNonAdmin(apiResponse);
        navigate("/non-admin/dashboard");
      }
    } catch (err) {
      setError(t("auth_unexpected_error"));
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="relative min-h-screen flex flex-col overflow-hidden"
      style={{
        backgroundImage:    `url(${bgIllustration})`,
        backgroundSize:     "cover",
        backgroundPosition: "left center",
        backgroundRepeat:   "no-repeat",
      }}
    >
      <div className="absolute inset-0 bg-sky-50/20 pointer-events-none z-0" />

      {/* Header */}
      <header className="animate-fade-down relative z-10 flex items-center justify-between px-8 py-5">
        <img src={empLogo} alt="EmpMonitor" className="w-40" />
      </header>

      {/* Main */}
      <main className="relative z-10 flex flex-1 items-center justify-end px-6 sm:px-16 lg:px-24 pb-12 max-w-[1700px]">
        <div className="flex flex-col items-center justify-center max-w-[500px] w-full gap-4">
          <div
            className="animate-card-rise relative w-full rounded-[63px] overflow-hidden px-12 py-10"
            style={{
              background:          "rgba(255,255,255,0.92)",
              backdropFilter:      "blur(24px)",
              WebkitBackdropFilter:"blur(24px)",
              boxShadow:
                "0 0 0 1px rgba(92,225,253,0.14), 0 4px 24px rgba(32,121,253,0.1), 0 20px 60px rgba(32,121,253,0.14)",
            }}
          >
            {/* Avatar */}
            <div className="flex justify-center mb-5">
              <img src={userIcon} alt="icon" className="w-10" />
            </div>

            {/* Title */}
            <div className="text-center mb-7">
              <h2 className="text-[20px] font-bold tracking-tight text-[#0f1e3a]">
                {t("auth_employee_login")}
              </h2>
              <p className="text-[13px] text-[#7aadca] mt-1">
                {t("auth_sign_in_employee")}
              </p>
            </div>

            {/* Error banner */}
            {error && (
              <div className="animate-fade-in flex items-center gap-2 mb-5 px-3.5 py-2.5 rounded-xl text-[13px] text-red-700 bg-red-50 border border-red-200 border-l-[3px] border-l-red-400">
                <AlertCircle size={16} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email */}
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-[13px] font-semibold text-[#3a5a7a]">
                  {t("email")}
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder={t("auth_enter_your_email")}
                  className={`emp-input px-4 h-11 rounded-xl text-sm text-[#1a2a4a] bg-white/80 placeholder:text-[#aac4d8] border-[1.5px] transition-all duration-200 ${
                    error ? "border-red-300 emp-input-error" : "border-[#e0eef5]"
                  }`}
                />
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-[13px] font-semibold text-[#3a5a7a]">
                  {t("password")}
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder={t("auth_enter_your_password")}
                    className={`emp-input px-4 pr-11 h-11 rounded-xl text-sm text-[#1a2a4a] bg-white/80 placeholder:text-[#aac4d8] border-[1.5px] transition-all duration-200 ${
                      error ? "border-red-300 emp-input-error" : "border-[#e0eef5]"
                    }`}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    tabIndex={-1}
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 text-[#9bbdce] hover:text-[#2079FD] hover:bg-transparent transition-colors duration-200"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </Button>
                </div>
              </div>

              {/* Submit */}
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

              <div className="flex justify-center !mt-2">
                <Button
                  type="button"
                  variant="ghost"
                  className="h-auto p-0 text-[13px] font-semibold text-[#2079FD] hover:text-[#2079FD] hover:bg-transparent hover:underline transition-opacity duration-200"
                >
                  {t("auth_forgot_password")}
                </Button>
              </div>
            </form>

            {/* Footer links */}
            <p className="text-center text-[13px] text-[#7aadca] leading-relaxed mt-5">
              {t("auth_admin_question")}{" "}
              <Button
                type="button"
                variant="ghost"
                className="h-auto p-0 text-[13px] font-bold text-[#2079FD] hover:text-[#2079FD] hover:bg-transparent hover:underline"
                onClick={() => navigate("/admin-login")}
              >
                {t("auth_admin_login")}
              </Button>
            </p>
          </div>

          <span className="text-xs text-[#9bbdce]">
            © {new Date().getFullYear()} – EmpMonitor
          </span>
        </div>
      </main>
    </div>
  );
};
