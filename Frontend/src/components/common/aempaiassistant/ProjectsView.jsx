import React from "react";
import { Pencil, Search, Plus, Mic, AudioLines } from "lucide-react";

const sampleProjects = [
  { id: 1, title: "EMP", description: "Creating react components with responsive and as similar as figma", updated: "Updated 13 days ago" },
  { id: 2, title: "EMP", description: "Creating react components with responsive and as similar as figma", updated: "Updated 13 days ago" },
  { id: 3, title: "EMP", description: "Creating react components with responsive and as similar as figma", updated: "Updated 13 days ago" },
  { id: 4, title: "EMP", description: "Creating react components with responsive and as similar as figma", updated: "Updated 13 days ago" },
  { id: 5, title: "EMP", description: "Creating react components with responsive and as similar as figma", updated: "Updated 13 days ago" },
  { id: 6, title: "EMP", description: "Creating react components with responsive and as similar as figma", updated: "Updated 13 days ago" },
];

const ProjectsView = ({ onNewChat }) => (
  <div className="flex-1 flex flex-col min-w-0 relative">
    {/* Header */}
    <div className="flex items-center justify-between px-6 pt-14 pb-4">
      <h2 className="text-2xl font-bold text-slate-800">Projects</h2>
      <button
        onClick={onNewChat}
        className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors"
      >
        <Pencil size={14} />
        New Chat
      </button>
    </div>

    {/* Search bar */}
    <div className="px-6 pb-4">
      <div className="flex items-center gap-2 bg-slate-100 rounded-lg px-3 py-2.5">
        <Search size={16} className="text-slate-400 shrink-0" />
        <input
          type="text"
          placeholder="Search your chats..."
          className="flex-1 bg-transparent text-sm outline-none text-slate-700 placeholder:text-slate-400 min-w-0"
        />
      </div>
    </div>

    {/* Project cards grid */}
    <div className="flex-1 overflow-y-auto custom-scrollbar px-6 pb-24">
      <div className="grid grid-cols-3 gap-4">
        {sampleProjects.map((project) => (
          <div
            key={project.id}
            className="border border-slate-200 rounded-xl p-4 hover:border-slate-300 hover:shadow-sm transition-all cursor-pointer"
          >
            <h3 className="text-sm font-semibold text-slate-800 mb-1">{project.title}</h3>
            <p className="text-xs text-slate-500 leading-relaxed mb-3">{project.description}</p>
            <p className="text-[11px] text-slate-400">{project.updated}</p>
          </div>
        ))}
      </div>
    </div>

    {/* Floating input area */}
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-[min(680px,85%)]">
      <div className="flex items-center gap-2 bg-slate-800 rounded-full px-4 py-3 shadow-lg">
        <button className="text-slate-400 hover:text-white shrink-0 transition-colors"><Plus size={20} /></button>
        <input
          type="text"
          placeholder="Ask anything"
          className="flex-1 bg-transparent text-sm outline-none text-white placeholder:text-slate-400 min-w-0"
          readOnly
        />
        <button className="text-slate-400 hover:text-white shrink-0 transition-colors"><Mic size={18} /></button>
        <button className="bg-blue-500 hover:bg-blue-600 text-white rounded-full p-1.5 shrink-0 transition-colors">
          <AudioLines size={16} />
        </button>
      </div>
    </div>
  </div>
);

export default ProjectsView;
