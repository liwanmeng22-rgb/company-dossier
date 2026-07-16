/**
 * 把指定DOM节点导出为PDF，自动按A4尺寸分页。
 * 用 html2canvas 把节点截成一张长图，再用 jsPDF 按页高裁切拼接。
 */
export async function exportReportToPDF(node, filename = "report") {
  if (!node) throw new Error("没有找到要导出的报告内容");

  const html2canvas = (await import("html2canvas")).default;
  const { jsPDF } = await import("jspdf");

  const canvas = await html2canvas(node, {
    scale: 2,
    backgroundColor: "#0c121f",
    useCORS: true,
    windowWidth: node.scrollWidth,
  });

  const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  const imgWidth = pageWidth;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;
  const imgData = canvas.toDataURL("image/png");

  let heightLeft = imgHeight;
  let position = 0;

  pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
  heightLeft -= pageHeight;

  while (heightLeft > 0) {
    position -= pageHeight;
    pdf.addPage();
    pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
  }

  const safeName = filename.replace(/[\\/:*?"<>|]/g, "").trim() || "report";
  pdf.save(`${safeName}.pdf`);
}
