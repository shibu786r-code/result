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

    doc.setFont("times", "normal");

    // --- Form Number ---
    doc.setFontSize(8.5);
    doc.text("Form No. Ex-32(a)", pageWidth - 18, 12, { align: "right" });

    // --- Emblem Mimic ---
    doc.setLineWidth(0.4);
    doc.circle(25, 25, 10);
    doc.setLineWidth(0.1);
    doc.circle(25, 25, 8);
    doc.setFontSize(3.5);
    doc.setFont("times", "bold");
    doc.text("ASSAM HIGHER", 25, 20, { align: "center" });
    doc.text("SECONDARY", 25, 22, { align: "center" });
    doc.text("EDUCATION", 25, 24, { align: "center" });
    doc.text("COUNCIL", 25, 26, { align: "center" });
    doc.setFontSize(4.5);
    doc.text("AHSEC", 25, 30, { align: "center" });

    // --- Header Text ---
    doc.setFontSize(16);
    doc.text("ASSAM HIGHER SECONDARY EDUCATION COUNCIL", pageWidth / 2 + 10, 20, { align: "center" });
    doc.setFontSize(11);
    doc.text("GUWAHATI - 781021", pageWidth / 2 + 10, 25, { align: "center" });
    doc.text("MARKS-SHEET (INTERNET COPY)", pageWidth / 2 + 10, 30, { align: "center" });
    doc.setFontSize(12);
    doc.text("HIGHER SECONDARY FINAL EXAMINATION-2024", pageWidth / 2 + 10, 36, { align: "center" });

    doc.setLineWidth(0.2);
    doc.line(18, 42, pageWidth - 18, 42);

    // --- Info Section ---
    doc.setFontSize(10.5);
    let y = 48;
    doc.setFont("times", "normal"); doc.text(`Stream :`, 18, y); doc.setFont("times", "bold"); doc.text(result.Stream || "ARTS", 33, y);
    doc.setFont("times", "normal"); doc.text(`Date :`, pageWidth - 45, y); doc.setFont("times", "bold"); doc.text(result.Date || new Date().toLocaleDateString("en-IN"), pageWidth - 34, y);
    y += 7;
    doc.setFont("times", "normal"); doc.text(`Name :`, 18, y); doc.setFont("times", "bold"); doc.text(result.CandidateName, 32, y);
    y += 7;
    doc.setFont("times", "normal"); doc.text(`College/School :`, 18, y); doc.setFont("times", "bold"); doc.text(result.SchoolName, 44, y);
    y += 7;
    doc.setFont("times", "normal"); doc.text(`Roll :`, 18, y); doc.setFont("times", "bold"); doc.text(result.RollNumber.split("-")[0], 28, y);
    doc.setFont("times", "normal"); doc.text(`No. :`, 55, y); doc.setFont("times", "bold"); doc.text(result.RollNumber.split("-")[1], 64, y);

    // --- Table Preparation ---
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
          "" // Merged RESULT
        ]);
      }
    }
    const fillerCount = Math.max(0, 9 - subjectRows.length);
    for(let i=0; i<fillerCount; i++) {
        subjectRows.push(["", "", "", "", "", "", ""]);
    }

    autoTable(doc, {
      startY: 75,
      margin: { left: 18, right: 18 },
      head: [["CODE", "IND", "SUBJECTS", "THEORY", "PR", "TOTAL", "RESULT"]],
      body: [
          ...subjectRows,
          [
            { content: "GRAND TOTAL\n(Out of 500 Marks)", colSpan: 2, styles: { fontStyle: "bold", fontSize: 9.5 } },
            { content: result.Total_Marks_in_Words || "", styles: { halign: "center" } },
            { content: "", colSpan: 2 },
            { content: result.Total_Marks_in_Figure || "", styles: { fontStyle: "bold", halign: "center", fontSize: 11 } },
            { content: result.FinalResult || "", styles: { fontStyle: "bold", halign: "center", fontSize: 11 } }
          ],
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
        0: { cellWidth: 14 }, // CODE
        1: { cellWidth: 10 }, // IND
        2: { cellWidth: 65 }, // SUBJECTS
        3: { halign: "center", cellWidth: 15 }, // THEORY
        4: { halign: "center", cellWidth: 10 }, // PR
        5: { halign: "center", cellWidth: 15 }, // TOTAL
        6: { cellWidth: 45 }  // RESULT (14+10+65+15+10+15+45 = 174mm, fits A4 210-36mm margin)
      },
      didParseCell: (data) => {
        if (data.column.index === 6 && data.section === 'body' && data.row.index === 0) {
            data.cell.rowSpan = subjectRows.length;
        }
      },
      didDrawCell: (data) => {
        if (data.column.index === 6 && data.section === 'body' && data.row.index === 0) {
            const x = data.cell.x + 2;
            let ty = data.cell.y + 6;
            doc.setFontSize(9);
            doc.setFont("times", "bolditalic");
            doc.text("1st Division", x + 21, ty, { align: "center" });
            doc.setFont("times", "normal");
            doc.text("300 and above", x + 21, ty + 4, { align: "center" });
            ty += 12;
            doc.setFont("times", "bolditalic");
            doc.text("2nd Division", x + 21, ty, { align: "center" });
            doc.setFont("times", "normal");
            doc.text("225 - 299", x + 21, ty + 4, { align: "center" });
            ty += 12;
            doc.setFont("times", "bolditalic");
            doc.text("3rd Division", x + 21, ty, { align: "center" });
            doc.setFont("times", "normal");
            doc.setFontSize(8);
            doc.text("**150/153/156/159 - 224", x + 21, ty + 4, { align: "center" });
            ty += 10;
            doc.setFontSize(7);
            doc.text("** 150/153/156/159 depend", x, ty);
            doc.text("on practical subjects.", x, ty + 3);
        }
      }
    });

    // @ts-ignore
    let tableEndY = doc.lastAutoTable.finalY;

    // --- Bottom Section ---
    let bottomY = tableEndY + 6;
    doc.setFontSize(8.5);
    doc.setFont("times", "italic");
    doc.text("In order to verify the result, scan the QR Code", 18, bottomY);
    doc.text("and follow instructions as appearing in the screen.", 18, bottomY + 4);
    doc.setFont("times", "normal");
    doc.text("or", 18, bottomY + 8);
    doc.text("Visit website http://www.ahsec.assam.gov.in/", 18, bottomY + 12);

    const qrData = `Roll: ${result.RollNumber}, Name: ${result.CandidateName}, Total: ${result.Total_Marks_in_Figure}`;
    const qrCodeUrl = await QRCode.toDataURL(qrData);
    doc.addImage(qrCodeUrl, "PNG", 95, bottomY - 3, 20, 20);
    doc.setFont("times", "bold");
    doc.text("SCAN ME", 105, bottomY + 22, { align: "center" });

    doc.setTextColor(215);
    doc.setFontSize(36);
    doc.setFont("times", "bolditalic");
    doc.text("Internet", 145, bottomY + 4, { align: "center" });
    doc.text("Copy", 145, bottomY + 13, { align: "center" });
    doc.setTextColor(0);

    doc.setFont("times", "normal");
    doc.setFontSize(9);
    doc.text("Controller of Examinations", pageWidth - 18, bottomY + 14, { align: "right" });
    doc.text("Assam Higher Secondary Education Council", pageWidth - 18, bottomY + 18, { align: "right" });
    doc.text("Guwahati-21", pageWidth - 18, bottomY + 22, { align: "right" });

    // --- Legend Table ---
    let legendY = bottomY + 28;
    doc.setLineWidth(0.2);
    doc.rect(18, legendY, pageWidth - 36, 12);
    doc.line(100, legendY, 100, legendY + 12);
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

    doc.setFontSize(8);
    doc.rect(18, legendY + 12, pageWidth - 36, 6);
    doc.text("This marks sheet is not to be treated as original. It is meant for immediate information to the examinee. Original marks sheet have been issued by the Council separately.", pageWidth / 2, legendY + 16, { align: "center" });

    doc.save(`Marksheet_${result.RollNumber}.pdf`);
  };

  return (
    <main className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-6 antialiased">
      <div className="max-w-md w-full bg-white rounded-[3rem] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.15)] p-10 border border-white">
        <div className="text-center mb-12">
          <div className="w-20 h-20 bg-blue-600 rounded-[2rem] mx-auto flex items-center justify-center shadow-2xl shadow-blue-200 mb-8 hover:scale-110 transition-all duration-500 cursor-default">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">AHSEC Portal</h1>
          <p className="text-slate-400 font-bold text-xs uppercase tracking-[0.2em] mt-2">Class XII Results</p>
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Roll</label>
              <input type="text" value={roll} onChange={(e) => setRoll(e.target.value)} placeholder="0241" className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl px-6 py-4 focus:border-blue-600 outline-none transition-all font-bold text-slate-700" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Number</label>
              <input type="text" value={no} onChange={(e) => setNo(e.target.value)} placeholder="10037" className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl px-6 py-4 focus:border-blue-600 outline-none transition-all font-bold text-slate-700" />
            </div>
          </div>

          <button onClick={fetchResult} disabled={loading} className="w-full bg-blue-600 text-white font-black py-5 rounded-3xl shadow-2xl shadow-blue-100 hover:bg-blue-700 hover:-translate-y-1 active:scale-95 transition-all flex items-center justify-center gap-3">
            {loading ? <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin"></div> : "GENERATE MARKSHEET"}
          </button>
        </div>

        {error && <div className="mt-8 p-4 bg-red-50 text-red-600 rounded-2xl text-center text-sm font-black border border-red-100 animate-pulse">{error}</div>}

        {result && (
          <div className="mt-10 pt-10 border-t border-slate-100 animate-in fade-in slide-in-from-bottom-10 duration-1000">
            <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700"></div>
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-2">Student</p>
              <h2 className="text-2xl font-black mb-6 leading-tight">{result.CandidateName}</h2>
              
              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-white/5 p-5 rounded-3xl border border-white/5">
                  <p className="text-slate-500 text-[9px] font-bold uppercase mb-1">Status</p>
                  <p className="text-lg font-black">{result.FinalResult || "PASSED"}</p>
                </div>
                <div className="bg-white/5 p-5 rounded-3xl border border-white/5">
                  <p className="text-slate-500 text-[9px] font-bold uppercase mb-1">Total</p>
                  <p className="text-2xl font-black">{result.Total_Marks_in_Figure}</p>
                </div>
              </div>

              <button onClick={downloadPDF} className="w-full bg-white text-slate-900 font-black py-4 rounded-2xl hover:bg-blue-50 transition-all flex items-center justify-center gap-2">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                DOWNLOAD PDF
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
