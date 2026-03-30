import React from "react";
import { Activity } from "lucide-react";

function Headers({ isConnected }) {
    return (
        <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
            <div className="border-l-4 border-blue-600 pl-4">
                <div className="flex items-center gap-2">
                    <h2 className="text-gray-800" style={{ fontSize: "21px", lineHeight: "18px" }}>
                        <span className="font-semibold">Employee&apos;s</span>{" "}
                        <span className="font-normal text-gray-500">Real Time Insights</span>
                    </h2>
                    <span
                        className={`w-2 h-2 rounded-full mt-1 ${isConnected ? "bg-green-500" : "bg-slate-300"}`}
                        title={isConnected ? "Live" : "Disconnected"}
                    />
                </div>
                <p className="text-xs text-gray-400 mt-1 max-w-sm leading-tight">
                    &quot;A realtime analysis of employee. Every second counts in tracking&quot;
                </p>
            </div>
            <div className="shrink-0 hidden sm:block">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
                    <Activity className="w-10 h-10 text-blue-500" />
                </div>
            </div>
        </div>
    );
}

export default React.memo(Headers);
