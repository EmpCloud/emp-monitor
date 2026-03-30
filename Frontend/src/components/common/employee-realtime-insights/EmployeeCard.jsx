import React, { useCallback } from "react"
import { BarChart3, Download, MapPin } from "lucide-react"

const avatarColors = [
    "bg-blue-500",
    "bg-cyan-500",
    "bg-sky-500",
    "bg-amber-500",
    "bg-rose-500",
    "bg-emerald-500",
]

const getSubstring = (str, charCount = 20) => {
    if (typeof str !== "string") return str || ""
    return str.length > charCount ? str.substring(0, charCount) + "..." : str
}

const getHostname = (url) => {
    try { return new URL(url).hostname }
    catch { return "" }
}

const statusColorMap = {
    online: "bg-green-500",
    idle: "bg-yellow-500",
    offline: "bg-red-500",
}

function EmployeeCard({ emp, isSelected, onSelect, onAnalytics, onDownload, idx }) {
    const activity = emp.activity

    const handleClick = useCallback(() => onSelect(emp.id), [onSelect, emp.id])
    const stopPropagation = useCallback((e) => e.stopPropagation(), [])

    const initials = emp.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()

    return (
        <div
            onClick={handleClick}
            className={`relative rounded-2xl border p-4 cursor-pointer transition-all ${isSelected
                ? "border-blue-400 shadow-md shadow-blue-100 bg-white"
                : "border-slate-100 bg-white hover:border-slate-200 hover:shadow-sm"
                }`}
        >
            {/* Status indicator */}
            <div className="absolute top-3 right-3">
                <span className={`w-2.5 h-2.5 rounded-full inline-block ${statusColorMap[emp.status] || statusColorMap.offline}`} />
            </div>

            {/* Avatar + Name */}
            <div className="flex items-center gap-3 mb-3">
                <div
                    className={`w-11 h-11 rounded-full ${avatarColors[idx % avatarColors.length]} flex items-center justify-center text-sm font-bold text-white shrink-0`}
                >
                    {initials}
                </div>
                <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-slate-800 truncate">
                        {emp.name}
                    </h3>
                    <p className="text-[10px] text-slate-400 truncate leading-tight">
                        {emp.description}
                    </p>
                </div>
            </div>

            {/* Productivity */}
            <div className="flex items-center justify-between mb-2">
                <div>
                    <span className="text-[11px] text-slate-500">
                        Productivity :{" "}
                    </span>
                    <span className="text-[11px] font-bold text-slate-800">
                        {emp.productivity}
                    </span>
                </div>
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                    <BarChart3 className="w-4 h-4 text-blue-500" />
                </div>
            </div>

            {/* Timesheet Hours */}
            <div className="flex flex-wrap gap-x-3 gap-y-0.5 mb-2">
                <p className="text-[10px] text-slate-500">
                    <span className="font-semibold">Office:</span>{" "}
                    <span className="text-slate-700">{emp.officeHours}</span>
                </p>
                <p className="text-[10px] text-slate-500">
                    <span className="font-semibold">Active:</span>{" "}
                    <span className="text-slate-700">{emp.activeHours}</span>
                </p>
                <p className="text-[10px] text-slate-500">
                    <span className="font-semibold">Idle:</span>{" "}
                    <span className="text-slate-700">{emp.idleHours}</span>
                </p>
            </div>

            {/* Email */}
            <div className="mb-2">
                <span className="text-[11px] text-slate-500">Email : </span>
                <span className="text-[11px] text-slate-600">
                    {emp.email}
                </span>
            </div>

            {/* Real-time Activity Details */}
            {activity && (
                <div className="mb-3 space-y-0.5">
                    {activity.title && (
                        <p className="text-[11px] text-slate-600">
                            <span className="font-semibold text-slate-500">Title: </span>
                            {getSubstring(activity.title)}
                        </p>
                    )}
                    {activity.appName && (
                        <p className="text-[11px] text-slate-600">
                            <span className="font-semibold text-slate-500">App: </span>
                            {getSubstring(activity.appName)}
                        </p>
                    )}
                    {activity.currentUrl && (
                        <p className="text-[11px] text-slate-600">
                            <span className="font-semibold text-slate-500">URL: </span>
                            <a
                                href={activity.currentUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-500 hover:underline"
                                onClick={stopPropagation}
                            >
                                {getSubstring(getHostname(activity.currentUrl), 19)}
                            </a>
                        </p>
                    )}
                </div>
            )}

            {/* Footer icons */}
            <div className="flex items-center gap-2 border-t border-slate-100 pt-2.5">
                <button onClick={(e) => { e.stopPropagation(); onDownload?.(emp); }} title="Download" className="w-6 h-6 rounded-md bg-emerald-100 hover:bg-emerald-200 flex items-center justify-center transition-colors">
                    <Download className="w-3 h-3 text-emerald-600" />
                </button>
                <button onClick={(e) => { e.stopPropagation(); onAnalytics?.(emp); }} title="Analytics" className="w-6 h-6 rounded-md bg-blue-100 hover:bg-blue-200 flex items-center justify-center transition-colors">
                    <BarChart3 className="w-3 h-3 text-blue-500" />
                </button>
                {activity?.latitude && activity?.longitude && (
                    <a
                        href={`https://www.google.com/maps/search/?api=1&query=${activity.latitude},${activity.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={stopPropagation}
                        className="w-6 h-6 rounded-md bg-purple-100 hover:bg-purple-200 flex items-center justify-center transition-colors"
                    >
                        <MapPin className="w-3 h-3 text-purple-500" />
                    </a>
                )}
            </div>
        </div>
    )
}

export default React.memo(EmployeeCard)
