const fs = require('fs');
const path = require('path');

const BASE = path.join(__dirname, '..', 'src', 'components', 'common');

// Define replacements for each file
const fileConfigs = [
  // ============ LOCATION DEPARTMENT ============
  {
    file: path.join(BASE, 'location-department', 'EmpLocationDepartment.jsx'),
    importAfter: 'import React',
    hookIn: 'export default function EmpLocationDepartment()',
    replacements: [
      ['{expanded ? "Show Less" : `+${departments.length - visibleCount} More`}', '{expanded ? t("locDept.showLess") : `+${departments.length - visibleCount} ${t("locDept.more")}`}'],
      ['Export\n                <ChevronDown', '{t("common.export")}\n                <ChevronDown'],
      ['Export as PDF', '{t("locDept.exportPdf")}'],
      ['Export as Excel', '{t("locDept.exportExcel")}'],
      ['Rename Location', '{t("locDept.renameLocation")}'],
      ['>Add Department<', '>{t("locDept.addDepartment")}<'],
      ['Remove Department', '{t("locDept.removeDepartment")}'],
      ['>Delete Location<', '>{t("locDept.deleteLocation")}<'],
      ['<span className="font-semibold">Manage</span>', '<span className="font-semibold">{t("locDept.manage")}</span>'],
      ['<span className="font-normal text-gray-500">Locations & Departments</span>', '<span className="font-normal text-gray-500">{t("locDept.locationsAndDepartments")}</span>'],
      ['Create and manage office locations and<br />\n                            department structures', '{t("locDept.createAndManage")}'],
      ['>Delete Departments<', '>{t("locDept.deleteDepartments")}<'],
      ['>Add Location & Departments<', '>{t("locDept.addLocationAndDepartments")}<'],
      ['placeholder="Search locations or departments..."', 'placeholder={t("locDept.searchPlaceholder")}'],
      ['>Loading locations...</span>', '>{t("locDept.loadingLocations")}</span>'],
      ['<span className="text-[12px] font-semibold text-slate-600">Location</span>', '<span className="text-[12px] font-semibold text-slate-600">{t("locDept.location")}</span>'],
      ['<span className="text-[12px] font-semibold text-slate-600">Department</span>', '<span className="text-[12px] font-semibold text-slate-600">{t("common.department")}</span>'],
      ['>Action<', '>{t("common.action")}<'],
      ['{search ? "No locations match your search" : "No locations found. Add your first location."}', '{search ? t("locDept.noMatchSearch") : t("locDept.noLocationsFound")}'],
      ['>Dismiss</button>', '>{t("locDept.dismiss")}</button>'],
    ]
  },
  {
    file: path.join(BASE, 'location-department', 'dialog', 'AddLocationDialog.jsx'),
    importAfter: 'import React',
    hookIn: 'const AddLocationDialog = (',
    replacements: [
      ['Add Location & Departments\n                        </DialogTitle>', '{t("locDept.addLocTitle")}\n                        </DialogTitle>'],
      ['Create a new location and assign departments to it', '{t("locDept.addLocDesc")}'],
      ['>Timezone *</label>', '>{t("locDept.timezone")} *</label>'],
      ['<option value="">Select Timezone</option>', '<option value="">{t("locDept.selectTimezone")}</option>'],
      ['>Location Name *</label>', '>{t("locDept.locationName")} *</label>'],
      ['placeholder="Type location name"', 'placeholder={t("locDept.typeLocationName")}'],
      ['>Departments *</label>', '>{t("locDept.departments")} *</label>'],
      ['placeholder="Search or type new department, press Enter"', 'placeholder={t("locDept.searchOrTypeDept")}'],
      ['>+ Create "{deptInput.trim()}"<', '>{`+ ${t("locDept.create")} "${deptInput.trim()}"`}<'],
      ['>Cancel<', '>{t("common.cancel")}<'],
      ['>Add Location<', '>{t("locDept.addLocation")}<'],
    ]
  },
  {
    file: path.join(BASE, 'location-department', 'dialog', 'EditLocationDialog.jsx'),
    importAfter: 'import React',
    hookIn: 'const EditLocationDialog = (',
    replacements: [
      ['Edit Location\n                        </DialogTitle>', '{t("locDept.editLocation")}\n                        </DialogTitle>'],
      ['Update the location name and timezone', '{t("locDept.updateLocationDesc")}'],
      ['>Timezone *</label>', '>{t("locDept.timezone")} *</label>'],
      ['<option value="">Select Timezone</option>', '<option value="">{t("locDept.selectTimezone")}</option>'],
      ['>Location Name *</label>', '>{t("locDept.locationName")} *</label>'],
      ['placeholder="Type location name"', 'placeholder={t("locDept.typeLocationName")}'],
      ['>Cancel<', '>{t("common.cancel")}<'],
      ['>Update Location<', '>{t("locDept.updateLocation")}<'],
    ]
  },
  {
    file: path.join(BASE, 'location-department', 'dialog', 'AddDeptToLocationDialog.jsx'),
    importAfter: 'import React',
    hookIn: 'const AddDeptToLocationDialog = (',
    replacements: [
      ['Add Department to Location', '{t("locDept.addDeptToLocation")}'],
      ['Assign new or existing departments to this location', '{t("locDept.assignDeptDesc")}'],
      ['"At least one department is required"', 't("locDept.atLeastOneDept")'],
      ['"Failed to add department"', 't("locDept.failedAddDept")'],
      ['>Departments *</label>', '>{t("locDept.departments")} *</label>'],
      ['placeholder="Search or type new department, press Enter"', 'placeholder={t("locDept.searchOrTypeDept")}'],
      ['>+ Create "{deptInput.trim()}"<', '>{`+ ${t("locDept.create")} "${deptInput.trim()}"`}<'],
      ['>Cancel<', '>{t("common.cancel")}<'],
      ['>Add Department<', '>{t("locDept.addDepartment")}<'],
    ]
  },
  {
    file: path.join(BASE, 'location-department', 'dialog', 'DeleteDepartmentsDialog.jsx'),
    importAfter: 'import React',
    hookIn: 'const DeleteDepartmentsDialog = (',
    replacements: [
      ['Delete Departments\n                        </DialogTitle>', '{t("locDept.deleteDepartments")}\n                        </DialogTitle>'],
      ['Permanently delete departments from the system', '{t("locDept.permanentlyDeleteDepts")}'],
      ['No departments found', '{t("locDept.noDepartmentsFound")}'],
      ['>Department</th>', '>{t("common.department")}</th>'],
      ['>Action</th>', '>{t("common.action")}</th>'],
      ['"Yes"', 't("common.yes")'],
      ['"No"', 't("common.no")'],
      ['>Close<', '>{t("common.close")}<'],
    ]
  },
  {
    file: path.join(BASE, 'location-department', 'dialog', 'DeleteDeptFromLocationDialog.jsx'),
    importAfter: 'import React',
    hookIn: 'const DeleteDeptFromLocationDialog = (',
    replacements: [
      ['Remove Department from Location', '{t("locDept.removeDeptFromLocation")}'],
      ['Select departments to remove from this location', '{t("locDept.selectDeptsToRemove")}'],
      ['No departments found for this location', '{t("locDept.noDeptsForLocation")}'],
      ['>Cancel<', '>{t("common.cancel")}<'],
      ['Remove Selected ({selectedDepts.length})', '{`${t("locDept.removeSelected")} (${selectedDepts.length})`}'],
    ]
  },
  {
    file: path.join(BASE, 'location-department', 'dialog', 'DeleteLocationDialog.jsx'),
    importAfter: 'import React',
    hookIn: 'const DeleteLocationDialog = (',
    replacements: [
      ['Delete Location\n                        </DialogTitle>', '{t("locDept.deleteLocation")}\n                        </DialogTitle>'],
      ['Are you sure you want to delete this location? All departments assigned to this location will also be removed. This action cannot be undone.', '{t("locDept.deleteLocationConfirm")}'],
      ['Yes, Delete', '{t("locDept.yesDelete")}'],
      ['>Cancel<', '>{t("common.cancel")}<'],
    ]
  },
  // ============ SHIFT MANAGEMENT ============
  {
    file: path.join(BASE, 'shift-management', 'EmpShiftManagement.jsx'),
    importAfter: 'import React',
    hookIn: 'const EmpShiftManagement = ()',
    replacements: [
      ['Export\n                <ChevronDown', '{t("common.export")}\n                <ChevronDown'],
      ['Export as PDF', '{t("shift.exportPdf")}'],
      ['Export as Excel', '{t("shift.exportExcel")}'],
      ['Export as CSV', '{t("shift.exportCsv")}'],
      ['<span className="font-semibold">Shift</span>', '<span className="font-semibold">{t("shift.title")}</span>'],
      ['<span className="font-normal text-gray-500">Management</span>', '<span className="font-normal text-gray-500">{t("shift.management")}</span>'],
      ['Configure work shifts and assign them to employees or departments.', '{t("shift.description")}'],
      ['>Create Shift<', '>{t("shift.createShift")}<'],
      ['>Shift Name<', '>{t("shift.shiftName")}<'],
      ['>Days<', '>{t("shift.days")}<'],
      ['>Start Time<', '>{t("timeclaim.startTime")}<'],
      ['>End Time<', '>{t("timeclaim.endTime")}<'],
      ['>Action<', '>{t("common.action")}<'],
      ['No data found', '{t("common.noDataFound")}'],
      ['title="Edit Shift"', 'title={t("shift.editShift")}'],
      ['title="Delete Shift"', 'title={t("shift.deleteShift")}'],
      ['placeholder="Search"', 'placeholder={t("common.search")}'],
    ]
  },
  {
    file: path.join(BASE, 'shift-management', 'dialog', 'DeleteShiftDialog.jsx'),
    importAfter: 'import React',
    hookIn: 'const DeleteShiftDialog = (',
    replacements: [
      ['Delete Shift\n                        </DialogTitle>', '{t("shift.deleteShift")}\n                        </DialogTitle>'],
      ['This action cannot be undone', '{t("shift.cannotBeUndone")}'],
      ['>Are you sure you want to delete this shift?</p>', '>{t("shift.deleteShiftConfirm")}</p>'],
      ['Employees assigned to this shift will be affected. This cannot be undone.', '{t("shift.deleteShiftWarning")}'],
      ['>Cancel<', '>{t("common.cancel")}<'],
      ['>Delete Shift<', '>{t("shift.deleteShift")}<'],
    ]
  },
  // ============ MONITORING CONTROL ============
  {
    file: path.join(BASE, 'monitoring-control', 'EmpMonitoringControl.jsx'),
    importAfter: 'import React',
    hookIn: 'const EmpMonitoringControl = ()',
    replacements: [
      ['<span className="font-semibold">Monitoring</span>', '<span className="font-semibold">{t("monitoring.title")}</span>'],
      ['<span className="font-normal text-gray-500">Control</span>', '<span className="font-normal text-gray-500">{t("monitoring.control")}</span>'],
      ['Control monitoring settings, screenshot intervals and data collection policies.', '{t("monitoring.description")}'],
      ['>Custom Productivity Time<', '>{t("monitoring.customProductivityTime")}<'],
      ['Productivity calculation based on custom hours :', '{t("monitoring.productivityCalc")}'],
      ['>Create Group<', '>{t("monitoring.createGroup")}<'],
      ['>Group Name<', '>{t("monitoring.groupName")}<'],
      ['>Role<', '>{t("monitoring.role")}<'],
      ['>Location<', '>{t("common.location")}<'],
      ['>Department<', '>{t("common.department")}<'],
      ['>Employees<', '>{t("monitoring.employees")}<'],
      ['>Action<', '>{t("common.action")}<'],
      ['>Default Settings</td>', '>{t("monitoring.defaultSettings")}</td>'],
      ['>All Employees</td>', '>{t("monitoring.allEmployees")}</td>'],
      ['Actions <ChevronDown', '{t("monitoring.actions")} <ChevronDown'],
      ['<Settings className="w-3.5 h-3.5" /> Settings', '<Settings className="w-3.5 h-3.5" /> {t("monitoring.settings")}'],
      ['<Edit2 className="w-3.5 h-3.5" /> Edit', '<Edit2 className="w-3.5 h-3.5" /> {t("edit")}'],
      ['<Trash2 className="w-3.5 h-3.5" /> Delete', '<Trash2 className="w-3.5 h-3.5" /> {t("common.delete")}'],
      ['Loading...', '{t("common.loading")}'],
      ['No groups found. Create one to get started.', '{t("monitoring.noGroupsFound")}'],
      ['placeholder="Search"', 'placeholder={t("common.search")}'],
    ]
  },
  {
    file: path.join(BASE, 'monitoring-control', 'dialog', 'DeleteGroupDialog.jsx'),
    importAfter: 'import React',
    hookIn: 'const DeleteGroupDialog = (',
    replacements: [
      ['>Delete Group<', '>{t("monitoring.deleteGroup")}<'],
      ['This action cannot be undone', '{t("shift.cannotBeUndone")}'],
      ['>Are you sure you want to delete the group', '>{t("monitoring.deleteGroupConfirm")}'],
      ['? All settings associated with this group will be removed.', '? {t("monitoring.deleteGroupWarning")}'],
      ['>Cancel<', '>{t("common.cancel")}<'],
      ['{saving ? "Deleting..." : "Delete"}', '{saving ? t("common.deleting") : t("common.delete")}'],
    ]
  },
  {
    file: path.join(BASE, 'monitoring-control', 'dialog', 'CreateGroup.jsx'),
    importAfter: 'import React',
    hookIn: 'const CreateGroup = (',
    replacements: [
      ['{isEdit ? "Edit Group" : "Create Group"}', '{isEdit ? t("monitoring.editGroup") : t("monitoring.createGroup")}'],
      ['"Modify group details and employee assignments"', 't("monitoring.modifyGroupDetails")'],
      ['"Set up a new monitoring group with specific rules"', 't("monitoring.setupNewGroup")'],
      ['"Group name is required"', 't("monitoring.groupNameRequired")'],
      ['>Group Name</span>', '>{t("monitoring.groupName")}</span>'],
      ['placeholder="Enter group name"', 'placeholder={t("monitoring.enterGroupName")}'],
      ['>Role</label>', '>{t("monitoring.role")}</label>'],
      ['>Location</label>', '>{t("common.location")}</label>'],
      ['>Department</label>', '>{t("common.department")}</label>'],
      ['>Employees</label>', '>{t("monitoring.employees")}</label>'],
      ['>All Employees<', '>{t("monitoring.allEmployees")}<'],
      ['>Select Employees<', '>{t("monitoring.selectEmployees")}<'],
      ['>No employees found</p>', '>{t("monitoring.noEmployeesFound")}</p>'],
      ['>Note</span>', '>{t("common.note")}</span>'],
      ['placeholder="Optional note for this group"', 'placeholder={t("monitoring.optionalNote")}'],
      ['>Cancel<', '>{t("common.cancel")}<'],
      ['{saving ? "Saving..." : isEdit ? "Update Group" : "Create Group"}', '{saving ? t("common.saving") : isEdit ? t("monitoring.updateGroup") : t("monitoring.createGroup")}'],
    ]
  },
  // ============ AUTO EMAIL REPORT ============
  {
    file: path.join(BASE, 'auto-email-report', 'EmpAutoEmailReport.jsx'),
    importAfter: 'import React',
    hookIn: 'export default function EmpAutoEmailReport()',
    replacements: [
      ['<span className="font-semibold">Email</span>', '<span className="font-semibold">{t("emailReport.title")}</span>'],
      ['<span className="font-normal text-gray-500">Reports</span>', '<span className="font-normal text-gray-500">{t("emailReport.reports")}</span>'],
      ['Configure automated scheduled report delivery via email', '{t("emailReport.description")}'],
      ['>Create New Report<', '>{t("emailReport.createNewReport")}<'],
      ['>Title <SortIcon', '>{t("emailReport.title_col")} <SortIcon'],
      ['>Frequency <SortIcon', '>{t("emailReport.frequency")} <SortIcon'],
      ['>Recipients <SortIcon', '>{t("emailReport.recipients")} <SortIcon'],
      ['>Content <SortIcon', '>{t("emailReport.content")} <SortIcon'],
      ['>Filter<', '>{t("emailReport.filter")}<'],
      ['>Action<', '>{t("common.action")}<'],
      ['>No email reports found</p>', '>{t("emailReport.noReportsFound")}</p>'],
      ['>Create your first report<', '>{t("emailReport.createFirstReport")}<'],
      ['{expanded ? "Show less" : `+${list.length - 3} more`}', '{expanded ? t("emailReport.showLess") : `+${list.length - 3} ${t("emailReport.more")}`}'],
      ['Export PDF', '{t("emailReport.exportPdf")}'],
      ['Export Excel', '{t("emailReport.exportExcel")}'],
      ['Export\n                <ChevronDown', '{t("common.export")}\n                <ChevronDown'],
      ['>Loading email reports...</span>', '>{t("emailReport.loadingReports")}</span>'],
      ['>Dismiss</button>', '>{t("locDept.dismiss")}</button>'],
      ['placeholder="Search by name..."', 'placeholder={t("common.search")}'],
      ['title="Edit report"', 'title={t("edit")}'],
      ['title="Delete report"', 'title={t("common.delete")}'],
    ]
  },
  {
    file: path.join(BASE, 'auto-email-report', 'dialog', 'DeleteReportDialog.jsx'),
    importAfter: 'import React',
    hookIn: 'const DeleteReportDialog = (',
    replacements: [
      ['>Delete Report<', '>{t("emailReport.deleteReport")}<'],
      ['Are you sure you want to delete this email report? This action cannot be undone.', '{t("emailReport.deleteConfirm")}'],
      ['Yes, Delete', '{t("locDept.yesDelete")}'],
      ['>Cancel<', '>{t("common.cancel")}<'],
    ]
  },
  // ============ SCREENSHOT LOGS ============
  {
    file: path.join(BASE, 'screenshot-logs', 'EmpScreenshotLogs.jsx'),
    importAfter: 'import React',
    hookIn: 'const EmpScreenshotLogs = ()',
    replacements: [
      ['<span className="font-semibold">Screenshot </span> Logs', '<span className="font-semibold">{t("screenshotLogs.title")} </span> {t("screenshotLogs.logs")}'],
      ['Track and review screenshot capture activity across monitored systems.', '{t("screenshotLogs.description")}'],
      ['>Employee Name</div>', '>{t("screenshotLogs.employeeName")}</div>'],
      ['>Computer</div>', '>{t("screenshotLogs.computer")}</div>'],
      ['>Event Date</div>', '>{t("screenshotLogs.eventDate")}</div>'],
      ['>Event Time (hr)</div>', '>{t("screenshotLogs.eventTime")}</div>'],
      ['>Screenshot</div>', '>{t("screenshotLogs.screenshot")}</div>'],
      ['>No screenshot available</span>', '>{t("screenshotLogs.noScreenshot")}</span>'],
      ['No records found', '{t("common.noRecordsFound")}'],
      ['placeholder="Search"', 'placeholder={t("common.search")}'],
    ]
  },
  // ============ SYSTEM LOGS ============
  {
    file: path.join(BASE, 'system-logs', 'EmpSystemLogs.jsx'),
    importAfter: 'import React',
    hookIn: 'const EmpSystemLogs = ()',
    replacements: [
      ['<span className="font-semibold">System </span> Logs', '<span className="font-semibold">{t("systemLogs.title")} </span> {t("systemLogs.logs")}'],
      ['Detailed system-level logs for security auditing and compliance.', '{t("systemLogs.description")}'],
      ['>Employee Name<', '>{t("screenshotLogs.employeeName")}<'],
      ['>Computer<', '>{t("screenshotLogs.computer")}<'],
      ['>Event Date<', '>{t("screenshotLogs.eventDate")}<'],
      ['>Event Time (hr)<', '>{t("screenshotLogs.eventTime")}<'],
      ['>Description<', '>{t("systemLogs.description_col")}<'],
      ['No records found', '{t("common.noRecordsFound")}'],
      ['placeholder="Search"', 'placeholder={t("common.search")}'],
    ]
  },
  // ============ USB DETECTION ============
  {
    file: path.join(BASE, 'usb-detection', 'EmpUsbDetection.jsx'),
    importAfter: 'import React',
    hookIn: 'const EmpUsbDetection = ()',
    replacements: [
      ['<span className="font-semibold">USB Detection</span>', '<span className="font-semibold">{t("usbDetection.title")}</span>'],
      ['Monitor and log all USB device connections and file transfer activities across managed endpoints.', '{t("usbDetection.description")}'],
      ['>Employee Name</TableHead>', '>{t("screenshotLogs.employeeName")}</TableHead>'],
      ['>Employee ID</TableHead>', '>{t("usbDetection.employeeId")}</TableHead>'],
      ['>Computer</TableHead>', '>{t("screenshotLogs.computer")}</TableHead>'],
      ['>Location</TableHead>', '>{t("common.location")}</TableHead>'],
      ['>Department</TableHead>', '>{t("common.department")}</TableHead>'],
      ['>Title</TableHead>', '>{t("usbDetection.title_col")}</TableHead>'],
      ['>Date & Time</TableHead>', '>{t("usbDetection.dateTime")}</TableHead>'],
      ['>Description</TableHead>', '>{t("systemLogs.description_col")}</TableHead>'],
      ['No records found', '{t("common.noRecordsFound")}'],
      ['placeholder="Search"', 'placeholder={t("common.search")}'],
    ]
  },
  // ============ PRINT LOGS ============
  {
    file: path.join(BASE, 'print-logs', 'EmpPrintLogs.jsx'),
    importAfter: 'import React',
    hookIn: 'const EmpPrintLogs = ()',
    replacements: [
      ['<span className="font-semibold">Print</span>', '<span className="font-semibold">{t("printLogs.title")}</span>'],
      ['<span className="font-normal text-gray-500">Logs</span>', '<span className="font-normal text-gray-500">{t("printLogs.logs")}</span>'],
      ['>Employee Name<', '>{t("screenshotLogs.employeeName")}<'],
      ['>Computer<', '>{t("screenshotLogs.computer")}<'],
      ['>Event Date<', '>{t("screenshotLogs.eventDate")}<'],
      ['>Event Time (hr)<', '>{t("screenshotLogs.eventTime")}<'],
      ['>Description<', '>{t("systemLogs.description_col")}<'],
      ['No data found', '{t("common.noDataFound")}'],
      ['placeholder="Search"', 'placeholder={t("common.search")}'],
    ]
  },
];

