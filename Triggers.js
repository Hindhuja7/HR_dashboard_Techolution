/**
 * Triggers.gs
 * Real-time reflection: onEdit trigger re-renders affected sections immediately.
 * Daily time-based trigger runs the full pipeline (refresh + alerts + changelog).
 */

const SOURCE_TABS = [
  'India Employee Database',
  'US Employee Database',
  'RM Data',
  'Finance',
  'Productivity',
  'Risk Report',
  'Offboarded Resources'
];

const VALIDATED_TABS = {
  'India Employee Database': true,
  'US Employee Database':    true,
  'Risk Report':             true,
  'Offboarded Resources':    true,
  'Finance':                 true,
  'Productivity':            true
};

const REQUIRED_FIELDS_BY_TAB = {
  'India Employee Database': ['Employee ID', 'Employee Name', 'Department', 'Employment Status', 'Date of Joining'],
  'US Employee Database':    ['Employee ID', 'Employee Name', 'Department', 'Employment Status', 'Date of Joining'],
  'Risk Report':             ['Employee Name', 'Risk Category', 'Risk Level'],
  'Offboarded Resources':    ['Employee ID', 'Employee Name', 'Department', 'Date of Joining'],
  'Finance':                 ['Employee ID', 'Employee Name', 'CTC'],
  'Productivity':            ['Employee ID', 'Employee Name', 'Overall Avg Hrs/Day']
};

// ── ONEDIT INSTALLABLE ────────────────────────────────────────────────────────
function onEditInstallable(e) {
  try {
    const sheet = e.range.getSheet();
    const sheetName = sheet.getName();

    // DrillDown filter changed — just re-render table
    if (sheetName === "DrillDown") {
      const editedCell = e.range.getA1Notation();
      if (["B2", "D2", "F2", "H2"].includes(editedCell)) {
        renderDrillDown();
        logInfo("DrillDown filter changed");
      }
      return;
    }

    // Validate edits on ALL validated source tabs
    if (VALIDATED_TABS[sheetName]) {
      const error = validateEmployeeEdit(e, sheetName);
      if (error) {
        SpreadsheetApp.getActiveSpreadsheet().toast(
          error,
          '⚠️ Input Validation Error',
          12
        );
        logWarn(`Validation error in ${sheetName} at row ${e.range.getRow()}: ${error}`);
      }
    }

    if (SOURCE_TABS.includes(sheetName)) {
      refreshAll('onEdit: ' + sheetName);
    }

  } catch (err) {
    logError(`onEditInstallable failed: ${err.message}`);
    SpreadsheetApp.getActiveSpreadsheet().toast(
      'Dashboard update failed. Check the Logs tab for details.',
      '⚠️ Dashboard Error',
      8
    );
  }
}

