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

    // --- SETUP FONTS ---
    doc.setFont("times", "normal");

    // --- HEADER: Form Number ---
    doc.setFontSize(8.5);
    doc.text("Form No. Ex-32(a)", pageWidth - 18, 12, { align: "right" });

    // --- EMBLEM MIMIC ---
    doc.setLineWidth(0.4);
    doc.circle(25, 25, 10); // Outer
    doc.setLineWidth(0.1);
    doc.circle(25, 25, 8); // Inner
    doc.setFontSize(3.5);
    doc.setFont("times", "bold");
    doc.text("ASSAM HIGHER", 25, 20, { align: "center" });
    doc.text("SECONDARY", 25, 22, { align: "center" });
    doc.text("EDUCATION", 25, 24, { align: "center" });
    doc.text("COUNCIL", 25, 26, { align: "center" });
    doc.setFontSize(4.5);
    doc.text("AHSEC", 25, 30, { align: "center" });

    // --- HEADER TEXT ---
    doc.setFontSize(16);
    doc.text("ASSAM HIGHER SECONDARY EDUCATION COUNCIL", pageWidth / 2 + 10, 20, { align: "center" });
    doc.setFontSize(11);
    doc.text("GUWAHATI - 781021", pageWidth / 2 + 10, 25, { align: "center" });
    doc.text("MARKS-SHEET (INTERNET COPY)", pageWidth / 2 + 10, 30, { align: "center" });
    doc.setFontSize(12);
    doc.text("HIGHER SECONDARY FINAL EXAMINATION-2024", pageWidth / 2 + 10, 36, { align: "center" });

    doc.setLineWidth(0.2);
    doc.line(18, 42, pageWidth - 18, 42);

    // --- INFO SECTION ---
    doc.setFont("times", "normal");
    doc.setFontSize(10.5);
    let y = 48;
    doc.text(`Stream :`, 18, y); doc.setFont("times", "bold"); doc.text(result.Stream || "ARTS", 32, y);
    doc.setFont("times", "normal"); doc.text(`Date :`, pageWidth - 45, y); doc.setFont("times", "bold"); doc.text(result.Date || new Date().toLocaleDateString("en-IN"), pageWidth - 34, y);
    
    y += 7;
    doc.setFont("times", "normal"); doc.text(`Name :`, 18, y); doc.setFont("times", "bold"); doc.text(result.CandidateName, 32, y);
    
    y += 7;
    doc.setFont("times", "normal"); doc.text(`College/School :`, 18, y); doc.setFont("times", "bold"); doc.text(result.SchoolName, 44, y);
    
    y += 7;
    doc.setFont("times", "normal"); doc.text(`Roll :`, 18, y); doc.setFont("times", "bold"); doc.text(result.RollNumber.split("-")[0], 28, y);
    doc.setFont("times", "normal"); doc.text(`No. :`, 55, y); doc.setFont("times", "bold"); doc.text(result.RollNumber.split("-")[1], 64, y);

    // --- MAIN TABLE PREP ---
    const subjectRows: any[] = [];
    for (let i = 1; i <= 16; i++) {
      if (result[`Sub${i}_Code`]) {
        subjectRows.push([
          result[`Sub${i}_Code`],
          result[`Sub${i}_Pap_Indicator`] || "",
          result[`Sub${i}_Name`],
          result[`Sub${i}_Th_Marks`] || "",
          result[`Sub${i}_Pr_Marks`] || "",
          result[`Sub${i}_Tot_Marks`],
          "" // Result col
        ]);
      }
    }

    // Add filler rows to match HTML reference (approx 10 total rows)
    const fillerCount = Math.max(0, 10 - subjectRows.length);
    for(let i=0; i<fillerCount; i++) {
        subjectRows.push(["", "", "", "", "", "", ""]);
    }

    autoTable(doc, {
      startY: 75,
      margin: { left: 18, right: 18 },
      head: [["CODE", "IND", "SUBJECTS", "THEORY", "PR", "TOTAL", "RESULT"]],
      body: [
          ...subjectRows,
          // Grand Total Row
          [
            { content: "GRAND TOTAL\n(Out of 500 Marks)", colSpan: 2, styles: { fontStyle: "bold", fontSize: 10 } },
            { content: result.Total_Marks_in_Words || "", styles: { halign: "center" } },
            { content: "", colSpan: 2 },
            { content: result.Total_Marks_in_Figure || "", styles: { fontStyle: "bold", halign: "center", fontSize: 11 } },
            { content: result.FinalResult || "", styles: { fontStyle: "bold", halign: "center", fontSize: 11 } }
          ],
          // ENVE Row
          [
            { content: "ENVE - GRADE ON ENVIRONMENTAL EDUCATION", colSpan: 5 },
            { content: result.ENVE_Grade || "", styles: { fontStyle: "bold", halign: "center", fontSize: 11 } },
            { content: "" }
          ]
      ],
      theme: "grid",
      styles: { font: "times", fontSize: 10, cellPadding: 2, lineWidth: 0.2, lineColor: [0, 0, 0], textColor: [0, 0, 0], valign: "middle" },
      headStyles: { fontStyle: "bold", halign: "center", fillColor: [255, 255, 255] },
      columnStyles: {
        0: { cellWidth: 15 }, // CODE
        1: { cellWidth: 12 }, // IND
        2: { cellWidth: 55 }, // SUBJECTS
        3: { halign: "center", cellWidth: 18 }, // THEORY
        4: { halign: "center", cellWidth: 12 }, // PR
        5: { halign: "center", cellWidth: 15 }, // TOTAL
        6: { cellWidth: 50 }  // RESULT
      },
      didParseCell: (data) => {
        // Result Column Spans all subject rows + header height mimic
        if (data.column.index === 6 && data.section === 'body' && data.row.index === 0) {
            data.cell.rowSpan = subjectRows.length;
        }
      },
      didDrawCell: (data) => {
        // Draw division info inside the spanned RESULT cell
        if (data.column.index === 6 && data.section === 'body' && data.row.index === 0) {
            const x = data.cell.x + 2;
            let ty = data.cell.y + 8;
            doc.setFontSize(9.5);
            doc.setFont("times", "bolditalic");
            doc.text("1st Division", x + 23, ty, { align: "center" });
            doc.setFont("times", "normal");
            doc.text("300 and above", x + 23, ty + 4, { align: "center" });
            
            ty += 14;
            doc.setFont("times", "bolditalic");
            doc.text("2nd Division", x + 23, ty, { align: "center" });
            doc.setFont("times", "normal");
            doc.text("225 - 299", x + 23, ty + 4, { align: "center" });
            
            ty += 14;
            doc.setFont("times", "bolditalic");
            doc.text("3rd Division", x + 23, ty, { align: "center" });
            doc.setFont("times", "normal");
            doc.setFontSize(8.5);
            doc.text("**150/153/156/159 - 224", x + 23, ty + 4, { align: "center" });
            
            ty += 10;
            doc.setFontSize(7.5);
            doc.text("**", x, ty);
            doc.text("150 - Without practical subjects.", x, ty + 3);
            doc.text("153 - With one practical subject.", x, ty + 6);
            doc.text("156 - With two practical subjects.", x, ty + 9);
            doc.text("159 - With three practical subjects.", x, ty + 12);
        }
      }
    });

    // @ts-ignore
    let tableEndY = doc.lastAutoTable.finalY;

    // --- BOTTOM SECTION ---
    let bottomY = tableEndY + 8;
    doc.setFontSize(9);
    doc.setFont("times", "italic");
    doc.text("In order to verify the result, scan the QR Code", 18, bottomY);
    doc.text("and follow instructions as appearing in the screen.", 18, bottomY + 4);
    doc.setFont("times", "normal");
    doc.text("or", 18, bottomY + 8);
    doc.text("Visit website http://www.ahsec.assam.gov.in/", 18, bottomY + 12);

    // QR CODE
    const qrData = `Roll: ${result.RollNumber}, Name: ${result.CandidateName}, Total: ${result.Total_Marks_in_Figure}`;
    const qrCodeUrl = await QRCode.toDataURL(qrData);
    doc.addImage(qrCodeUrl, "PNG", 95, bottomY - 2, 22, 22);
    doc.setFont("times", "bold");
    doc.setFontSize(8);
    doc.text("SCAN ME", 106, bottomY + 23, { align: "center" });

    // WATERMARK
    doc.setTextColor(210);
    doc.setFontSize(38);
    doc.setFont("times", "bolditalic");
    doc.text("Internet", 145, bottomY + 5, { align: "center" });
    doc.text("Copy", 145, bottomY + 15, { align: "center" });
    doc.setTextColor(0);

    // CONTROLLER
    doc.setFont("times", "normal");
    doc.setFontSize(9);
    doc.text("Controller of Examinations", pageWidth - 18, bottomY + 15, { align: "right" });
    doc.text("Assam Higher Secondary Education Council", pageWidth - 18, bottomY + 19, { align: "right" });
    doc.text("Guwahati-21", pageWidth - 18, bottomY + 23, { align: "right" });

    // --- LEGEND TABLE ---
    let legendY = bottomY + 30;
    doc.setLineWidth(0.2);
    doc.rect(18, legendY, pageWidth - 36, 12);
    doc.line(100, legendY, 100, legendY + 12); // Split
    
    doc.setFontSize(8.5);
    doc.setFont("times", "bold");
    doc.text("THEORY", 55, legendY + 3.5, { align: "center" });
    doc.text("PRACTICAL", 80, legendY + 3.5, { align: "center" });
    doc.setFont("times", "normal");
    doc.text("FULL MARKS :", 20, legendY + 7);
    doc.text("100/80/70", 55, legendY + 7, { align: "center" });
    doc.text("20/30", 80, legendY + 7, { align: "center" });
    doc.text("PASS MARKS :", 20, legendY + 10.5);
    doc.text("30/24/21", 55, legendY + 10.5, { align: "center" });
    doc.text("08/12", 80, legendY + 10.5, { align: "center" });

    // --- DISCLAIMER ---
    doc.setFontSize(8);
    doc.rect(18, legendY + 12, pageWidth - 36, 6);
    doc.text("This marks sheet is not to be treated as original. It is meant for immediate information to the examinee. Original marks sheet have been issued by the Council separately.", pageWidth / 2, legendY + 16, { align: "center" });

    doc.save(`Marksheet_${result.RollNumber}.pdf`);
  };

  return (
    <main className="min-h-screen bg-[#f1f5f9] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl p-8 border border-white">
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-blue-600 rounded-3xl mx-auto flex items-center justify-center shadow-xl shadow-blue-100 mb-6 group hover:scale-110 transition-transform duration-500">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.246.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">AHSEC</h1>
          <p className="text-slate-400 font-black text-xs uppercase tracking-widest mt-1">Examination 2024</p>
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-1">Roll</label>
              <input type="text" value={roll} onChange={(e) => setRoll(e.target.value)} placeholder="0241" className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl px-6 py-4 focus:border-blue-600 focus:bg-white outline-none transition-all font-bold text-slate-700" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-1">No.</label>
              <input type="text" value={no} onChange={(e) => setNo(e.target.value)} placeholder="10037" className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl px-6 py-4 focus:border-blue-600 focus:bg-white outline-none transition-all font-bold text-slate-700" />
            </div>
          </div>

          <button onClick={fetchResult} disabled={loading} className="w-full bg-blue-600 text-white font-black py-5 rounded-2xl shadow-2xl shadow-blue-100 hover:bg-blue-700 hover:-translate-y-1 active:scale-95 transition-all flex items-center justify-center gap-3">
            {loading ? <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin"></div> : "SEARCH RESULTS"}
          </button>
        </div>

        {error && <div className="mt-8 p-4 bg-red-50 text-red-600 rounded-2xl text-center text-sm font-black animate-bounce">{error}</div>}

        {result && (
          <div className="mt-10 pt-10 border-t border-slate-100 animate-in fade-in slide-in-from-bottom-10 duration-1000">
            <div className="bg-slate-900 rounded-[2rem] p-8 text-white">
              <p className="text-slate-500 text-[10px] font-black uppercase mb-1">Candidate Name</p>
              <h2 className="text-2xl font-black mb-6 leading-tight truncate">{result.CandidateName}</h2>
              
              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-white/5 p-5 rounded-3xl border border-white/5">
                  <p className="text-slate-500 text-[9px] font-black uppercase mb-1">Marks</p>
                  <p className="text-2xl font-black">{result.Total_Marks_in_Figure}</p>
                </div>
                <div className="bg-white/5 p-5 rounded-3xl border border-white/5">
                  <p className="text-slate-500 text-[9px] font-black uppercase mb-1">Division</p>
                  <p className="text-lg font-black">{result.FinalResult || "PASSED"}</p>
                </div>
              </div>

              <button onClick={downloadPDF} className="w-full bg-white text-slate-900 font-black py-4 rounded-2xl hover:bg-blue-50 transition-all flex items-center justify-center gap-2 group">
                <svg className="w-6 h-6 group-hover:animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                GET PDF MARKSHEET
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
