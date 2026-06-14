/**
 * Sends daily HR alert digest.
 */
function sendAlertDigest() {
  const config = getConfig();

  const recipient = config.ALERT_EMAIL_RECIPIENT;
  const lwdAlerts = getLWDAlerts();
  const probationAlerts = getProbationAlerts();

  if (lwdAlerts.length === 0 && probationAlerts.length === 0) {
    logInfo("No alerts found. Email not sent.");
    return;
  }

  let html = `
    <h2>HR Alert Digest</h2>
    <p>Generated on ${new Date().toLocaleString()}</p>
  `;

  // LWD Section
  html += `<h3>Intern Last Working Day Alerts (${lwdAlerts.length})</h3>`;

  if (lwdAlerts.length > 0) {
    html += `
      <table border="1" cellpadding="5" cellspacing="0">
        <tr>
          <th>ID</th>
          <th>Name</th>
          <th>Department</th>
          <th>Region</th>
          <th>LWD</th>
          <th>Status</th>
        </tr>
    `;

    lwdAlerts.forEach(emp => {
      html += `
        <tr>
          <td>${emp.employeeId}</td>
          <td>${emp.name}</td>
          <td>${emp.department}</td>
          <td>${emp.region}</td>
          <td>${emp.lwd.toDateString()}</td>
          <td>${emp.status}</td>
        </tr>
      `;
    });

    html += `</table>`;
  } else {
    html += `<p>No LWD alerts.</p>`;
  }

  // Probation Section
  html += `<h3>Probation Alerts (${probationAlerts.length})</h3>`;

  if (probationAlerts.length > 0) {
    html += `
      <table border="1" cellpadding="5" cellspacing="0">
        <tr>
          <th>ID</th>
          <th>Name</th>
          <th>Department</th>
          <th>Region</th>
          <th>Confirmation Date</th>
          <th>Status</th>
        </tr>
    `;

    probationAlerts.forEach(emp => {
      html += `
        <tr>
          <td>${emp.employeeId}</td>
          <td>${emp.name}</td>
          <td>${emp.department}</td>
          <td>${emp.region}</td>
          <td>${emp.confirmationDate.toDateString()}</td>
          <td>${emp.status}</td>
        </tr>
      `;
    });

    html += `</table>`;
  } else {
    html += `<p>No probation alerts.</p>`;
  }

  MailApp.sendEmail({
    to: recipient,
    subject: "HR Alert Digest",
    htmlBody: html
  });

  logInfo(
    `Alert digest sent to ${recipient}. LWD=${lwdAlerts.length}, Probation=${probationAlerts.length}`
  );
}