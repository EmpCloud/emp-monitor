import apiService from "@/services/api.service";

/**
 * Fetch employee full information.
 * Mirrors: UserDetailsController::getEmployeeInformation (POST /user/get-user)
 */
export const fetchEmployeeInfo = async (userId) => {
  try {
    const { data } = await apiService.apiInstance.post("/user/get-user", {
      user_id: userId,
    });
    return data ?? null;
  } catch (error) {
    console.error("EmployeeProfile: fetchEmployeeInfo error", error);
    return null;
  }
};

/**
 * Fetch productivity data.
 * Mirrors: UserDetailsController::getProductivity (GET /report/productivity)
 */
export const fetchProductivity = async (employeeId, startDate, endDate) => {
  try {
    const { data } = await apiService.apiInstance.get(
      `/report/productivity?employee_id=${employeeId}&startDate=${startDate}&endDate=${endDate}`
    );
    return data ?? null;
  } catch (error) {
    console.error("EmployeeProfile: fetchProductivity error", error);
    return null;
  }
};

/**
 * Fetch offline/active breakdown for a single date (used in productivity timeline).
 * Mirrors: UserDetailsController::activeOfflineProductivity
 */
export const fetchOfflineProductivity = async (date, employeeId) => {
  try {
    const { data } = await apiService.apiInstance.get(
      `/settings/offline-activity-breakdown?date=${date}&employeeId=${employeeId}`
    );
    return data ?? null;
  } catch (error) {
    console.error("EmployeeProfile: fetchOfflineProductivity error", error);
    return null;
  }
};

/**
 * Fetch timesheet data.
 * Mirrors: UserDetailsController::getTimeSheetData (GET /timesheet/)
 */
export const fetchTimesheets = async (employeeId, startDate, endDate) => {
  try {
    const start = new Date(startDate).toISOString();
    const end = new Date(endDate).toISOString();
    const { data } = await apiService.apiInstance.get(
      `/timesheet/?location_id=0&department_id=0&employee_id=${employeeId}&start_date=${start}&end_date=${end}`
    );
    return data ?? null;
  } catch (error) {
    console.error("EmployeeProfile: fetchTimesheets error", error);
    return null;
  }
};

/**
 * Fetch screenshots for a specific date/time range.
 * Mirrors: UserController::EmpScreenshots (POST /user/get-screenshots-new)
 * from_hour / to_hour are the integer hour parts of the time strings (e.g. "15:00" → 15)
 */
export const fetchScreenshots = async (userId, date, fromTime, toTime) => {
  try {
    const fromHour = parseInt(String(fromTime).split(":")[0], 10);
    const toHour   = parseInt(String(toTime).split(":")[0], 10);
    const { data } = await apiService.apiInstance.post("/user/get-screenshots-new", {
      user_id:   userId,
      date,
      from_hour: fromHour,
      to_hour:   toHour,
    });
    return data ?? null;
  } catch (error) {
    console.error("EmployeeProfile: fetchScreenshots error", error);
    return null;
  }
};

/**
 * Fetch screen recording videos.
 * Mirrors: UserDetailsController::getScreenRecords (POST /user/get-screen-records)
 */
export const fetchScreenRecords = async (userId, date, fromTime, toTime) => {
  try {
    const { data } = await apiService.apiInstance.post("/user/get-screen-records", {
      user_id: userId,
      date,
      from_hour: parseInt(fromTime, 10),
      to_hour: parseInt(toTime, 10),
    });
    return data ?? null;
  } catch (error) {
    console.error("EmployeeProfile: fetchScreenRecords error", error);
    return null;
  }
};

/**
 * Fetch browser/web history.
 * Mirrors: UserDetailsController::getBrowserHistory (GET /employee/browser-history)
 */
export const fetchBrowserHistory = async (
  employeeId,
  startDate,
  endDate,
  skip = 0,
  limit = 9000
) => {
  try {
    const { data } = await apiService.apiInstance.get(
      `/employee/browser-history?employee_id=${employeeId}&startDate=${startDate}&endDate=${endDate}&skip=${skip}&limit=${limit}`
    );
    return data ?? null;
  } catch (error) {
    console.error("EmployeeProfile: fetchBrowserHistory error", error);
    return null;
  }
};

/**
 * Fetch application usage history.
 * Mirrors: UserDetailsController::getApplicationsUsed (GET /employee/applications)
 */
export const fetchApplications = async (
  employeeId,
  startDate,
  endDate,
  skip = 0,
  limit = 9000
) => {
  try {
    const { data } = await apiService.apiInstance.get(
      `/employee/applications?employee_id=${employeeId}&startDate=${startDate}&endDate=${endDate}&skip=${skip}&limit=${limit}`
    );
    return data ?? null;
  } catch (error) {
    console.error("EmployeeProfile: fetchApplications error", error);
    return null;
  }
};

/**
 * Fetch combined web & app usage detail.
 * Mirrors: UserDetailsController::getWebAppDetail (GET /employee/app-web-combined)
 */
export const fetchWebAppDetail = async (
  employeeId,
  startDate,
  endDate,
  type = "",
  category = ""
) => {
  try {
    let url = `/employee/app-web-combined?employee_id=${employeeId}&startDate=${startDate}&endDate=${endDate}&limit=99999`;
    if (type) url += `&type=${type}`;
    if (category) url += `&category=${category}`;
    const { data } = await apiService.apiInstance.get(url);
    return data ?? null;
  } catch (error) {
    console.error("EmployeeProfile: fetchWebAppDetail error", error);
    return null;
  }
};

/**
 * Fetch keystroke / key-logger data.
 * Mirrors: UserDetailsController::getKeyLoggerData (GET /employee/keystrokes)
 */
export const fetchKeystrokes = async (
  employeeId,
  startDate,
  endDate,
  skip = 0,
  limit = 90000
) => {
  try {
    const { data } = await apiService.apiInstance.get(
      `/employee/keystrokes?employee_id=${employeeId}&startDate=${startDate}&endDate=${endDate}&skip=${skip}&limit=${limit}`
    );
    return data ?? null;
  } catch (error) {
    console.error("EmployeeProfile: fetchKeystrokes error", error);
    return null;
  }
};
