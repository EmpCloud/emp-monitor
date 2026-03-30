import React from "react";
import aiLogo from "@/assets/ailogo.png";

const TypingIndicator = () => (
  <div className="flex gap-3 items-start">
    <img src={aiLogo} alt="AI" className="w-7 h-7 shrink-0 mt-1" />
    <div className="flex items-center gap-1.5 px-4 py-3 bg-slate-50 rounded-2xl rounded-tl-sm">
      <span className="w-2 h-2 bg-slate-400 rounded-full emp-ai-loader-dot" />
      <span className="w-2 h-2 bg-slate-400 rounded-full emp-ai-loader-dot" />
      <span className="w-2 h-2 bg-slate-400 rounded-full emp-ai-loader-dot" />
    </div>
  </div>
);

export default TypingIndicator;
