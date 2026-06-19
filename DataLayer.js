/**
 * DataLayer.gs
 * Header-agnostic data access layer.
 * Resolution order:
 *   1. Exact match map
 *   2. Fuzzy keyword fallback
 *   3. Positional fallback (for arbitrary renames like "XYZ")
 *   4. Keep raw header (no silent drop)
 */

// ── IN-MEMORY REQUEST CACHE ───────────────────────────────────────────────────
let _cache = {};

function clearCache() {

  _cache = {};
}

function getCached(key, loaderFn) {
  if (_cache[key] === undefined) {
    _cache[key] = loaderFn();
  }
  return _cache[key];
}

function cachedEmployees() {
  return getCached('employees', () => getAllEmployees());
}

function cachedSheetData(tabName) {
  return getCached('sheet_' + tabName, () => getSheetData(tabName));
}

// ── POSITIONAL FALLBACK ───────────────────────────────────────────────────────
// IMPORTANT: column order must match EXACTLY what's in the actual sheet.
const COLUMN_POSITION_FALLBACK = {

  // Col: 1              2               3             4               5                   6          7                8             9                    10
  'India Employee Database': [
    'Employee ID',
    'Employee Name',
    'Department',
    'Designation',
    'Reporting Manager',
    'Skillset',
    'Date of Joining',
    'Employment Status',
    'Last Working Day (Interns Only)'
  ],

  // Col: 1              2               3             4               5                   6                      7                8          9                  10                  11
  'US Employee Database': [
    'Employee ID',           // col 1: Employee ID
    'Employee Name',         // col 2: Employee Name
    'Department',            // col 3: Department
    'Designation',           // col 4: Designation
    'Reporting Manager',     // col 5: Reporting Manager
    'Allocation %',          // col 6: Current Allocation (%)
    'CTC',                   // col 7: CTC (Annual USD)
    'Skillset',              // col 8: Skillset
    'Date of Joining',       // col 9: Date of Joining
    'Employment Status',     // col 10: Employment Status
    'Last Working Day (Interns Only)' // col 11: Last Working Day (Interns Only)
  ],
'Risk Report': [
  'Employee ID',
  'Employee Name',
  'Department',
  'Region',
  'Risk Category',
  'Risk Level',
  'Identified Date',
  'Mitigation Action',
  'Status',
  'HR Notes'
],

  'Finance': [
    'Employee ID',
    'Employee Name',
    'Department',
    'CTC'
  ],

  'Productivity': [
    'Employee ID',
    'Employee Name',
    'Department',
    'Overall Avg Hrs/Day',
    'Below 8 Hrs Flag'
  ],

  'Offboarded Resources': [
    'Employee ID',
    'Employee Name',
    'Department',
    'Designation',
    'Reporting Manager',
    'Date of Joining',
    'Last Working Day (Interns Only)',
    'Employment Status',
    'Region'
  ],

  'RM Data': [
    'Employee ID',
    'Employee Name',
    'Department'
  ]
};

