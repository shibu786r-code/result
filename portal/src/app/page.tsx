"use client";

import { useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import QRCode from "qrcode";

export default function ResultPortal() {
  const [roll, setRoll] = useState("");
  const [no, setNo] = useState("");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const LAMBDA_URL = "https://hlrcfmiwizggb6mq7jcsezvi5u0wgdpb.lambda-url.ap-south-1.on.aws";

  const fetchResult = async () => {
    if (!roll || !no) return alert("Please enter both Roll and Number");
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch(`${LAMBDA_URL}/?rollNumber=${roll}-${no}`);
      if (!response.ok) throw new Error("Result not found. Check your Roll/No.");
      const data = await response.json();
      console.log("Student Data Fetched:", data);
      setResult(data);
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const downloadPDF = async () => {
    if (!result) return;
    const doc = new jsPDF("p", "mm", "a4");
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // --- OUTER BORDER ---
    doc.setLineWidth(0.4);
    doc.rect(7, 7, pageWidth - 14, pageHeight - 14);
    
    // --- HEADER SECTION ---
    doc.setFont("times", "bold");
    doc.setFontSize(18);
    doc.text("ASSAM HIGHER SECONDARY EDUCATION COUNCIL", pageWidth / 2, 18, { align: "center" });
    doc.setFontSize(13);
    doc.text("GUWAHATI - 781021", pageWidth / 2, 25, { align: "center" });
    doc.setFontSize(12);
    doc.text("MARKS-SHEET (INTERNET COPY)", pageWidth / 2, 32, { align: "center" });
    doc.text("HIGHER SECONDARY FINAL EXAMINATION-2024", pageWidth / 2, 39, { align: "center" });
    doc.setFontSize(9);
    doc.setFont("times", "normal");
    doc.text("Form No. Ex-32(a)", pageWidth - 45, 12);

    // --- STUDENT INFO ---
    let y = 50;
    doc.setFontSize(11);
    doc.text(`Stream :  ${result.Stream || ""}`, 12, y);
    doc.text(`Date :  ${result.Date || new Date().toLocaleDateString("en-IN")}`, pageWidth - 55, y);
    y += 8;
    doc.text(`Name :  ${result.CandidateName}`, 12, y);
    y += 8;
    doc.text(`College/School :  ${result.SchoolName}`, 12, y);
    y += 8;
    doc.text(`Roll :  ${result.RollNumber.split("-")[0]}`, 12, y);
    doc.text(`No. :  ${result.RollNumber.split("-")[1]}`, 65, y);

    // --- MARKS TABLE ---
    const rows: any[] = [];
    for (let i = 1; i <= 16; i++) {
      if (result[`Sub${i}_Code`]) {
        rows.push([
          result[`Sub${i}_Code`],
          result[`Sub${i}_Pap_Indicator`] || "",
          result[`Sub${i}_Name`],
          result[`Sub${i}_Th_Marks`] || "",
          result[`Sub${i}_Pr_Marks`] || "",
          result[`Sub${i}_Tot_Marks`],
          "" // Merged column placeholder
        ]);
      }
    }

    autoTable(doc, {
      startY: 85,
      margin: { left: 12, right: 12 },
      head: [["CODE", "IND", "SUBJECTS", "THEORY", "PR", "TOTAL", "RESULT"]],
      body: rows,
      theme: "plain",
      styles: { font: "times", fontSize: 10, cellPadding: 2, lineWidth: 0.2, lineColor: [0, 0, 0] },
      headStyles: { fontStyle: "bold", halign: "center" },
      columnStyles: {
        0: { cellWidth: 15 },
        1: { cellWidth: 12 },
        2: { cellWidth: 65 },
        3: { halign: "center", cellWidth: 18 },
        4: { halign: "center", cellWidth: 12 },
        5: { halign: "center", cellWidth: 18 },
        6: { cellWidth: 35 } 
      },
      didParseCell: (data) => {
        // Use rowSpan to create the merged box
        if (data.section === 'body' && data.column.index === 6 && data.row.index === 0) {
            data.cell.rowSpan = rows.length;
        }
      },
      didDrawCell: (data) => {
        // Draw the division criteria inside the spanned cell
        if (data.section === 'body' && data.column.index === 6 && data.row.index === 0) {
            const x = data.cell.x + 2;
            let ty = data.cell.y + 10;
            doc.setFontSize(8);
            doc.setFont("times", "bolditalic");
            doc.text("1st Division", x, ty); doc.text("300 and above", x, ty + 4);
            ty += 15;
            doc.text("2nd Division", x, ty); doc.text("225 - 299", x, ty + 4);
            ty += 15;
            doc.text("3rd Division", x, ty); doc.text("150/153/156/159 - 224", x, ty + 4);
            doc.setFontSize(6);
            doc.text("* Depends on practicals", x, ty + 10);
        }
      }
    });

    // --- FOOTER SECTION ---
    // @ts-ignore
    let tableEndY = doc.lastAutoTable.finalY;
    doc.rect(12, tableEndY, 151, 12); 
    doc.rect(163, tableEndY, 35, 12); 
    doc.setFont("times", "bold");
    doc.text("GRAND TOTAL (Out of 500 Marks)", 14, tableEndY + 5);
    doc.setFont("times", "normal");
    doc.text(result.Total_Marks_in_Words || "", 85, tableEndY + 5);
    doc.text(result.Total_Marks_in_Figure || "", 150, tableEndY + 5);
    doc.setFont("times", "bold");
    doc.text(result.FinalResult || "", 165, tableEndY + 8);

    doc.rect(12, tableEndY + 12, 151, 8);
    doc.rect(163, tableEndY + 12, 35, 8);
    doc.text("ENVE - GRADE ON ENVIRONMENTAL EDUCATION", 14, tableEndY + 17.5);
    doc.text(result.ENVE_Grade || "", 150, tableEndY + 17.5);

    // QR Code
    const qrData = `Roll: ${result.RollNumber}, Name: ${result.CandidateName}, Total: ${result.Total_Marks_in_Figure}`;
    const qrCodeUrl = await QRCode.toDataURL(qrData);
    doc.addImage(qrCodeUrl, "PNG", pageWidth / 2 - 15, tableEndY + 25, 30, 30);

    // Footer Signature
    doc.setFontSize(9);
    const footY = pageHeight - 25;
    doc.text("Controller of Examinations", pageWidth - 15, footY, { align: "right" });
    doc.text("Assam Higher Secondary Education Council", pageWidth - 15, footY + 5, { align: "right" });
    doc.text("Guwahati-21", pageWidth - 15, footY + 10, { align: "right" });

    // Disclaimer
    doc.setFontSize(7);
    doc.text("This marks sheet is not to be treated as original. Original marks sheet will be issued separately.", pageWidth / 2, pageHeight - 5, { align: "center" });

    doc.save(`Marksheet_${result.RollNumber}.pdf`);
  };

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl p-10 border border-slate-100">
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-blue-600 rounded-3xl mx-auto flex items-center justify-center shadow-xl mb-6">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.246.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>
          </div>
          <h1 className="text-3xl font-black text-slate-900">AHSEC Result</h1>
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <input type="text" value={roll} onChange={(e) => setRoll(e.target.value)} placeholder="Roll" className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl px-6 py-4 outline-none font-bold" />
            <input type="text" value={no} onChange={(e) => setNo(e.target.value)} placeholder="Number" className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl px-6 py-4 outline-none font-bold" />
          </div>
          <button onClick={fetchResult} disabled={loading} className="w-full bg-blue-600 text-white font-black py-5 rounded-2xl">
            {loading ? "SEARCHING..." : "GENERATE PDF"}
          </button>
        </div>

        {error && <div className="mt-8 text-red-600 text-center font-bold">{error}</div>}

        {result && (
          <div className="mt-10 p-8 bg-slate-900 rounded-[2rem] text-white">
            <h2 className="text-xl font-bold mb-6">{result.CandidateName}</h2>
            <button onClick={downloadPDF} className="w-full bg-white text-slate-900 font-bold py-4 rounded-xl">DOWNLOAD PDF</button>
          </div>
        )}
      </div>
    </main>
  );
}
