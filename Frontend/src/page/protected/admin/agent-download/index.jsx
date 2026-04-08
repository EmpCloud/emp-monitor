import React, { useState, useEffect, useCallback } from "react";
import ReactDOM from "react-dom";
import { X, Info, Download, ArrowLeft, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import agentImg from "@/assets/agent.png";
import linuxIcon from "@/assets/linux.png";
import apiService from "@/services/api.service";

const WindowsIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M3 5.548l7.065-.966v6.822H3V5.548z" fill="#00ADEF" />
    <path d="M11.065 4.463L21 3v8.404h-9.935V4.463z" fill="#00ADEF" />
    <path d="M21 12.596V21l-9.935-1.373V12.596H21z" fill="#00ADEF" />
    <path d="M10.065 19.514L3 18.632V12.596h7.065v6.918z" fill="#00ADEF" />
  </svg>
);

const MacIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path
      d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.81-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"
      fill="#555555"
    />
  </svg>
);

const LinuxIcon = ({ size = 18 }) => (
  <img
    src={linuxIcon}
    alt=""
    width={size}
    height={size}
    className="shrink-0 object-contain"
    aria-hidden
  />
);

const AgentDownloadOverlay = ({ open, onClose }) => {
  const { t } = useTranslation();
  const [step, setStep] = useState("select");
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [selectedPlatform, setSelectedPlatform] = useState(null);
  const [builds, setBuilds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);

  const AGENT_TYPES = [
    {
      id: "stealth",
      mode: "office",
      label: t("agentStealthLabel"),
      description: t("agentStealthDescription"),
    },
    {
      id: "revealed",
      mode: "personal",
      label: t("agentRevealedLabel"),
      description: t("agentRevealedDescription"),
    },
  ];

  const PLATFORMS = [
    { id: "windows", label: t("agentPlatformWindows"), icon: WindowsIcon },
    { id: "mac", label: t("agentPlatformMac"), icon: MacIcon },
    { id: "linux", label: t("agentPlatformLinux"), icon: LinuxIcon },
  ];

  const TYPE_LABELS = {
    win64: t("agentTypeWin64"),
    win86: t("agentTypeWin32"),
    mac: t("agentPlatformMac"),
    "mac-intel": t("agentTypeMacIntel"),
    "mac-arm": t("agentTypeMacAppleSilicon"),
    linux: t("agentPlatformLinux"),
  };

  const TYPE_TO_PLATFORM = {
    win64: "windows",
    win86: "windows",
    mac: "mac",
    "mac-intel": "mac",
    "mac-arm": "mac",
    linux: "linux",
  };

  const fetchBuilds = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiService.apiInstance.get("/organization-build/build");
      setBuilds(res.data?.data?.builds || []);
    } catch (err) {
      setError(t("agentFetchError"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (open) {
      fetchBuilds();
    }
  }, [open, fetchBuilds]);

  const handleAgentSelect = (agentId) => {
    setSelectedAgent(agentId);
    setStep("platform");
    setSelectedPlatform(null);
  };

  const handleBack = () => {
    setStep("select");
    setSelectedAgent(null);
    setSelectedPlatform(null);
  };

  const handleClose = () => {
    setStep("select");
    setSelectedAgent(null);
    setSelectedPlatform(null);
    setError(null);
    onClose?.();
  };

  const handleDownload = async (build) => {
    if (!build.url) return;
    setDownloadingId(build.id);
    try {
      const link = document.createElement("a");
      link.href = build.url;
      link.setAttribute("download", "");
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch {
      setError(t("agentDownloadError"));
    } finally {
      setDownloadingId(null);
    }
  };

  if (!open) return null;

  const activeAgentType = AGENT_TYPES.find((a) => a.id === selectedAgent);

  // Filter builds by the selected agent's mode
  const filteredBuilds = activeAgentType
    ? builds.filter((b) => b.mode === activeAgentType.mode)
    : [];

  // Group filtered builds by platform
  const buildsByPlatform = {};
  filteredBuilds.forEach((build) => {
    const platform = TYPE_TO_PLATFORM[build.type];
    if (platform) {
      if (!buildsByPlatform[platform]) buildsByPlatform[platform] = [];
      buildsByPlatform[platform].push(build);
    }
  });

  // Only show platforms that have builds available
  const availablePlatforms = PLATFORMS.filter((p) => buildsByPlatform[p.id]?.length > 0);

  const currentBuilds = selectedPlatform ? buildsByPlatform[selectedPlatform] || [] : [];

  return ReactDOM.createPortal(
    <div
      className="fixed inset-0 z-[99999] bg-slate-900/60 flex items-center justify-center"
      onClick={handleClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl overflow-hidden w-[min(880px,92vw)] max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Step 1: Select Agent Type ── */}
        {step === "select" && (
          <div className="flex flex-col md:flex-row min-h-[480px]">
            <div className="md:w-[45%] bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-10">
              <img src={agentImg} alt="Agent" className="w-full max-w-[320px] object-contain" />
            </div>

            <div className="md:w-[55%] p-10 flex flex-col justify-center relative">
              <button
                onClick={handleClose}
                className="absolute top-4 right-4 w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={18} />
              </button>
              <h2 className="text-2xl font-bold text-slate-800 mb-2">{t("agentDownloadsHeading")}</h2>
              <p className="text-sm text-slate-500 mb-8">
                {t("agentInstallationPreference")}
              </p>

              {loading && (
                <div className="flex items-center gap-2 text-sm text-slate-500 mb-4">
                  <Loader2 size={16} className="animate-spin" />
                  {t("agentLoadingBuilds")}
                </div>
              )}

              {error && (
                <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600">
                  {error}
                </div>
              )}

              <div className="space-y-3">
                {AGENT_TYPES.map((agent) => (
                  <button
                    key={agent.id}
                    onClick={() => handleAgentSelect(agent.id)}
                    disabled={loading}
                    className="w-full flex items-start gap-3 p-4 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 transition-all text-left group disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="mt-0.5 w-5 h-5 rounded-full border-2 border-slate-300 group-hover:border-blue-500 flex items-center justify-center shrink-0 transition-colors">
                      <div className="w-2.5 h-2.5 rounded-full bg-blue-500 scale-0 group-hover:scale-100 transition-transform" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-800">{agent.label}</span>
                        <Info size={14} className="text-blue-400" />
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                        {agent.description}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Step 2: Platform & Download ── */}
        {step === "platform" && activeAgentType && (
          <div className="flex flex-col md:flex-row min-h-[480px]">
            <div className="md:w-[45%] bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-10">
              <img src={agentImg} alt="Agent" className="w-full max-w-[320px] object-contain" />
            </div>

            <div className="md:w-[55%] p-10 flex flex-col justify-center relative">
              <button
                onClick={handleClose}
                className="absolute top-4 right-4 w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={18} />
              </button>
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleBack}
                    className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    <ArrowLeft size={18} />
                  </button>
                  <h2 className="text-2xl font-bold text-slate-800">{t("agentDownloadsHeading")}</h2>
                </div>
              </div>

              {/* Selected agent badge */}
              <div className="flex items-center gap-2 mb-6 px-3 py-2 bg-blue-50 rounded-lg border border-blue-100 w-fit">
                <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-white" />
                </div>
                <span className="text-sm font-semibold text-blue-700">
                  {activeAgentType.label}
                </span>
              </div>

              {error && (
                <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600">
                  {error}
                </div>
              )}

              {/* Platform tabs */}
              <p className="text-sm text-slate-500 mb-3">{t("agentSelectPlatform")}</p>
              <div className="flex gap-2 mb-6">
                {availablePlatforms.length > 0 ? (
                  availablePlatforms.map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      onClick={() => setSelectedPlatform(id)}
                      className={`flex items-center gap-2 px-5 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                        selectedPlatform === id
                          ? "border-blue-500 bg-blue-50 text-blue-700"
                          : "border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      <Icon size={18} />
                      {label}
                    </button>
                  ))
                ) : (
                  <p className="text-sm text-slate-400">
                    {t("agentNoBuildsForType")}
                  </p>
                )}
              </div>

              {/* Download options */}
              {selectedPlatform && currentBuilds.length > 0 && (
                <div className="space-y-2">
                  {currentBuilds.map((build) => (
                    <button
                      key={build.id}
                      onClick={() => handleDownload(build)}
                      disabled={downloadingId === build.id}
                      className="w-full flex items-center justify-between p-3.5 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 transition-all group text-left disabled:opacity-50"
                    >
                      <div>
                        <p className="text-sm font-semibold text-slate-800">
                          {TYPE_LABELS[build.type] || build.type}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          v{build.build_version} &middot; {build.file_type}
                        </p>
                      </div>
                      <div className="w-9 h-9 rounded-lg bg-blue-500 group-hover:bg-blue-600 flex items-center justify-center text-white transition-colors shrink-0">
                        {downloadingId === build.id ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <Download size={16} />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {selectedPlatform && currentBuilds.length === 0 && (
                <p className="text-sm text-slate-400">
                  {t("agentNoBuildsForPlatform")}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

export default AgentDownloadOverlay;
