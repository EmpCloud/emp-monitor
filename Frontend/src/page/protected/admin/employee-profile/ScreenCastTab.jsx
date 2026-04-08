import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  Monitor, Wifi, WifiOff, Gauge, Camera, Video,
  Layers, FolderOpen, Play, Copy, Lock, RotateCcw, Power,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import apiService from "@/services/api.service";
import { fetchEmployeeInfo } from "./service";

// ─── Constants ────────────────────────────────────────────────────────────────
const DEFAULT_CANVAS_HEIGHT = 500;
const FRAME_RATE            = 5;
const SCREEN_CONTROL        = true; // set false to disable remote-control input

const SPECIAL_KEYS = new Set([
  "Control", "Alt", "Shift", "Escape", "Tab", "Insert", "Home", "PageUp",
  "Delete", "End", "PageDown", "Backspace", "ArrowUp", "ArrowDown",
  "ArrowLeft", "ArrowRight", "AltGraph", "ContextMenu", "Enter", "Meta",
]);

// Maps customButtonPress(type) from ScreenCast.js
const CUSTOM_BUTTONS = [
  { type: 1, label: "Win",      icon: Layers,     title: "Windows Key" },
  { type: 2, label: "Explorer", icon: FolderOpen,  title: "File Explorer" },
  { type: 3, label: "Run",      icon: Play,        title: "Windows Run" },
  { type: 4, label: "Copy",     icon: Copy,        title: "Copy" },
  { type: 5, label: "Paste",    icon: Copy,        title: "Paste" },
  { type: 6, label: "Lock",     icon: Lock,        title: "Lock Screen" },
  { type: 7, label: "Restart",  icon: RotateCcw,   title: "Restart" },
  { type: 8, label: "Shutdown", icon: Power,       title: "Shutdown" },
];

const CUSTOM_BUTTON_DATA = {
  1: "Windows", 2: "File Explorer", 3: "Windows Run",
  4: "Copy",    5: "Paste",         6: "Lock",
  7: "Restart", 8: "Shutdown",
};

