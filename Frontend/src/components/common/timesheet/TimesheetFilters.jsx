import React from "react";
import { Info } from "lucide-react";
import CustomSelect from "@/components/common/elements/CustomSelect";
import DateRangeCalendar from "@/components/common/elements/DateRangeCalendar";

function TimesheetFilters({
    locations,
    departments,
    employees,
    shifts,
    locationValue,
    departmentValue,
    employeeValue,
    shiftValue,
    startDate,
    endDate,
    onLocationChange,
    onDepartmentChange,
    onEmployeeChange,        
    onShiftChange,
    onDateRangeChange,
}) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-x-6 gap-y-4 mb-9">
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Location
                </label>
                <CustomSelect
                    placeholder="All Locations"
                    items={locations}
                    selected={locationValue}
                    onChange={onLocationChange}
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Department
                </label>
                <CustomSelect
                    placeholder="All Departments"
                    items={departments}
                    selected={departmentValue}
                    onChange={onDepartmentChange}
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Employee
                </label>
                <CustomSelect
                    placeholder="All Employees"
                    items={employees}
                    selected={employeeValue}
                    onChange={onEmployeeChange}
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Shift
                </label>
                <CustomSelect
                    placeholder="All Shifts"
                    items={shifts}
                    selected={shiftValue}
                    onChange={onShiftChange}
                />
            </div>
            <div>
                <label className="flex items-center gap-1 text-sm font-medium text-slate-700 mb-1.5">
                    Select Date Ranges :
                    <span className="relative group">
                        <Info className="w-3.5 h-3.5 text-blue-500 cursor-pointer" />
                        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-3 py-1.5 text-[11px] text-white bg-slate-800 rounded-lg whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
                            Click to select a start and end date for the timesheet range
                        </span>
                    </span>
                </label>
                <DateRangeCalendar
                    startDate={startDate}
                    endDate={endDate}
                    onChange={onDateRangeChange}
                />
            </div>
        </div>
    );
}

export default React.memo(TimesheetFilters);
