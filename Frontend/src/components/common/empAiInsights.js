/**
 * EMP AI — dashboard insight engine.
 *
 * Pure, side-effect-free derivation of "insight cards" from the data the
 * dashboard store has already loaded (no extra API calls). Each card surfaces a
 * real, actionable signal — idle spikes, absences, top/bottom performers,
 * productivity trends — and deep-links to the relevant screen.
 *
 * This replaces the previous hardcoded "Andrei Luca / Lorem ipsum" mockup in
 * EmpAi.jsx. Every number here comes from live dashboard data; if the data
 * isn't loaded yet the engine returns an empty list and the UI shows a
 * friendly empty state.
 *
 * Card shape:
 *   {
 *     id:       stable string key (for React + de-dupe)
 *     tone:     "good" | "warn" | "bad" | "info"  → drives the colour palette
 *     icon:     one of "trend-up" | "trend-down" | "alert" | "users" | "usb" | "info"
 *     title:    short headline (already localized by caller where needed)
 *     desc:     one-line detail
 *     to:       optional in-app route to deep-link to on click
 *   }
 */

/** Parse "HH:MM:SS" or a raw seconds number into seconds. Returns 0 on junk. */
function toSeconds(value) {
  if (value == null) return 0;
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const str = String(value).trim();
  if (/^\d+$/.test(str)) return parseInt(str, 10);
  // "HH:MM:SS (12%)" → take the time part before any parenthesis
  const timePart = str.split("(")[0].trim();
  const m = timePart.match(/^(\d+):(\d{2}):(\d{2})$/);
  if (!m) return 0;
  return parseInt(m[1], 10) * 3600 + parseInt(m[2], 10) * 60 + parseInt(m[3], 10);
}