const SIZE_OPTIONS = [
  { labelKey: "small",  value: 400 },
  { labelKey: "medium", value: 600 },
  { labelKey: "large",  value: 800 },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Mirrors extractScreenData() in ScreenCast.js */
function extractScreenData(data) {
  const count = Object.keys(data).filter((k) => k.startsWith("image")).length;
  const result = [];
  for (let i = 0; i < count; i++) {
    result.push({ image: data[`image${i}`], screenData: data[`screenData${i}`] });
  }
  return result;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ScreenCastTab({ employee }) {
  const { t } = useTranslation();
  // ── UI state (drives renders) ──────────────────────────────────────────────
  const [isConnected,  setIsConnected]  = useState(false);
  const [agentOnline,  setAgentOnline]  = useState(null);   // null | true | false
  const [dashLatency,  setDashLatency]  = useState(null);   // ms string
  const [agentLatency, setAgentLatency] = useState(null);   // ms number
  const [errorMsg,     setErrorMsg]     = useState("");
  const [isRecording,  setIsRecording]  = useState(false);
  const [canvasHeight, setCanvasHeight] = useState(DEFAULT_CANVAS_HEIGHT);
  const [sizeKey,      setSizeKey]      = useState("small");

  // ── Imperative refs (no re-render needed) ─────────────────────────────────
  const socketRef            = useRef(null);
  const canvasContainerRef   = useRef(null);
  const imagePropertyRef     = useRef({});     // { [screenIndex]: { width, height, aspectRatio } }
  const isDraggingRef        = useRef(false);
  const startXRef            = useRef(0);
  const startYRef            = useRef(0);
  const isMouseInsideRef     = useRef(false);
  const canvasHeightRef      = useRef(DEFAULT_CANVAS_HEIGHT); // sync with state
  const numberOfScreensRef   = useRef(0);
  const isScreenStartedRef   = useRef(false);
  const recordRTCRef         = useRef([]);
  const latencyIntervalRef   = useRef(null);
  const latencyCounterRef    = useRef(0);
  const performanceVarRef    = useRef(null);
  const agentPollIntervalRef = useRef(null);
  // Resolved u_id from /user/get-user API — the actual user_id the WS server expects.
  // Populated in connect() before the socket opens; do NOT derive from employee.id (that's the DB id).
  const userIdRef            = useRef(null);

  // ── send helper ───────────────────────────────────────────────────────────
  const send = useCallback((payload) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(payload));
    }
  }, []);

  // ── Canvas event handlers (stable via refs, no re-render deps) ────────────
  const handleMouseDown = useCallback((e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    startXRef.current  = e.clientX - rect.left;
    startYRef.current  = e.clientY - rect.top;
    isDraggingRef.current = true;
  }, []);

  const handleMouseMove = useCallback((_e) => {
    // Position tracked implicitly via startX/startY on mousedown
    // Matches original handleMouseMove which captured but didn't send
  }, []);

  const handleMouseUp = useCallback((e) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;

    const idx  = parseInt(e.currentTarget.dataset.index, 10);
    const rect = e.currentTarget.getBoundingClientRect();
    const endX = e.clientX - rect.left;
    const endY = e.clientY - rect.top;
    const prop = imagePropertyRef.current[idx];
    if (!prop) return;

    const displayedW = canvasHeightRef.current * prop.aspectRatio;
    const displayedH = canvasHeightRef.current;
    const scaleX = prop.width  / displayedW;
    const scaleY = prop.height / displayedH;
    const buttonMap = { 0: "Left", 1: "Middle", 2: "Right" };

    send({
      type:               "fe_control",
      event:              "mouse_click",
      requested_user_id:  userIdRef.current,
      data: {
        originalStartX: startXRef.current * scaleX,
        originalStartY: startYRef.current * scaleY,
        originalEndX:   endX * scaleX,
        originalEndY:   endY * scaleY,
        button:         buttonMap[e.button] ?? "Unknown",
        screenId:       idx,
      },
    });
  }, [send]);

  const handleScroll = useCallback((e) => {
    if (isMouseInsideRef.current) e.preventDefault();
    if (e.deltaY === 0) return;
    send({
      type:              "fe_control",
      event:             "scroll",
      requested_user_id: userIdRef.current,
      data:              e.deltaY > 0 ? "Scrolled Down" : "Scrolled Up",
      screenId:          e.currentTarget.dataset.index,
    });
  }, [send]);

  const handleKeyDown = useCallback((e) => {
    const key = e.key;
    const idx = e.currentTarget.dataset.index;
    if (["F5", "F11", "F1", "Meta"].includes(key)) e.preventDefault();

    if (key === "CapsLock" || key === "NumLock") {
      send({ type: "fe_control", event: "key_press_start", requested_user_id: userIdRef.current, data: key, currentValue: e.getModifierState(key), screenId: idx });
      return;
    }
    if (SPECIAL_KEYS.has(key)) {
      send({ type: "fe_control", event: "key_press_start", requested_user_id: userIdRef.current, data: key, screenId: idx });
      return;
    }
    send({ type: "fe_control", event: "key_press", requested_user_id: userIdRef.current, data: key, screenId: idx });
  }, [send]);

  const handleKeyUp = useCallback((e) => {
    const key = e.key;
    const idx = e.currentTarget.dataset.index;
    if (SPECIAL_KEYS.has(key)) {
      send({ type: "fe_control", event: "key_press_end", requested_user_id: userIdRef.current, data: key, screenId: idx });
      return;
    }
    if (key === "CapsLock" || key === "NumLock") {
      send({ type: "fe_control", event: "key_press_end", requested_user_id: userIdRef.current, data: key, currentValue: e.getModifierState(key), screenId: idx });
    }
  }, [send]);

  // ── Attach canvas events (mirrors setupCanvasEvents in ScreenCast.js) ─────
  const attachCanvasEvents = useCallback((canvas) => {
    canvas.tabIndex = 0;
    canvas.style.cursor = "crosshair";
    canvas.addEventListener("mousedown",  handleMouseDown);
    canvas.addEventListener("mousemove",  handleMouseMove);
    canvas.addEventListener("mouseup",    handleMouseUp);
    canvas.addEventListener("wheel",      handleScroll, { passive: false });
    canvas.addEventListener("keydown",    handleKeyDown);
    canvas.addEventListener("keyup",      handleKeyUp);
    canvas.addEventListener("contextmenu", (ev) => ev.preventDefault());
    canvas.addEventListener("mouseenter", () => {
      isMouseInsideRef.current = true;
      canvas.focus();
    });
    canvas.addEventListener("mouseleave", () => {
      isMouseInsideRef.current = false;
    });
  }, [handleMouseDown, handleMouseMove, handleMouseUp, handleScroll, handleKeyDown, handleKeyUp]);

  // ── Process incoming screen frames (mirrors processImageInCanvas) ──────────
  const processImageInCanvas = useCallback((screens) => {
    const container = canvasContainerRef.current;
    if (!container || screens.length === 0) return;

    const height = canvasHeightRef.current;

    // Rebuild canvases if screen count changed (e.g. monitor added/removed)
    if (numberOfScreensRef.current !== screens.length) {
      isScreenStartedRef.current = false;
    }

    if (!isScreenStartedRef.current) {
      container.innerHTML    = "";
      imagePropertyRef.current = {};

      screens.forEach((s, i) => {
        const aspectRatio = s.screenData?.[`aspectRatio${i}`] ?? (16 / 9);
        const canvas      = document.createElement("canvas");
        canvas.id          = `canvas-img-${i}`;
        canvas.height      = height;
        canvas.width       = height * aspectRatio;
        canvas.dataset.index = String(i);
        container.appendChild(canvas);

        imagePropertyRef.current[i] = {
          height:      s.screenData?.[`height${i}`]      ?? height,
          width:       s.screenData?.[`width${i}`]       ?? Math.round(height * aspectRatio),
          aspectRatio,
        };

        if (SCREEN_CONTROL) attachCanvasEvents(canvas);
      });

      isScreenStartedRef.current  = true;
      numberOfScreensRef.current  = screens.length;
    }

    // Paint each screen frame
    screens.forEach((s, i) => {
      const canvas = document.getElementById(`canvas-img-${i}`);
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      };
      img.src = `data:image/png;base64,${s.image}`;
    });
  }, [attachCanvasEvents]);

  // ── WebSocket message handler (mirrors onWebSocketMessage) ─────────────────
  // Stored in a ref so the stable socket listener always calls the latest version
  const onMessageRef = useRef(null);
  onMessageRef.current = useCallback((event) => {
    const data = event.data;

    if (data === "User authenticated successfully") {
      send({ type: "image_request",      requested_user_id: userIdRef.current });
      send({ type: "check_agent_status", requested_user_id: userIdRef.current });

    } else if (data.includes("Image request received for user")) {
      // Start polling agent status every 5 s
      if (agentPollIntervalRef.current) clearInterval(agentPollIntervalRef.current);
      agentPollIntervalRef.current = setInterval(() => {
        send({ type: "check_agent_status", requested_user_id: userIdRef.current });
      }, 5000);

    } else if (data.includes("Agent is")) {
      setAgentOnline(data === "Agent is online -- Agent Status");

    } else if (data === "Latency Test Completed") {
      const ms = (performance.now() - (performanceVarRef.current ?? 0)).toFixed(2);
      setDashLatency(ms);

    } else if (data.includes("latency_test_send_record")) {
      try {
        const parsed = JSON.parse(data);
        setAgentLatency(parsed.b - parsed.a);
      } catch { /* ignore malformed */ }

    } else if (data.includes("You are already connected to a different system.")) {
      setErrorMsg("You are already connected to a system.");

    } else {
      try {
        processImageInCanvas(extractScreenData(JSON.parse(data)));
      } catch (err) {
        console.error("ScreenCast: parse error", err);
      }
    }
  }, [send, processImageInCanvas]);

  // ── Reset all volatile refs / state (used on disconnect) ──────────────────
  const resetState = useCallback(() => {
    numberOfScreensRef.current  = 0;
    isScreenStartedRef.current  = false;
    imagePropertyRef.current    = {};
    isDraggingRef.current       = false;
    isMouseInsideRef.current    = false;
    userIdRef.current           = null; // cleared so next connect() re-fetches from API

    if (agentPollIntervalRef.current) {
      clearInterval(agentPollIntervalRef.current);
      agentPollIntervalRef.current = null;
    }
    if (canvasContainerRef.current) {
      canvasContainerRef.current.innerHTML = "";
    }

    setIsConnected(false);
    setAgentOnline(null);
    setDashLatency(null);
    setAgentLatency(null);
    setErrorMsg("");
  }, []);

  // ── Connect (mirrors screenCast(1) / connect()) ───────────────────────────
  const connect = useCallback(async () => {
    if (!employee?.id) return;
    const ws = socketRef.current;
    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return;

    // Fetch employee info to get the real u_id (user_id) the WS server expects.
    // employee.id from the table may be a DB/employee id — not the same as u_id.
    if (!userIdRef.current) {
      const res = await fetchEmployeeInfo(employee.id);
      // API: { code, data: { u_id, id, ... } }
      userIdRef.current = res?.data?.u_id ?? res?.data?.id ?? employee.id;
    }

    const uid = userIdRef.current;
    if (!uid) return;

    const token  = localStorage.getItem("token");
    const socket = new WebSocket(apiService.SOCKET_BASE_URL);

    // Stable wrapper so we can always call the latest handler
    const stableMessage = (e) => onMessageRef.current(e);

    socket.addEventListener("open", () => {
      setIsConnected(true);
      setErrorMsg("");
      socket.send(JSON.stringify({ type: "fe_auth", token }));
    });

    socket.addEventListener("message", stableMessage);

    socket.addEventListener("close", () => {
      resetState();
    });

    socket._stableMessage = stableMessage; // stash ref for cleanup
    socketRef.current = socket;
  }, [resetState]);

  // ── Disconnect (mirrors screenCast(2) / disconnect()) ─────────────────────
  const disconnect = useCallback(() => {
    const ws = socketRef.current;
    if (!ws) return;
    if (ws._stableMessage) ws.removeEventListener("message", ws._stableMessage);
    ws.onclose = null; // prevent double reset
    ws.close();
    socketRef.current = null;
    resetState();
  }, [resetState]);

  // ── Latency test (mirrors runLatencyTest()) ───────────────────────────────
  const runLatencyTest = useCallback(() => {
    if (latencyIntervalRef.current) {
      clearInterval(latencyIntervalRef.current);
      latencyIntervalRef.current = null;
      latencyCounterRef.current  = 0;
    }

    latencyIntervalRef.current = setInterval(() => {
      if (latencyCounterRef.current >= 60) {
        clearInterval(latencyIntervalRef.current);
        latencyIntervalRef.current = null;
        latencyCounterRef.current  = 0;
        setDashLatency(null);
        setAgentLatency(null);
        return;
      }
      send({ type: "agent_latency_test_request", requested_user_id: userIdRef.current });
      performanceVarRef.current = performance.now();
      send({ type: "latency_test" });
      latencyCounterRef.current++;
    }, 1500);
  }, [send]);

  // ── Custom shortcut buttons (mirrors customButtonPress()) ─────────────────
  const handleCustomButton = useCallback((type) => {
    send({ type: "fe_control", event: "key_press_custom", requested_user_id: userIdRef.current, data: CUSTOM_BUTTON_DATA[type] });
  }, [send]);

  // ── Screenshot capture (mirrors captureButton click) ─────────────────────
  const captureScreenshot = useCallback(() => {
    for (let i = 0; i < numberOfScreensRef.current; i++) {
      const canvas = document.getElementById(`canvas-img-${i}`);
      if (!canvas) continue;
      const link = document.createElement("a");
      link.href     = canvas.toDataURL("image/png");
      link.download = `screenshot-sc-${i}.png`;
      link.click();
    }
  }, []);

  // ── Screen recording (mirrors startStopScreenRecord / startRecording / stopRecording) ──
  const startRecording = useCallback(() => {
    const doStart = () => {
      const newRTCs = [];
      for (let i = 0; i < numberOfScreensRef.current; i++) {
        const canvas = document.getElementById(`canvas-img-${i}`);
        if (!canvas) continue;
        const stream = canvas.captureStream(FRAME_RATE);
        const rtc    = window.RecordRTC(stream, { type: "video" });
        rtc.startRecording();
        newRTCs[i] = rtc;
      }
      recordRTCRef.current = newRTCs;
      setIsRecording(true);
    };

    if (!window.RecordRTC) {
      const script   = document.createElement("script");
      script.src     = "https://cdn.jsdelivr.net/npm/recordrtc@5.6.0/RecordRTC.min.js";
      script.onload  = doStart;
      document.head.appendChild(script);
    } else {
      doStart();
    }
  }, []);

  const stopRecording = useCallback(() => {
    recordRTCRef.current.forEach((rtc, i) => {
      if (!rtc) return;
      rtc.stopRecording(() => {
        const blob = rtc.getBlob();
        if (blob.size > 0) {
          const url  = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href     = url;
          link.download = `video-sc-${i}.webm`;
          link.click();
          URL.revokeObjectURL(url);
        } else {
          console.warn(`ScreenCast: recording ${i} was empty`);
        }
      });
    });
    recordRTCRef.current = [];
    setIsRecording(false);
  }, []);

  // ── Tab-visibility auto connect/disconnect (mirrors tabSwitchIndex()) ──────
  useEffect(() => {
    const onFocusChange = () => {
      if (!document.hidden && document.hasFocus()) {
        connect();
      } else {
        disconnect();
      }
    };
    window.addEventListener("focus",           onFocusChange);
    window.addEventListener("blur",            onFocusChange);
    document.addEventListener("visibilitychange", onFocusChange);
    return () => {
      window.removeEventListener("focus",           onFocusChange);
      window.removeEventListener("blur",            onFocusChange);
      document.removeEventListener("visibilitychange", onFocusChange);
    };
  }, [connect, disconnect]);

  // ── Cleanup on unmount ────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      disconnect();
      if (latencyIntervalRef.current) clearInterval(latencyIntervalRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Keep canvasHeightRef in sync when size changes ────────────────────────
  const applySize = useCallback((opt) => {
    canvasHeightRef.current     = opt.value;
    isScreenStartedRef.current  = false; // force canvas rebuild on next frame
    setCanvasHeight(opt.value);
    setSizeKey(opt.labelKey);
  }, []);

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* ── Top control bar ── */}
      <div className="flex flex-wrap items-center justify-center gap-3">

        {/* Agent status badge */}
        <Badge className={`rounded-full px-4 py-1.5 text-xs font-semibold border gap-1.5 ${
          agentOnline === true  ? "bg-green-50 text-green-700 border-green-200" :
          agentOnline === false ? "bg-red-50   text-red-600   border-red-200"   :
          "bg-blue-50 text-blue-600 border-blue-200"
        }`}>
          <span className={`inline-block w-2 h-2 rounded-full ${
            agentOnline === true ? "bg-green-500" :
            agentOnline === false ? "bg-red-500" : "bg-gray-400"
          }`} />
          {agentOnline === true ? t("agentOnlineLabel") : agentOnline === false ? t("agentOfflineLabel") : t("agentConnectionStatus")}
        </Badge>

        {/* Connect / Disconnect */}
        {!isConnected ? (
          <Button
            onClick={connect}
            disabled={!employee?.id}
            className="h-9 px-5 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold gap-1.5"
          >
            <Wifi size={13} /> {t("connectBtn")}
          </Button>
        ) : (
          <Button
            onClick={disconnect}
            className="h-9 px-5 rounded-full bg-red-500 hover:bg-red-600 text-white text-xs font-semibold gap-1.5"
          >
            <WifiOff size={13} /> {t("disconnectBtn")}
          </Button>
        )}

        {/* Latency test */}
        <Button
          onClick={runLatencyTest}
          disabled={!isConnected}
          variant="outline"
          className="h-9 px-5 rounded-full text-xs font-semibold gap-1.5"
        >
          <Gauge size={13} /> {t("testLatency")}
        </Button>

        {/* Dashboard latency readout */}
        <Badge className="bg-gray-50 text-gray-600 border border-gray-200 rounded-full px-4 py-1.5 text-xs font-medium gap-1.5">
          <Gauge size={12} className="inline" />
          {dashLatency != null ? `Dashboard: ${dashLatency} ms` : "Dashboard: — ms"}
        </Badge>

        {/* Agent latency readout */}
        <Badge className="bg-gray-50 text-gray-600 border border-gray-200 rounded-full px-4 py-1.5 text-xs font-medium gap-1.5">
          <Gauge size={12} className="inline" />
          {agentLatency != null ? `Agent: ${agentLatency} ms` : "Agent: — ms"}
        </Badge>

        {/* Screen size selector */}
        <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-full px-2 py-1">
          {SIZE_OPTIONS.map((opt) => (
            <button
              key={opt.labelKey}
              onClick={() => applySize(opt)}
              className={`text-xs px-2.5 py-0.5 rounded-full transition-colors ${
                sizeKey === opt.labelKey
                  ? "bg-blue-600 text-white font-semibold"
                  : "text-gray-600 hover:text-blue-600"
              }`}
            >
              {t(opt.labelKey)}
            </button>
          ))}
        </div>
      </div>

      {/* ── Error message ── */}
      {errorMsg && (
        <div className="text-center text-sm text-red-500 bg-red-50 border border-red-100 rounded-xl px-4 py-2">
          {errorMsg}
        </div>
      )}

      {/* ── Custom shortcut taskbar (mirrors customButtonPress + screenshot/record) ── */}
      <div className="flex items-center justify-center">
        <div className="bg-slate-200 border border-slate-300 rounded-xl p-2 flex items-center gap-2 flex-wrap justify-center">
          {CUSTOM_BUTTONS.map(({ type, label, icon: Icon, title }) => (
            <button
              key={type}
              onClick={() => handleCustomButton(type)}
              disabled={!isConnected}
              title={title}
              className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-100 flex flex-col items-center justify-center hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors gap-0.5"
            >
              <Icon size={15} className="text-gray-600" />
              <span className="text-[8px] text-gray-500 leading-none">{label}</span>
            </button>
          ))}

          <div className="w-px h-8 bg-slate-300 mx-1" />

          {/* Screenshot */}
          <button
            onClick={captureScreenshot}
            disabled={!isConnected}
            title="Capture Screenshot"
            className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-100 flex flex-col items-center justify-center hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors gap-0.5"
          >
            <Camera size={15} className="text-blue-500" />
            <span className="text-[8px] text-gray-500 leading-none">{t("snap")}</span>
          </button>

          {/* Record */}
          <button
            onClick={isRecording ? stopRecording : startRecording}
            disabled={!isConnected}
            title={isRecording ? "Stop Recording" : "Start Recording"}
            className={`w-10 h-10 rounded-xl border flex flex-col items-center justify-center transition-colors gap-0.5 disabled:opacity-40 disabled:cursor-not-allowed ${
              isRecording
                ? "bg-red-100 border-red-200 hover:bg-red-200"
                : "bg-gray-50 border-gray-100 hover:bg-gray-100"
            }`}
          >
            <Video size={15} className={isRecording ? "text-red-500" : "text-gray-600"} />
            <span className="text-[8px] text-gray-500 leading-none">{isRecording ? t("stopRecord") : t("record")}</span>
          </button>
        </div>
      </div>

      {/* ── Screen canvas area ── */}
      <div
        className="relative rounded-2xl  overflow-auto flex justify-center"
        style={{ minHeight: canvasHeight + 8 }}
      >
        {/* Placeholder overlay — shown when not connected */}
        {!isConnected && (
          <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none border-dashed border-2 border-blue-600/30 rounded-2xl">
            <div className="text-center space-y-3">
              <div className="w-16 h-16 mx-auto bg-blue-600/30 rounded-2xl flex items-center justify-center">
                <Monitor size={32} className="text-white/70" />
              </div>
              <p className="text-blue-600 text-sm">{t("liveScreenCastAppearHere")}</p>
              <p className="text-blue-500 text-xs">{t("clickConnectToStart")}</p>
            </div>
          </div>
        )}

        {/* Agent offline overlay */}
        {isConnected && agentOnline === false && (
          <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
            <div className="text-center space-y-2">
              <WifiOff size={32} className="text-white/40 mx-auto" />
              <p className="text-white/60 text-sm">{t("agentIsOffline")}</p>
            </div>
          </div>
        )}

        {/*
          Canvas container — children are injected imperatively by processImageInCanvas.
          Do NOT put JSX children here; React must not manage this div's children.
        */}
        <div
          ref={canvasContainerRef}
          className={`flex gap-1 overflow-auto justify-center rounded-2xl items-start p-2 flex-wrap min-w-0 
    ${isConnected && "border-dashed border-2 border-blue-600/30"}
  `}
          style={{ minHeight: canvasHeight + 4 }}
        />

        {/* Bottom info bar */}
        {isConnected && (
          <div className="absolute bottom-3 right-3 flex items-center gap-2 pointer-events-none">
            <span className="text-[10px] text-white/50 bg-black/30 rounded px-2 py-0.5">
              {employee?.name ?? "—"}
            </span>
            <span className="text-[10px] text-white/50 bg-black/30 rounded px-2 py-0.5">
              {new Date().toLocaleTimeString()}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
