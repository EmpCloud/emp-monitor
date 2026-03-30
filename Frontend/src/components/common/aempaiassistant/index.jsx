import React, { useState, useRef, useCallback, useEffect } from "react";
import { Minus, X, Maximize2, Minimize2 } from "lucide-react";
import html2canvas from "html2canvas";
import aiLogo from "@/assets/ailogo.png";
import GenieEffect from "./GenieEffect";
import AiSidebar from "./AiSidebar";
import ChatUI from "./ChatUI";
import ProjectsView from "./ProjectsView";
import ChatsView from "./ChatsView";
import SearchPanel from "./SearchPanel";
import "./emp-ai-assistant.css";

const LOADER_DURATION = 2000;
const GENIE_DURATION = 460;
const ORB_SIZE = 80;
const ORB_MARGIN = 24;

// ── Modal draggable hook ──
const useDraggable = (ref, headerRef) => {
  const posRef = useRef({ x: 0, y: 0 });
  const dragRef = useRef({ isDragging: false, startX: 0, startY: 0 });

  useEffect(() => {
    const header = headerRef.current;
    const el = ref.current;
    if (!header || !el) return;

    const onMouseDown = (e) => {
      if (e.target.closest("button")) return;
      dragRef.current = {
        isDragging: true,
        startX: e.clientX - posRef.current.x,
        startY: e.clientY - posRef.current.y,
      };
      document.body.style.userSelect = "none";
    };

    const onMouseMove = (e) => {
      if (!dragRef.current.isDragging) return;
      const x = e.clientX - dragRef.current.startX;
      const y = e.clientY - dragRef.current.startY;
      posRef.current = { x, y };
      el.style.transform = `translate(${x}px, ${y}px)`;
    };

    const onMouseUp = () => {
      dragRef.current.isDragging = false;
      document.body.style.userSelect = "";
    };

    header.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);

    return () => {
      header.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [ref, headerRef]);

  const resetPosition = useCallback(() => {
    posRef.current = { x: 0, y: 0 };
    if (ref.current) ref.current.style.transform = "translate(0, 0)";
  }, [ref]);

  return { resetPosition };
};

// ── Orb draggable hook with corner snapping ──
const useOrbDrag = (orbRef, isMinimized, onPositionChange) => {
  const dragState = useRef({ isDragging: false, startX: 0, startY: 0, hasMoved: false });
  const posRef = useRef({ x: window.innerWidth - ORB_SIZE - ORB_MARGIN, y: window.innerHeight - ORB_SIZE - ORB_MARGIN });

  const snapToCorner = useCallback((x, y) => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const centerX = x + ORB_SIZE / 2;
    const centerY = y + ORB_SIZE / 2;

    const corners = [
      { x: ORB_MARGIN, y: ORB_MARGIN },
      { x: vw - ORB_SIZE - ORB_MARGIN, y: ORB_MARGIN },
      { x: ORB_MARGIN, y: vh - ORB_SIZE - ORB_MARGIN },
      { x: vw - ORB_SIZE - ORB_MARGIN, y: vh - ORB_SIZE - ORB_MARGIN },
    ];

    let nearest = corners[3];
    let minDist = Infinity;
    for (const c of corners) {
      const dist = Math.hypot(centerX - (c.x + ORB_SIZE / 2), centerY - (c.y + ORB_SIZE / 2));
      if (dist < minDist) { minDist = dist; nearest = c; }
    }
    return nearest;
  }, []);

  useEffect(() => {
    const el = orbRef.current;
    if (!el) return;
    if (isMinimized) {
      el.style.right = "auto";
      el.style.bottom = "auto";
      el.style.left = `${posRef.current.x}px`;
      el.style.top = `${posRef.current.y}px`;
    }
  }, [isMinimized, orbRef]);

  useEffect(() => {
    const el = orbRef.current;
    if (!el || !isMinimized) return;

    const onMouseDown = (e) => {
      e.preventDefault();
      dragState.current = {
        isDragging: true,
        startX: e.clientX - posRef.current.x,
        startY: e.clientY - posRef.current.y,
        hasMoved: false,
      };
      el.style.transition = "none";
      document.body.style.userSelect = "none";
    };

    const onMouseMove = (e) => {
      if (!dragState.current.isDragging) return;
      dragState.current.hasMoved = true;
      const x = Math.max(0, Math.min(e.clientX - dragState.current.startX, window.innerWidth - ORB_SIZE));
      const y = Math.max(0, Math.min(e.clientY - dragState.current.startY, window.innerHeight - ORB_SIZE));
      posRef.current = { x, y };
      el.style.left = `${x}px`;
      el.style.top = `${y}px`;
    };

    const onMouseUp = () => {
      if (!dragState.current.isDragging) return;
      const wasDrag = dragState.current.hasMoved;
      dragState.current.isDragging = false;
      document.body.style.userSelect = "";

      if (wasDrag) {
        const snapped = snapToCorner(posRef.current.x, posRef.current.y);
        posRef.current = snapped;
        el.style.transition = "left 0.35s cubic-bezier(0.4,0,0.2,1), top 0.35s cubic-bezier(0.4,0,0.2,1)";
        el.style.left = `${snapped.x}px`;
        el.style.top = `${snapped.y}px`;
        onPositionChange?.(snapped);
      }
    };

    el.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);

    return () => {
      el.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [orbRef, isMinimized, snapToCorner, onPositionChange]);

  return { posRef, dragState };
};

// Loader screen
const LoaderScreen = () => (
  <div className="flex-1 flex flex-col items-center justify-center gap-4">
    <img src={aiLogo} alt="EMP AI" className="w-20 h-20 object-contain" />
    <div className="text-center">
      <h2 className="text-lg font-bold text-slate-800 tracking-wide">EMP AI ASSISTANT</h2>
      <p className="text-sm text-slate-500 mt-1">Ready to assist you anytime</p>
    </div>
    <div className="flex gap-1.5 mt-4">
      <span className="w-2 h-2 bg-blue-500 rounded-full emp-ai-loader-dot" />
      <span className="w-2 h-2 bg-blue-500 rounded-full emp-ai-loader-dot" />
      <span className="w-2 h-2 bg-blue-500 rounded-full emp-ai-loader-dot" />
    </div>
  </div>
);

const EmpAiAssistant = ({ open, onClose, context }) => {
  const [phase, setPhase] = useState("loading");
  const [animState, setAnimState] = useState("visible");
  const [isMaximized, setIsMaximized] = useState(false);
  const [activeView, setActiveView] = useState("chat");
  const [searchOpen, setSearchOpen] = useState(false);
  const [chatKey, setChatKey] = useState(0);
  const [chatContext, setChatContext] = useState(null);
  const [webglData, setWebglData] = useState({ texture: null, startRect: null, targetRect: null });

  const modalRef = useRef(null);
  const headerRef = useRef(null);
  const orbRef = useRef(null);
  const orbPosRef = useRef({ x: window.innerWidth - ORB_SIZE - ORB_MARGIN, y: window.innerHeight - ORB_SIZE - ORB_MARGIN });
  const resizeObsRef = useRef(null);
  const mutationObsRef = useRef(null);
  const updateFnRef = useRef(null);
  const { resetPosition } = useDraggable(modalRef, headerRef);

  const isMinimized = animState === "minimized";

  const handleOrbPositionChange = useCallback((pos) => {
    orbPosRef.current = pos;
  }, []);

  const { dragState } = useOrbDrag(orbRef, isMinimized, handleOrbPositionChange);

  const getTargetRect = useCallback(() => {
    const pos = orbPosRef.current;
    return { x: pos.x, y: pos.y, width: ORB_SIZE, height: ORB_SIZE };
  }, []);

  // Handle sidebar "New chat" — reset chat with no context
  const handleNewChat = useCallback(() => {
    setChatContext(null);
    setChatKey((k) => k + 1);
    setActiveView("chat");
    setSearchOpen(false);
  }, []);

  // Handle sidebar view changes
  const handleViewChange = useCallback((view) => {
    if (view === "search") {
      setSearchOpen((prev) => !prev);
      return;
    }
    setSearchOpen(false);
    if (view === "chat") {
      handleNewChat();
    } else {
      setActiveView(view);
    }
  }, [handleNewChat]);

  // Reset on open
  useEffect(() => {
    if (open) {
      setPhase("loading");
      setAnimState("visible");
      setIsMaximized(false);
      setActiveView("chat");
      setSearchOpen(false);
      setChatContext(context || null);
      setChatKey((k) => k + 1);
      setWebglData({ texture: null, startRect: null, targetRect: null });
      resetPosition();
      const t = setTimeout(() => setPhase("ready"), LOADER_DURATION);
      return () => clearTimeout(t);
    }
  }, [open, context, resetPosition]);

  const handleMinimize = useCallback(async () => {
    const el = modalRef.current;
    if (!el) return;

    setAnimState("capturing");
    try {
      const canvas = await html2canvas(el, { backgroundColor: null, scale: window.devicePixelRatio || 2 });
      setWebglData({
        texture: canvas,
        startRect: el.getBoundingClientRect(),
        targetRect: getTargetRect(),
      });
      setAnimState("minimizing_webgl");
    } catch (err) {
      console.error("Genie capture failed", err);
      setAnimState("minimized");
    }
  }, [getTargetRect]);

  const handleRestore = useCallback(() => {
    if (dragState.current.hasMoved) return;
    if (webglData.texture && webglData.startRect) {
      setWebglData((prev) => ({ ...prev, targetRect: getTargetRect() }));
      setAnimState("restoring_webgl");
    } else {
      setAnimState("visible");
    }
  }, [webglData, getTargetRect, dragState]);

  const handleClose = useCallback(async () => {
    const el = modalRef.current;
    if (el) {
      setAnimState("capturing");
      try {
        const canvas = await html2canvas(el, { backgroundColor: null, scale: window.devicePixelRatio || 2 });
        setWebglData({
          texture: canvas,
          startRect: el.getBoundingClientRect(),
          targetRect: getTargetRect(),
        });
        setAnimState("minimizing_webgl");
        setTimeout(() => {
          setAnimState("visible");
          onClose?.();
        }, GENIE_DURATION);
        return;
      } catch (e) {
        // fallback
      }
    }
    setAnimState("visible");
    onClose?.();
  }, [onClose, getTargetRect]);

  const handleWebglComplete = useCallback(() => {
    if (animState === "minimizing_webgl") {
      setAnimState("minimized");
    } else if (animState === "restoring_webgl") {
      setAnimState("visible");
      setWebglData({ texture: null, startRect: null, targetRect: null });
    }
  }, [animState]);

  // Position orb at modal's bottom-right corner when modal is visible
  const modalVisible = animState === "visible" || animState === "capturing";
  useEffect(() => {
    if (!modalVisible || !open) return;

    const updateOrbPosition = () => {
      const modal = modalRef.current;
      const orb = orbRef.current;
      if (!modal || !orb) return;
      const rect = modal.getBoundingClientRect();
      if (rect.width === 0) return;
      const x = rect.right - ORB_SIZE / 2;
      const y = rect.bottom - ORB_SIZE / 2;
      orb.style.left = `${x}px`;
      orb.style.top = `${y}px`;
      orb.style.right = "auto";
      orb.style.bottom = "auto";
      orb.style.transition = "none";
      orbPosRef.current = { x, y };
    };

    const rafId = requestAnimationFrame(() => {
      updateOrbPosition();

      const modal = modalRef.current;
      if (!modal) return;

      resizeObsRef.current = new ResizeObserver(updateOrbPosition);
      resizeObsRef.current.observe(modal);

      mutationObsRef.current = new MutationObserver(updateOrbPosition);
      mutationObsRef.current.observe(modal, { attributes: true, attributeFilter: ["style", "class"] });

      window.addEventListener("resize", updateOrbPosition);
      updateFnRef.current = updateOrbPosition;
    });

    return () => {
      cancelAnimationFrame(rafId);
      resizeObsRef.current?.disconnect();
      mutationObsRef.current?.disconnect();
      if (updateFnRef.current) window.removeEventListener("resize", updateFnRef.current);
    };
  }, [modalVisible, open, isMaximized]);

  if (!open) return null;

  const isDomModalHidden = animState === "minimizing_webgl" || animState === "restoring_webgl" || animState === "minimized";
  const backdropClass =
    (animState === "minimizing_webgl" || animState === "minimized") ? "opacity-0" :
    (animState === "restoring_webgl" || animState === "visible") ? "opacity-100 transition-opacity duration-300" : "opacity-100";

  // Determine which content view to render
  const renderContent = () => {
    switch (activeView) {
      case "projects":
        return <ProjectsView onNewChat={handleNewChat} />;
      case "chats":
        return <ChatsView onNewChat={handleNewChat} />;
      case "chat":
      default:
        return <ChatUI key={chatKey} context={chatContext} />;
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-9998 bg-black/20 backdrop-blur-[2px] transition-opacity duration-300 ${backdropClass}`}
        style={{ pointerEvents: isMinimized ? "none" : "auto" }}
      />

      {/* WebGL Overlay */}
      {(animState === "minimizing_webgl" || animState === "restoring_webgl") && webglData.texture && (
        <GenieEffect
          textureSource={webglData.texture}
          startRect={webglData.startRect}
          targetRect={webglData.targetRect}
          duration={GENIE_DURATION}
          reverse={animState === "restoring_webgl"}
          onComplete={handleWebglComplete}
        />
      )}

      {/* Modal */}
      <div
        ref={modalRef}
        className={`fixed z-9999 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 emp-ai-modal shadow-2xl flex overflow-hidden transition-all duration-300 ease-in-out ${
          isMaximized ? "w-screen h-screen rounded-none" : "w-[min(1100px,94vw)] h-[min(720px,88vh)] rounded-2xl"
        } ${isDomModalHidden ? "opacity-0 pointer-events-none" : "opacity-100"}`}
      >
        {phase === "loading" ? (
          <LoaderScreen />
        ) : (
          <>
            {/* Sidebar — full height */}
            <AiSidebar activeView={searchOpen ? "search" : activeView} onViewChange={handleViewChange} />

            {/* Main content area */}
            <div className="flex-1 flex flex-col min-w-0 relative bg-white">
              {/* Draggable header zone + window buttons */}
              <div
                ref={headerRef}
                className="absolute top-0 right-0 left-0 z-20 flex items-center justify-end gap-1.5 px-4 py-3 cursor-move select-none pointer-events-none bg-white/90 backdrop-blur-sm"
              >
                <button onClick={handleMinimize} className="pointer-events-auto w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
                  <Minus size={16} />
                </button>
                <button onClick={() => setIsMaximized((v) => !v)} className="pointer-events-auto w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
                  {isMaximized ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                </button>
                <button onClick={handleClose} className="pointer-events-auto w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors">
                  <X size={16} />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 flex flex-col min-h-0 relative">
                {renderContent()}
                {searchOpen && (
                  <SearchPanel
                    onClose={() => setSearchOpen(false)}
                    onNewChat={handleNewChat}
                  />
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Orb */}
      <div
        ref={orbRef}
        onClick={isMinimized ? handleRestore : handleMinimize}
        className={`fixed z-10001 flex items-center justify-center rounded-full bg-white shadow-lg border-2 border-blue-400 cursor-pointer hover:shadow-xl transition-shadow ${
          isMinimized ? "emp-ai-floating-orb" : ""
        } ${(isDomModalHidden && !isMinimized) || isMaximized ? "opacity-0 pointer-events-none" : ""}`}
        style={{ width: ORB_SIZE, height: ORB_SIZE }}
      >
        {isMinimized && (
          <span className="absolute inset-0 rounded-full border-2 border-blue-400 emp-ai-pulse-ring" />
        )}
        <img src={aiLogo} alt="EMP AI" className="w-10 h-10 object-contain pointer-events-none" />
      </div>
    </>
  );
};

export default EmpAiAssistant;
