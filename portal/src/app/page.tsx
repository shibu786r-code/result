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

    // --- OUTER BORDER ---
    doc.setLineWidth(0.4);
    doc.rect(7, 7, pageWidth - 14, pageHeight - 14);
    
    // --- HEADER SECTION (Times New Roman Style) ---
    doc.setFont("times", "bold");
    doc.setFontSize(18);
    doc.text("ASSAM HIGHER SECONDARY EDUCATION COUNCIL", pageWidth / 2, 18, { align: "center" });
    
    doc.setFontSize(13);
    doc.text("GUWAHATI - 781021", pageWidth / 2, 25, { align: "center" });
    
    doc.setFontSize(12);
    doc.text("MARKS-SHEET (INTERNET COPY)", pageWidth / 2, 32, { align: "center" });
    doc.text(`HIGHER SECONDARY FINAL EXAMINATION-2024`, pageWidth / 2, 39, { align: "center" });
    
    doc.setFontSize(9);
    doc.setFont("times", "normal");
    doc.text("Form No. Ex-32(a)", pageWidth - 45, 12);

    // --- STUDENT INFO ---
    let y = 50;
    doc.setFontSize(11);
    doc.text(`Stream :  ${result.Stream || "ARTS"}`, 12, y);
    doc.text(`Date :  ${result.Date || new Date().toLocaleDateString("en-IN")}`, pageWidth - 55, y);
    
    y += 8;
    doc.text(`Name :  ${result.CandidateName}`, 12, y);
    
    y += 8;
    doc.text(`College/School :  ${result.SchoolName}`, 12, y);
    
    y += 8;
    doc.text(`Roll :  ${result.RollNumber.split("-")[0]}`, 12, y);
    doc.text(`No. :  ${result.RollNumber.split("-")[1]}`, 65, y);

    // --- MARKS TABLE ---
    const rows = [];
    // Catch every subject slot from Sub1 to Sub16
    for (let i = 1; i <= 16; i++) {
      if (result[`Sub${i}_Code`]) {
        rows.push([
          result[`Sub${i}_Code`],
          result[`Sub${i}_Pap_Indicator`] || "",
          result[`Sub${i}_Name`],
          result[`Sub${i}_Th_Marks`] || "",
          result[`Sub${i}_Pr_Marks`] || "",
          result[`Sub${i}_Tot_Marks`],
          "" // Empty Result merge space
        ]);
      }
    }

    autoTable(doc, {
      startY: 85,
      margin: { left: 12, right: 12 },
      head: [["CODE", "IND", "SUBJECTS", "THEORY", "PR", "TOTAL", "RESULT"]],
      body: rows,
      theme: "plain",
      styles: { font: "times", fontSize: 10, cellPadding: 2.5, lineWidth: 0.2, lineColor: [0, 0, 0], textColor: [0, 0, 0] },
      headStyles: { fontStyle: "bold", halign: "center", fillColor: [255, 255, 255] },
      columnStyles: {
        0: { cellWidth: 20 },
        1: { cellWidth: 15 },
        2: { cellWidth: 65 },
        3: { halign: "center", cellWidth: 20 },
        4: { halign: "center", cellWidth: 15 },
        5: { halign: "center", cellWidth: 20 },
        6: { cellWidth: 35 } 
      },
      didDrawCell: (data) => {
        if (data.section === 'body' && data.column.index === 6 && data.row.index === 0) {
          const x = data.cell.x;
          const yStart = data.cell.y;
          // @ts-ignore
          const totalRowsHeight = doc.lastAutoTable.finalY - yStart;
          
          doc.rect(x, yStart, data.cell.width, totalRowsHeight);
          
          doc.setFontSize(8);
          doc.setFont("times", "bolditalic");
          let ty = yStart + 8;
          doc.text("1st Division", x + 5, ty); doc.text("300 and above", x + 5, ty + 4);
          ty += 15;
          doc.text("2nd Division", x + 5, ty); doc.text("225 - 299", x + 5, ty + 4);
          ty += 15;
          doc.text("3rd Division", x + 5, ty); doc.text("150/153/156/159 - 224", x + 5, ty + 4);
          doc.setFontSize(6);
          doc.text("* 150/153/156/159 depend", x+5, ty+8);
          doc.text("on practical subjects.", x+5, ty+11);
        }
      }
    });

    // --- GRAND TOTAL ---
    // @ts-ignore
    let tableEndY = doc.lastAutoTable.finalY;
    doc.rect(12, tableEndY, 155, 12); 
    doc.rect(167, tableEndY, 31, 12); 
    
    doc.setFont("times", "bold");
    doc.text("GRAND TOTAL (Out of 500 Marks)", 14, tableEndY + 5);
    doc.setFont("times", "normal");
    doc.text(result.Total_Marks_in_Words || "", 85, tableEndY + 5);
    doc.text(result.Total_Marks_in_Figure || "", 155, tableEndY + 5);
    
    doc.setFont("times", "bold");
    doc.text(result.FinalResult || "", 170, tableEndY + 8);

    // --- ENVE ---
    doc.rect(12, tableEndY + 12, 155, 8);
    doc.rect(167, tableEndY + 12, 31, 8);
    doc.text("ENVE - GRADE ON ENVIRONMENTAL EDUCATION", 14, tableEndY + 17.5);
    doc.text(result.ENVE_Grade || "", 155, tableEndY + 17.5);

    // --- BOTTOM QR & WATERMARK ---
    const qrData = `Roll: ${result.RollNumber}, Name: ${result.CandidateName}, Total: ${result.Total_Marks_in_Figure}`;
    const qrCodeUrl = await QRCode.toDataURL(qrData);
    doc.addImage(qrCodeUrl, "PNG", pageWidth / 2 - 15, tableEndY + 25, 30, 30);
    doc.setFontSize(8);
    doc.text("SCAN ME", pageWidth / 2, tableEndY + 58, { align: "center" });

    // PASS MARKS TABLE
    const passMarksY = tableEndY + 25;
    autoTable(doc, {
        startY: passMarksY,
        margin: { left: 12 },
        tableWidth: 80,
        head: [["", "THEORY", "PRACTICAL"]],
        body: [
            ["FULL MARKS :", "100/80/70", "20/30"],
            ["PASS MARKS :", "30/24/21", "08/12"]
        ],
        theme: "grid",
        styles: { font: "times", fontSize: 7, cellPadding: 1, halign: 'center' },
        columnStyles: { 0: { halign: 'left', fontStyle: 'bold' } }
    });

    // INTERNET COPY WATERMARK
    doc.setTextColor(245);
    doc.setFontSize(60);
    doc.setFont("times", "bold");
    doc.text("Internet Copy", pageWidth - 15, pageHeight - 45, { angle: 35, align: "right" });
    doc.setTextColor(0);

    // FOOTER
    doc.setFontSize(9);
    const footY = pageHeight - 25;
    doc.text("Controller of Examinations", pageWidth - 15, footY, { align: "right" });
    doc.text("Assam Higher Secondary Education Council", pageWidth - 15, footY + 4, { align: "right" });
    doc.text("Guwahati-21", pageWidth - 15, footY + 8, { align: "right" });

    doc.setFontSize(7);
    doc.text("This marks sheet is not to be treated as original. Original marks sheet will be issued separately.", pageWidth / 2, pageHeight - 5, { align: "center" });

    doc.save(`Marksheet_${result.RollNumber}.pdf`);
  };

  return (
    <main className="min-h-screen bg-[#f1f5f9] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.1)] p-8 border border-white">
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
