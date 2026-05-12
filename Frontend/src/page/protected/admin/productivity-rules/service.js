import apiService from "@/services/api.service";
import moment from "moment-timezone";
import * as XLSX from "xlsx";
import autoTable from "jspdf-autotable";
import {
    createBrandedPdf,
    drawSummaryCard,
    drawSectionHeading,
    adaptiveTableStyles,
    drawFooter,
} from "@/utils/pdfBrand";

// ─── Utility: Seconds → HH:MM:SS ───────────────────────────────────────────

export function convertSecToHHMM(seconds) {
    if (!seconds && seconds !== 0) return "00:00:00";
    const n = Math.abs(Math.floor(Number(seconds)));
    const h = Math.floor(n / 3600);
    const m = Math.floor((n % 3600) / 60);
    const s = n % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function convertSecToHM(seconds) {
    const n = Math.abs(Math.floor(Number(seconds) || 0));
    const h = Math.floor(n / 3600);
    const m = Math.floor((n % 3600) / 60);
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function secToHours(seconds) {
    return parseFloat((Number(seconds || 0) / 3600).toFixed(2));
}

// ─── Status helpers ─────────────────────────────────────────────────────────

export const STATUS_MAP = {
    0: "neutral",
    1: "productive",
    2: "unproductive",
    4: "customize",
};

export const STATUS_REVERSE = {
    productive: 1,
    neutral: 0,
    unproductive: 2,
    customize: 4,
};

export const RANKING_OPTIONS = [
    { value: "all", label: "See All" },
    { value: "1", label: "Productive" },
    { value: "2", label: "Unproductive" },
    { value: "0", label: "Neutral" },
];

// ─── API: Fetch Productivity Rankings (Activity view) ───────────────────────

export const getProductivityRankings = async ({
    skip = 0,
    limit = 10,
    siteType = "",
    domain = "",
    name = "",
    sortName = "",
    sortOrder = "",
    status = "",
    filteredValue = "1",
    categoryId = "0",
} = {}) => {
    try {
        let categoryParam = categoryId !== "0" ? "" : "&category_type=All";
        let siteTypeParam = siteType && categoryId === "0" ? `&type=${siteType}` : "";
        let nameParam = name ? `&name=${name}` : "";
        let sortColumnParam = sortName ? `&sortColumn=${sortName}` : "";
        let sortOrderParam = sortOrder ? `&sortOrder=${sortOrder}` : "";
        let statusParam = status ? `&status=${status}` : "";
        let categoryIdParam = categoryId !== "0" ? `&category_id=${categoryId}` : "";

        if (domain && categoryId === "0") {
            categoryParam = `&category_type=${domain}`;
        }

        let route;
        if (categoryId !== "0") {
            route = "/settings/category-web-apps";
        } else if (filteredValue === "1") {
            route = "/settings/productivity-rankings";
        } else {
            route = "/settings/category";
        }

        const url = `${route}?skip=${skip}&limit=${limit}${categoryParam}${siteTypeParam}${nameParam}${sortColumnParam}${sortOrderParam}${statusParam}${categoryIdParam}`;

        const { data } = await apiService.apiInstance.get(url);

        if (data?.code === 200) {
            const isActivity = filteredValue === "1";
            // When categoryId is set the request hits /category-web-apps,
            // which returns `data: [...]` (a flat array) and the items
            // shape mirrors the activity list (application_id, status,
            // pre_request, etc.). Treat that case the same as activity
            // mode so the modal actually populates.
            const isCategoryDrilldown = categoryId !== "0";
            const isAppShape = isActivity || isCategoryDrilldown;

            let items;
            if (isAppShape) {
                items = Array.isArray(data.data)
                    ? data.data
                    : data.data?.docs || data.data?.items || [];
            } else {
                items = data.data?.categories || [];
            }

            const rows = items.map((item) => {
                let itemName = item.name || "";
                if (itemName.includes(".exe")) {
                    itemName = itemName.replace(".exe", "");
                }
                if (isAppShape && item.type !== 2) {
                    itemName = itemName.charAt(0).toUpperCase() + itemName.slice(1);
                } else if (!isAppShape) {
                    itemName = itemName.charAt(0).toUpperCase() + itemName.slice(1);
                }

                return {
                    id: isAppShape ? item.application_id : item._id,
                    name: itemName,
                    type: item.type,
                    status: item.status,
                    preRequest: item.pre_request || 0,
                    departmentRules:
                        (isAppShape ? item.department_rules : item.department_rule) || [],
                    domainCount: item.domain_count || 0,
                    createdAt: item.createdAt,
                    updatedAt: item.updatedAt,
                };
            });

            let totalCount;
            if (isCategoryDrilldown) {
                totalCount = typeof data.total === "number" ? data.total : items.length;
            } else if (isActivity) {
                totalCount = Array.isArray(data.total) ? data.total[0]?.total : data.total;
            } else {
                totalCount = data.data?.totalCount || 0;
            }

            return { success: true, rows, totalCount: totalCount || 0 };
        }

        return { success: false, rows: [], totalCount: 0, message: data?.message };
    } catch (error) {
        console.error("Productivity Rankings API Error:", error);
        return { success: false, rows: [], totalCount: 0, message: "Failed to fetch data" };
    }
};

// ─── API: Update Productivity Ranking ───────────────────────────────────────

export const updateProductivityRanking = async ({
    applicationId,
    status,
    departmentId = 0,
    preRequest = 0,
    updateType = "1",
} = {}) => {
    try {
        const idKey = updateType === "1" ? "application_id" : "category_id";
        const payload = {
            data: [
                {
                    [idKey]: applicationId,
                    department_rules: [
                        {
                            department_id: departmentId,
                            status: parseInt(status, 10),
                            pre_request: preRequest,
                        },
                    ],
                },
            ],
        };

        const route = updateType === "1"
            ? "/settings/productivity-ranking"
            : "/settings/category-productivity-ranking";

        const { data } = await apiService.apiInstance.put(route, payload);

        if (data?.code === 200) {
            return { success: true, data: data.data };
        }
        return { success: false, message: data?.message || "Productivity update failed" };
    } catch (error) {
        console.error("Productivity Update Error:", error);
        return { success: false, message: "Productivity update failed" };
    }
};

// ─── API: Custom Productivity Update (multiple department rules) ────────────

export const customProductivityUpdate = async ({
    applicationId,
    departmentRules = [],
    updateType = "1",
} = {}) => {
    try {
        const idKey = updateType === "1" ? "application_id" : "category_id";
        const payload = {
            data: [
                {
                    [idKey]: applicationId,
                    department_rules: departmentRules.map((rule) => ({
                        department_id: parseInt(rule.departmentId, 10),
                        status: parseInt(rule.status, 10),
                        pre_request: rule.preRequest || 0,
                    })),
                },
            ],
        };

        const route = updateType === "1"
            ? "/settings/productivity-ranking"
            : "/settings/category-productivity-ranking";

        const { data } = await apiService.apiInstance.put(route, payload);

        if (data?.code === 200) {
            return { success: true, data: data.data };
        }
        return { success: false, message: data?.message || "Custom productivity update failed" };
    } catch (error) {
        console.error("Custom Productivity Update Error:", error);
        return { success: false, message: "Custom productivity update failed" };
    }
};

// ─── API: Add new productivity ranking (single) ────────────────────────────

export const addProductivityRanking = async ({ name, type, status, departmentRules }) => {
    try {
        const payload = {
            name,
            type,
            status: parseInt(status, 10),
            department_rules: departmentRules,
        };

        const { data } = await apiService.apiInstance.post(
            "/settings/productivity-ranking-single",
            payload
        );

        if (data?.code === 200) {
            return { success: true, data: data.data, message: "Added successfully" };
        }
        return { success: false, message: data?.message || "Failed to add" };
    } catch (error) {
        const msg = error.response?.data?.message || "Failed to add productivity ranking";
        console.error("Add Productivity Error:", error);
        return { success: false, message: msg };
    }
};

// ─── API: Add new domain URL ────────────────────────────────────────────────

export const addNewDomainURL = async ({ domain, departmentRules }) => {
    try {
        const { data } = await apiService.apiInstance.post("/settings/add-url", {
            url: domain,
            department_rules: departmentRules,
        });

        if (data?.code === 200) {
            return { success: true, data: data.data, message: data.message || "Domain added successfully" };
        }
        return { success: false, message: data?.message || "Failed to add domain" };
    } catch (error) {
        console.error("Add Domain Error:", error);
        return { success: false, message: error.response?.data?.message || "Failed to add domain" };
    }
};

// ─── API: Export productivity data ──────────────────────────────────────────

export const fetchExportData = async ({ dataType = "", status = "" } = {}) => {
    try {
        const payload = {};
        if (dataType) payload.type = dataType;
        if (status) payload.status = status;

        const { data } = await apiService.apiInstance.post(
            "/settings/download-productivity-ranking",
            payload
        );

        if (data?.code === 200) {
            return { success: true, data: data.data };
        }
        return { success: false, message: data?.message || "Export failed" };
    } catch (error) {
        console.error("Export Data Error:", error);
        return { success: false, message: "Export failed" };
    }
};

// ─── API: Import bulk domain (xlsx upload) ──────────────────────────────────

export const uploadBulkDomain = async (file) => {
    try {
        const formData = new FormData();
        formData.append("file", file);

        const { data } = await apiService.apiInstance.post(
            "/settings/upload-productivity-ranking",
            formData,
            { headers: { "Content-Type": "multipart/form-data" } }
        );

        if (data?.code === 200) {
            return { success: true, message: data.message || "Import successful" };
        }
        return { success: false, message: data?.message || "Import failed", data: data?.data };
    } catch (error) {
        console.error("Bulk Upload Error:", error);
        return { success: false, message: "Import failed" };
    }
};

// ─── API: Bulk import productivity rules (xlsx) ─────────────────────────────

export const uploadBulkProductivityRules = async (file) => {
    try {
        const formData = new FormData();
        formData.append("file", file);

        const { data } = await apiService.apiInstance.post(
            "/settings/add-url-bulk",
            formData,
            { headers: { "Content-Type": "multipart/form-data" } }
        );

        if (data?.code === 200) {
            return {
                success: true,
                message: data.message || "Bulk import successful",
                data: data.data,
                error: data.error,
            };
        }
        return {
            success: false,
            message: data?.message || "Bulk import failed",
            data: data?.data,
            error: data?.error,
        };
    } catch (error) {
        console.error("Bulk Productivity Upload Error:", error);
        return { success: false, message: "Bulk import failed" };
    }
};

// ─── API: Departments (for productivity rules — includes productivity rules context) ──

export const getDepartmentsForProductivityRules = async () => {
    try {
        const { data } = await apiService.apiInstance.post(
            "/department/get-departments-productivity-rules",
            { skip: "", limit: "" }
        );
        if (data?.code === 200 && data.data) {
            return data.data.map((dept) => ({
                id: dept.id,
                name: dept.name,
            }));
        }
        return [];
    } catch (error) {
        console.error("Departments Fetch Error:", error);
        return [];
    }
};

// ─── API: Locations ─────────────────────────────────────────────────────────

export const getLocations = async () => {
    try {
        const { data } = await apiService.apiInstance.post("/location/get-locations", {
            skip: "",
            limit: "",
        });
        if (data?.code === 200 && data.data?.data) {
            return data.data.data.map((loc) => ({
                value: String(loc.id),
                label: loc.name,
            }));
        }
        return [];
    } catch (error) {
        console.error("Locations Fetch Error:", error);
        return [];
    }
};

// ─── API: Departments by Location ───────────────────────────────────────────

export const getDepartmentsByLocation = async (locationId) => {
    try {
        const payload = { location_id: "" };
        if (locationId && locationId !== "All" && locationId !== "0") {
            payload.location_id = parseInt(locationId, 10);
        }
        const { data } = await apiService.apiInstance.post(
            "/location/get-department-by-location",
            payload
        );
        if (data?.code === 200 && data.data) {
            return data.data.map((dept) => ({
                value: String(dept.department_id || dept.id),
                label: dept.name,
            }));
        }
        return [];
    } catch (error) {
        console.error("Departments By Location Error:", error);
        return [];
    }
};

// ─── API: Employees ─────────────────────────────────────────────────────────

export const getEmployees = async ({ locationId, departmentId } = {}) => {
    try {
        const payload = { skip: "", limit: "" };
        if (locationId && locationId !== "All" && locationId !== "0") {
            payload.location_id = parseInt(locationId, 10);
        }
        if (departmentId && departmentId !== "All" && departmentId !== "0") {
            payload.department_id = parseInt(departmentId, 10);
        }
        const { data } = await apiService.apiInstance.post("/user/users", payload);
        if (data?.code === 200 && data.data) {
            return data.data.map((emp) => ({
                value: String(emp.id),
                label: `${emp.first_name || ""} ${emp.last_name || ""}`.trim() || emp.email || "-",
            }));
        }
        return [];
    } catch (error) {
        console.error("Employees Fetch Error:", error);
        return [];
    }
};

// ─── API: URL-based time usage ──────────────────────────────────────────────

export const getURLTimeUsage = async ({
    appId,
    startDate,
    endDate,
    locationId,
    departmentId,
    employeeId,
} = {}) => {
    try {
        const payload = {
            startDate,
            endDate,
        };
        if (appId) payload.url_id = appId;
        payload.type = 2;
        if (employeeId && employeeId !== "null") payload.employee_id = employeeId;
        if (locationId && locationId !== "null" && locationId !== "0") payload.location_id = locationId;
        if (departmentId && departmentId !== "null") payload.department_id = departmentId;

        const { data } = await apiService.apiInstance.post("/report/user-web-usages", payload);

        if (data?.code === 200 && data.data?.webUsagesData) {
            return {
                success: true,
                data: data.data.webUsagesData.map((item) => ({
                    name: item.employee?.name || "-",
                    email: item.employee?.a_email || "-",
                    location: item.employee?.location || "-",
                    department: item.employee?.department || "-",
                    productive: convertSecToHHMM(item.productive),
                    unproductive: convertSecToHHMM(item.nonProductive),
                    neutral: convertSecToHHMM(item.neutal),
                    idle: convertSecToHHMM(item.idle),
                    isSuspended: item.employee?.status === 2,
                })),
            };
        }
        return { success: false, data: [], message: data?.message || "No data found" };
    } catch (error) {
        console.error("URL Time Usage Error:", error);
        return { success: false, data: [], message: "Failed to fetch usage data" };
    }
};

// ─── URL Validation ─────────────────────────────────────────────────────────

export const isValidURL = (str) => {
    try {
        new URL(str);
        return true;
    } catch {
        return false;
    }
};

// ─── Export: Excel ──────────────────────────────────────────────────────────

export const exportToExcel = (exportData, rankingFilter = "") => {
    try {
        let filtered = exportData;
        if (rankingFilter) {
            filtered = exportData.filter((i) => String(i.status) === String(rankingFilter));
        }

        const rows = filtered
            .filter((item) => item.status !== 4)
            .map((item) => ({
                Type: item.type === 1 ? "Application" : "Website",
                Activity: item.name,
                Status:
                    item.status === 1
                        ? "Productive"
                        : item.status === 2
                        ? "Unproductive"
                        : "Neutral",
                "Pre Request": item.pre_request >= 60 ? item.pre_request : 0,
                "Created At": item.createdAt || "-",
                "Updated At": item.updatedAt || "-",
            }));

        if (!rows.length) return false;

        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Productivity Rules");
        XLSX.writeFile(wb, "Productivity_Rules.xlsx");
        return true;
    } catch (error) {
        console.error("Excel Export Error:", error);
        return false;
    }
};

// ─── Export: PDF ────────────────────────────────────────────────────────────

const STATUS_LABEL = { 1: "Productive", 2: "Unproductive", 3: "Neutral" };

export const exportToPDF = async (exportData, rankingFilter = "") => {
    try {
        let filtered = exportData;
        if (rankingFilter) {
            filtered = exportData.filter((i) => String(i.status) === String(rankingFilter));
        }

        const rows = filtered
            .filter((item) => item.status !== 4)
            .map((item) => [
                item.type === 1 ? "Application" : "Website",
                item.name,
                STATUS_LABEL[item.status] || "Neutral",
                item.pre_request >= 60 ? convertSecToHM(item.pre_request) : "00:00",
                item.createdAt || "-",
                item.updatedAt || "-",
            ]);

        if (!rows.length) return false;

        const headers = ["Type", "Activity", "Status", "Pre Request", "Created At", "Updated At"];
        const filterLabel = rankingFilter ? (STATUS_LABEL[rankingFilter] || rankingFilter) : "All";

        const { doc, pageWidth, margin, contentWidth, cursorY: startY } =
            await createBrandedPdf({ title: "Productivity Rules" });
        let cursorY = startY;

        cursorY = drawSummaryCard({
            doc,
            cursorY,
            pageWidth,
            margin,
            contentWidth,
            recordCount: rows.length,
            cols: 2,
            entries: [
                ["Status Filter", filterLabel],
                ["Date Generated", new Date().toLocaleDateString()],
            ],
        });

        cursorY = drawSectionHeading(doc, "Detailed Rules", margin, cursorY);

        const styles = adaptiveTableStyles(headers.length);
        autoTable(doc, {
            startY: cursorY,
            head: [headers],
            body: rows,
            theme: "grid",
            ...styles,
            margin: { left: margin, right: margin },
        });

        drawFooter(doc, { margin, pageWidth });
        doc.save("Productivity_Rules.pdf");
        return true;
    } catch (error) {
        console.error("PDF Export Error:", error);
        return false;
    }
};

// ─── Export: CSV ────────────────────────────────────────────────────────────

export const exportToCSV = (exportData, rankingFilter = "") => {
    try {
        let filtered = exportData;
        if (rankingFilter) {
            filtered = exportData.filter((i) => String(i.status) === String(rankingFilter));
        }

        const rows = filtered
            .filter((item) => item.status !== 4)
            .map((item) => ({
                Type: item.type === 1 ? "Application" : "Website",
                Activity: item.name,
                Status:
                    item.status === 1
                        ? "Productive"
                        : item.status === 2
                        ? "Unproductive"
                        : "Neutral",
                "Pre Request": item.pre_request >= 60 ? item.pre_request : 0,
                "Created At": item.createdAt || "-",
                "Updated At": item.updatedAt || "-",
            }));

        if (!rows.length) return false;

        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Productivity Rules");
        XLSX.writeFile(wb, "Productivity_Rules.csv", { bookType: "csv" });
        return true;
    } catch (error) {
        console.error("CSV Export Error:", error);
        return false;
    }
};