let totalFiles = 0;
let totalReplacements = 0;

for (const config of fileConfigs) {
  if (!fs.existsSync(config.file)) {
    console.log(`SKIP: ${config.file} not found`);
    continue;
  }

  let content = fs.readFileSync(config.file, 'utf8');
  let changed = false;

  // 1. Add import if not already present
  if (!content.includes('useTranslation')) {
    // Find the first import line and add after it
    const importLine = 'import { useTranslation } from "react-i18next";';
    const firstImportEnd = content.indexOf('\n', content.indexOf('import '));
    if (firstImportEnd > -1) {
      content = content.slice(0, firstImportEnd + 1) + importLine + '\n' + content.slice(firstImportEnd + 1);
      changed = true;
    }
  }

  // 2. Add hook call if not already present
  if (!content.includes('const { t } = useTranslation()') && !content.includes('const {t} = useTranslation()')) {
    // Find the component function and add hook
    if (config.hookIn) {
      const hookIdx = content.indexOf(config.hookIn);
      if (hookIdx > -1) {
        // Find the opening brace of the function body
        let braceIdx = content.indexOf('{', hookIdx + config.hookIn.length);
        if (braceIdx > -1) {
          // Insert after the opening brace
          const insertPoint = braceIdx + 1;
          const nextChar = content[insertPoint];
          const indent = nextChar === '\n' ? '\n    ' : '\n    ';
          content = content.slice(0, insertPoint) + indent + 'const { t } = useTranslation();' + content.slice(insertPoint);
          changed = true;
        }
      }
    }
  }

  // 3. Apply string replacements
  let replacementCount = 0;
  for (const [oldStr, newStr] of config.replacements) {
    if (content.includes(oldStr)) {
      content = content.replace(oldStr, newStr);
      replacementCount++;
    }
  }

  if (replacementCount > 0) changed = true;

  if (changed) {
    fs.writeFileSync(config.file, content, 'utf8');
    totalFiles++;
    totalReplacements += replacementCount;
    console.log(`DONE: ${path.basename(config.file)} - ${replacementCount} replacements`);
  } else {
    console.log(`SKIP: ${path.basename(config.file)} - no changes needed`);
  }
}

console.log(`\nTotal: ${totalFiles} files modified, ${totalReplacements} string replacements`);
