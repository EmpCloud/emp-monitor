import React from "react";
import { useTranslation } from "react-i18next";
import { Search } from "lucide-react";
import CustomSelect from "@/components/common/elements/CustomSelect";

function LiveFilters({
    locations,
    departments,
    employees,
    locationValue,
    departmentValue,
    employeeValue,
    onLocationChange,
    onDepartmentChange,
    onEmployeeChange,
    search,
    onSearchChange,
}) {
    const { t } = useTranslation();
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div>
                <label className="block text-[12px] font-semibold text-slate-600 mb-1.5">
                    {t("live.searchEmployee")}
                </label>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder={t("live.searchByNameOrEmail")}
                        value={search}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="w-full pl-9 pr-3 py-2.5 text-[13px] bg-white border border-slate-200 rounded-lg hover:border-slate-300 focus:outline-none focus:border-blue-400 transition-all"
                    />
                </div>
            </div>
            <div>
                <label className="block text-[12px] font-semibold text-slate-600 mb-1.5">
                    {t("location")}
                </label>
                <CustomSelect
                    placeholder={t("live.allLocations")}
                    items={locations}
                    selected={locationValue}
                    onChange={onLocationChange}
                    width="full"
                />
            </div>
            <div>
                <label className="block text-[12px] font-semibold text-slate-600 mb-1.5">
                    {t("department")}
                </label>
                <CustomSelect
                    placeholder={t("live.allDepartments")}
                    items={departments}
                    selected={departmentValue}
                    onChange={onDepartmentChange}
                    width="full"
                />
            </div>
            <div>
                <label className="block text-[12px] font-semibold text-slate-600 mb-1.5">
                    {t("employee")}
                </label>
                <CustomSelect
                    placeholder={t("allEmployees")}
                    items={employees}
                    selected={employeeValue}
                    onChange={onEmployeeChange}
                    width="full"
                />
            </div>
        </div>
    );
}

export default React.memo(LiveFilters);
