import React, { useState, useRef, useEffect, useCallback } from "react";
import { Plus, Mic, AudioLines, Send } from "lucide-react";
import ChatMessage from "./ChatMessage";
import TypingIndicator from "./TypingIndicator";

// Simulated AI responses based on context keywords
const generateAiResponse = (userMessage) => {
  const msg = userMessage.toLowerCase();

  if (msg.includes("productive employee")) {
    return `Here's an analysis of the Top 10 Productive Employees:

📊 Key Insights:
• The top performer logged 9.2 productive hours on average today
• Productivity scores range from 85% to 97% across the top 10
• 7 out of 10 employees exceeded their weekly targets
• Most productive hours are between 10 AM – 1 PM

💡 Recommendations:
• Recognize top performers with weekly shoutouts
• Analyze their workflows to create best-practice guides
• Consider adjusting break schedules to optimize peak hours

Would you like me to drill deeper into any specific employee's metrics?`;
  }

  if (msg.includes("non productive") || msg.includes("unproductive")) {
    return `Here's an analysis of the Top 10 Non-Productive Employees:

⚠️ Key Findings:
• Average idle time: 3.5 hours per day
• Top non-productive activities: Social media (34%), Entertainment (28%), Shopping (18%)
• 6 employees show a declining productivity trend over the past week
• Peak non-productive hours: 2 PM – 4 PM

💡 Suggestions:
• Schedule 1-on-1 check-ins with consistently low performers
• Review workload distribution — some may be under-assigned
• Consider implementing focus-time blocks during peak idle hours

Want me to compare these patterns with department averages?`;
  }

  if (msg.includes("active employee")) {
    return `Here's the Top 10 Active Employees summary:

✅ Activity Overview:
• All 10 employees have been online for 7+ hours today
• Average active time: 8.1 hours
• Keyboard & mouse activity levels are consistently above 75%
• Most active department: Engineering (4 of top 10)

📈 Trends:
• Activity levels are 12% higher compared to last week
• Monday shows the highest activity across the board

Need more details on any specific employee?`;
  }

  if (msg.includes("non active") || msg.includes("inactive")) {
    return `Here's the Top 10 Non-Active Employees report:

🔴 Inactivity Summary:
• Average online time: Less than 3 hours today
• 4 employees haven't logged in yet
• 3 employees show frequent disconnections
• Departments affected: Sales (3), Support (4), Marketing (3)

⚠️ Possible Reasons:
• Scheduled leaves or half-days not updated in HRIS
• Network/VPN connectivity issues for remote workers
• Some may be in extended meetings without screen activity

Shall I cross-reference with leave records or meeting calendars?`;
  }

  if (msg.includes("location performance")) {
    return `Here's the Location Performance breakdown:

📍 Performance by Location:
• Headquarters (NYC): 92% avg productivity — highest performer
• Remote (Global): 87% avg productivity — steady growth
• Branch (Chicago): 78% avg productivity — slight decline
• Branch (Austin): 85% avg productivity — improving trend

📊 Key Observations:
• NYC office benefits from in-person collaboration
• Remote workers show best engagement scores
• Chicago branch needs attention — idle time up 15%

Would you like location-specific recommendations?`;
  }

  if (msg.includes("department performance")) {
    return `Here's the Department Performance analysis:

🏢 Department Rankings:
1. Engineering — 94% productivity, +3% from last week
2. Design — 91% productivity, stable
3. Marketing — 84% productivity, -2% decline
4. Sales — 82% productivity, +5% improvement
5. Support — 79% productivity, stable

🔍 Insights:
• Engineering leads with highest focused hours
• Sales showing strongest improvement trend
• Marketing's decline correlates with campaign deadline completion

Want me to break down any specific department?`;
  }

  if (msg.includes("website usage") || msg.includes("web usage")) {
    return `Here's the Top 10 Website Usage report:

🌐 Most Visited Websites:
1. GitHub — 4.2 hrs (Productive)
2. Google Docs — 3.8 hrs (Productive)
3. Slack — 2.5 hrs (Productive)
4. YouTube — 1.8 hrs (Mixed)
5. Stack Overflow — 1.5 hrs (Productive)

⚠️ Non-Productive Web Usage:
• Social media sites account for 12% of web time
• Entertainment sites peaked during 2–3 PM
• Shopping sites usage increased 8% this week

Need a detailed breakdown by department or employee?`;
  }

  if (msg.includes("application usage") || msg.includes("app usage")) {
    return `Here's the Top 10 Application Usage report:

💻 Most Used Applications:
1. VS Code — 5.1 hrs (Productive)
2. Chrome — 4.8 hrs (Mixed)
3. Slack — 2.3 hrs (Productive)
4. Figma — 2.1 hrs (Productive)
5. Microsoft Teams — 1.9 hrs (Productive)

📊 Highlights:
• Development tools dominate productive app time
• Communication apps average 4.2 hrs combined
• Unproductive app usage is under 8% — good benchmark

Shall I compare this with last week's data?`;
  }

  return `I'd be happy to help you with that! Here's what I can assist you with:

• Employee productivity & activity analysis
• Location and department performance metrics
• Website and application usage insights
• Trend comparisons and recommendations

Could you provide more details about what specific data or insights you're looking for?`;
};

