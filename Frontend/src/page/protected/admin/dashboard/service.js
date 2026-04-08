import apiService from "@/services/api.service";
import moment from "moment-timezone";

const getDashboardStats = async (timezone = "Asia/Kolkata") => {
    try {

        let { data } = await apiService.apiInstance.get(`/dashboard/employees?date=${moment().tz(timezone).format("YYYY-MM-DD")}`);
        let temp = [
            {
                labelKey: "stat_total_enrollments",
                value: "0",
                highlight: true,
                variant: "blue",
                chart: "wave",
            },
            {
                labelKey: "stat_currently_active",
                value: "0",
                bars: [40, 70, 50, 90, 60, 80, 55],
                barColor: "#a78bfa",
            },
            {
                labelKey: "stat_currently_idle",
                value: "0",
                bars: [30, 60, 45, 75, 50, 65, 40],
                barColor: "#60a5fa",
            },
            {
                labelKey: "stat_currently_offline",
                value: "0",
                bars: [50, 35, 65, 45, 70, 40, 60],
                barColor: "#4ade80",
            },
            {
                labelKey: "stat_absent",
                value: "0",
                bars: [60, 80, 50, 90, 55, 75, 65],
                barColor: "#f87171",
            },
            {
                labelKey: "stat_suspended",
                value: "0",
                highlight: true,
                variant: "steel",
                chart: "wave",
            },
        ]

        if (data?.data?.absentEmp.length !== 0) temp[4].value = data.data.absentEmp.length;
        if (data?.data?.onlineEmps.length !== 0) temp[1].value = data.data.onlineEmps.length;
        if (data?.data?.idleEmps.length !== 0) temp[2].value = data.data.idleEmps.length;
        if (data?.data?.offlineEmp.length !== 0) temp[3].value = data.data.offlineEmp.length;
        if (data?.data?.suspendedEmp.length !== 0) temp[5].value = data.data.suspendedEmp.length;
        if (data?.data?.registeredEmp.length !== 0) temp[0].value = data.data.registeredEmp.length;
        return {
            stats: temp,
            data: data.data
        }
    } catch (error) {
        return null;
    }
};

const pickEmployeesByType = (payload, type) => {
    const t = Number(type);
    const d = payload?.data ?? payload ?? {};

    // If backend already returns an array for the type endpoint, just use it.
    if (Array.isArray(d)) return d;

    switch (t) {
        case 1:
            return d?.onlineEmps ?? [];
        case 2:
            // Idle
            return d?.idleEmps ?? [];
        case 3:
            return d?.absentEmp ?? [];
        case 4:
            return d?.suspendedEmp ?? [];
        case 5:
            // Registered (Total Enrollments)
            return d?.registeredEmp ?? [];
        case 6:
            // Offline
            return d?.offlineEmp ?? [];
        default:
            return [];
    }
};

/**
 * Fetch employees list for a specific dashboard stat type.
 * GET /dashboard/employees?type=<type>&date=<YYYY-MM-DD>
 */
const getDashboardEmployeesByType = async ({ type, timezone = "Asia/Kolkata" } = {}) => {
    try {
        const date = moment().tz(timezone).format("YYYY-MM-DD");
        const { data } = await apiService.apiInstance.get(`/dashboard/employees?date=${date}`);
        return {
            stats: pickEmployeesByType(data, type),
            raw: data
        };
    } catch (error) {
        console.error("Dashboard Employees By Type API Error:", error);
        return {
            stats: [],
            raw: null
        };
    }
};

const getTodayActivitySnapShot = async (timezone = "Asia/Kolkata") => {
    try {
        // let { data } = await apiService.apiInstance.get(`/dashboard/activity-snapshot?date=${moment().tz(timezone).form
        let { data } = await apiService.apiInstance.get(`/dashboard/activity-breakdown?from_date=${moment().tz(timezone).format("YYYY-MM-DD")}&to_date=${moment().tz(timezone).format("YYYY-MM-DD")}`);
        let temp = [
            { label: "Idle Time", value: 0 },
            { label: "Active Time", value: 0 },
            { label: "Productive Time", value: 0 },
            { label: "Non-Productive Time", value: 0 },
            { label: "Neutral Time", value: 0 },

        ]
        if (data?.data?.todays?.length !== 0) {
            temp[0].value = data.data.todays[0].idle_duration;
            temp[1].value = data.data.todays[0].computer_activities_time;
            temp[2].value = data.data.todays[0].productive_duration;
            temp[3].value = data.data.todays[0].non_productive_duration;
            temp[4].value = data.data.todays[0].neutral_duration;
        }
        return {
            stats: temp,
            data: data.data.todays[0]
        }
    }
    catch (error) {
        return null;
    }
};

