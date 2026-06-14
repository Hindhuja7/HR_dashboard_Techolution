/**
 * DrillDown.gs
 */

const DD_TABLE_START_ROW = 4;

const DD_FILTER_CELLS = {
  Region: "B2",
  Department: "D2",
  "Reporting Manager": "F2",
  "Employment Status": "H2"
};

function setupDrillDownFilters() {
  const sheet = SpreadsheetApp
    .getActiveSpreadsheet()
    .getSheetByName("DrillDown");

  if (!sheet) throw new Error('DrillDown tab not found.');

  const employees = cachedEmployees();

  sheet.getRange("A2").setValue("Region");
  sheet.getRange("C2").setValue("Department");
  sheet.getRange("E2").setValue("Manager");
  sheet.getRange("G2").setValue("Status");

  setDropdown(sheet, DD_FILTER_CELLS.Region,
    getUniqueValues(employees, "Region"));

  setDropdown(sheet, DD_FILTER_CELLS.Department,
    getUniqueValues(employees, "Department"));

  setDropdown(sheet, DD_FILTER_CELLS["Reporting Manager"],
    getUniqueValues(employees, "Reporting Manager"));

  setDropdown(sheet, DD_FILTER_CELLS["Employment Status"],
    getUniqueValues(employees, "Employment Status"));

  // Preserve existing filter values — don't reset to "All" on every refresh
  const currentRegion = sheet.getRange(DD_FILTER_CELLS.Region).getValue();
  const currentDept   = sheet.getRange(DD_FILTER_CELLS.Department).getValue();
  const currentMgr    = sheet.getRange(DD_FILTER_CELLS["Reporting Manager"]).getValue();
  const currentStatus = sheet.getRange(DD_FILTER_CELLS["Employment Status"]).getValue();

  if (!currentRegion) sheet.getRange(DD_FILTER_CELLS.Region).setValue("All");
  if (!currentDept)   sheet.getRange(DD_FILTER_CELLS.Department).setValue("All");
  if (!currentMgr)    sheet.getRange(DD_FILTER_CELLS["Reporting Manager"]).setValue("All");
  if (!currentStatus) sheet.getRange(DD_FILTER_CELLS["Employment Status"]).setValue("All");

  renderDrillDown();
  logInfo("DrillDown filters initialized.");
}

function getUniqueValues(employees, canonicalField) {
  const values = employees
    .map(emp => (getField(emp, canonicalField) || '').toString().trim()) // trim here
    .filter(v => v !== '');

  return ["All", ...new Set(values)].sort();
}

function setDropdown(sheet, cell, options) {
  const rule = SpreadsheetApp.newDataValidation()
    .requireValueInList(options, true)
    .setAllowInvalid(false)
    .build();

  sheet.getRange(cell).setDataValidation(rule);
}

function renderDrillDown() {
  const sheet = SpreadsheetApp
    .getActiveSpreadsheet()
    .getSheetByName("DrillDown");

  if (!sheet) throw new Error("DrillDown tab not found.");

  const region     = sheet.getRange("B2").getValue().toString().trim();
  const department = sheet.getRange("D2").getValue().toString().trim();
  const manager    = sheet.getRange("F2").getValue().toString().trim();
  const status     = sheet.getRange("H2").getValue().toString().trim();

  let employees = cachedEmployees();

  if (region !== "All" && region !== "") {
    employees = employees.filter(e =>
      (getField(e, 'Region') || '').toString().trim() === region);
  }

  if (department !== "All" && department !== "") {
    employees = employees.filter(e =>
      (getField(e, 'Department') || '').toString().trim() === department);
  }

  if (manager !== "All" && manager !== "") {
    employees = employees.filter(e =>
      (getField(e, 'Reporting Manager') || '').toString().trim() === manager);
  }

  if (status !== "All" && status !== "") {
    employees = employees.filter(e =>
      (getField(e, 'Employment Status') || '').toString().trim() === status);
  }

  // Clear previous results
  if (sheet.getLastRow() >= DD_TABLE_START_ROW) {
    sheet.getRange(
      DD_TABLE_START_ROW, 1,
      sheet.getMaxRows() - DD_TABLE_START_ROW + 1,
      sheet.getMaxColumns()
    ).clearContent();
  }

  // Headers
  const headers = [
    "Employee ID", "Employee Name", "Department",
    "Region", "Reporting Manager", "Employment Status"
  ];

  sheet.getRange(DD_TABLE_START_ROW, 1, 1, headers.length)
    .setValues([headers])
    .setFontWeight("bold");

  // Data rows
  if (employees.length > 0) {
    const data = employees.map(emp => [
      getField(emp, 'Employee ID'),
      getField(emp, 'Employee Name'),
      getField(emp, 'Department'),
      getField(emp, 'Region'),
      getField(emp, 'Reporting Manager'),
      getField(emp, 'Employment Status')
    ]);

    sheet.getRange(
      DD_TABLE_START_ROW + 1, 1,
      data.length, headers.length
    ).setValues(data);
  }

  sheet.getRange(DD_TABLE_START_ROW + employees.length + 2, 1)
    .setValue(`${employees.length} employee(s) found`);

  logInfo(`DrillDown rendered: ${employees.length} employees`);
}
function debugStepByStep() {
  clearCache();
  let employees = cachedEmployees();
  console.log('Total: ' + employees.length);

  // Step 1: Region filter
  const region = 'US';
  employees = employees.filter(e =>
    (getField(e, 'Region') || '').toString().trim() === region);
  console.log('After Region=US: ' + employees.length);

  // Step 2: Status filter
  const status = 'Confirmed';
  employees = employees.filter(e =>
    (getField(e, 'Employment Status') || '').toString().trim() === status);
  console.log('After Status=Confirmed: ' + employees.length);

  // Show first 3 matches
  employees.slice(0, 3).forEach(e => {
    console.log(JSON.stringify({
      id: getField(e, 'Employee ID'),
      name: getField(e, 'Employee Name'),
      region: getField(e, 'Region'),
      status: getField(e, 'Employment Status')
    }));
  });
}