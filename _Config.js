/**
 * Config.gs
 * Loads all tunable thresholds/settings from the _Config tab.
 * Nothing in the rest of the project should hardcode these values —
 * always call getConfig() and read from the returned object.
 */

function getConfig() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('_Config');
  if (!sheet) {
    throw new Error('Config Error: "_Config" tab not found. Cannot load thresholds.');
  }

  const data = sheet.getDataRange().getValues();
  const config = {};

  // Skip header row (row 0), read Key/Value pairs
  for (let i = 1; i < data.length; i++) {
    const key = data[i][0];
    const value = data[i][1];
    if (key) {
      config[key.toString().trim()] = value;
    }
  }

  // Validate required keys exist, with sensible fallback + warning log
  const required = {
    LWD_ALERT_DAYS: 45,
    PROBATION_ALERT_DAYS: 30,
    PROBATION_PERIOD_DAYS: 180,
    PRODUCTIVITY_TARGET_HRS: 8,
    ALERT_EMAIL_RECIPIENT: 'hr@techolution.com'
  };

  for (const key in required) {
    if (!(key in config)) {
      config[key] = required[key];
      console.warn(`Config key "${key}" missing from _Config tab. Using default: ${required[key]}`);
    }
  }

  return config;
}

/**
 * Quick test function — run this manually to verify config loads correctly.
 */
function testConfig() {
  const cfg = getConfig();
  console.log(JSON.stringify(cfg, null, 2));
}

// /**
//  * Debug helper — lists every sheet/tab name in this spreadsheet exactly
//  * as Apps Script sees it. Use this to check for typos/spaces in tab names.
//  */
// function listAllSheetNames() {
//   const sheets = SpreadsheetApp.getActiveSpreadsheet().getSheets();
//   sheets.forEach(s => console.log(`"${s.getName()}"`));
// }