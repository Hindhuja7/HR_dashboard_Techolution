function getProductivityFlags() {

  const data = getSheetData("Productivity");

  return data.filter(row => {
    const flag = String(
      row["Below 8 Hrs Flag"] || ""
    ).trim();

    return flag !== "";
  });
}

function getProductivityData() {

  const data = getSheetData("Productivity");

  const employees = cachedEmployees();
  const rmData = getRMData();

  return data.map(row => {

    const overallAvg =
      Number(row["Overall Avg Hrs/Day"] || 0);

    const novAvg =
      Number(row["Nov-2025 Avg Hrs/Day"] || 0);

    const decAvg =
      Number(row["Dec-2025 Avg Hrs/Day"] || 0);

    let trend = "Stable";

    const diff = decAvg - novAvg;

    if (diff > 0.25) {
      trend = "Improving";
    } else if (diff < -0.25) {
      trend = "Declining";
    }

    const emp =
      employees.find(e =>
        String(e["Employee ID"]).trim() ===
        String(row["Employee ID"]).trim()
      ) || {};

    const rm =
      rmData.find(r =>
        String(r["Employee ID"]).trim() ===
        String(row["Employee ID"]).trim()
      ) || {};

    Logger.log(
      row["Employee ID"] +
      " | Region=" +
      (emp["Region"] || "") +
      " | Project=" +
      (rm["Dec-2025 Project"] || "")
    );

    return {

      employeeId:
        row["Employee ID"],

      employeeName:
        row["Employee Name"],

      department:
        row["Department"],

      region:
        emp["Region"] || "",

      project:
        rm["Dec-2025 Project"] || "Unassigned",

      overallAvg:
        overallAvg,

      novAvg:
        novAvg,

      decAvg:
        decAvg,

      trend:
        trend,

      flag:
        row["Below 8 Hrs Flag"] || ""

    };

  });

}
function getTopPerformers(limit) {

  limit = limit || 5;

  return getProductivityData()
    .sort((a, b) =>
      b.overallAvg - a.overallAvg
    )
    .slice(0, limit);

}

function getLowestPerformers(limit) {

  limit = limit || 5;

  return getProductivityData()
    .sort((a, b) =>
      a.overallAvg - b.overallAvg
    )
    .slice(0, limit);

}

function sendProductivityEmail(employeeId) {

  const employee =
    getProductivityData()
      .find(e =>
        e.employeeId === employeeId
      );

  if (!employee) {
    throw new Error(
      "Employee not found"
    );
  }

  const subject =
    "Productivity Review - " +
    employee.employeeName;

  const body =
`Employee: ${employee.employeeName}

Employee ID: ${employee.employeeId}

Department: ${employee.department}

Region: ${employee.region}

Overall Average Hours:
${employee.overallAvg.toFixed(2)}

November Average:
${employee.novAvg.toFixed(2)}

December Average:
${employee.decAvg.toFixed(2)}

Trend:
${employee.trend}

Flag:
${employee.flag || "No Flag"}

Recommended Action:
Please review workload, productivity trends, attendance patterns, and project allocation.

Regards,
HR Automation Dashboard`;

  GmailApp.createDraft(
    Session.getActiveUser().getEmail(),
    subject,
    body
  );

  return "Draft email created successfully";
}

function testTrendCounts() {

  const data =
    getProductivityData();

  const counts = {
    Improving: 0,
    Stable: 0,
    Declining: 0
  };

  data.forEach(r => {
    counts[r.trend]++;
  });

  Logger.log(
    JSON.stringify(
      counts,
      null,
      2
    )
  );

}

function testTrendSamples() {

  const data =
    getProductivityData();

  data.slice(0, 10)
    .forEach(r => {

      Logger.log(
        r.employeeName +
        " | Nov=" +
        r.novAvg +
        " | Dec=" +
        r.decAvg +
        " | Trend=" +
        r.trend
      );

    });

}
function testProductivityData() {

  const data =
    getProductivityData();

  Logger.log(
    JSON.stringify(
      data.slice(0,5),
      null,
      2
    )
  );
}