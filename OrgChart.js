/**
 * OrgChart.gs
 * Builds organization hierarchy from Reporting Manager column.
 */

function renderOrgChart() {

  const sheet = SpreadsheetApp
    .getActiveSpreadsheet()
    .getSheetByName("OrgChart");

  sheet.clear();

  const employees = getAllEmployees();

  const hierarchy = {};
  const employeesSet = new Set();
  const managersSet = new Set();

  employees.forEach(emp => {

    const employee =
      String(emp["Employee Name"] || "").trim();

    const manager =
      String(emp["Reporting Manager"] || "").trim();

    if (!employee) return;

    employeesSet.add(employee);

    if (manager) {
      managersSet.add(manager);

      if (!hierarchy[manager]) {
        hierarchy[manager] = [];
      }

      hierarchy[manager].push(employee);
    }
  });

  // Find top-level managers
  const roots = [];

  managersSet.forEach(manager => {
    if (!employeesSet.has(manager)) {
      roots.push(manager);
    }
  });

  // Fallback if no roots found
  if (roots.length === 0) {
    roots.push("Organization");
  }

  let row = 1;

  // ==========================
  // TITLE
  // ==========================

  sheet.getRange("A1:D1")
    .merge()
    .setValue("ORGANIZATION CHART")
    .setFontSize(16)
    .setFontWeight("bold")
    .setHorizontalAlignment("center")
    .setBorder(false, false, true, false, false, false);

  row = 3;

  roots.forEach(root => {

    row = writeNode(
      sheet,
      hierarchy,
      root,
      row,
      0
    );

    row++;
  });

  sheet.autoResizeColumns(1, 3);

  logInfo(
    `Org Chart rendered successfully. Roots=${roots.length}`
  );
}

/**
 * Recursive hierarchy writer
 */
function writeNode(
  sheet,
  hierarchy,
  person,
  row,
  level
) {

  const prefix =
    level === 0
      ? ""
      : "│   ".repeat(level - 1) + "├── ";

  sheet.getRange(row, 1)
    .setValue(prefix + person);

  // styling
  if (level === 0) {

    sheet.getRange(row, 1)
      .setFontWeight("bold")
      .setFontSize(12);

  } else {

    sheet.getRange(row, 1)
      .setFontSize(10);
  }

  row++;

  const reports =
    hierarchy[person] || [];

  reports.sort();

  reports.forEach(report => {

    row = writeNode(
      sheet,
      hierarchy,
      report,
      row,
      level + 1
    );

  });

  return row;
}