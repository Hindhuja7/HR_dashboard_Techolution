function styleDashboard(sheet) {

  // Title
  sheet.getRange("A1:D1")
    .merge()
    .setFontSize(16)
    .setFontWeight("bold")
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle")
    .setBorder(false, false, true, false, false, false);

  // Generated timestamp
  sheet.getRange("A2:D2")
    .merge()
    .setHorizontalAlignment("center")
    .setFontStyle("italic");

  // Auto-size columns
  sheet.autoResizeColumns(1, 5);

  // Section Headers
  const sectionNames = [
    "KEY METRICS",
    "ALERT SUMMARY",
    "DEPARTMENT BREAKDOWN",
    "REGION BREAKDOWN",
    "RECENT ALERTS"
  ];

  const data = sheet.getDataRange().getValues();

  for (let r = 0; r < data.length; r++) {

    const value = String(data[r][0]).trim();

    if (sectionNames.includes(value)) {

      sheet.getRange(r + 1, 1, 1, 4)
        .merge()
        .setFontWeight("bold")
        .setBackground("#F1F3F4")
        .setBorder(true, true, true, true, false, false);
    }
  }

  // Table Headers
  for (let r = 0; r < data.length; r++) {

    const row = data[r];

    if (
      row[0] === "Department" ||
      row[0] === "Region" ||
      row[0] === "Type"
    ) {

      sheet.getRange(r + 1, 1, 1, 4)
        .setFontWeight("bold")
        .setBackground("#F8F9FA")
        .setBorder(false, false, true, false, false, false);
    }
  }

  // Light borders on used range
  sheet.getDataRange()
    .setBorder(
      false,
      false,
      false,
      false,
      false,
      true,
      "#DADCE0",
      SpreadsheetApp.BorderStyle.SOLID
    );
}