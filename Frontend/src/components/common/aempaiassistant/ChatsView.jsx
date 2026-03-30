import React from "react";
import { Pencil, Search, Plus, Mic, AudioLines } from "lucide-react";

const sampleChatHistory = [
  { id: 1, title: "Ai assistant of employee analytics dashboard", lastMessage: "Last message 3 minutes ago" },
  { id: 2, title: "Ai assistant of employee analytics dashboard", lastMessage: "Last message 3 minutes ago" },
  { id: 3, title: "Ai assistant of employee analytics dashboard", lastMessage: "Last message 3 minutes ago" },
];

const ChatsView = ({ onNewChat }) => (
  <div className="flex-1 flex flex-col min-w-0 relative">
    {/* Header */}
    <div className="flex items-center justify-between px-6 pt-14 pb-4">
      <h2 className="text-2xl font-bold text-slate-800">Chats</h2>
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

    {/* Chat list */}
    <div className="flex-1 overflow-y-auto custom-scrollbar px-6 pb-24">
      <p className="text-sm text-slate-500 mb-4">Your chats with EMP Ai Assistant</p>
      <div className="space-y-0">
        {sampleChatHistory.map((chat) => (
          <div
            key={chat.id}
            className="py-4 border-b border-slate-200 cursor-pointer hover:bg-slate-50 -mx-2 px-2 rounded-lg transition-colors"
          >
            <p className="text-base font-semibold text-slate-800">{chat.title}</p>
            <p className="text-sm text-slate-400 mt-1">{chat.lastMessage}</p>
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

export default ChatsView;
