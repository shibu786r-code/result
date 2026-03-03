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

    // --- OUTER BORDER ---
    doc.setLineWidth(0.5);
    doc.rect(5, 5, pageWidth - 10, doc.internal.pageSize.getHeight() - 10);
    
    // --- HEADER SECTION ---
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("ASSAM HIGHER SECONDARY EDUCATION COUNCIL", pageWidth / 2, 15, { align: "center" });
    
    doc.setFontSize(12);
    doc.text("GUWAHATI - 781021", pageWidth / 2, 22, { align: "center" });
    
    doc.setFontSize(11);
    doc.text("MARKS-SHEET (INTERNET COPY)", pageWidth / 2, 28, { align: "center" });
    doc.text("HIGHER SECONDARY FINAL EXAMINATION-2024", pageWidth / 2, 34, { align: "center" });
    
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text("Form No. Ex-32(a)", pageWidth - 40, 10);

    // --- STUDENT INFO SECTION ---
    let y = 45;
    doc.setFontSize(10);
    doc.text(`Stream : ${result.Stream || "ARTS"}`, 10, y);
    doc.text(`Date : ${new Date().toLocaleDateString("en-IN")}`, pageWidth - 50, y);
    
    y += 7;
    doc.text(`Name : ${result.CandidateName}`, 10, y);
    
    y += 7;
    doc.text(`College/School : ${result.SchoolName}`, 10, y);
    
    y += 7;
    doc.text(`Roll : ${result.RollNumber.split("-")[0]}`, 10, y);
    doc.text(`No. : ${result.RollNumber.split("-")[1]}`, 50, y);

    // --- MARKS TABLE ---
    const rows = [];
    for (let i = 1; i <= 6; i++) {
      if (result[`Sub${i}_Code`]) {
        rows.push([
          result[`Sub${i}_Code`],
          result[`Sub${i}_Pap_Indicator`] || "CORE",
          result[`Sub${i}_Name`],
          result[`Sub${i}_Th_Marks`] || "",
          result[`Sub${i}_Pr_Marks`] || "",
          result[`Sub${i}_Tot_Marks`]
        ]);
      }
    }

    autoTable(doc, {
      startY: 72,
      margin: { left: 10, right: 60 }, // Leave space for the result criteria box on the right
      head: [["CODE", "IND", "SUBJECTS", "THEORY", "PR", "TOTAL"]],
      body: rows,
      theme: "plain",
      styles: { fontSize: 9, cellPadding: 2, lineWidth: 0.2, lineColor: [0, 0, 0] },
      headStyles: { fontStyle: "bold", halign: "center", fillColor: [255, 255, 255] },
      columnStyles: {
        0: { cellWidth: 15 },
        1: { cellWidth: 15 },
        2: { cellWidth: 60 },
        3: { halign: "center" },
        4: { halign: "center" },
        5: { halign: "center" }
      }
    });

    // --- DIVISION CRITERIA BOX (Right Side) ---
    // @ts-ignore
    const tableEndY = doc.lastAutoTable.finalY;
    const rightBoxWidth = 50;
    doc.rect(pageWidth - 60, 72, rightBoxWidth, tableEndY - 72);
    
    doc.setFontSize(8);
    doc.setFont("helvetica", "bolditalic");
    let dy = 80;
    doc.text("1st Division", pageWidth - 55, dy); doc.text("300 and above", pageWidth - 55, dy + 4);
    dy += 15;
    doc.text("2nd Division", pageWidth - 55, dy); doc.text("225 - 299", pageWidth - 55, dy + 4);
    dy += 15;
    doc.text("3rd Division", pageWidth - 55, dy); doc.text("150/153/156/159 - 224", pageWidth - 55, dy + 4);
    
    // --- TOTAL SECTION ---
    doc.setLineWidth(0.2);
    doc.rect(10, tableEndY, pageWidth - 70, 15);
    doc.rect(pageWidth - 60, tableEndY, rightBoxWidth, 15); // Grand Total Right Box
    
    doc.setFont("helvetica", "bold");
    doc.text("GRAND TOTAL (Out of 500 Marks)", 12, tableEndY + 6);
    doc.setFont("helvetica", "normal");
    doc.text(result.Total_Marks_in_Words || "ONE EIGHT FOUR", 80, tableEndY + 6);
    doc.text(result.Total_Marks_in_Figure || "184", pageWidth - 75, tableEndY + 6);
    
    doc.setFont("helvetica", "bold");
    doc.text(result.FinalResult || "THIRD DIVISION", pageWidth - 58, tableEndY + 10);

    // --- ENVE BOX ---
    doc.rect(10, tableEndY + 15, pageWidth - 70, 8);
    doc.rect(pageWidth - 60, tableEndY + 15, rightBoxWidth, 8);
    doc.text("ENVE - GRADE ON ENVIRONMENTAL EDUCATION", 12, tableEndY + 20.5);
    doc.text(result.ENVE_Grade || "B", pageWidth - 75, tableEndY + 20.5);

    // --- QR CODE ---
    const qrData = `Roll: ${result.RollNumber}, Name: ${result.CandidateName}, Total: ${result.Total_Marks_in_Figure}`;
    const qrCodeUrl = await QRCode.toDataURL(qrData);
    doc.addImage(qrCodeUrl, "PNG", pageWidth / 2 - 15, tableEndY + 35, 30, 30);
    doc.setFontSize(7);
    doc.text("SCAN ME", pageWidth / 2, tableEndY + 68, { align: "center" });

    // --- WATERMARK (INTERNET COPY) ---
    doc.setTextColor(230);
    doc.setFontSize(50);
    doc.text("Internet Copy", pageWidth - 20, doc.internal.pageSize.getHeight() - 40, { angle: 30, align: "right" });
    doc.setTextColor(0);

    // --- FOOTER SIGNATURE ---
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    const footerY = doc.internal.pageSize.getHeight() - 25;
    doc.text("Controller of Examinations", pageWidth - 20, footerY, { align: "right" });
    doc.text("Assam Higher Secondary Education Council", pageWidth - 20, footerY + 4, { align: "right" });
    doc.text("Guwahati-21", pageWidth - 20, footerY + 8, { align: "right" });

    doc.setFontSize(7);
    doc.text("This marks sheet is not to be treated as original. Original marks sheet will be issued separately.", 10, doc.internal.pageSize.getHeight() - 5);

    doc.save(`Marksheet_${result.RollNumber}.pdf`);
  };

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-4 antialiased">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-[0_20px_50px_rgba(8,_112,_184,_0.1)] p-8 border border-slate-100 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-bl-full -z-0 opacity-50"></div>
        
        <div className="text-center mb-10 relative z-10">
          <div className="w-16 h-16 bg-blue-700 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg shadow-blue-200">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.246.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>
          </div>
          <h1 className="text-2xl font-black text-slate-900 leading-tight">AHSEC RESULTS</h1>
          <p className="text-slate-400 font-medium text-sm mt-1 uppercase tracking-wider">Session 2024</p>
        </div>

        <div className="space-y-5 relative z-10">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">Roll</label>
              <input type="text" value={roll} onChange={(e) => setRoll(e.target.value)} placeholder="0241" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3.5 focus:border-blue-500 focus:bg-white outline-none transition-all font-bold text-slate-700 placeholder:text-slate-300" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">No.</label>
              <input type="text" value={no} onChange={(e) => setNo(e.target.value)} placeholder="10037" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3.5 focus:border-blue-500 focus:bg-white outline-none transition-all font-bold text-slate-700 placeholder:text-slate-300" />
            </div>
          </div>

          <button onClick={fetchResult} disabled={loading} className="w-full bg-slate-900 text-white font-bold py-4 rounded-2xl shadow-xl shadow-slate-200 hover:bg-blue-700 hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-3">
            {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : "VIEW MARKSHEET"}
          </button>
        </div>

        {error && <div className="mt-6 p-4 bg-rose-50 text-rose-600 rounded-2xl text-center text-sm font-bold border border-rose-100 animate-shake">{error}</div>}

        {result && (
          <div className="mt-8 pt-8 border-t-2 border-dashed border-slate-100 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-3xl p-6 text-white shadow-2xl shadow-blue-200">
              <p className="text-blue-200 text-[10px] font-bold uppercase tracking-[0.2em] mb-1">Candidate</p>
              <h2 className="text-xl font-black mb-4 truncate">{result.CandidateName}</h2>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/10 rounded-2xl p-4 backdrop-blur-sm">
                  <p className="text-blue-200 text-[10px] font-bold uppercase mb-1">Total</p>
                  <p className="text-2xl font-black">{result.Total_Marks_in_Figure || "N/A"}</p>
                </div>
                <div className="bg-white/10 rounded-2xl p-4 backdrop-blur-sm">
                  <p className="text-blue-200 text-[10px] font-bold uppercase mb-1">Result</p>
                  <p className="text-lg font-black tracking-tight">{result.FinalResult || "PASS"}</p>
                </div>
              </div>

              <button onClick={downloadPDF} className="mt-6 w-full bg-white text-blue-700 font-black py-4 rounded-2xl hover:bg-blue-50 transition-colors flex items-center justify-center gap-2 group">
                <svg className="w-5 h-5 group-hover:bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                DOWNLOAD INTERNET COPY
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