const formatSecondsToHMS = (value) => {
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0) return "00:00:00 hrs";
    const total = Math.floor(n);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")} hrs`;
};

const formatWithPercent = (value, percent) => {
    const time = formatSecondsToHMS(value);
    const n = Number(percent);
    if (!Number.isFinite(n)) return time;
    return `${time} (${n.toFixed(2)}%)`;
};

const getActivityBreakdown = async (timezone = "Asia/Kolkata") => {
    try {
        const now = moment().tz(timezone);
        // Match required range: last 3 days including today
        const toDate = now.format("YYYY-MM-DD");
        const fromDate = now.clone().subtract(2, "day").format("YYYY-MM-DD");

        const { data } = await apiService.apiInstance.get(
            `/dashboard/activity-breakdown?from_date=${fromDate}&to_date=${toDate}`
        );

        const todays = data?.data?.todays?.[0];
        const yesterdays = data?.data?.yesterdays?.[0];
        const thisWeek = data?.data?.thisWeek?.[0];

        const rows = [
            {
                activity: "Office Hours",
                highlight: true,
                today: formatSecondsToHMS(todays?.office_time),
                yesterday: formatSecondsToHMS(yesterdays?.office_time),
                thisWeek: formatSecondsToHMS(thisWeek?.office_time)
            },
            {
                activity: "Active Hours",
                highlight: false,
                today: formatWithPercent(todays?.computer_activities_time, todays?.activePer),
                yesterday: formatWithPercent(yesterdays?.computer_activities_time, yesterdays?.activePer),
                thisWeek: formatWithPercent(thisWeek?.computer_activities_time, thisWeek?.activePer)
            },
            {
                activity: "Idle Hours",
                highlight: false,
                today: formatWithPercent(todays?.idle_duration, todays?.idlePer),
                yesterday: formatWithPercent(yesterdays?.idle_duration, yesterdays?.idlePer),
                thisWeek: formatWithPercent(thisWeek?.idle_duration, thisWeek?.idlePer)
            },
            {
                activity: "Productive Hours",
                highlight: false,
                today: formatWithPercent(todays?.productive_duration, todays?.productivePer),
                yesterday: formatWithPercent(yesterdays?.productive_duration, yesterdays?.productivePer),
                thisWeek: formatWithPercent(thisWeek?.productive_duration, thisWeek?.productivePer)
            },
            {
                activity: "Non Productive Hours",
                highlight: false,
                today: formatWithPercent(todays?.non_productive_duration, todays?.nonProductivePer),
                yesterday: formatWithPercent(yesterdays?.non_productive_duration, yesterdays?.nonProductivePer),
                thisWeek: formatWithPercent(thisWeek?.non_productive_duration, thisWeek?.nonProductivePer)
            },
            {
                activity: "Neutral Hours",
                highlight: false,
                today: formatWithPercent(todays?.neutral_duration, todays?.neutralPer),
                yesterday: formatWithPercent(yesterdays?.neutral_duration, yesterdays?.neutralPer),
                thisWeek: formatWithPercent(thisWeek?.neutral_duration, thisWeek?.neutralPer)
            }
        ];

        return {
            stats: rows,
            raw: data
        };
    } catch (error) {
        console.error("Activity Breakdown API Error:", error);
        return {
            stats: [],
            raw: null
        };
    }
};

/**
 * Build date range for "today" / "yesterday" / "thisweek"
 */
const buildTopAppWebRange = (by = "today", timezone = "Asia/Kolkata") => {
    const now = moment().tz(timezone);
    let start = now.clone();
    let end = now.clone();

    if (by === "yesterday") {
        start = now.clone().subtract(1, "day");
        end = start.clone();
    } else if (by === "thisweek") {
        start = now.clone().startOf("week");
        end = now.clone();
    }

    return {
        startDate: start.format("YYYY-MM-DD"),
        endDate: end.format("YYYY-MM-DD")
    };
};

/**
 * Helper to call `/dashboard/top-app-web` for a given type (1 = app, 2 = web)
 * and map the response into [{ name, value, color }].
 */
