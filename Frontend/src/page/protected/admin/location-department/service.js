import apiService from "@/services/api.service";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

// ─── Timezone Data ──────────────────────────────────────────────────────────

export const TIMEZONES = [
    { name: "(UTC -12:00) Baker Island", zone: "Etc/GMT+12", offset: "-12:00" },
    { name: "(UTC -11:00) Pago Pago", zone: "Pacific/Pago_Pago", offset: "-11:00" },
    { name: "(UTC -10:00) Honolulu", zone: "Pacific/Honolulu", offset: "-10:00" },
    { name: "(UTC -09:00) Anchorage", zone: "America/Anchorage", offset: "-09:00" },
    { name: "(UTC -08:00) Los Angeles", zone: "America/Los_Angeles", offset: "-08:00" },
    { name: "(UTC -07:00) Denver", zone: "America/Denver", offset: "-07:00" },
    { name: "(UTC -06:00) Chicago", zone: "America/Chicago", offset: "-06:00" },
    { name: "(UTC -05:00) New York", zone: "America/New_York", offset: "-05:00" },
    { name: "(UTC -04:00) Santiago", zone: "America/Santiago", offset: "-04:00" },
    { name: "(UTC -03:00) Sao Paulo", zone: "America/Sao_Paulo", offset: "-03:00" },
    { name: "(UTC -02:00) South Georgia", zone: "Atlantic/South_Georgia", offset: "-02:00" },
    { name: "(UTC -01:00) Azores", zone: "Atlantic/Azores", offset: "-01:00" },
    { name: "(UTC +00:00) London", zone: "Europe/London", offset: "+00:00" },
    { name: "(UTC +01:00) Berlin", zone: "Europe/Berlin", offset: "+01:00" },
    { name: "(UTC +02:00) Cairo", zone: "Africa/Cairo", offset: "+02:00" },
    { name: "(UTC +03:00) Riyadh", zone: "Asia/Riyadh", offset: "+03:00" },
    { name: "(UTC +03:30) Tehran", zone: "Asia/Tehran", offset: "+03:30" },
    { name: "(UTC +04:00) Dubai", zone: "Asia/Dubai", offset: "+04:00" },
    { name: "(UTC +04:30) Kabul", zone: "Asia/Kabul", offset: "+04:30" },
    { name: "(UTC +05:00) Karachi", zone: "Asia/Karachi", offset: "+05:00" },
    { name: "(UTC +05:30) Kolkata", zone: "Asia/Kolkata", offset: "+05:30" },
    { name: "(UTC +05:45) Kathmandu", zone: "Asia/Kathmandu", offset: "+05:45" },
    { name: "(UTC +06:00) Dhaka", zone: "Asia/Dhaka", offset: "+06:00" },
    { name: "(UTC +06:30) Yangon", zone: "Asia/Yangon", offset: "+06:30" },
    { name: "(UTC +07:00) Bangkok", zone: "Asia/Bangkok", offset: "+07:00" },
    { name: "(UTC +08:00) Singapore", zone: "Asia/Singapore", offset: "+08:00" },
    { name: "(UTC +09:00) Tokyo", zone: "Asia/Tokyo", offset: "+09:00" },
    { name: "(UTC +09:30) Adelaide", zone: "Australia/Adelaide", offset: "+09:30" },
    { name: "(UTC +10:00) Sydney", zone: "Australia/Sydney", offset: "+10:00" },
    { name: "(UTC +11:00) Noumea", zone: "Pacific/Noumea", offset: "+11:00" },
    { name: "(UTC +12:00) Auckland", zone: "Pacific/Auckland", offset: "+12:00" },
    { name: "(UTC +13:00) Tongatapu", zone: "Pacific/Tongatapu", offset: "+13:00" },
];

// ─── API: Fetch Locations with Departments ──────────────────────────────────

export const getLocationsDept = async () => {
    try {
        const { data } = await apiService.apiInstance.post("/location/get-locations-dept", {
            skip: "",
            limit: "",
        });
        if (data?.code === 200) {
            const locations = (data.data || []).map((loc) => ({
                location_id: loc.location_id,
                location: loc.location,
                timezone: loc.timezone || "",
                timezone_offset: loc.timezone_offset || "",
                departments: (loc.department || []).map((dept) => ({
                    department_id: dept.department_id,
                    name: dept.name,
                })),
            }));
            const orgTimezone = data.orgtimezone || "";
            return { success: true, data: locations, orgTimezone };
        }
        return { success: false, message: data?.message || "Failed to fetch locations", data: [] };
    } catch (error) {
        console.error("LocationDept: Fetch locations error:", error);
        return { success: false, message: "Failed to fetch locations", data: [] };
    }
};

