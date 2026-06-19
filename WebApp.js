/**
 * WebApp.gs
 * Deployed Apps Script web app — serves the HR dashboard as a browser UI.
 * Authentication: restricted to authenticated Workspace users (set in deployment).
 * All data read fresh from source tabs on each request via existing backend functions.
 */

function doGet(e) {
  return HtmlService
    .createHtmlOutputFromFile('WebApp1')
    .setTitle('HR Automation Dashboard')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// ── DATA ENDPOINTS (called from frontend via google.script.run) ───────────────

function getWebAppData() {
  try {
    clearCache();

    const employees        = cachedEmployees();
    const risks            = cachedSheetData('Risk Report');
    const productivity     = cachedSheetData('Productivity');
    const rmData = getRMData();
    const offboarded       = cachedSheetData('Offboarded Resources');
    // Create lookup map
    const rmMap = {};                   // <-- ADD THIS
    rmData.forEach(r => {
      rmMap[r["Employee ID"]] = r;
    });
    const lwdAlerts        = getLWDAlerts();
    const probationAlerts  = getProbationAlerts();

    // KPIs
    const kpis = {
      total:        employees.length,
      india:        employees.filter(e => getField(e, 'Region') === 'India').length,
      us:           employees.filter(e => getField(e, 'Region') === 'US').length,
      confirmed:    employees.filter(e => getField(e, 'Employment Status') === 'Confirmed').length,
      probation:    employees.filter(e => getField(e, 'Employment Status') === 'Under Probation').length,
      interns:      employees.filter(e => getField(e, 'Employment Status') === 'Intern').length,
      highRisk:     risks.filter(r => getField(r, 'Risk Level') === 'High').length,
      prodFlags:    productivity.filter(p => (getField(p, 'Below 8 Hrs Flag') || '').toString().trim() !== '').length,
      lwdAlerts:    lwdAlerts.length,
      probAlerts:   probationAlerts.length
    };
    const employeeFinance = employees.map(e => {

  const empId = getField(e, 'Employee ID') || '';
  const rm = rmMap[empId] || {};

  return {
    employeeId: empId,
    employeeName: getField(e, 'Employee Name') || '',
    department: getField(e, 'Department') || '',
    region: getField(e, 'Region') || '',
    project: rm["Dec-2025 Project"] || 'Unassigned',
    ctc: Number(rm["Annual CTC"] || 0)
  };

});

    // Department breakdown
    const deptMap = {};
    employees.forEach(e => {
      const d = getField(e, 'Department') || 'Unknown';
      deptMap[d] = (deptMap[d] || 0) + 1;
    });
    const departments = Object.entries(deptMap)
      .sort((a, b) => b[1] - a[1])
      .map(([dept, count]) => ({ dept, count }));

    // Quarterly attrition — current quarter from Offboarded Resources
    const attrition = getQuarterlyAttrition(offboarded, employees.length);

    // Risk register
    const riskRegister = risks.map(r => ({
      name:     getField(r, 'Employee Name') || '',
      category: getField(r, 'Risk Category') || '',
      level:    getField(r, 'Risk Level') || '',
      status:   getField(r, 'Status') || '',
      action:   getField(r, 'Mitigation Action') || ''
    }));

    // Org chart data — manager → reports map
    const orgData = buildOrgData(employees);

    // Drill-down — all employees serialized
    // Drill-down — all employees serialized
// Drill-down — all employees serialized
const employeeList = employees.map(e => {
  const empId = getField(e, 'Employee ID') || '';
  const rm = rmMap[empId] || {};

  return {
    id: empId,
    name: getField(e, 'Employee Name') || '',
    dept: getField(e, 'Department') || '',
    region: getField(e, 'Region') || '',
    manager: getField(e, 'Reporting Manager') || '',
    status: getField(e, 'Employment Status') || '',
    designation: getField(e, 'Designation') || '',
    doj: formatDate(getField(e, 'Date of Joining')),

    currentProject: rm["Dec-2025 Project"] || '',
    allocation: rm["Dec-2025 Allocation (%)"] || ''
  };
});

    // Unique filter values for drill-down
    const filters = {
      regions:    [...new Set(employeeList.map(e => e.region).filter(Boolean))].sort(),
      departments:[...new Set(employeeList.map(e => e.dept).filter(Boolean))].sort(),
      managers:   [...new Set(employeeList.map(e => e.manager).filter(Boolean))].sort(),
      statuses:   [...new Set(employeeList.map(e => e.status).filter(Boolean))].sort()
    };
const alertEngine = getAlertEngineRecommendations();
const productivityData = getProductivityData();
const financeData =getFinanceData();
const topPerformers =
  getTopPerformers(5);
const projectFinance =
  getProjectFinanceSummary();

const departmentFinance =
  getDepartmentFinanceSummary();
const lowestPerformers =
  getLowestPerformers(5);
    return {
  success: true,
  generatedAt: new Date().toLocaleString(),
projectFinance,
departmentFinance,
  kpis,
  alertEngine,
employeeFinance,
  productivityData,

  financeData,
  topPerformers,
  lowestPerformers,
      lwdAlerts:     lwdAlerts.map(a => ({
        id:       a.employeeId,
        name:     a.name,
        dept:     a.department,
        region:   a.region,
        lwd:      a.lwd.toDateString(),
        daysUntil: a.daysUntil,
        status:   a.status
      })),
      probationAlerts: probationAlerts.map(a => ({
        id:               a.employeeId,
        name:             a.name,
        dept:             a.department,
        region:           a.region,
        confirmationDate: a.confirmationDate.toDateString(),
        daysUntil:        a.daysUntil,
        status:           a.status
      })),
      departments,
      attrition,
      riskRegister,
      orgData,
      employeeList,
      filters
    };

  } catch (err) {
    logError('getWebAppData failed: ' + err.message);
    return { success: false, error: err.message };
  }
}

// ── HELPERS ───────────────────────────────────────────────────────────────────

function getQuarterlyAttrition(offboarded, currentHeadcount) {
  const now = new Date();
  const currentQ = Math.floor(now.getMonth() / 3);
  const currentYear = now.getFullYear();

  const quarters = [];

  for (let i = 3; i >= 0; i--) {
    let q = currentQ - i;
    let y = currentYear;
    if (q < 0) { q += 4; y -= 1; }

    const qStart = new Date(y, q * 3, 1);
    const qEnd   = new Date(y, q * 3 + 3, 0);

    const exits = offboarded.filter(r => {
      const lwd = new Date(getField(r, 'Last Working Day (Interns Only)') || '');
      return !isNaN(lwd.getTime()) && lwd >= qStart && lwd <= qEnd;
    }).length;

    const label = `Q${q + 1} ${y}`;
    const rate  = currentHeadcount > 0
      ? ((exits / (currentHeadcount + exits)) * 100).toFixed(1)
      : '0.0';

    quarters.push({ label, exits, rate });
  }

  return quarters;
}

function buildOrgData(employees) {
  const hierarchy = {};
  const allEmployees = new Set();
  const allManagers  = new Set();

  employees.forEach(emp => {
    const name    = (getField(emp, 'Employee Name') || '').trim();
    const manager = (getField(emp, 'Reporting Manager') || '').trim();
    if (!name) return;
    allEmployees.add(name);
    if (manager) {
      allManagers.add(manager);
      if (!hierarchy[manager]) hierarchy[manager] = [];
      hierarchy[manager].push({
        name,
        dept:        getField(emp, 'Department') || '',
        designation: getField(emp, 'Designation') || '',
        region:      getField(emp, 'Region') || ''
      });
    }
  });

  const roots = [];
  allManagers.forEach(m => {
    if (!allEmployees.has(m)) roots.push(m);
  });

  return { hierarchy, roots };
}

function formatDate(val) {
  if (!val) return '';
  const d = new Date(val);
  if (isNaN(d.getTime())) return val.toString();
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}
function testProductivity() {

  const data = getWebAppData();

  Logger.log(data.topPerformers);
  Logger.log(data.lowestPerformers);
  Logger.log(data.productivityData.length);

}
function testWebAppProductivity() {

  const data = getWebAppData();

  Logger.log(
    JSON.stringify(
      data.topPerformers[0],
      null,
      2
    )
  );

}
function testWebData() {
  const data = getWebAppData();

  Logger.log(JSON.stringify(data, null, 2));
}