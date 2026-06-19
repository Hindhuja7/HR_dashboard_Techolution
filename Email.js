/**
 * Email.gs
 * Sends HR alert emails and daily digest
 */

/**
 * Send a single email
 */
function sendAlertEmail(subject, htmlBody) {

  const config = getConfig();

  const recipient =
    config.ALERT_EMAIL_RECIPIENT ||
    Session.getActiveUser().getEmail();

  MailApp.sendEmail({
    to: recipient,
    subject: subject,
    htmlBody: htmlBody
  });

  return true;
}


/**
 * Daily HR Digest
 */
function sendAlertDigest() {

  const lwdAlerts = getLWDAlerts();
  const probationAlerts = getProbationAlerts();

  let html = `
    <h2>HR Alert Digest</h2>

    <p>
      Generated:
      ${new Date().toLocaleString()}
    </p>
  `;

  // --------------------------------------------------
  // LWD Alerts
  // --------------------------------------------------

  html += `
    <h3>Intern LWD Alerts (${lwdAlerts.length})</h3>
  `;

  if (lwdAlerts.length === 0) {

    html += `<p>No active LWD alerts.</p>`;

  } else {

    html += `
      <table border="1" cellpadding="6" cellspacing="0">
      <tr>
        <th>ID</th>
        <th>Name</th>
        <th>Department</th>
        <th>LWD</th>
        <th>Days</th>
      </tr>
    `;

    lwdAlerts.forEach(a => {

      html += `
        <tr>
          <td>${a.employeeId}</td>
          <td>${a.name}</td>
          <td>${a.department}</td>
          <td>${Utilities.formatDate(
            new Date(a.lwd),
            Session.getScriptTimeZone(),
            "dd-MMM-yyyy"
          )}</td>
          <td>${a.daysUntil}</td>
        </tr>
      `;

    });

    html += `</table>`;
  }

  // --------------------------------------------------
  // Probation Alerts
  // --------------------------------------------------

  html += `
    <br>
    <h3>Probation Alerts (${probationAlerts.length})</h3>
  `;

  if (probationAlerts.length === 0) {

    html += `<p>No active probation alerts.</p>`;

  } else {

    html += `
      <table border="1" cellpadding="6" cellspacing="0">
      <tr>
        <th>ID</th>
        <th>Name</th>
        <th>Department</th>
        <th>Confirmation Date</th>
        <th>Days</th>
      </tr>
    `;

    probationAlerts.forEach(a => {

      html += `
        <tr>
          <td>${a.employeeId}</td>
          <td>${a.name}</td>
          <td>${a.department}</td>
          <td>${Utilities.formatDate(
            new Date(a.confirmationDate),
            Session.getScriptTimeZone(),
            "dd-MMM-yyyy"
          )}</td>
          <td>${a.daysUntil}</td>
        </tr>
      `;

    });

    html += `</table>`;
  }

  sendAlertEmail(
    "Daily HR Alert Digest",
    html
  );

  logEmailStatus(
    "SUCCESS",
    getConfig().ALERT_EMAIL_RECIPIENT,
    lwdAlerts.length + probationAlerts.length,
    "Daily Digest Sent"
  );

  return {
    success: true,
    message: "Digest email sent successfully"
  };
}