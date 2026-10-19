/** Export cards separately to avoid giant images and split paragraphs. */
export async function exportReportToPDF(node, filename = "report") {
  if (!node) throw new Error("没有找到要导出的报告内容");
  const html2canvas = (await import("html2canvas")).default;
  const { jsPDF } = await import("jspdf");
  await document.fonts.ready;
  const clone = node.cloneNode(true);
  Object.assign(clone.style, { position: "absolute", left: "-12000px", top: "0", width: "800px", padding: "0", background: "#0c121f", color: "#e9edf5" });
  clone.setAttribute("aria-hidden", "true");
  clone.querySelectorAll('.claim-proof').forEach(element => element.setAttribute('open', ''));
  clone.querySelectorAll('.price-chart > details').forEach(element => element.remove());
  clone.querySelectorAll('.table-scroll').forEach(element => { element.style.overflow = 'visible'; });
  clone.querySelectorAll("[id]").forEach(element => element.removeAttribute("id"));
  document.body.appendChild(clone);
  try {
    const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4", compress: true });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 28, width = pageWidth - margin * 2, availableHeight = pageHeight - margin * 2, gap = 9;
    let position = margin;
    const background = () => { pdf.setFillColor(12, 18, 31); pdf.rect(0, 0, pageWidth, pageHeight, "F"); };
    const newPage = () => { pdf.addPage(); background(); position = margin; };
    background();
    const blocks = Array.from(clone.children).flatMap(child => child.classList.contains("section") ? Array.from(child.children) : [child]).filter(child => child.getBoundingClientRect().height > 0);
    for (let index = 0; index < blocks.length; index++) {
      const block = blocks[index];
      const canvas = await html2canvas(block, { scale: 1.5, backgroundColor: "#0c121f", useCORS: true, windowWidth: 1120, logging: false });
      const height = canvas.height * width / canvas.width;
      const nextHeight = block.classList.contains("section-head") && blocks[index + 1] ? Math.min(availableHeight / 2, blocks[index + 1].getBoundingClientRect().height * width / 800) + gap : 0;
      if (position > margin && position + height + nextHeight > pageHeight - margin) newPage();
      if (height <= availableHeight) {
        pdf.addImage(canvas.toDataURL("image/jpeg", 0.88), "JPEG", margin, position, width, height);
        position += height + gap;
      } else {
        // Only exceptionally tall cards require slices; normal cards stay intact.
        let offset = 0;
        const sliceHeight = Math.max(1, Math.floor(availableHeight * canvas.width / width));
        while (offset < canvas.height) {
          if (position > margin) newPage();
          const slice = document.createElement("canvas");
          slice.width = canvas.width; slice.height = Math.min(sliceHeight, canvas.height - offset);
          slice.getContext("2d").drawImage(canvas, 0, offset, slice.width, slice.height, 0, 0, slice.width, slice.height);
          const renderedHeight = slice.height * width / slice.width;
          pdf.addImage(slice.toDataURL("image/jpeg", 0.88), "JPEG", margin, position, width, renderedHeight);
          position += renderedHeight + gap; offset += slice.height;
          slice.width = slice.height = 0;
        }
      }
      canvas.width = canvas.height = 0;
    }
    const safeName = filename.replace(/[\\/:*?"<>|]/g, "").trim() || "report";
    pdf.save(`${safeName}.pdf`);
  } finally { clone.remove(); }
}
