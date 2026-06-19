/**
 * Finance.gs
 */

function parseCurrency(val) {
  return Number(
    String(val || 0)
      .replace(/[₹,$]/g, "")
      .replace(/,/g, "")
  ) || 0;
}

function getFinanceData() {
  const employees = cachedEmployees();

  if (!employees || employees.length === 0) {
    return {
      totalPayrollINR: 0,
      totalPayrollUSD: 0,
      indiaPayroll: 0,
      usPayroll: 0,
      avgCTC: 0,
      highestPaid: null
    };
  }

  let totalINR = 0;
  let totalUSD = 0;

  employees.forEach(emp => {
    const region =
  String(
    getField(emp,'Region') || ''
  ).trim().toLowerCase();
    const ctc = parseCurrency(getField(emp, 'CTC'));

    if(region.includes('india')) {
  totalINR += ctc;
}
else if(region.includes('us')) {
  totalUSD += ctc;
}
  });

  const indiaPayroll = employees
    .filter(e => getField(e, 'Region') === 'India')
    .reduce((s, e) => s + parseCurrency(getField(e, 'CTC')), 0);

  const usPayroll = employees
    .filter(e => getField(e, 'Region') === 'US')
    .reduce((s, e) => s + parseCurrency(getField(e, 'CTC')), 0);

  const sorted = [...employees].sort((a, b) =>
    parseCurrency(getField(b, 'CTC')) - parseCurrency(getField(a, 'CTC'))
  );
  const highestPaidEmp = sorted[0] || null;

  const highestPaid = highestPaidEmp ? {
    name: getField(highestPaidEmp, 'Employee Name') || '',
    department: getField(highestPaidEmp, 'Department') || '',
    ctc: parseCurrency(getField(highestPaidEmp, 'CTC')),
    region: getField(highestPaidEmp, 'Region') || ''
  } : null;

  return {
    totalPayrollINR: totalINR,
    totalPayrollUSD: totalUSD,
    indiaPayroll: indiaPayroll,
    usPayroll: usPayroll,
    avgCTC:
  employees.length > 0
    ? (totalINR + totalUSD) / employees.length
    : 0,
    highestPaid: highestPaid
  };
}
function testFinanceDebug() {

  const employees = cachedEmployees();

  employees.slice(0,20).forEach(emp => {

    Logger.log(
      "Name=" + getField(emp,'Employee Name') +
      " | Region=" + getField(emp,'Region') +
      " | CTC=" + getField(emp,'CTC')
    );

  });
}
function getDepartmentFinanceSummary() {

  const employees = cachedEmployees();

  const map = {};

  employees.forEach(emp => {

    const dept = getField(emp,"Department");
    const region = getField(emp,"Region");

    if (!map[dept]) {
      map[dept] = {
        headcount:0,
        usEmployees:0,
        usPayroll:0
      };
    }

    map[dept].headcount++;

    if(region === "US") {
      map[dept].usEmployees++;
      map[dept].usPayroll +=
        parseCurrency(getField(emp,"CTC"));
    }
  });

  return Object.entries(map).map(([dept,v])=>({
    dept,
    ...v
  }));
}

function getProjectFinanceSummary() {

  const employees = cachedEmployees();
  const rmData = getRMData();

  const projectMap = {};

  rmData.forEach(r => {

    const empId = r["Employee ID"];
    const project = r["Dec-2025 Project"] || "Unassigned";

    const emp = employees.find(
      e => getField(e,"Employee ID") == empId
    );

    if (!emp) return;

    const ctc =
      parseCurrency(getField(emp,"CTC"));

    if (!projectMap[project]) {

      projectMap[project] = {
        project,
        headcount:0,
        totalCTC:0,
        employees:[]
      };
    }

    projectMap[project].headcount++;
    projectMap[project].totalCTC += ctc;

    projectMap[project].employees.push({
      employeeId: empId,
      employeeName:
        getField(emp,"Employee Name"),
      department:
        getField(emp,"Department"),
      ctc
    });
  });

  return Object.values(projectMap)
    .sort((a,b)=>b.totalCTC-a.totalCTC);
}
function getDepartmentFinanceSummary() {

  const employees = cachedEmployees();

  const map = {};

  employees.forEach(emp => {

    const dept =
      getField(emp,"Department") || "Unknown";

    const ctc =
      parseCurrency(getField(emp,"CTC"));

    if (!map[dept]) {

      map[dept] = {
        department: dept,
        headcount: 0,
        totalCTC: 0,
        employees:[]
      };
    }

    map[dept].headcount++;
    map[dept].totalCTC += ctc;

    map[dept].employees.push({
      employeeId:
        getField(emp,"Employee ID"),

      employeeName:
        getField(emp,"Employee Name"),

      ctc
    });
  });

  return Object.values(map)
    .sort((a,b)=>b.totalCTC-a.totalCTC);
}