// ── VALIDATE EMPLOYEE EDIT ────────────────────────────────────────────────────
function validateEmployeeEdit(e, sheetName) {
  const sheet = e.range.getSheet();
  const editedRow = e.range.getRow();
  const editedCol = e.range.getColumn();

  // Skip header row
  if (editedRow === 1) return null;

  // Get normalized headers using same resolution as getSheetData
  const rawHeaders = sheet
    .getRange(1, 1, 1, sheet.getLastColumn())
    .getValues()[0]
    .map(h => h.toString().trim());

  const headers = rawHeaders.map((h, idx) => {
    const normalized = normalizeHeader(h);
    if (normalized !== h) return normalized;
    const fallback = (COLUMN_POSITION_FALLBACK[sheetName] || [])[idx];
    return fallback || h;
  });

  const numRows = e.range.getNumRows();
  const numCols = e.range.getNumColumns();
  const rangeValues = e.range.getValues();

  const requiredFields = REQUIRED_FIELDS_BY_TAB[sheetName] || [];
  const errors = [];

  for (let r = 0; r < numRows; r++) {
    const absoluteRow = editedRow + r;
    if (absoluteRow === 1) continue; // skip header

    for (let c = 0; c < numCols; c++) {
      const colIndex = editedCol - 1 + c;
      const colHeader = headers[colIndex];
      const val = rangeValues[r][c];
      const isEmpty = val === '' || val === null || val === undefined;

      // ── Required field check ──────────────────────────────────────────────
      if (requiredFields.includes(colHeader) && isEmpty) {
        errors.push(`Row ${absoluteRow}: "${colHeader}" is required and cannot be blank.`);
        continue;
      }

      if (isEmpty) continue; // optional field, blank is fine

      // ── Date fields ───────────────────────────────────────────────────────
      const dateFields = ['Date of Joining', 'Last Working Day (Interns Only)'];
      if (dateFields.includes(colHeader)) {
        const d = new Date(val);
        if (isNaN(d.getTime())) {
          errors.push(`Row ${absoluteRow}: "${colHeader}" must be a valid date (e.g. 15/01/2024). Got: "${val}".`);
        }
      }

      // ── Employment Status enum ────────────────────────────────────────────
      if (colHeader === 'Employment Status') {
        const allowed = ['Confirmed', 'Under Probation', 'Intern'];
        if (!allowed.map(s => s.toLowerCase())
                    .includes(val.toString().trim().toLowerCase())) {
          errors.push(`Row ${absoluteRow}: "Employment Status" must be Confirmed, Under Probation, or Intern. Got: "${val}".`);
        }
      }

      // ── Risk Level enum ───────────────────────────────────────────────────
      if (colHeader === 'Risk Level') {
        const allowed = ['High', 'Medium', 'Low', 'Critical'];
        if (!allowed.map(s => s.toLowerCase())
                    .includes(val.toString().trim().toLowerCase())) {
          errors.push(`Row ${absoluteRow}: "Risk Level" must be High, Medium, Low, or Critical. Got: "${val}".`);
        }
      }

      // ── Allocation % range ────────────────────────────────────────────────
      if (colHeader === 'Allocation %') {
        const num = parseFloat(val);
        if (isNaN(num) || num < 0 || num > 100) {
          errors.push(`Row ${absoluteRow}: "Allocation %" must be a number between 0 and 100. Got: "${val}".`);
        }
      }

      // ── CTC must be numeric ───────────────────────────────────────────────
      if (colHeader === 'CTC') {
        const num = parseFloat(val);
        if (isNaN(num) || num < 0) {
          errors.push(`Row ${absoluteRow}: "CTC" must be a positive number. Got: "${val}".`);
        }
      }

      // ── Overall Avg Hrs/Day range ─────────────────────────────────────────
      if (colHeader === 'Overall Avg Hrs/Day') {
        const num = parseFloat(val);
        if (isNaN(num) || num < 0 || num > 24) {
          errors.push(`Row ${absoluteRow}: "Overall Avg Hrs/Day" must be between 0 and 24. Got: "${val}".`);
        }
      }

      // ── Employee ID not blank ─────────────────────────────────────────────
      if (colHeader === 'Employee ID' && val.toString().trim() === '') {
        errors.push(`Row ${absoluteRow}: "Employee ID" cannot be blank.`);
      }
    }
  }

  return errors.length > 0 ? errors.join('\n') : null;
}

// ── REFRESH ALL ───────────────────────────────────────────────────────────────

 function refreshAll(triggerSource) {

  const start =
    new Date().getTime();

  clearCache();

  try {
    renderDashboard();
  }
  catch (err) {
    logError(
      `renderDashboard failed: ${err.message}`
    );
  }

  try {
    renderOrgChart();
  }
  catch (err) {
    logError(
      `renderOrgChart failed: ${err.message}`
    );
  }

  try {
    setupDrillDownFilters();
    renderDrillDown();
  }
  catch (err) {
    logError(
      `renderDrillDown failed: ${err.message}`
    );
  }

  let lwdAlerts = [];
  let probationAlerts = [];

  try {

    lwdAlerts =
      getLWDAlerts();

    probationAlerts =
      getProbationAlerts();

  }
  catch (err) {

    logError(
      `Alert calculation failed: ${err.message}`
    );

  }

  const duration =
    new Date().getTime() - start;

  logInfo(
    `refreshAll completed (${triggerSource}) in ${duration}ms. LWD=${lwdAlerts.length}, Probation=${probationAlerts.length}`
  );

  return {
    duration,
    lwdAlerts,
    probationAlerts
  };
}