// ─── API: Fetch All Departments ─────────────────────────────────────────────

export const getAllDepartments = async () => {
    try {
        const { data } = await apiService.apiInstance.post("/department/get-departments", {
            skip: "",
            limit: "",
        });
        if (data?.code === 200) {
            const departments = (data.data || []).map((dept) => ({
                id: dept.id,
                name: dept.name,
            }));
            return { success: true, data: departments };
        }
        return { success: false, message: data?.message || "No departments found", data: [] };
    } catch (error) {
        console.error("LocationDept: Fetch departments error:", error);
        return { success: false, message: "Failed to fetch departments", data: [] };
    }
};

// ─── API: Add Location with Departments ─────────────────────────────────────

export const addLocation = async ({ locName, departmentIds, departmentNames, timezone, timezoneOffset }) => {
    try {
        const { data } = await apiService.apiInstance.post("/location/add-location", {
            location: locName,
            timezone: timezone,
            timezone_offset: timezoneOffset,
            department_id: departmentIds.join(","),
            department_name: departmentNames,
        });
        if (data?.code === 200) {
            return { success: true, data: data.data, message: data.message || "Location added successfully" };
        }
        return { success: false, message: data?.message || data?.error || "Failed to add location" };
    } catch (error) {
        console.error("LocationDept: Add location error:", error);
        const msg = error.response?.data?.message || "Failed to add location";
        return { success: false, message: msg };
    }
};

// ─── API: Update Location ───────────────────────────────────────────────────

export const updateLocation = async ({ locationId, name, timezone, timezoneOffset }) => {
    try {
        const { data } = await apiService.apiInstance.put("/location/update-location", {
            location_id: locationId,
            name: name,
            timezone: timezone,
            timezone_offset: timezoneOffset,
        });
        if (data?.code === 200) {
            return { success: true, data: data.data, message: data.message || "Location updated successfully" };
        }
        return { success: false, message: data?.message || data?.error || "Failed to update location" };
    } catch (error) {
        console.error("LocationDept: Update location error:", error);
        const msg = error.response?.data?.message || "Failed to update location";
        return { success: false, message: msg };
    }
};

// ─── API: Delete Location ───────────────────────────────────────────────────

export const deleteLocation = async (locationId) => {
    try {
        const { data } = await apiService.apiInstance.delete("/location/delete-location", {
            data: { location_id: locationId },
        });
        if (data?.code === 200) {
            return { success: true, message: data.message || "Location deleted successfully" };
        }
        return { success: false, message: data?.message || data?.error || "Failed to delete location" };
    } catch (error) {
        console.error("LocationDept: Delete location error:", error);
        return { success: false, message: "Failed to delete location" };
    }
};

// ─── API: Add Department to Location ────────────────────────────────────────

export const addDepartmentToLocation = async ({ locationId, departmentIds, departmentNames }) => {
    try {
        const { data } = await apiService.apiInstance.post("/location/add-department-location", {
            location_id: locationId,
            department_ids: departmentIds,
            department_name: departmentNames,
        });
        if (data?.code === 200) {
            return { success: true, data: data.data, message: data.message || "Department added successfully" };
        }
        return { success: false, message: data?.message || data?.error || "Failed to add department" };
    } catch (error) {
        console.error("LocationDept: Add department error:", error);
        return { success: false, message: "Failed to add department to location" };
    }
};

// ─── API: Get Departments by Location ───────────────────────────────────────

export const getDepartmentsByLocation = async (locationId) => {
    try {
        const { data } = await apiService.apiInstance.post("/location/get-department-by-location", {
            location_id: locationId,
            role_id: "",
        });
        if (data?.code === 200) {
            return {
                success: true,
                data: (data.data || []).map((dept) => ({
                    department_id: dept.department_id,
                    name: dept.name,
                })),
            };
        }
        return { success: false, message: data?.message || "No departments found", data: [] };
    } catch (error) {
        console.error("LocationDept: Get depts by location error:", error);
        return { success: false, message: "Failed to fetch departments", data: [] };
    }
};

