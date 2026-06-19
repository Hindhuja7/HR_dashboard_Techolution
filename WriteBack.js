/**
 * WriteBack.gs
 * Bidirectional editing — functions called from the web app (via google.script.run)
 * that write changes back into the Google Sheet.
 */

// ── CASE-INSENSITIVE HELPERS ─────────────────────────────────────────────────
/**
 * Normalizes a name for comparison purposes only (trim + lowercase).
 * Used for Reporting Manager and Employee Name matching, where HR may type
 * "arjun joshi" instead of "Arjun Joshi" and it should still match.
 * Employee ID and Employment Status remain exact-match (not passed through this).
 */
function normalizeForMatch(str) {
  return (str || '').toString().trim().toLowerCase();
}

/**
 * Finds the canonical (correctly-cased) version of a name already present
 * in the employee data, given a case-insensitive input. Falls back to the
 * input as-typed if no existing match is found (so brand-new managers/names
 * can still be added).
 */
function resolveCanonicalName(inputName, employees, fieldName) {
  if (!inputName) return inputName;
  const target = normalizeForMatch(inputName);
  for (const emp of employees) {
    const existing = getField(emp, fieldName);
    if (normalizeForMatch(existing) === target) {
      return existing; // return the already-correct casing from the sheet
    }
  }
  return inputName.toString().trim(); // no existing match — keep as typed
}

// ── ADD EMPLOYEE ───────────────────────────────────────────────────────────

function addEmployee(emp) {
  try {
    const validation = validateNewEmployee(emp);
    if (!validation.valid) {
      return { success: false, message: validation.message };
    }

    const idPrefix = emp.employeeId.trim().substring(0, 2).toUpperCase();
    const tabName = idPrefix === 'US' ? 'US Employee Database' : 'India Employee Database';

    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(tabName);
    if (!sheet) throw new Error(`Tab "${tabName}" not found.`);

    const existing = getAllEmployees();

    // Employee ID stays exact-match (IDs must be unique and precise)
    if (existing.some(e => (getField(e, 'Employee ID') || '').toString().trim().toUpperCase() === emp.employeeId.trim().toUpperCase())) {
      return { success: false, message: `Employee ID "${emp.employeeId}" already exists. Choose a unique ID.` };
    }

    // Reporting Manager — case-insensitive match against existing managers,
    // so "arjun joshi" resolves to the already-correct "Arjun Joshi" in the sheet.
    const canonicalManager = resolveCanonicalName(emp.reportingManager, existing, 'Reporting Manager');

    const headerRow = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]
      .map(h => h.toString().trim());

    const fieldMap = {
      'Employee ID': emp.employeeId.trim(),
      'Employee Name': emp.employeeName.trim(),
      'Department': emp.department.trim(),
      'Designation': emp.designation.trim(),
      'Reporting Manager': canonicalManager,
      'Skillset': emp.skillset || '',
      'Date of Joining': emp.doj ? new Date(emp.doj) : new Date(),
      'Employment Status': emp.employmentStatus, // exact-match enum, not normalized
      'Last Working Day (Interns Only)': emp.employmentStatus === 'Intern' && emp.lwd ? new Date(emp.lwd) : 'N/A',
      'Allocation %': emp.allocation || '',
      'CTC': emp.ctc || ''
    };

    const newRow = headerRow.map(rawHeader => {
      const canonical = normalizeHeader(rawHeader);
      return fieldMap.hasOwnProperty(canonical) ? fieldMap[canonical] : '';
    });

    sheet.appendRow(newRow);

    logInfo(`Web app: added employee ${emp.employeeId} (${emp.employeeName}) to ${tabName}. Manager resolved to "${canonicalManager}".`);
    refreshAll('webapp-addEmployee');

    return { success: true, message: `${emp.employeeName} (${emp.employeeId}) added successfully.` };

  } catch (err) {
    logError('addEmployee failed: ' + err.message);
    return { success: false, message: 'Could not add employee: ' + err.message };
  }
}

function validateNewEmployee(emp) {
  if (!emp) return { valid: false, message: 'No employee data received.' };
  if (!emp.employeeId || !emp.employeeId.trim()) return { valid: false, message: 'Employee ID is required.' };
  if (!/^(IN|US)/i.test(emp.employeeId.trim())) return { valid: false, message: 'Employee ID must start with IN or US (e.g. IN1070, US2030).' };
  if (!emp.employeeName || !emp.employeeName.trim()) return { valid: false, message: 'Employee Name is required.' };
  if (!emp.department || !emp.department.trim()) return { valid: false, message: 'Department is required.' };
  if (!emp.designation || !emp.designation.trim()) return { valid: false, message: 'Designation is required.' };
  if (!emp.reportingManager || !emp.reportingManager.trim()) return { valid: false, message: 'Reporting Manager is required.' };

  // Employment Status — case-insensitive CHECK but normalized to correct case on save
  const validStatuses = ['Confirmed', 'Under Probation', 'Intern'];
  const matchedStatus = validStatuses.find(s => s.toLowerCase() === (emp.employmentStatus || '').toLowerCase());
  if (!matchedStatus) {
    return { valid: false, message: 'Employment Status must be Confirmed, Under Probation, or Intern.' };
  }
  emp.employmentStatus = matchedStatus; // normalize casing before it's written

  if (emp.employmentStatus === 'Intern' && !emp.lwd) {
    return { valid: false, message: 'Last Working Day is required for interns.' };
  }
  if (emp.doj && isNaN(new Date(emp.doj).getTime())) {
    return { valid: false, message: 'Date of Joining must be a valid date.' };
  }
  if (emp.lwd && isNaN(new Date(emp.lwd).getTime())) {
    return { valid: false, message: 'Last Working Day must be a valid date.' };
  }
  return { valid: true };
}

