function getProductivityFlags() {

  const data =
    getSheetData("Productivity");

  return data.filter(row => {

    const flag =
      String(
        row["Below 8 Hrs Flag"] || ""
      ).trim();

    return flag !== "";

  });

}