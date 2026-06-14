/**
 * Logs.gs
 * Append-only logging to the "Logs" tab.
 * Every pipeline run, action, and error should call logEvent().
 */

function logEvent(level, message) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Logs');
  if (!sheet) {
    // Fallback: if Logs tab missing, at least don't crash the caller
    console.error(`Logs tab not found. [${level}] ${message}`);
    return;
  }

  sheet.appendRow([new Date(), level, message]);
}

// Convenience wrappers
function logInfo(message)  { logEvent('INFO', message); }
function logWarn(message)  { logEvent('WARN', message); }
function logError(message) { logEvent('ERROR', message); }

/**
 * Test function
 */
function testLogs() {
  logInfo('Logs system test — pipeline initialized.');
  logWarn('This is a test warning.');
  logError('This is a test error.');
}