// ── HELPERS ───────────────────────────────────────────────────────────────────
function getDepartmentBreakdown(employees) {
  const counts = {};
  employees.forEach(e => {
    const dept = getField(e, 'Department') || 'Unknown';
    counts[dept] = (counts[dept] || 0) + 1;
  });
  return counts;
}

// ── DAILY PIPELINE ────────────────────────────────────────────────────────────
function dailyPipelineRun() {
  const runId = 'RUN-' + new Date().getTime();
  const result = refreshAll('daily-trigger');

  let emailStatus = 'Skipped (no active alerts)';
  try {
    emailStatus = sendAlertDigest(result.lwdAlerts, result.probationAlerts);
  } catch (err) {
    emailStatus = `Failed: ${err.message}`;
    logError(`sendAlertDigest failed: ${err.message}`);
  }

  writeChangelog(runId, 'daily-trigger', result.duration,
    result.lwdAlerts.length, result.probationAlerts.length, emailStatus);
}

// ── CHANGELOG ─────────────────────────────────────────────────────────────────
function writeChangelog(runId, source, durationMs, lwdCount, probationCount, notes) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Changelog');
  if (!sheet) {
    logWarn('Changelog tab not found, skipping changelog entry.');
    return;
  }
  sheet.appendRow([runId, new Date(), source, durationMs, lwdCount, probationCount, notes]);
}

// ── TRIGGER SETUP ─────────────────────────────────────────────────────────────
function createInstallableTriggers() {

  const triggers =
    ScriptApp.getProjectTriggers();

  triggers.forEach(t =>
    ScriptApp.deleteTrigger(t)
  );

  const ss =
    SpreadsheetApp.getActiveSpreadsheet();

  // ON EDIT
  ScriptApp.newTrigger(
    "onEditInstallable"
  )
  .forSpreadsheet(ss)
  .onEdit()
  .create();

  // ON CHANGE
  ScriptApp.newTrigger(
    "onSpreadsheetChange"
  )
  .forSpreadsheet(ss)
  .onChange()
  .create();

  // DAILY PIPELINE
  ScriptApp.newTrigger(
    "dailyPipelineRun"
  )
  .timeBased()
  .everyDays(1)
  .atHour(8)
  .create();

  logInfo(
    "Installable triggers created successfully."
  );

  console.log(
    "Triggers created successfully."
  );
}
// ── TESTS ─────────────────────────────────────────────────────────────────────
function testTriggersPipeline() {
  const result = refreshAll('manual-test');
  console.log(`Refresh done in ${result.duration}ms`);
  console.log(`LWD alerts: ${result.lwdAlerts.length}, Probation alerts: ${result.probationAlerts.length}`);
}

function testEmailLogDirectly() {
  logEmailStatus('TEST', 'test@example.com', 5, 'Direct test write');
  console.log('Done — check EmailLog tab now.');
}

function testValidation() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('India Employee Database');

  const fakeEvent = {
    range: sheet.getRange('H2'),
    value: ''
  };

  fakeEvent.range.getValues = () => [['']];
  fakeEvent.range.getNumRows = () => 1;
  fakeEvent.range.getNumColumns = () => 1;
  fakeEvent.range.getRow = () => 2;
  fakeEvent.range.getColumn = () => 8;

  const result = validateEmployeeEdit(fakeEvent, 'India Employee Database');
  console.log('Validation result:', result);
}
function onSpreadsheetChange(e) {
  try {

    logInfo(
      "Spreadsheet change detected: " +
      e.changeType
    );

    const validChanges = [
      "INSERT_ROW",
      "REMOVE_ROW",
      "INSERT_COLUMN",
      "REMOVE_COLUMN",
      "EDIT"
    ];

    if (
      validChanges.includes(
        e.changeType
      )
    ) {

      refreshAll(
        "onChange: " +
        e.changeType
      );

    }

  } catch (err) {

    logError(
      `onSpreadsheetChange failed: ${err.message}`
    );

  }
}