// ─── API: Delete Department from Location ───────────────────────────────────

export const deleteDeptFromLocation = async ({ locationId, departmentId }) => {
    try {
        // Backend expects department_id as a string (comma-separated IDs supported).
        // Sending a number crashes the validator at `department_id.split(",")`
        // and surfaces a misleading "Failed To Delete Departments." error.
        const { data } = await apiService.apiInstance.delete("/location/delete-dept-location", {
            data: {
                location_id: locationId,
                department_id: Array.isArray(departmentId)
                    ? departmentId.map(String).join(",")
                    : String(departmentId),
            },
        });
        if (data?.code === 200) {
            return { success: true, message: data.message || "Department removed from location" };
        }
        return { success: false, message: data?.message || data?.error || "Failed to remove department" };
    } catch (error) {
        console.error("LocationDept: Delete dept from location error:", error);
        return { success: false, message: "Failed to remove department from location" };
    }
};

// ─── API: Delete Department (global) ────────────────────────────────────────

export const deleteDepartment = async (departmentId) => {
    try {
        const { data } = await apiService.apiInstance.delete("/department/delete-department-new", {
            data: { department_id: departmentId },
        });
        if (data?.code === 200) {
            return { success: true, message: data.message || "Department deleted successfully" };
        }
        return { success: false, message: data?.message || data?.error || "Failed to delete department" };
    } catch (error) {
        console.error("LocationDept: Delete department error:", error);
        return { success: false, message: "Failed to delete department" };
    }
};

// ─── Validation ─────────────────────────────────────────────────────────────

export const validateLocationForm = ({ locName, timezone, departments }) => {
    if (!locName?.trim()) return "Location name is required";
    if (locName.trim().length < 3) return "Minimum 3 characters required";
    if (!/^[a-zA-Z-,]+(\s{0,1}[a-zA-Z-, ])*$/.test(locName.trim())) return "Only alphabets are allowed";
    if (!timezone) return "Timezone is required";
    if (!departments || departments.length === 0) return "At least one department is required";
    return null;
};

export const validateEditLocationForm = ({ locName, timezone }) => {
    if (!locName?.trim()) return "Location name is required";
    if (locName.trim().length < 3) return "Minimum 3 characters required";
    if (!/^[a-zA-Z-,]+(\s{0,1}[a-zA-Z-, ])*$/.test(locName.trim())) return "Only alphabets are allowed";
    if (!timezone) return "Timezone is required";
    return null;
};

// ─── Export: CSV/Excel ──────────────────────────────────────────────────────

export const exportLocationsCsv = (locations) => {
    try {
        const rows = locations.map((loc) => ({
            Location: loc.location,
            Timezone: loc.timezone || "N/A",
            Departments: loc.departments.map((d) => d.name).join(", "),
            "Total Departments": loc.departments.length,
        }));

        const worksheet = XLSX.utils.json_to_sheet(rows);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Locations & Departments");
        XLSX.writeFile(workbook, "Locations_Departments.xlsx");
        return { success: true };
    } catch (error) {
        console.error("Export CSV Error:", error);
        return { success: false };
    }
};

// ─── Export: PDF ─────────────────────────────────────────────────────────────

export const exportLocationsPdf = (locations) => {
    try {
        const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
        doc.setFontSize(14);
        doc.text("Locations & Departments", 40, 30);

        const headers = ["#", "Location", "Timezone", "Departments", "Total Depts"];
        const body = locations.map((loc, idx) => [
            idx + 1,
            loc.location,
            loc.timezone || "N/A",
            loc.departments.map((d) => d.name).join(", "),
            loc.departments.length,
        ]);

        autoTable(doc, {
            head: [headers],
            body,
            startY: 50,
            styles: { fontSize: 8, cellPadding: 4 },
            headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: "bold" },
            alternateRowStyles: { fillColor: [248, 250, 252] },
            margin: { left: 20, right: 20 },
            columnStyles: { 3: { cellWidth: 300 } },
        });

        doc.save("Locations_Departments.pdf");
        return { success: true };
    } catch (error) {
        console.error("Export PDF Error:", error);
        return { success: false };
    }
};
