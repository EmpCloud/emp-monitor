import React, { useRef, useEffect, useState } from "react";
import { Info, Calendar } from "lucide-react";
import moment from "moment";
import $ from "jquery";
import CustomSelect from "@/components/common/elements/CustomSelect";

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
    const datePickerRef = useRef(null);
    const [pluginReady, setPluginReady] = useState(false);

    // Load daterangepicker plugin after setting globals
    useEffect(() => {
        window.moment = moment;
        window.jQuery = window.$ = $;

        import("daterangepicker/daterangepicker.css");
        import("daterangepicker").then(() => {
            setPluginReady(true);
        });
    }, []);

    // Initialize daterangepicker once plugin is loaded
    useEffect(() => {
        if (!pluginReady || !datePickerRef.current) return;

        const $el = $(datePickerRef.current);

        $el.daterangepicker(
            {
                startDate: moment(startDate),
                endDate: moment(endDate),
                minDate: moment().subtract(180, "days"),
                maxDate: moment(),
                dateLimit: { days: 31 },
                locale: {
                    format: "MMM D, YYYY",
                },
                ranges: {
                    Today: [moment(), moment()],
                    Yesterday: [moment().subtract(1, "days"), moment().subtract(1, "days")],
                    "Last 7 Days": [moment().subtract(7, "days"), moment().subtract(1, "days")],
                    "Last 30 Days": [moment().subtract(30, "days"), moment().subtract(1, "days")],
                    "This Month": [moment().startOf("month"), moment().endOf("month")],
                    "Last Month": [
                        moment().subtract(1, "month").startOf("month"),
                        moment().subtract(1, "month").endOf("month"),
                    ],
                    "This Week": [moment().startOf("week"), moment().endOf("week")],
                },
                opens: "left",
                autoUpdateInput: true,
            },
            (start, end) => {
                onDateRangeChange(
                    start.startOf("day").toISOString(),
                    end.endOf("day").toISOString()
                );
            }
        );

        return () => {
            const dp = $el.data("daterangepicker");
            if (dp) dp.remove();
        };
    }, [pluginReady]);

    // Sync external prop changes into the picker display
    useEffect(() => {
        if (!pluginReady || !datePickerRef.current) return;
        const $el = $(datePickerRef.current);
        const dp = $el.data("daterangepicker");
        if (dp) {
            dp.setStartDate(moment(startDate));
            dp.setEndDate(moment(endDate));
        }
    }, [startDate, endDate, pluginReady]);

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
                    <Info className="w-3.5 h-3.5 text-blue-500" />
                </label>
                <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input
                        ref={datePickerRef}
                        type="text"
                        readOnly
                        className="w-full pl-9 pr-3 py-2 text-[13px] bg-white border border-slate-200 rounded-lg hover:border-slate-300 focus:outline-none focus:border-blue-400 transition-all cursor-pointer"
                    />
                </div>
            </div>
        </div>
    );
}

export default React.memo(TimesheetFilters);