const fetchTopAppWebForRange = async ({ type, by = "today", timezone = "Asia/Kolkata" }) => {
    const { startDate, endDate } = buildTopAppWebRange(by, timezone);

    const { data } = await apiService.apiInstance.get(
        `/dashboard/top-app-web?type=${type}&start_date=${startDate}&end_date=${endDate}`
    );

    const list = Array.isArray(data?.data) ? data.data : [];

    const palette = ["#6366f1", "#818cf8", "#c7d2fe", "#e0e7ff", "#38bdf8", "#0ea5e9"];

    return list.map((item, idx) => ({
        name:
            item.name ||
            item.website ||
            item.app_name ||
            item.title ||
            `Item ${idx + 1}`,
        value: Number(
            item.percentage ??
            item.value ??
            item.usage_percent ??
            item.percent ??
            0
        ),
        color: palette[idx % palette.length]
    }));
};

/**
 * Top Websites Usage (type = 2)
 */
const getWebUsageChart = async (timezone = "Asia/Kolkata") => {
    try {
        const [today, yesterday, thisWeek] = await Promise.all([
            fetchTopAppWebForRange({ type: 2, by: "today", timezone }),
            fetchTopAppWebForRange({ type: 2, by: "yesterday", timezone }),
            fetchTopAppWebForRange({ type: 2, by: "thisweek", timezone }),
        ]);

        return {
            stats: {
                today,
                yesterday,
                thisWeek
            },
            raw: null
        };
    } catch (error) {
        console.error("Web Usage API Error:", error);
        return {
            stats: {
                today: [],
                yesterday: [],
                thisWeek: []
            },
            raw: null
        };
    }
};

/**
 * Top Applications Usage (type = 1)
 */
const getAppUsageChart = async (timezone = "Asia/Kolkata") => {
    try {
        const [today, yesterday, thisWeek] = await Promise.all([
            fetchTopAppWebForRange({ type: 1, by: "today", timezone }),
            fetchTopAppWebForRange({ type: 1, by: "yesterday", timezone }),
            fetchTopAppWebForRange({ type: 1, by: "thisweek", timezone }),
        ]);

        return {
            stats: {
                today,
                yesterday,
                thisWeek
            },
            raw: null
        };
    } catch (error) {
        console.error("App Usage API Error:", error);
        return {
            stats: {
                today: [],
                yesterday: [],
                thisWeek: []
            },
            raw: null
        };
    }
};
const getLocations = async () => {
    try {
        const { data } = await apiService.apiInstance.post(`/location/get-locations`);

        let temp = [
            { value: "all", label: "All Location" }
        ];
        if (data?.data?.length) {
            const locations = data.data.map((location) => ({
                value: location.id,
                label: location.name
            }));

            temp = [...temp, ...locations];
        }
        return {
            stats: temp,
            raw: data
        };

    } catch (error) {
        console.error("Location API Error:", error);
        return {
            stats: [],
            raw: null
        };
    }
};

const getDepartments = async (location_id) => {
    try {
        const { data } = await apiService.apiInstance.post(location_id ? `/location/get-department-by-location` : `/location/get-locations-dept`, { location_id });
        let temp = [
            { value: "all", label: "All Departments" }
        ];
        if(location_id) {
            if (data?.data?.length) {
                const departments = data.data.map((dept) => ({
                    value: dept.department_id,
                    label: dept.name
                }));
                temp = [...temp, ...departments];
            }
            return {
                stats: temp,
                raw: data
            };
        }
        if (Array.isArray(data?.data)) {

            const deptMap = new Map();

            data.data.forEach((location) => {
                (location.department || []).forEach((dept) => {
                    if (!deptMap.has(dept.department_id)) {
                        deptMap.set(dept.department_id, {
                            value: String(dept.department_id),
                            label: dept.name
                        });
                    }
                });
            });

            temp = [...temp, ...Array.from(deptMap.values())];
        }
        return {
            stats: temp,
            raw: data
        };

    } catch (error) {
        console.error("Department API Error:", error);

        return {
            stats: [],
            raw: null
        };
    }
};

