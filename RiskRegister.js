function getRiskRecords() {

  const risks = getSheetData("Risk Report");

  return risks.filter(r =>
    r["Status"] !== "Resolved"
  );
}