// ── NORMALIZE HEADER ──────────────────────────────────────────────────────────
function normalizeHeader(raw) {
  const h = raw.toString().trim();

  // TIER 1: Exact match
  const exactMap = {
    // Employee ID
    "Employee ID": "Employee ID",
    "Emp ID": "Employee ID",
    "EmpID": "Employee ID",
    "ID": "Employee ID",

    // Employee Name
    "Employee Name": "Employee Name",
    "EName": "Employee Name",
    "Employee_Name": "Employee Name",
    "Name": "Employee Name",
    "Full Name": "Employee Name",
    "Resource Name": "Employee Name",

    // Department
    "Department": "Department",
    "Dept": "Department",
    "Division": "Department",
    "Team": "Department",

    // Region
    "Region": "Region",
    "Location": "Region",
    "Country": "Region",
    "Office": "Region",

    // Employment Status
"Employment Status": "Employment Status",
"Emp Status": "Employment Status",
"Employment Type": "Employment Status",
"Employee Status": "Employment Status",

// Generic Status
"Status": "Status",

    // Reporting Manager
    "Reporting Manager": "Reporting Manager",
    "Manager": "Reporting Manager",
    "RM": "Reporting Manager",
    "Reports To": "Reporting Manager",
    "Direct Manager": "Reporting Manager",

    // Date of Joining
    "Date of Joining": "Date of Joining",
    "DOJ": "Date of Joining",
    "Joining Date": "Date of Joining",
    "Start Date": "Date of Joining",
    "Date of Join": "Date of Joining",
    "Join Date": "Date of Joining",

    // Last Working Day
    "Last Working Day (Interns Only)": "Last Working Day (Interns Only)",
    "LWD": "Last Working Day (Interns Only)",
    "Last Working Day": "Last Working Day (Interns Only)",
    "Last Day": "Last Working Day (Interns Only)",
    "Exit Date": "Last Working Day (Interns Only)",
    "End Date": "Last Working Day (Interns Only)",

    // Designation
    "Designation": "Designation",
    "Role": "Designation",
    "Job Title": "Designation",
    "Title": "Designation",
    "Position": "Designation",

    // Skillset
    "Skillset": "Skillset",
    "Skills": "Skillset",
    "Skill Set": "Skillset",
    "Skill": "Skillset",

    // Allocation — covers US tab "Current Allocation (%)"
    "Allocation %": "Allocation %",
    "Allocation": "Allocation %",
    "Alloc %": "Allocation %",
    "Alloc": "Allocation %",
    "Allocation Percentage": "Allocation %",
    "Current Allocation (%)": "Allocation %",
    "Current Allocation": "Allocation %",

    // CTC — covers US tab "CTC (Annual USD)" and India variants
    "CTC": "CTC",
    "Salary": "CTC",
    "Annual CTC": "CTC",
    "Total CTC": "CTC",
    "Compensation": "CTC",
    "CTC (Annual USD)": "CTC",
    "CTC (Annual INR)": "CTC",
    "CTC (USD)": "CTC",
    "CTC (INR)": "CTC",

    // Risk Report
    "Risk Category": "Risk Category",
    "Category": "Risk Category",
    "Risk Type": "Risk Category",
    "Risk Level": "Risk Level",
    "Level": "Risk Level",
    "Severity": "Risk Level",
    "Risk Severity": "Risk Level",
    "Mitigation Action": "Mitigation Action",
    "Action": "Mitigation Action",
    "Action Plan": "Mitigation Action",
    "Mitigation": "Mitigation Action",
    "Resolution": "Mitigation Action",

    // Productivity
    "Overall Avg Hrs/Day": "Overall Avg Hrs/Day",
    "Avg Hrs/Day": "Overall Avg Hrs/Day",
    "Average Hours": "Overall Avg Hrs/Day",
    "Avg Hours": "Overall Avg Hrs/Day",
    "Avg Hours/Day": "Overall Avg Hrs/Day",
    "Average Hrs/Day": "Overall Avg Hrs/Day",
    "Productivity Score": "Overall Avg Hrs/Day",
    "Below 8 Hrs Flag": "Below 8 Hrs Flag",
    "Flag": "Below 8 Hrs Flag",
    "Hours Flag": "Below 8 Hrs Flag",
    "Low Hours Flag": "Below 8 Hrs Flag",
    "Productivity Flag": "Below 8 Hrs Flag",
    "Below Target": "Below 8 Hrs Flag"
  };

  if (exactMap[h]) return exactMap[h];

  // TIER 2: Fuzzy keyword match
  const lower = h.toLowerCase();

  if ((lower.includes('emp') || lower.includes('employee')) && lower.includes('id')) return 'Employee ID';
  if (lower.includes('name') && !lower.includes('manager')) return 'Employee Name';
  if (lower.includes('dept') || lower.includes('department') || lower.includes('division')) return 'Department';
  if (lower.includes('employment') && lower.includes('status')) return 'Employment Status';
  if (lower.includes('manager') || lower.includes('reporting')) return 'Reporting Manager';
  if ((lower.includes('date') || lower.includes('day')) && lower.includes('join')) return 'Date of Joining';
  if (lower === 'doj') return 'Date of Joining';
  if (lower.includes('last') && (lower.includes('day') || lower.includes('working'))) return 'Last Working Day (Interns Only)';
  if (lower === 'lwd' || (lower.includes('exit') && lower.includes('date'))) return 'Last Working Day (Interns Only)';
  if (lower.includes('designation') || lower.includes('job title') || lower.includes('position')) return 'Designation';
  if (lower.includes('skill')) return 'Skillset';
  if (lower.includes('alloc')) return 'Allocation %';
  if (lower.includes('ctc') || lower.includes('salary') || lower.includes('compensation')) return 'CTC';
  if (lower.includes('region') || lower.includes('location') || lower.includes('country')) return 'Region';
  if (lower.includes('risk') && lower.includes('category')) return 'Risk Category';
  if (lower.includes('risk') && (lower.includes('level') || lower.includes('sever'))) return 'Risk Level';
  if (lower.includes('mitigation') || lower.includes('action plan')) return 'Mitigation Action';
  if (lower.includes('avg') && (lower.includes('hr') || lower.includes('hour'))) return 'Overall Avg Hrs/Day';
  if ((lower.includes('below') || lower.includes('flag')) && (lower.includes('hr') || lower.includes('hour') || lower.includes('target'))) return 'Below 8 Hrs Flag';
  if (lower.includes('productivity') && lower.includes('flag')) return 'Below 8 Hrs Flag';

  // No match — positional fallback handles in getSheetData
  return h;
}