const buildProductiveEmployeesUrl = ({
    by = "today",
    locationId = "all",
    departmentId = "all",
    timezone = "Asia/Kolkata",
    type = 1
} = {}) => {
    const now = moment().tz(timezone);
    let fromDate = now.format("YYYY-MM-DD");
    let toDate = now.format("YYYY-MM-DD");

    if (by === "yesterday") {
        fromDate = now.clone().subtract(1, "day").format("YYYY-MM-DD");
        toDate = fromDate;
    } else if (by === "thisweek") {
        fromDate = now.clone().startOf("week").format("YYYY-MM-DD");
        toDate = now.format("YYYY-MM-DD");
    }

    let url = `/dashboard/productive-and-nonproductive?type=${type}&from_date=${fromDate}&to_date=${toDate}`;

    if (locationId && locationId !== "all") {
        url += `&location_id=${locationId}`;
    }
    if (departmentId && departmentId !== "all") {
        url += `&department_id=${departmentId}`;
    }

    return url;
};

const parseEmployeesResponse = (data) => {
    const list =
        data?.data?.employees ??
        data?.data ??
        data?.employees ??
        [];

    return Array.isArray(list) ? list : [];
};

const getProductiveEmployees = async (params = {}) => {
    try {
        const url = buildProductiveEmployeesUrl({ ...params, type: 1 });
        const { data } = await apiService.apiInstance.get(url);

        return {
            stats: parseEmployeesResponse(data),
            raw: data
        };
    } catch (error) {
        console.error("Productive Employees API Error:", error);
        return {
            stats: [],
            raw: null
        };
    }
};

const getNonProductiveEmployees = async (params = {}) => {
    try {
        const url = buildProductiveEmployeesUrl({ ...params, type: 2 });
        const { data } = await apiService.apiInstance.get(url);

        return {
            stats: parseEmployeesResponse(data),
            raw: data
        };
    } catch (error) {
        console.error("Non Productive Employees API Error:", error);
        return {
            stats: [],
            raw: null
        };
    }
};

const buildActiveEmployeesUrl = ({
    by = "today",
    locationId = "all",
    departmentId = "all",
    timezone = "Asia/Kolkata",
    limit = 10,
    skip = 0,
    sortOrder = "D"
} = {}) => {
    const now = moment().tz(timezone);
    let startDate = now.clone().startOf("day");
    let endDate = now.clone().endOf("day");

    if (by === "yesterday") {
        startDate = now.clone().subtract(1, "day").startOf("day");
        endDate = startDate.clone().endOf("day");
    } else if (by === "thisweek") {
        startDate = now.clone().startOf("week");
        endDate = now.clone().endOf("day");
    }

    const params = new URLSearchParams({
        skip: String(skip),
        limit: String(limit),
        location_id: locationId && locationId !== "all" ? String(locationId) : "0",
        department_id: departmentId && departmentId !== "all" ? String(departmentId) : "0",
        employee_id: "0",
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        sortColumn: "Active Hours",
        sortOrder
    });

    return `/timesheet/timesheet?${params.toString()}`;
};

const getRandomActiveUsers = async (params = {}) => {
    try {
        const url = buildActiveEmployeesUrl({ ...params, sortOrder: "D" });
        const { data } = await apiService.apiInstance.get(url);

        const list = data?.data?.user_data ?? [];

        return {
            stats: Array.isArray(list) ? list : [],
            raw: data
        };
    } catch (error) {
        console.error("Random Active Users API Error:", error);
        return {
            stats: [],
            raw: null
        };
    }
};

const getRandomNonActiveUsers = async (params = {}) => {
    try {
        const url = buildActiveEmployeesUrl({ ...params, sortOrder: "A" });
        const { data } = await apiService.apiInstance.get(url);

        const list = data?.data?.user_data ?? [];

        return {
            stats: Array.isArray(list) ? list : [],
            raw: data
        };
    } catch (error) {
        console.error("Random Non Active Users API Error:", error);
        return {
            stats: [],
            raw: null
        };
    }
};





/**
 * Location performance: GET /dashboard/performance?category=location&type=pro|non|neu&start_date&end_date
 */
const buildPerformanceDateRange = (by = "today", timezone = "Asia/Kolkata") => {
    const now = moment().tz(timezone);
    let start = now.clone();
    let end = now.clone();
    if (by === "yesterday") {
        start = now.clone().subtract(1, "day");
        end = start.clone();
    } else if (by === "thisweek") {
        start = now.clone().startOf("week");
        end = now.clone();
    }
    return {
        startDate: start.format("YYYY-MM-DD"),
        endDate: end.format("YYYY-MM-DD")
    };
};

const LOCATION_PERFORMANCE_PALETTE = [
    "#4c1d95", "#7c3aed", "#818cf8", "#38bdf8", "#7dd3fc", "#bfdbfe"
];

