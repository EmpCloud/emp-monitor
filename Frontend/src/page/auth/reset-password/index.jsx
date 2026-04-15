import React, { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { resetPassword } from "./service";
import userBgIllustration from "@/assets/user-bg.png";
import empLogo from "@/assets/emp.png";
import userIcon from "@/assets/user-setting.png";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

export const ResetPassword = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const token = (params.get("token") || "").trim();
  const email = (params.get("email") || "").trim();
  const isClient = params.get("isClient");

  const tokenValid = useMemo(() => token.length > 0 && email.length > 0, [token, email]);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!tokenValid) {
      setError(t("auth_reset_invalid_link") || "Invalid or expired reset link.");
      return;
    }
    if (newPassword.length < 6) {
      setError(t("auth_reset_password_too_short") || "Password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t("auth_reset_password_mismatch") || "Passwords do not match.");
      return;
    }

    setLoading(true);
    const res = await resetPassword({
      email,
      token,
      new_password: newPassword,
      confirm_password: confirmPassword,
      isClient,
    });
    setLoading(false);

    if (res?.code === 200) {
      setSuccess(res.message || t("auth_reset_password_success") || "Password updated. Redirecting to login…");
      setTimeout(() => navigate("/login", { replace: true }), 1800);
    } else {
      setError(res?.message || t("auth_reset_password_failed") || "Unable to update password.");
    }
  };

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
      <div className="absolute inset-0 bg-sky-50/20 pointer-events-none z-0" />

      <header className="animate-fade-down relative z-10 flex items-center justify-between px-8 py-5">
        <div className="flex items-center gap-3">
          <img src={empLogo} alt="" className="w-40" />
        </div>
      </header>

      <main className="relative z-10 flex flex-1 items-center justify-end px-6 sm:px-16 lg:px-24 pb-12 max-w-[1700px]">
        <div className="flex flex-col items-center justify-center max-w-[500px] w-full gap-4">
          <div
            className="animate-card-rise relative w-full rounded-[63px] overflow-hidden px-12 py-10"
            style={{
              background: "rgba(255,255,255,0.92)",
              backdropFilter: "blur(24px)",
              WebkitBackdropFilter: "blur(24px)",
              boxShadow:
                "0 0 0 1px rgba(92,225,253,0.14), 0 4px 24px rgba(32,121,253,0.1), 0 20px 60px rgba(32,121,253,0.14)",
            }}
          >
            <div className="flex justify-center mb-5">
              <img src={userIcon} alt="icon" className="w-10" />
            </div>

            <div className="text-center mb-7">
              <h2 className="text-[20px] font-bold tracking-tight text-[#0f1e3a]">
                {t("auth_reset_password_title") || "Reset your password"}
              </h2>
              {email && (
                <p className="mt-1 text-[13px] text-[#3a5a7a] break-all">{email}</p>
              )}
            </div>

            {!tokenValid && (
              <div className="animate-fade-in flex items-center gap-2 mb-5 px-3.5 py-2.5 rounded-xl text-[13px] text-red-700 bg-red-50 border border-red-200 border-l-[3px] border-l-red-400">
                <AlertCircle size={16} className="shrink-0" />
                <span>{t("auth_reset_invalid_link") || "Invalid or expired reset link."}</span>
              </div>
            )}

            {error && (
              <div className="animate-fade-in flex items-center gap-2 mb-5 px-3.5 py-2.5 rounded-xl text-[13px] text-red-700 bg-red-50 border border-red-200 border-l-[3px] border-l-red-400">
                <AlertCircle size={16} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="animate-fade-in flex items-center gap-2 mb-5 px-3.5 py-2.5 rounded-xl text-[13px] text-green-700 bg-green-50 border border-green-200 border-l-[3px] border-l-green-400">
                <CheckCircle2 size={16} className="shrink-0" />
                <span>{success}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="new_password" className="text-[13px] font-semibold text-[#3a5a7a]">
                  {t("auth_new_password") || "New password"}
                </Label>
                <div className="relative">
                  <Input
                    id="new_password"
                    type={showNew ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    disabled={!tokenValid || loading || !!success}
                    placeholder={t("auth_enter_new_password") || "Enter new password"}
                    className="emp-input px-4 pr-11 h-11 rounded-xl text-sm text-[#1a2a4a] bg-white/80 placeholder:text-[#aac4d8] border-[1.5px] border-[#e0eef5] transition-all duration-200"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    tabIndex={-1}
                    onClick={() => setShowNew((v) => !v)}
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 text-[#9bbdce] hover:text-[#2079FD] hover:bg-transparent transition-colors duration-200"
                  >
                    {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                  </Button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirm_password" className="text-[13px] font-semibold text-[#3a5a7a]">
                  {t("auth_confirm_password") || "Confirm password"}
                </Label>
                <div className="relative">
                  <Input
                    id="confirm_password"
                    type={showConfirm ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    disabled={!tokenValid || loading || !!success}
                    placeholder={t("auth_reenter_new_password") || "Re-enter new password"}
                    className="emp-input px-4 pr-11 h-11 rounded-xl text-sm text-[#1a2a4a] bg-white/80 placeholder:text-[#aac4d8] border-[1.5px] border-[#e0eef5] transition-all duration-200"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    tabIndex={-1}
                    onClick={() => setShowConfirm((v) => !v)}
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 text-[#9bbdce] hover:text-[#2079FD] hover:bg-transparent transition-colors duration-200"
                  >
                    {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </Button>
                </div>
              </div>

              <div className="pt-1">
                <Button
                  type="submit"
                  disabled={loading || !tokenValid || !!success}
                  className="login-btn w-full h-11 rounded-xl text-[15px] font-bold text-white border-none transition-all duration-300 disabled:opacity-75 disabled:cursor-not-allowed bg-gradient-to-b from-[#5CE1FD] to-[#2079FD]"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 size={17} className="animate-spin" />
                      {t("auth_updating") || "Updating…"}
                    </span>
                  ) : (
                    t("auth_update_password") || "Update password"
                  )}
                </Button>
              </div>
            </form>

            <div className="flex justify-center mt-4">
              <Button
                type="button"
                variant="ghost"
                className="h-auto p-0 text-[13px] font-bold text-[#2079FD] hover:text-[#2079FD] hover:bg-transparent hover:underline"
                onClick={() => navigate("/login")}
              >
                {t("auth_back_to_login") || "Back to login"}
              </Button>
            </div>
          </div>
          <span className="text-xs text-[#9bbdce]">© {new Date().getFullYear()} – EmpMonitor</span>
        </div>
      </main>
    </div>
  );
};

export default ResetPassword;