// ── REMOVE EMPLOYEE (OFFBOARD) ──────────────────────────────────────────────

function removeEmployee(employeeId, exitInfo) {
  try {
    if (!employeeId || !employeeId.trim()) {
      return { success: false, message: 'Employee ID is required.' };
    }
    exitInfo = exitInfo || {};

    const employees = getAllEmployees();
    // Employee ID lookup stays exact (case-insensitive only for typo tolerance, IDs are otherwise fixed format)
    const target = employees.find(e =>
      (getField(e, 'Employee ID') || '').toString().trim().toUpperCase() === employeeId.trim().toUpperCase()
    );

    if (!target) {
      return { success: false, message: `Employee ID "${employeeId}" not found.` };
    }

    const sourceTab = getField(target, '_sourceTab');
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sourceTab);
    const rowNumber = target._rowNumber;

    const offboardSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Offboarded Resources');
    if (!offboardSheet) throw new Error('Offboarded Resources tab not found.');

    const offHeaderRow = offboardSheet.getRange(1, 1, 1, offboardSheet.getLastColumn()).getValues()[0]
      .map(h => h.toString().trim());

    const lwd = exitInfo.lastWorkingDay ? new Date(exitInfo.lastWorkingDay) : new Date();
    const quarter = `Q${Math.floor(lwd.getMonth() / 3) + 1}-${lwd.getFullYear()}`;

    const offFieldMap = {
      'Employee ID': getField(target, 'Employee ID'),
      'Employee Name': getField(target, 'Employee Name'),
      'Department': getField(target, 'Department'),
      'Region': getField(target, 'Region'),
      'Designation': getField(target, 'Designation'),
      'Reporting Manager': getField(target, 'Reporting Manager'),
      'Date of Joining': getField(target, 'Date of Joining'),
      'Last Working Day (Interns Only)': lwd
    };

    const offRow = offHeaderRow.map(rawHeader => {
      const canonical = normalizeHeader(rawHeader);
      if (canonical === 'Exit Reason') return exitInfo.exitReason || 'Not specified';
      if (rawHeader === 'Exit Quarter') return quarter;
      if (rawHeader === 'Notice Period Served') return exitInfo.noticePeriodServed || 'No';
      if (rawHeader === 'Rehire Eligible') return exitInfo.rehireEligible || 'Yes';
      return offFieldMap.hasOwnProperty(canonical) ? offFieldMap[canonical] : '';
    });

    offboardSheet.appendRow(offRow);
    sheet.deleteRow(rowNumber);

    logInfo(`Web app: offboarded employee ${employeeId} (${getField(target, 'Employee Name')}) from ${sourceTab}.`);
    refreshAll('webapp-removeEmployee');

    return { success: true, message: `${getField(target, 'Employee Name')} (${employeeId}) moved to Offboarded Resources.` };

  } catch (err) {
    logError('removeEmployee failed: ' + err.message);
    return { success: false, message: 'Could not remove employee: ' + err.message };
  }
}

// ── UPDATE EMPLOYEE FIELD ───────────────────────────────────────────────────

function updateEmployeeField(employeeId, fieldName, newValue) {
  try {
    if (!employeeId || !employeeId.trim()) return { success: false, message: 'Employee ID is required.' };
    if (!fieldName) return { success: false, message: 'Field name is required.' };

    const employees = getAllEmployees();

    // Case-insensitive normalization for Reporting Manager updates specifically
    if (fieldName === 'Reporting Manager') {
      newValue = resolveCanonicalName(newValue, employees, 'Reporting Manager');
    }

    const validation = validateFieldUpdate(fieldName, newValue);
    if (!validation.valid) return { success: false, message: validation.message };
    if (validation.normalizedValue !== undefined) newValue = validation.normalizedValue;

    const target = employees.find(e =>
      (getField(e, 'Employee ID') || '').toString().trim().toUpperCase() === employeeId.trim().toUpperCase()
    );
    if (!target) return { success: false, message: `Employee ID "${employeeId}" not found.` };

    const sourceTab = getField(target, '_sourceTab');
    const colIndex = getColumnIndex(sourceTab, fieldName);
    if (colIndex === -1) {
      return { success: false, message: `Field "${fieldName}" does not exist in ${sourceTab}.` };
    }

    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sourceTab);
    const writeValue = (fieldName === 'Date of Joining' || fieldName === 'Last Working Day (Interns Only)')
      ? new Date(newValue)
      : newValue;

    sheet.getRange(target._rowNumber, colIndex + 1).setValue(writeValue);

    logInfo(`Web app: updated ${fieldName} for ${employeeId} to "${newValue}" in ${sourceTab}.`);
    refreshAll('webapp-updateEmployeeField');

    return { success: true, message: `${fieldName} updated for ${getField(target, 'Employee Name')}.` };

  } catch (err) {
    logError('updateEmployeeField failed: ' + err.message);
    return { success: false, message: 'Could not update field: ' + err.message };
  }
}