// ── GET SHEET DATA ────────────────────────────────────────────────────────────
function getSheetData(tabName) {
  const sheet = SpreadsheetApp
    .getActiveSpreadsheet()
    .getSheetByName(tabName);

  if (!sheet) {
    throw new Error(`DataLayer Error: Tab "${tabName}" not found.`);
  }

  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];

  const rawHeaders = values[0].map(h => h.toString().trim());
  const positionalFallback = COLUMN_POSITION_FALLBACK[tabName] || [];

  const headers = rawHeaders.map((raw, idx) => {
    // Tier 1+2: name-based resolution
    const normalized = normalizeHeader(raw);
    if (normalized !== raw) return normalized;

    // Tier 3: positional fallback for arbitrary renames like "XYZ"
    if (positionalFallback[idx]) {
      logWarn(`"${tabName}" col ${idx + 1}: "${raw}" unrecognised — positional fallback: "${positionalFallback[idx]}"`);
      return positionalFallback[idx];
    }

    // Tier 4: unknown extra column — keep raw
    return raw;
  });

  const rows = [];
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    const isBlank = row.every(cell => cell === '' || cell === null);
    if (isBlank) continue;

    const obj = {};
    headers.forEach((header, idx) => {
      if (header) obj[header] = row[idx];
    });
    obj._rowNumber = i + 1;
    rows.push(obj);
  }

  return rows;
}

// ── GET COLUMN INDEX ──────────────────────────────────────────────────────────
function getColumnIndex(tabName, canonicalName) {
  const sheet = SpreadsheetApp
    .getActiveSpreadsheet()
    .getSheetByName(tabName);
  if (!sheet) throw new Error(`DataLayer Error: Tab "${tabName}" not found.`);

  const rawHeaders = sheet
    .getRange(1, 1, 1, sheet.getLastColumn())
    .getValues()[0]
    .map(h => h.toString().trim());

  const positionalFallback = COLUMN_POSITION_FALLBACK[tabName] || [];

  for (let i = 0; i < rawHeaders.length; i++) {
    const normalized = normalizeHeader(rawHeaders[i]);
    if (normalized === canonicalName) return i;
    if (normalized === rawHeaders[i] && positionalFallback[i] === canonicalName) return i;
  }

  return -1;
}

// ── GET FIELD ─────────────────────────────────────────────────────────────────
function getField(record, canonicalName) {
  if (record[canonicalName] !== undefined) return record[canonicalName];

  for (const key of Object.keys(record)) {
    if (normalizeHeader(key) === canonicalName) return record[key];
  }

  return null;
}

// ── JOIN ON ───────────────────────────────────────────────────────────────────
function joinOn(leftRecords, rightRecords, canonicalKey) {
  const rightMap = {};
  rightRecords.forEach(record => {
    const keyVal = getField(record, canonicalKey);
    if (keyVal === null || keyVal === '') return;
    const k = keyVal.toString().trim().toLowerCase();
    if (!rightMap[k]) rightMap[k] = [];
    rightMap[k].push(record);
  });

  return leftRecords.map(record => {
    const keyVal = getField(record, canonicalKey);
    const k = keyVal ? keyVal.toString().trim().toLowerCase() : '';
    return { ...record, _joined: rightMap[k] || [] };
  });
}

// ── GET ALL EMPLOYEES ─────────────────────────────────────────────────────────
function getAllEmployees() {
  const india = getSheetData('India Employee Database').map(emp => ({
    ...emp,
    Region: 'India',
    _sourceTab: 'India Employee Database'
  }));

  const us = getSheetData('US Employee Database').map(emp => ({
    ...emp,
    Region: 'US',
    _sourceTab: 'US Employee Database'
  }));

  return [...india, ...us];
}

function testDataLayer() {
  clearCache();
  const all = cachedEmployees();
  console.log(`Total employees: ${all.length}`);
}
function getRMData() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet()
    .getSheetByName('RM Data');

  if (!sheet) {
    throw new Error('RM Data sheet not found');
  }

  const values = sheet.getDataRange().getValues();

  if (values.length < 3) return [];

  const header1 = values[0];
  const header2 = values[1];

  const headers = [];
  let currentMonth = '';

  for (let i = 0; i < header1.length; i++) {

    if (header1[i]) {
      currentMonth = header1[i];
    }

    if (i < 4) {
      headers.push(header1[i]);
    } else {
      headers.push(`${currentMonth} ${header2[i]}`);
    }
  }

  const rows = [];

  for (let r = 2; r < values.length; r++) {
    const row = values[r];

    const obj = {};

    headers.forEach((h, idx) => {
      obj[h] = row[idx];
    });

    obj._rowNumber = r + 1;

    rows.push(obj);
  }

  return rows;
}
function testRiskData() {
  const risk = cachedSheetData('Risk Report');
  Logger.log(JSON.stringify(risk[0], null, 2));
}
function testRiskHeaders() {
  const risk = cachedSheetData('Risk Report');
  Logger.log(JSON.stringify(risk[0], null, 2));
}
function testRiskStatus() {
  clearCache();
  const risk = cachedSheetData('Risk Report');
  Logger.log(JSON.stringify(risk[0], null, 2));
}
function testRMData() {
  const rm = getRMData();
  Logger.log(JSON.stringify(rm[0], null, 2));
}