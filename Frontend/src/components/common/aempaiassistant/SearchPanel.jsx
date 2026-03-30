import React from "react";
import { X, Pencil, MessageSquare } from "lucide-react";

const sampleChats = [
  { id: 1, title: "Quantum Ethics Review", description: "An editorial deep-dive into the societal implications of quantum computing democratization and decentralized AI governance models." },
  { id: 2, title: "Quantum Ethics Review", description: "An editorial deep-dive into the societal implications of quantum computing democratization and decentralized AI governance models." },
  { id: 3, title: "Quantum Ethics Review", description: "An editorial deep-dive into the societal implications of quantum computing democratization and decentralized AI governance models." },
];

const SearchPanel = ({ onClose, onNewChat }) => (
  <div className="absolute inset-0 z-30 bg-black/10 backdrop-blur-[1px]" onClick={onClose}>
    <div
      className="absolute top-4 left-4 bottom-20 w-[min(560px,70%)] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Search input */}
      <div className="flex items-center gap-3 px-5 pt-5 pb-3">
        <input
          type="text"
          placeholder="Search chats...."
          className="flex-1 bg-transparent text-base outline-none text-slate-700 placeholder:text-slate-400 min-w-0"
          autoFocus
        />
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600 shrink-0 transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      <div className="border-b border-slate-100 mx-5" />

      {/* New chat button */}
      <div className="px-5 py-3">
        <button
          onClick={onNewChat}
          className="flex items-center gap-3 w-full px-3 py-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors"
        >
          <Pencil size={16} className="text-slate-500 shrink-0" />
          <span className="text-sm font-medium text-slate-700">New chat</span>
        </button>
      </div>

      {/* Chat list */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-5 pb-4">
        <p className="text-sm font-medium text-slate-500 px-1 pb-3">Today</p>
        <div className="space-y-1">
          {sampleChats.map((chat) => (
            <button
              key={chat.id}
              className="flex items-start gap-3 w-full px-3 py-3 rounded-xl hover:bg-slate-50 transition-colors text-left"
            >
              <MessageSquare size={18} className="text-slate-400 shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-slate-800">{chat.title}</p>
                <p className="text-xs text-slate-400 leading-relaxed line-clamp-3 mt-1">{chat.description}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  </div>
);

export default SearchPanel;