function validateFieldUpdate(fieldName, newValue) {
  // Employment Status — case-insensitive check, normalized casing returned
  if (fieldName === 'Employment Status') {
    const validStatuses = ['Confirmed', 'Under Probation', 'Intern'];
    const matched = validStatuses.find(s => s.toLowerCase() === (newValue || '').toString().toLowerCase());
    if (!matched) {
      return { valid: false, message: 'Employment Status must be Confirmed, Under Probation, or Intern.' };
    }
    return { valid: true, normalizedValue: matched };
  }
  if (fieldName === 'Allocation %') {
    const n = Number(newValue);
    if (isNaN(n) || n < 0 || n > 100) {
      return { valid: false, message: 'Allocation % must be a number between 0 and 100.' };
    }
  }
  if (fieldName === 'CTC') {
    const n = Number(newValue);
    if (isNaN(n) || n <= 0) {
      return { valid: false, message: 'CTC must be a positive number.' };
    }
  }
  if (fieldName === 'Date of Joining' || fieldName === 'Last Working Day (Interns Only)') {
    if (isNaN(new Date(newValue).getTime())) {
      return { valid: false, message: `${fieldName} must be a valid date.` };
    }
  }
  if ((fieldName === 'Employee Name' || fieldName === 'Department' || fieldName === 'Designation' || fieldName === 'Reporting Manager')
      && (!newValue || !newValue.toString().trim())) {
    return { valid: false, message: `${fieldName} cannot be blank.` };
  }
  return { valid: true };
}

// ── UPDATE PROJECT ASSIGNMENT (RM Data) ─────────────────────────────────────

function updateProjectAssignment(employeeId, project, allocationPct) {
  try {
    if (!employeeId || !employeeId.trim()) return { success: false, message: 'Employee ID is required.' };
    if (!project || !project.trim()) return { success: false, message: 'Project name is required.' };
    const pct = Number(allocationPct);
    if (isNaN(pct) || pct < 0 || pct > 100) {
      return { success: false, message: 'Allocation % must be a number between 0 and 100.' };
    }

    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('RM Data');
    if (!sheet) throw new Error('RM Data tab not found.');

    const values = sheet.getDataRange().getValues();
    const monthRow = values[0];
    const subHeaderRow = values[1];

    const { monthLabel, projectCol, allocCol } = findCurrentMonthColumns(monthRow, subHeaderRow);
    if (projectCol === -1) {
      return { success: false, message: 'Could not locate a current-month Project/Allocation column pair in RM Data.' };
    }

    let targetRowIndex = -1;
    for (let i = 2; i < values.length; i++) {
      if ((values[i][0] || '').toString().trim().toUpperCase() === employeeId.trim().toUpperCase()) {
        targetRowIndex = i;
        break;
      }
    }
    if (targetRowIndex === -1) {
      return { success: false, message: `Employee ID "${employeeId}" not found in RM Data.` };
    }

    sheet.getRange(targetRowIndex + 1, projectCol + 1).setValue(project);
    sheet.getRange(targetRowIndex + 1, allocCol + 1).setValue(pct / 100);

    logInfo(`Web app: updated ${employeeId} project assignment to "${project}" (${pct}%) for ${monthLabel} in RM Data.`);
    refreshAll('webapp-updateProjectAssignment');

    return { success: true, message: `Project assignment updated for ${employeeId} (${monthLabel}).` };

  } catch (err) {
    logError('updateProjectAssignment failed: ' + err.message);
    return { success: false, message: 'Could not update project assignment: ' + err.message };
  }
}

function findCurrentMonthColumns(monthRow, subHeaderRow) {
  const now = new Date();
  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const currentLabel = `${monthNames[now.getMonth()]}-${now.getFullYear()}`;

  let lastProjectCol = -1, lastAllocCol = -1, lastLabel = '';

  for (let c = 4; c < monthRow.length; c++) {
    const label = (monthRow[c] || '').toString().trim();
    const sub = (subHeaderRow[c] || '').toString().trim();
    if (sub === 'Project') {
      lastProjectCol = c;
      lastAllocCol = c + 1;
      lastLabel = label || lastLabel;
      if (label === currentLabel) {
        return { monthLabel: label, projectCol: c, allocCol: c + 1 };
      }
    }
  }
  return { monthLabel: lastLabel || currentLabel, projectCol: lastProjectCol, allocCol: lastAllocCol };
}

