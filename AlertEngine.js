function getAlertEngineRecommendations() {

  const recommendations = [];

  const probationAlerts = getProbationAlerts();
  const employees = cachedEmployees();
  const offboarded = cachedSheetData('Offboarded Resources');

  // ATTRITION
  const attrition = getQuarterlyAttrition(
    offboarded,
    employees.length
  );

  const currentQuarter =
    attrition[attrition.length - 1];

  const attritionRate =
    Number(currentQuarter.rate);

  let attritionPriority = "Low";

  if (attritionRate > 10) {
    attritionPriority = "High";
  } else if (attritionRate > 5) {
    attritionPriority = "Medium";
  }

  recommendations.push({
    priority: attritionPriority,
    category: "Attrition",
    message:
      `Quarterly attrition is ${attritionRate}%. HR review recommended.`
  });

  // PROBATION
  probationAlerts.forEach(emp => {

    const priority =
      emp.daysUntil <= 7 ? "High" :
      emp.daysUntil <= 30 ? "Medium" :
      "Low";

    recommendations.push({
      priority,
      category: "Probation",
      message:
        `${emp.name}'s probation confirmation is due in ${emp.daysUntil} days. Initiate review.`
    });

  });

  // LWD
  const lwdAlerts = getLWDAlerts();

  const urgentLwd =
    lwdAlerts.filter(
      e => e.daysUntil <= 7
    ).length;

  const mediumLwd =
    lwdAlerts.filter(
      e => e.daysUntil > 7 &&
           e.daysUntil <= 30
    ).length;

  if (urgentLwd > 0) {

    recommendations.push({
      priority: "High",
      category: "Workforce Planning",
      message:
        `${urgentLwd} interns are exiting within 7 days. Consider immediate backfill planning.`
    });

  } else if (mediumLwd > 0) {

    recommendations.push({
      priority: "Medium",
      category: "Workforce Planning",
      message:
        `${mediumLwd} interns are exiting within 30 days. Review hiring needs.`
    });

  }

  // PRODUCTIVITY
  const productivity =
    cachedSheetData("Productivity");

  const flagged = productivity.filter(
    p =>
      (getField(
        p,
        'Below 8 Hrs Flag'
      ) || '')
        .toString()
        .trim() !== ''
  );

  let productivityPriority = "Low";

  if (flagged.length > 50) {
    productivityPriority = "High";
  } else if (flagged.length > 20) {
    productivityPriority = "Medium";
  }

  if (flagged.length > 0) {

    recommendations.push({
      priority: productivityPriority,
      category: "Productivity",
      message:
        `${flagged.length} productivity flags detected. Schedule manager review.`
    });

  }
  recommendations.sort((a, b) => {

  const order = {
    High: 1,
    Medium: 2,
    Low: 3
  };

  return order[a.priority] - order[b.priority];

});

  return recommendations;
}
function testAlertEngine() {
  Logger.log(
    JSON.stringify(
      getAlertEngineRecommendations(),
      null,
      2
    )
  );
}