const ChatUI = ({ context }) => {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const initialSentRef = useRef(false);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, scrollToBottom]);

  // Send initial context-based message when component mounts
  useEffect(() => {
    if (context && !initialSentRef.current) {
      initialSentRef.current = true;
      const prompt = `Give me the details of ${context}`;
      setMessages([{ id: Date.now(), role: "user", content: prompt }]);
      setIsTyping(true);

      const timer = setTimeout(() => {
        const response = generateAiResponse(prompt);
        setMessages((prev) => [
          ...prev,
          { id: Date.now(), role: "assistant", content: response },
        ]);
        setIsTyping(false);
      }, 1500);

      return () => clearTimeout(timer);
    }
  }, [context]);

  // Edit a user message: update it, remove all messages after it, and re-generate AI response
  const handleEditMessage = useCallback((msgId, newContent) => {
    if (isTyping) return;

    setMessages((prev) => {
      const idx = prev.findIndex((m) => m.id === msgId);
      if (idx === -1) return prev;
      const updated = prev.slice(0, idx);
      updated.push({ ...prev[idx], content: newContent });
      return updated;
    });

    setIsTyping(true);
    setTimeout(() => {
      const response = generateAiResponse(newContent);
      setMessages((prev) => [
        ...prev,
        { id: Date.now(), role: "assistant", content: response },
      ]);
      setIsTyping(false);
    }, 1500);
  }, [isTyping]);

  const handleSend = useCallback(() => {
    const text = inputValue.trim();
    if (!text || isTyping) return;

    setMessages((prev) => [...prev, { id: Date.now(), role: "user", content: text }]);
    setInputValue("");
    setIsTyping(true);

    setTimeout(() => {
      const response = generateAiResponse(text);
      setMessages((prev) => [
        ...prev,
        { id: Date.now(), role: "assistant", content: response },
      ]);
      setIsTyping(false);
    }, 1500);
  }, [inputValue, isTyping]);

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  const isEmpty = messages.length === 0;

  return (
    <div className="flex-1 flex flex-col min-w-0 relative">
      {/* Chat messages area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-4 pt-14 pb-20 space-y-4">
        {isEmpty ? (
          <div className="flex-1 flex flex-col items-center justify-center h-full text-center px-6">
            <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center mb-4">
              <AudioLines size={22} className="text-blue-500" />
            </div>
            <h3 className="text-lg font-semibold text-slate-800 mb-1">How can I help you today?</h3>
            <p className="text-sm text-slate-400 max-w-md">
              Ask me anything about employee activity, productivity metrics, department performance, or any workforce insights.
            </p>
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <ChatMessage key={msg.id} message={msg} onEdit={handleEditMessage} />
            ))}
            {isTyping && <TypingIndicator />}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Floating input area */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-[min(680px,85%)]">
        <div className="flex items-center gap-2 bg-slate-800 rounded-full px-4 py-3 shadow-lg">
          <button className="text-slate-400 hover:text-white shrink-0 transition-colors">
            <Plus size={20} />
          </button>
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything"
            className="flex-1 bg-transparent text-sm outline-none text-white placeholder:text-slate-400 min-w-0"
          />
          {inputValue.trim() ? (
            <button
              onClick={handleSend}
              className="bg-blue-500 hover:bg-blue-600 text-white rounded-full p-1.5 shrink-0 transition-colors"
            >
              <Send size={16} />
            </button>
          ) : (
            <>
              <button className="text-slate-400 hover:text-white shrink-0 transition-colors">
                <Mic size={18} />
              </button>
              <button className="bg-blue-500 hover:bg-blue-600 text-white rounded-full p-1.5 shrink-0 transition-colors">
                <AudioLines size={16} />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatUI;
