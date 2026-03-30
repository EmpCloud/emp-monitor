import React, { useState, useRef, useEffect } from "react";
import { Copy, Pencil, Check, X, FileText, User, Send } from "lucide-react";
import aiLogo from "@/assets/ailogo.png";

const ChatMessage = ({ message, onEdit }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(message.content);
  const textareaRef = useRef(null);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      const ta = textareaRef.current;
      ta.focus();
      ta.style.height = "auto";
      ta.style.height = `${ta.scrollHeight}px`;
    }
  }, [isEditing]);

  const handleSave = () => {
    const trimmed = editText.trim();
    if (trimmed && trimmed !== message.content) {
      onEdit?.(message.id, trimmed);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditText(message.content);
    setIsEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    }
    if (e.key === "Escape") {
      handleCancel();
    }
  };

  if (message.role === "user") {
    return (
      <div className="flex justify-end gap-3">
        <div className="flex flex-col items-end min-w-0 max-w-[80%]">
          {isEditing ? (
            <div className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3">
              <textarea
                ref={textareaRef}
                value={editText}
                onChange={(e) => {
                  setEditText(e.target.value);
                  e.target.style.height = "auto";
                  e.target.style.height = `${e.target.scrollHeight}px`;
                }}
                onKeyDown={handleKeyDown}
                className="w-full bg-transparent text-sm text-slate-800 outline-none resize-none min-w-[200px]"
                rows={1}
              />
              <div className="flex items-center justify-end gap-2 mt-2">
                <button
                  onClick={handleCancel}
                  className="px-3 py-1 text-xs text-slate-500 hover:text-slate-700 rounded-md hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="px-3 py-1 text-xs bg-blue-500 hover:bg-blue-600 text-white rounded-md flex items-center gap-1 transition-colors"
                >
                  <Send size={11} />
                  Send
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="bg-slate-100 text-slate-800 rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm">
                <p>{message.content}</p>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400 mt-1.5 mr-1">
                <button
                  onClick={() => navigator.clipboard.writeText(message.content)}
                  className="hover:text-slate-600 transition-colors"
                  title="Copy"
                >
                  <Copy size={13} />
                </button>
                <button
                  onClick={() => setIsEditing(true)}
                  className="hover:text-slate-600 transition-colors"
                  title="Edit"
                >
                  <Pencil size={13} />
                </button>
              </div>
            </>
          )}
        </div>
        <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center shrink-0 mt-0.5">
          <User size={16} className="text-white" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3 items-start">
      <img src={aiLogo} alt="AI" className="w-7 h-7 shrink-0 mt-1" />
      <div className="space-y-3 text-sm text-slate-700 min-w-0 flex-1">
        <div className="whitespace-pre-wrap leading-relaxed">{message.content}</div>
        <div className="flex items-center gap-2 text-xs text-slate-400 pt-1">
          <button
            onClick={() => navigator.clipboard.writeText(message.content)}
            className="hover:text-slate-600 flex items-center gap-1"
          >
            <Copy size={13} />
            <span>Copy</span>
          </button>
          <button className="hover:text-slate-600 flex items-center gap-1 ml-2">
            <FileText size={13} />
            <span>Export</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;
