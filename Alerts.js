/**
 * Alerts.gs
 * Detects LWD (intern exit) and Probation (confirmation due) alerts
 * based on thresholds in _Config. All date math uses TODAY() — no hardcoded dates.
 */

function getLWDAlerts() {
  const config = getConfig();
  const thresholdDays = Number(config.LWD_ALERT_DAYS);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const employees = cachedEmployees(); // was getAllEmployees()
  const alerts = [];

  employees.forEach(emp => {
    if (getField(emp, 'Employment Status') !== 'Intern') return;

    const lwdRaw = getField(emp, 'Last Working Day (Interns Only)');
    if (!lwdRaw || lwdRaw === 'N/A') return;

    const lwd = new Date(lwdRaw);
    if (isNaN(lwd.getTime())) return;

    lwd.setHours(0, 0, 0, 0);

    const daysUntil = Math.round((lwd - today) / (1000 * 60 * 60 * 24));

    if (daysUntil <= thresholdDays && daysUntil >= -thresholdDays) {
      alerts.push({
        employeeId: getField(emp, 'Employee ID'),
        name:       getField(emp, 'Employee Name'),
        department: getField(emp, 'Department'),
        region:     getField(emp, 'Region'),
        lwd:        lwd,
        daysUntil:  daysUntil,
        status:     daysUntil < 0 ? 'Just Passed' : (daysUntil === 0 ? 'Today' : 'Upcoming')
      });
    }
  });

  alerts.sort((a, b) => a.daysUntil - b.daysUntil);
  return alerts;
}

function getProbationAlerts() {
  const config = getConfig();
  const probationPeriod = Number(config.PROBATION_PERIOD_DAYS);
  const alertDays = Number(config.PROBATION_ALERT_DAYS);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const employees = cachedEmployees(); // was getAllEmployees()
  const alerts = [];

  employees.forEach(emp => {
    if (getField(emp, 'Employment Status') !== 'Under Probation') return;

    const dojRaw = getField(emp, 'Date of Joining');
    if (!dojRaw) return;

    const doj = new Date(dojRaw);
    if (isNaN(doj.getTime())) return;

    const confirmationDate = new Date(doj);
    confirmationDate.setDate(confirmationDate.getDate() + probationPeriod);
    confirmationDate.setHours(0, 0, 0, 0);

    const daysUntil = Math.round((confirmationDate - today) / (1000 * 60 * 60 * 24));

    if (daysUntil <= alertDays && daysUntil >= -alertDays) {
      alerts.push({
        employeeId:       getField(emp, 'Employee ID'),
        name:             getField(emp, 'Employee Name'),
        department:       getField(emp, 'Department'),
        region:           getField(emp, 'Region'),
        doj:              doj,
        confirmationDate: confirmationDate,
        daysUntil:        daysUntil,
        status:           daysUntil < 0 ? 'Confirmation Overdue' : (daysUntil === 0 ? 'Confirmation Due Today' : 'Upcoming Confirmation')
      });
    }
  });

  alerts.sort((a, b) => a.daysUntil - b.daysUntil);
  return alerts;
}

function testAlerts() {
  clearCache();
  const lwd = getLWDAlerts();
  const probation = getProbationAlerts();

  console.log(`LWD Alerts (${lwd.length}):`);
  lwd.forEach(a => console.log(`  ${a.employeeId} ${a.name} — LWD ${a.lwd.toDateString()} (${a.daysUntil} days, ${a.status})`));

  console.log(`Probation Alerts (${probation.length}):`);
  probation.forEach(a => console.log(`  ${a.employeeId} ${a.name} — Confirmation ${a.confirmationDate.toDateString()} (${a.daysUntil} days, ${a.status})`));

  logInfo(`Alert check run: ${lwd.length} LWD alerts, ${probation.length} probation alerts.`);
}

function sendAlertDigest(lwdAlerts, probationAlerts) {
  const config = getConfig();
  const recipient = config.ALERT_EMAIL_RECIPIENT;

  Logger.log("sendAlertDigest started");
  Logger.log("Recipient: " + recipient);
  Logger.log("LWD count: " + lwdAlerts.length);
  Logger.log("Probation count: " + probationAlerts.length);

  if (lwdAlerts.length === 0 && probationAlerts.length === 0) {
    logEmailStatus('Skipped', recipient, 0, 'No active alerts');
    return 'Skipped (no active alerts)';
  }

  const subject = `HR Dashboard Alert Digest — ${lwdAlerts.length} LWD, ${probationAlerts.length} Probation`;

  let body = `<h3>HR Automation Dashboard — Daily Alert Digest</h3>`;
  body += `<p>Generated: ${new Date().toLocaleString()}</p>`;

  if (lwdAlerts.length > 0) {
    body += `<h4>Intern LWD Alerts (${lwdAlerts.length})</h4><ul>`;
    lwdAlerts.forEach(a => {
      body += `<li>${a.name} (${a.employeeId}, ${a.department}, ${a.region}) — LWD ${a.lwd.toDateString()} — ${a.status}</li>`;
    });
    body += `</ul>`;
  }

  if (probationAlerts.length > 0) {
    body += `<h4>Probation Confirmation Alerts (${probationAlerts.length})</h4><ul>`;
    probationAlerts.forEach(a => {
      body += `<li>${a.name} (${a.employeeId}, ${a.department}, ${a.region}) — Confirmation ${a.confirmationDate.toDateString()} — ${a.status}</li>`;
    });
    body += `</ul>`;
  }

  try {
    MailApp.sendEmail({
      to: recipient,
      subject: subject,
      htmlBody: body
    });

    logEmailStatus("Sent", recipient, lwdAlerts.length + probationAlerts.length, "OK");
    logInfo(`Alert digest sent to ${recipient}`);
    return "Sent";

  } catch (err) {
    logEmailStatus("Failed", recipient, lwdAlerts.length + probationAlerts.length, err.message);
    logError(`Failed to send alert digest: ${err.message}`);
    return "Failed";
  }
}

function logEmailStatus(status, recipient, alertCount, notes) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("EmailLog");
  sheet.appendRow([new Date(), status, recipient, alertCount, notes]);
  logInfo("EmailLog updated successfully.");
}

function testSendAlertDigest() {
  clearCache();
  const lwdAlerts = getLWDAlerts();
  const probationAlerts = getProbationAlerts();
  Logger.log("LWD Alerts: " + lwdAlerts.length);
  Logger.log("Probation Alerts: " + probationAlerts.length);
  const result = sendAlertDigest(lwdAlerts, probationAlerts);
  Logger.log("Result = " + result);
}

function findSendAlertDigest() {
  Logger.log(sendAlertDigest.toString());
}