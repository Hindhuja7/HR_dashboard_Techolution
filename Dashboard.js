/**
 * Dashboard.gs
 */

function renderDashboard() {

  const sheet = SpreadsheetApp
    .getActiveSpreadsheet()
    .getSheetByName("Dashboard");

  sheet.clear();

  const employees        = cachedEmployees();                      // was getAllEmployees()
  const risks            = cachedSheetData('Risk Report');         // was getRiskRecords()

  // FIX: actual flag value is "⚠ Below 8 Hrs" (not 'Yes'/true) — check non-empty instead
  const productivityFlags = cachedSheetData('Productivity')        // was getProductivityFlags()
    .filter(emp => {
      const flag = getField(emp, 'Below 8 Hrs Flag');
      return flag && flag.toString().trim() !== '';
    });

  // ======================
  // BASIC COUNTS
  // ======================

  const indiaCount =
    employees.filter(e => getField(e, 'Region') === "India").length;

  const usCount =
    employees.filter(e => getField(e, 'Region') === "US").length;

  const interns =
    employees.filter(e => getField(e, 'Employment Status') === "Intern").length;

  const probation =
    employees.filter(e => getField(e, 'Employment Status') === "Under Probation").length;

  // FIX: "Offboarded" isn't an Employment Status in the Employee DB —
  // count from the dedicated Offboarded Resources tab instead.
  const offboarded = cachedSheetData('Offboarded Resources').length;

  const lwdAlerts       = getLWDAlerts();
  const probationAlerts = getProbationAlerts();

  const highRiskCount =
    risks.filter(r => getField(r, 'Risk Level') === "High").length;

  let row = 1;

  // ======================
  // HEADER
  // ======================

  sheet.getRange(row++, 1).setValue("HR ANALYTICS DASHBOARD");
  sheet.getRange(row++, 1).setValue("Generated: " + new Date());
  row++;

  // ======================
  // KEY METRICS
  // ======================

  sheet.getRange(row++, 1, 8, 2).setValues([
    ["Total Employees",    employees.length],
    ["India Employees",    indiaCount],
    ["US Employees",       usCount],
    ["Interns",            interns],
    ["Under Probation",    probation],
    ["Offboarded",         offboarded],
    ["High Risk Cases",    highRiskCount],
    ["Productivity Flags", productivityFlags.length]
  ]);

  row += 9;

  // ======================
  // ALERT SUMMARY
  // ======================

  sheet.getRange(row++, 1).setValue("ALERT SUMMARY");
  sheet.getRange(row++, 1, 2, 2).setValues([
    ["LWD Alerts",       lwdAlerts.length],
    ["Probation Alerts", probationAlerts.length]
  ]);

  row += 4;

  // ======================
  // DEPARTMENT BREAKDOWN
  // ======================

  sheet.getRange(row++, 1).setValue("DEPARTMENT BREAKDOWN");

  const deptMap = {};
  employees.forEach(emp => {
    const dept = getField(emp, 'Department') || "Unknown";
    deptMap[dept] = (deptMap[dept] || 0) + 1;
  });

  sheet.getRange(row++, 1, 1, 2).setValues([["Department", "Count"]]);

  Object.entries(deptMap)
    .sort((a, b) => b[1] - a[1])
    .forEach(([dept, count]) => {
      sheet.getRange(row++, 1, 1, 2).setValues([[dept, count]]);
    });

  row += 2;

  // ======================
  // REGION BREAKDOWN
  // ======================

  sheet.getRange(row++, 1).setValue("REGION BREAKDOWN");
  sheet.getRange(row++, 1, 1, 2).setValues([["Region", "Count"]]);
  sheet.getRange(row++, 1, 2, 2).setValues([
    ["India", indiaCount],
    ["US",    usCount]
  ]);

  row += 3;

  // ======================
  // RECENT ALERTS
  // ======================

  sheet.getRange(row++, 1).setValue("RECENT ALERTS");
  sheet.getRange(row++, 1, 1, 3).setValues([["Type", "Employee", "Status"]]);

  lwdAlerts.forEach(alert => {
    sheet.getRange(row++, 1, 1, 3).setValues([["LWD", alert.name, alert.status]]);
  });

  probationAlerts.forEach(alert => {
    sheet.getRange(row++, 1, 1, 3).setValues([["Probation", alert.name, alert.status]]);
  });

  // ======================
  // RISK REGISTER
  // ======================

  row += 3;
  sheet.getRange(row++, 1).setValue("RISK REGISTER");
  sheet.getRange(row++, 1, 1, 5).setValues([["Employee", "Category", "Risk Level", "Status", "Action"]]);

  risks.forEach(risk => {
    sheet.getRange(row++, 1, 1, 5).setValues([[
      getField(risk, 'Employee Name'),
      getField(risk, 'Risk Category'),
      getField(risk, 'Risk Level'),
      getField(risk, 'Status'),
      getField(risk, 'Mitigation Action')
    ]]);
  });

  // ======================
  // PRODUCTIVITY FLAGS
  // ======================

  row += 3;
  sheet.getRange(row++, 1).setValue("PRODUCTIVITY FLAGS");
  sheet.getRange(row++, 1, 1, 4).setValues([["Employee", "Department", "Avg Hours", "Status"]]);

  productivityFlags.forEach(emp => {
    sheet.getRange(row++, 1, 1, 4).setValues([[
      getField(emp, 'Employee Name'),
      getField(emp, 'Department'),
      getField(emp, 'Overall Avg Hrs/Day'),
      getField(emp, 'Below 8 Hrs Flag')
    ]]);
  });

  // ======================
  // FORMATTING
  // ======================

  sheet.autoResizeColumns(1, 5);
  sheet.getRange("A1").setFontSize(16).setFontWeight("bold");

  // ======================
  // LOGGING
  // ======================

  logInfo(`Dashboard rendered successfully. Employees=${employees.length}, LWD Alerts=${lwdAlerts.length}, Probation Alerts=${probationAlerts.length}`);
}
function testCounts() {
  Logger.log("Live: " + getAllEmployees().length);
  Logger.log("Cache: " + cachedEmployees().length);
}