/** Pull the leading "NN%" out of a "HH:MM:SS (NN%)" cell, else null. */
function toPercent(value) {
  if (value == null) return null;
  const m = String(value).match(/\(?\s*(\d+(?:\.\d+)?)\s*%/);
  return m ? parseFloat(m[1]) : null;
}

/** Human label for an employee record across the various API shapes. */
function employeeName(emp) {
  if (!emp) return "An employee";
  const first = emp.first_name ?? emp.firstName ?? "";
  const last = emp.last_name ?? emp.lastName ?? "";
  const full = `${first} ${last}`.trim();
  return full || emp.name || emp.full_name || emp.employee_name || emp.emp_code || "An employee";
}

const fmtHrs = (sec) => {
  const h = sec / 3600;
  if (h >= 1) return `${h.toFixed(1)} hrs`;
  const m = Math.round(sec / 60);
  return `${m} min`;
};

/**
 * Modal descriptors. Each card carries a `modal` instead of a route — clicking
 * opens ViewReportModal in-place on the dashboard rather than navigating away.
 *   - dataset: which store slice to show (resolved by the host component)
 *   - mode:    ViewReportModal mode ("employee_activity" | "timesheet" | "web_app")
 *   - title:   modal heading
 */
const MODAL = {
  // Roster buckets → employee_list (renders the list directly; absent/offline
  // employees have no activity to fetch, so employee_activity returns empty).
  absent: { dataset: "absentEmp", mode: "employee_list", title: "Absent Employees Today" },
  idle: { dataset: "idleEmps", mode: "employee_list", title: "Idle Employees" },
  offline: { dataset: "offlineEmp", mode: "employee_list", title: "Offline Employees" },
  online: { dataset: "onlineEmps", mode: "employee_list", title: "Online Employees" },
  registered: { dataset: "registeredEmp", mode: "employee_list", title: "All Enrolled Employees" },
  suspended: { dataset: "suspendedEmp", mode: "employee_list", title: "Suspended Accounts" },
  // Performer lists already carry activity columns → employee_activity fetch.
  productive: { dataset: "productiveEmployees", mode: "employee_activity", title: "Top 10 Productive Employees" },
  unproductive: { dataset: "unproductiveEmployees", mode: "employee_activity", title: "Top 10 Non-Productive Employees" },
  active: { dataset: "activeEmployees", mode: "timesheet", title: "Top 10 Active Employees" },
  nonActive: { dataset: "nonActiveEmployees", mode: "timesheet", title: "Least Active Employees" },
  web: { dataset: "webUsage", mode: "web_app", title: "Top Website Usage" },
  app: { dataset: "appUsage", mode: "web_app", title: "Top Application Usage" },
  locationPerf: { dataset: "locationPerformance", mode: "performance", title: "Location Performance" },
  departmentPerf: { dataset: "departmentPerformance", mode: "performance", title: "Department Performance" },
};

/** First non-empty top item ({name, value}) from a web/app usage slice. */
function topUsageItem(usage) {
  if (!usage) return null;
  const list = Array.isArray(usage) ? usage : usage.today;
  if (!Array.isArray(list) || list.length === 0) return null;
  return list[0];
}

/**
 * Build the insight cards from the dashboard store snapshot.
 *
 * @param {object} store  values from useDashboardStore (statsLists,
 *                        activityBreakdown, productiveEmployees,
 *                        unproductiveEmployees, nonActiveEmployees, ...)
 * @param {number} limit  max cards to return (panel shows a handful)
 * @returns {Array} insight cards, highest-priority first
 */
export function buildInsightCards(store = {}, limit = 6) {
  const {
    statsLists = {},
    activityBreakdown = [],
    productiveEmployees = [],
    unproductiveEmployees = [],
    nonActiveEmployees = [],
    activeEmployees = [],
    locationPerformance = { rows: [] },
    departmentPerformance = { rows: [] },
    webUsage = [],
    appUsage = [],
  } = store;

  const cards = [];

  // ── Roster signals (from /dashboard/employees buckets) ──
  const idle = statsLists.idleEmps?.length ?? 0;
  const offline = statsLists.offlineEmp?.length ?? 0;
  const absent = statsLists.absentEmp?.length ?? 0;
  const online = statsLists.onlineEmps?.length ?? 0;
  const registered = statsLists.registeredEmp?.length ?? 0;
  const suspended = statsLists.suspendedEmp?.length ?? 0;
  const present = Math.max(registered - absent, 0);

  if (absent > 0) {
    cards.push({
      id: "absent",
      priority: 90,
      tone: "bad",
      icon: "alert",
      title: `${absent} ${absent === 1 ? "employee" : "employees"} absent today`,
      desc: "No activity recorded yet — check leave records or follow up.",
      modal: MODAL.absent,
    });
  }

  if (idle > 0) {
    cards.push({
      id: "idle",
      priority: 70,
      tone: "warn",
      icon: "alert",
      title: `${idle} ${idle === 1 ? "employee is" : "employees are"} idle right now`,
      desc: "Sustained inactivity on an active session — worth a check-in.",
      modal: MODAL.idle,
    });
  }

  if (offline > 0 && registered > 0) {
    const pct = Math.round((offline / registered) * 100);
    cards.push({
      id: "offline",
      priority: 50,
      tone: "info",
      icon: "users",
      title: `${offline} offline (${pct}% of team)`,
      desc: online > 0 ? `${online} currently online.` : "No one is currently online.",
      modal: MODAL.offline,
    });
  }

  // ── Currently active / online ──
  if (online > 0) {
    cards.push({
      id: "online",
      priority: 42,
      tone: "good",
      icon: "users",
      title: `${online} ${online === 1 ? "employee" : "employees"} active right now`,
      desc: idle > 0 ? `${idle} idle, the rest are working.` : "Currently online and working.",
      modal: MODAL.online,
    });
  }

  // ── Attendance rate (always computable when there's a roster) ──
  if (registered > 0) {
    const rate = Math.round((present / registered) * 100);
    cards.push({
      id: "attendance",
      priority: absent > 0 ? 60 : 35,
      tone: rate >= 90 ? "good" : rate >= 70 ? "warn" : "bad",
      icon: rate >= 90 ? "trend-up" : "alert",
      title: `Attendance ${rate}% today`,
      desc: `${present} of ${registered} ${registered === 1 ? "employee" : "employees"} present.`,
      modal: MODAL.registered,
    });
  }

  // ── Suspended accounts ──
  if (suspended > 0) {
    cards.push({
      id: "suspended",
      priority: 38,
      tone: "info",
      icon: "alert",
      title: `${suspended} suspended ${suspended === 1 ? "account" : "accounts"}`,
      desc: "Review suspended users — reactivate or remove as needed.",
      modal: MODAL.suspended,
    });
  }

  // ── Team size / enrollment summary (always useful baseline) ──
  if (registered > 0) {
    cards.push({
      id: "team-size",
      priority: 20,
      tone: "info",
      icon: "users",
      title: `${registered} ${registered === 1 ? "employee" : "employees"} enrolled`,
      desc: online > 0 ? `${online} active right now.` : "Monitoring your full workforce.",
      modal: MODAL.registered,
    });
  }

  // ── "All clear" positive state — nobody idle/offline/absent ──
  if (registered > 0 && absent === 0 && idle === 0 && offline === 0) {
    cards.push({
      id: "all-clear",
      priority: 25,
      tone: "good",
      icon: "trend-up",
      title: "All systems quiet",
      desc: "No absences, idle, or offline employees right now. Nice and steady.",
      // No modal — this is a positive status card with no underlying list.
    });
  }

  // ── Productivity trend (today vs yesterday, from activity breakdown) ──
  const prodRow = activityBreakdown.find((r) => r.activity === "Productive Hours");
  if (prodRow) {
    const todayPct = toPercent(prodRow.today);
    const yestPct = toPercent(prodRow.yesterday);
    if (todayPct != null && yestPct != null) {
      const delta = Math.round(todayPct - yestPct);
      if (Math.abs(delta) >= 5) {
        const up = delta > 0;
        cards.push({
          id: "prod-trend",
          priority: up ? 40 : 75,
          tone: up ? "good" : "warn",
          icon: up ? "trend-up" : "trend-down",
          title: `Productivity ${up ? "up" : "down"} ${Math.abs(delta)}% vs yesterday`,
          desc: `Now at ${todayPct}% productive time across the team.`,
          modal: up ? MODAL.productive : MODAL.unproductive,
        });
      }
    }
  }

  // ── Idle-time spike (today vs yesterday) ──
  const idleRow = activityBreakdown.find((r) => r.activity === "Idle Hours");
  if (idleRow) {
    const todaySec = toSeconds(idleRow.today);
    const yestSec = toSeconds(idleRow.yesterday);
    if (yestSec > 0 && todaySec > yestSec * 1.25) {
      const jump = Math.round(((todaySec - yestSec) / yestSec) * 100);
      cards.push({
        id: "idle-spike",
        priority: 65,
        tone: "warn",
        icon: "trend-down",
        title: `Idle time up ${jump}% today`,
        desc: `Team idle time rose to ${fmtHrs(todaySec)} from ${fmtHrs(yestSec)} yesterday.`,
        modal: MODAL.idle,
      });
    }
  }

  // ── Top performer recognition (named highlight — distinct from the
  //    "Top 10 Productive" list card below: this calls out the #1 person) ──
  const topProd = productiveEmployees[0];
  if (topProd) {
    cards.push({
      id: "top-performer",
      priority: 30,
      tone: "good",
      icon: "trend-up",
      title: `${employeeName(topProd)} is today's top performer`,
      desc: "Leading the team on productive hours — worth recognizing.",
      modal: MODAL.productive,
    });
  }

  // ── Lowest performer attention (named highlight) ──
  const lowProd = unproductiveEmployees[0];
  if (lowProd) {
    cards.push({
      id: "low-performer",
      priority: 55,
      tone: "warn",
      icon: "trend-down",
      title: `${employeeName(lowProd)} needs attention`,
      desc: "Highest non-productive time today — consider a 1-on-1.",
      modal: MODAL.unproductive,
    });
  }

  // ── Not-logged-in callout ──
  if (nonActiveEmployees.length > 0) {
    cards.push({
      id: "non-active",
      priority: 45,
      tone: "info",
      icon: "users",
      title: `${nonActiveEmployees.length} ${nonActiveEmployees.length === 1 ? "employee" : "employees"} barely active`,
      desc: "Low online time today — may be on leave or facing connectivity issues.",
      modal: MODAL.nonActive,
    });
  }

  // ── Top 10 Productive Employees (always available when loaded) ──
  if (productiveEmployees.length > 0) {
    cards.push({
      id: "top10-productive",
      priority: 28,
      tone: "good",
      icon: "trend-up",
      title: "Top 10 Productive Employees",
      desc: `${productiveEmployees.length} ${productiveEmployees.length === 1 ? "employee" : "employees"} ranked by productive time. Tap to view.`,
      modal: MODAL.productive,
    });
  }

  // ── Top 10 Non-Productive Employees ──
  if (unproductiveEmployees.length > 0) {
    cards.push({
      id: "top10-nonproductive",
      priority: 27,
      tone: "warn",
      icon: "trend-down",
      title: "Top 10 Non-Productive Employees",
      desc: `${unproductiveEmployees.length} ${unproductiveEmployees.length === 1 ? "employee" : "employees"} with the most non-productive time.`,
      modal: MODAL.unproductive,
    });
  }

  // ── Top 10 Active Employees ──
  if (activeEmployees.length > 0) {
    cards.push({
      id: "top10-active",
      priority: 24,
      tone: "info",
      icon: "users",
      title: "Top 10 Active Employees",
      desc: `${activeEmployees.length} most active by workstation hours today.`,
      modal: MODAL.active,
    });
  }

  // ── Best-performing location ──
  const locRows = Array.isArray(locationPerformance?.rows) ? locationPerformance.rows : [];
  if (locRows.length > 0) {
    const top = locRows[0];
    cards.push({
      id: "loc-perf",
      priority: 22,
      tone: "info",
      icon: "trend-up",
      title: `Top location: ${top?.name ?? "—"}`,
      desc: `Leads ${locRows.length} ${locRows.length === 1 ? "location" : "locations"} on performance. Tap for the full breakdown.`,
      modal: MODAL.locationPerf,
    });
  }

  // ── Best-performing department ──
  const deptRows = Array.isArray(departmentPerformance?.rows) ? departmentPerformance.rows : [];
  if (deptRows.length > 0) {
    const top = deptRows[0];
    cards.push({
      id: "dept-perf",
      priority: 21,
      tone: "info",
      icon: "trend-up",
      title: `Top department: ${top?.name ?? "—"}`,
      desc: `Leads ${deptRows.length} ${deptRows.length === 1 ? "department" : "departments"} on performance. Tap for details.`,
      modal: MODAL.departmentPerf,
    });
  }

  // ── Top website today ──
  const topWeb = topUsageItem(webUsage);
  if (topWeb?.name && topWeb.value > 0) {
    cards.push({
      id: "top-web",
      priority: 18,
      tone: "info",
      icon: "info",
      title: `Top website: ${topWeb.name}`,
      desc: `Accounts for ${Math.round(topWeb.value)}% of web time today.`,
      modal: MODAL.web,
    });
  }

  // ── Top application today ──
  const topApp = topUsageItem(appUsage);
  if (topApp?.name && topApp.value > 0) {
    cards.push({
      id: "top-app",
      priority: 16,
      tone: "info",
      icon: "info",
      title: `Top app: ${topApp.name}`,
      desc: `Most-used application today at ${Math.round(topApp.value)}% of app time.`,
      modal: MODAL.app,
    });
  }

  // Highest-priority first, then cap. (Cards intentionally may share a modal
  // dataset — e.g. the "top performer" highlight and the "Top 10 Productive"
  // list — because they convey different insights; they have distinct ids.)
  return cards.sort((a, b) => b.priority - a.priority).slice(0, limit);
}
