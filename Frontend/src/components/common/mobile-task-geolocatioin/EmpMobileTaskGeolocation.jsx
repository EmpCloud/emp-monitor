import React, { useEffect, useCallback } from "react";
import { MapPin } from "lucide-react";
import CustomSelect from "@/components/common/elements/CustomSelect";
import DateRangeCalendar from "@/components/common/elements/DateRangeCalendar";
import { Button } from "@/components/ui/button";
import EmpMobileTaskGeolocationLogo from "@/assets/mobile-task/geo-location.svg";
import { useGpsStore } from "@/page/protected/admin/mobile-task-geolocation/gpsStore";

const STATUS_OPTIONS = [
    { value: "all", label: "All" },
    { value: "enabled", label: "Enabled" },
    { value: "disabled", label: "Disabled" },
];

const EmpMobileTaskGeolocation = () => {
    const employees = useGpsStore((s) => s.employees);
    const geoLog = useGpsStore((s) => s.geoLog);
    const taskTime = useGpsStore((s) => s.taskTime);
    const selectedEmployee = useGpsStore((s) => s.selectedEmployee);
    const startDate = useGpsStore((s) => s.startDate);
    const endDate = useGpsStore((s) => s.endDate);
    const statusFilter = useGpsStore((s) => s.statusFilter);
    const loading = useGpsStore((s) => s.loading);
    const mapLoading = useGpsStore((s) => s.mapLoading);
    const error = useGpsStore((s) => s.error);
    const setSelectedEmployee = useGpsStore((s) => s.setSelectedEmployee);
    const setDateRange = useGpsStore((s) => s.setDateRange);
    const setStatusFilter = useGpsStore((s) => s.setStatusFilter);
    const fetchEmployees = useGpsStore((s) => s.fetchEmployees);
    const fetchGpsData = useGpsStore((s) => s.fetchGpsData);

    useEffect(() => { fetchEmployees(); }, []);

    const handleTrack = useCallback(() => { fetchGpsData(); }, [fetchGpsData]);

    const handleDateRangeChange = useCallback((start, end) => {
        if (!start || !end) return;
        setDateRange(start, end);
    }, [setDateRange]);

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-9 w-full">
            {/* Header */}
            <div className="flex flex-wrap items-start justify-between gap-4 mb-7">
                <div className="flex items-center gap-2">
                    <img alt="gps" className="w-20 h-20" src={EmpMobileTaskGeolocationLogo} />
                    <div className="border-l-2 border-blue-500 pl-4">
                        <h2 className="text-gray-800" style={{ fontSize: "21px", lineHeight: "18px" }}><span className="font-semibold">GEO</span>{" "}<span className="font-normal text-gray-500">Location Tracking</span></h2>
                        <p className="text-xs text-gray-400 mt-1">Track employee GPS location and task activity</p>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-7">
                <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">GPS Status</label>
                    <CustomSelect placeholder="All" items={STATUS_OPTIONS} selected={statusFilter} onChange={setStatusFilter} width="full" />
                </div>
                <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Employee</label>
                    <CustomSelect
                        placeholder="Select Employee"
                        items={employees}
                        selected={selectedEmployee}
                        onChange={setSelectedEmployee}
                        width="full"
                    />
                </div>
                <div className="sm:col-span-2 lg:col-span-1 min-w-0">
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Date range</label>
                    <DateRangeCalendar
                        startDate={startDate}
                        endDate={endDate}
                        onChange={handleDateRangeChange}
                        placeholder="Select date range"
                    />
                </div>
                <div className="flex items-end">
                    <Button className="bg-blue-500 hover:bg-blue-600 w-full" onClick={handleTrack} disabled={mapLoading || !selectedEmployee}>
                        <MapPin className="w-4 h-4 mr-1.5" />
                        {mapLoading ? "Loading..." : "Track Location"}
                    </Button>
                </div>
            </div>

            {error && <div className="mb-4 px-4 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{error}</div>}

            {/* Map placeholder */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50 overflow-hidden" style={{ height: 500 }}>
                {geoLog.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400">
                        <MapPin className="w-12 h-12 mb-3 text-slate-300" />
                        <p className="text-sm font-medium">No GPS data available</p>
                        <p className="text-xs mt-1">Select an employee and date range, then track</p>
                    </div>
                ) : (
                    <div className="p-4 h-full overflow-y-auto">
                        <p className="text-sm font-semibold text-slate-700 mb-3">Location Points ({geoLog.length})</p>
                        <div className="space-y-2">
                            {geoLog.map((point, idx) => (
                                <div key={idx} className="flex items-start gap-3 p-3 bg-white rounded-lg border border-slate-100">
                                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                                        <MapPin className="w-4 h-4 text-blue-500" />
                                    </div>
                                    <div className="text-xs">
                                        <p className="font-medium text-slate-700">
                                            Lat: {point.latitude ?? point.lat}, Lng: {point.longitude ?? point.lng}
                                        </p>
                                        <p className="text-slate-400 mt-0.5">{point.timestamp || point.created_at || "-"}</p>
                                        {point.address && <p className="text-slate-500 mt-0.5">{point.address}</p>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Task time summary */}
            {taskTime && (
                <div className="mt-4 p-4 bg-blue-50 rounded-xl border border-blue-100">
                    <p className="text-sm font-semibold text-slate-700 mb-1">Task Time Summary</p>
                    <p className="text-xs text-slate-500">Total task time: {taskTime.total_time || taskTime.duration || "-"}</p>
                </div>
            )}
        </div>
    );
};

export default EmpMobileTaskGeolocation;
