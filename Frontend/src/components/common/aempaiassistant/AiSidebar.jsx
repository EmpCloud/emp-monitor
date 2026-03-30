import React, { useState } from "react";
import { PanelLeftClose, PanelLeftOpen, Pencil, Search, MessageSquare, FolderKanban, Settings } from "lucide-react";
import aiLogo from "@/assets/ailogo.png";

const navItems = [
  { icon: Pencil, label: "New chat", view: "chat" },
  { icon: Search, label: "Search", view: "search" },
  { icon: MessageSquare, label: "Chats", view: "chats" },
  { icon: FolderKanban, label: "Projects", view: "projects" },
];

const AiSidebar = ({ activeView = "chat", onViewChange }) => {
  const [collapsed, setCollapsed] = useState(true);

  return (
    <div
      className={`shrink-0 border-r border-slate-100 bg-white flex flex-col transition-all duration-300 ease-in-out ${
        collapsed ? "w-16" : "w-52"
      }`}
    >
      {/* Logo */}
      <div className={`shrink-0 ${collapsed ? "py-4 px-0" : "px-3 py-4"}`}>
        {collapsed ? (
          <div className="flex flex-col items-center gap-1">
            <img src={aiLogo} alt="EMP AI" className="w-8 h-8 object-contain" />
            <button
              onClick={() => setCollapsed(false)}
              className="w-7 h-7 flex items-center justify-center rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
              title="Expand sidebar"
            >
              <PanelLeftOpen size={15} />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <img src={aiLogo} alt="EMP AI" className="w-8 h-8 object-contain shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-slate-800 truncate leading-tight">EMP AI ASSISTANT</p>
              <p className="text-[10px] text-slate-400 truncate leading-tight">Ready to assist you anytime</p>
            </div>
            <button
              onClick={() => setCollapsed(true)}
              className="shrink-0 w-6 h-6 flex items-center justify-center rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
              title="Collapse sidebar"
            >
              <PanelLeftClose size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Nav items */}
      <nav className="flex-1 flex flex-col gap-1 px-2 py-2 overflow-y-auto custom-scrollbar">
        {navItems.map(({ icon: Icon, label, view }) => {
          const isActive = activeView === view;
          return (
            <button
              key={label}
              onClick={() => onViewChange?.(view)}
              className={`flex items-center gap-3 rounded-lg transition-colors ${
                isActive
                  ? "text-blue-600 bg-blue-50"
                  : "text-slate-500 hover:text-blue-600 hover:bg-blue-50"
              } ${collapsed ? "justify-center px-2 py-3" : "px-3 py-2.5"}`}
              title={collapsed ? label : undefined}
            >
              <Icon size={20} className="shrink-0" />
              {!collapsed && <span className="text-sm font-medium truncate">{label}</span>}
            </button>
          );
        })}
      </nav>

      {/* Footer — settings */}
      <div className="px-2 py-3 shrink-0">
        <button
          className={`flex items-center gap-3 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors w-full ${
            collapsed ? "justify-center px-2 py-2" : "px-3 py-2"
          }`}
          title={collapsed ? "Settings" : undefined}
        >
          <Settings size={20} className="shrink-0" />
          {!collapsed && <span className="text-sm font-medium">Settings</span>}
        </button>
      </div>
    </div>
  );
};

export default AiSidebar;
