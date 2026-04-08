import React, { useState, useEffect, useMemo, useCallback } from "react"
import { useTranslation } from "react-i18next"

import Headers from "@/components/common/employee-realtime-insights/Headers"
import SearchSection from "@/components/common/employee-realtime-insights/SearchSection"
import ProductivitySlider from "@/components/common/employee-realtime-insights/ProductivitySlider"
import EmployeeCard from "@/components/common/employee-realtime-insights/EmployeeCard"

import { useRealtimeInsightsStore } from "./realtimeInsightsStore"

const EmpRealtimeInsights = () => {
  const { t } = useTranslation()
  const employees = useRealtimeInsightsStore((s) => s.employees)
  const loading = useRealtimeInsightsStore((s) => s.loading)
  const error = useRealtimeInsightsStore((s) => s.error)
  const isConnected = useRealtimeInsightsStore((s) => s.isConnected)
  const loadEmployees = useRealtimeInsightsStore((s) => s.loadEmployees)
  const connectSocket = useRealtimeInsightsStore((s) => s.connectSocket)
  const cleanup = useRealtimeInsightsStore((s) => s.cleanup)
  const resetInactiveTime = useRealtimeInsightsStore((s) => s.resetInactiveTime)

  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [minProductivity, setMinProductivity] = useState(0)
  const [maxProductivity, setMaxProductivity] = useState(100)
  const [selectedId, setSelectedId] = useState(null)

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(timer)
  }, [search])

  // Load employees, then connect WebSocket
  useEffect(() => {
    loadEmployees().then(() => connectSocket())
    return () => cleanup()
  }, [])

  // Track tab visibility to reset inactivity / reconnect
  useEffect(() => {
    const handleVisibility = () => {
      if (!document.hidden) resetInactiveTime()
    }
    document.addEventListener("visibilitychange", handleVisibility)
    return () => document.removeEventListener("visibilitychange", handleVisibility)
  }, [resetInactiveTime])

  // Sorted + filtered employees
  const filteredEmployees = useMemo(() => {
    const query = debouncedSearch.toLowerCase()

    const filtered = employees.filter((emp) => {
      if (query) {
        const matchesSearch =
          emp.name.toLowerCase().includes(query) ||
          emp.email.toLowerCase().includes(query) ||
          emp.firstName.toLowerCase().includes(query) ||
          emp.lastName.toLowerCase().includes(query)
        if (!matchesSearch) return false
      }
      return emp.productivityValue >= minProductivity &&
        emp.productivityValue <= maxProductivity
    })

    return filtered.sort((a, b) => {
      const aOnline = a.status === "online" ? 1 : 0
      const bOnline = b.status === "online" ? 1 : 0
      if (aOnline !== bOnline) return bOnline - aOnline
      return b.productivityValue - a.productivityValue
    })
  }, [employees, debouncedSearch, minProductivity, maxProductivity])

  const handleSelect = useCallback((id) => setSelectedId(id), [])

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-slate-50">
        <div className="w-20 h-20 flex items-center justify-center">
          <video
            src="/src/assets/ai.webm"
            autoPlay
            loop
            playsInline
            muted
            className="w-full h-full object-contain"
          />
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 w-full">
      <Headers isConnected={isConnected} />

      {error && (
        <div className="mb-4 px-4 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="flex flex-wrap items-end justify-between gap-6 mb-8">
        <SearchSection search={search} setSearch={setSearch} />
        <ProductivitySlider
          minValue={minProductivity}
          maxValue={maxProductivity}
          onMinChange={setMinProductivity}
          onMaxChange={setMaxProductivity}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredEmployees.map((emp, idx) => (
          <EmployeeCard
            key={emp.id}
            emp={emp}
            idx={idx}
            isSelected={selectedId === emp.id}
            onSelect={handleSelect}
          />
        ))}
      </div>

      {!filteredEmployees.length && !loading && (
        <div className="text-center text-slate-400 py-12 text-sm">
          {t("noEmployeesFound")}
        </div>
      )}
    </div>
  )
}

export default EmpRealtimeInsights