const getLocationPerformance = async ({
    by = "today",
    type = "neu",
    category = "location",
    timezone = "Asia/Kolkata"
} = {}) => {
    try {
        const { startDate, endDate } = buildPerformanceDateRange(by, timezone);
        const { data } = await apiService.apiInstance.get(
            `/dashboard/performance?category=${category}&type=${type}&start_date=${startDate}&end_date=${endDate}`
        );
        const list = Array.isArray(data?.data) ? data.data : [];
        const chartRings = list.map((item, idx) => ({
            category: item.name || ("Location " + (idx + 1)),
            value: Math.min(100, Math.max(0, Number(item.percentage) || 0)),
            color: LOCATION_PERFORMANCE_PALETTE[idx % LOCATION_PERFORMANCE_PALETTE.length]
        }));
        const rows = list.map((item) => ({
            name: item.name || "-",
            hours: formatSecondsToHMS(item.duration),
            duration: item.duration,
            idle_duration: item.idle_duration,
            percentage: item.percentage,
            idle_percentage: item.idle_percentage,
            count: item.count
        }));
        return {
            stats: { chartRings, rows, msg: data?.msg || "" },
            raw: data
        };
    } catch (error) {
        console.error("Location Performance API Error:", error);
        return {
            stats: { chartRings: [], rows: [], msg: "" },
            raw: null
        };
    }
};

const DEPARTMENT_PERFORMANCE_PALETTE = [
    "#4c1d95", "#7c3aed", "#818cf8", "#38bdf8", "#7dd3fc", "#bfdbfe", "#f59e0b", "#ef4444", "#10b981", "#6366f1"
];

const getDepartmentPerformance = async ({
    by = "today",
    type = "pro",
    category = "department",
    timezone = "Asia/Kolkata"
} = {}) => {
    try {
        const { startDate, endDate } = buildPerformanceDateRange(by, timezone);
        const { data } = await apiService.apiInstance.get(
            `/dashboard/performance?category=${category}&type=${type}&start_date=${startDate}&end_date=${endDate}`
        );
        const list = Array.isArray(data?.data) ? data.data : [];
        const pieData = list.map((item, idx) => ({
            category: item.name || ("Department " + (idx + 1)),
            value: Math.min(100, Math.max(0, Number(item.percentage) || 0)),
            color: DEPARTMENT_PERFORMANCE_PALETTE[idx % DEPARTMENT_PERFORMANCE_PALETTE.length]
        }));
        const rows = list.map((item) => {
            const timeStr = formatSecondsToHMS(item.duration);
            const percentage = Number(item.percentage) || 0;
            return {
                name: item.name || "-",
                hours: `${timeStr} (${percentage.toFixed(2)}%)`,
                duration: item.duration,
                idle_duration: item.idle_duration,
                percentage: item.percentage,
                idle_percentage: item.idle_percentage,
                _id: item._id
            };
        });
        return {
            stats: { pieData, rows, msg: data?.msg || "" },
            raw: data
        };
    } catch (error) {
        console.error("Department Performance API Error:", error);
        return {
            stats: { pieData: [], rows: [], msg: "" },
            raw: null
        };
    }
};

/**
 * Fetch detailed web/app activity for productive/non-productive employees.
 * POST /dashboard/get-web-app-activity-productive-employees
 */
const getWebAppActivityForEmployees = async ({
    employeeIds = [],
    by = "today",
    timezone = "Asia/Kolkata",
} = {}) => {
    try {
        const { startDate, endDate } = buildTopAppWebRange(by, timezone);
        const { data } = await apiService.apiInstance.post(
            "/dashboard/get-web-app-activity-productive-employees",
            { employeeIds, startDate, endDate }
        );
        const activities = data?.data?.webAppActivities ?? data?.data ?? [];
        return { stats: Array.isArray(activities) ? activities : [], raw: data };
    } catch (error) {
        console.error("WebApp Activity API Error:", error);
        return { stats: [], raw: null };
    }
};

export {
    getDashboardStats,
    getDashboardEmployeesByType,
    getTodayActivitySnapShot,
    getActivityBreakdown,
    getWebUsageChart,
    getAppUsageChart,
    getLocations,
    getDepartments,
    getProductiveEmployees,
    getNonProductiveEmployees,
    getRandomActiveUsers,
    getRandomNonActiveUsers,
    getLocationPerformance,
    getDepartmentPerformance,
    getWebAppActivityForEmployees
};