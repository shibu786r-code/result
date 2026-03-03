"use client";

import { useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

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

  const downloadPDF = () => {
    if (!result) return;
    const doc = new jsPDF();
    
    doc.setFontSize(20);
    doc.text("ASSAM RESULT PORTAL 2024", 105, 20, { align: "center" });
    
    doc.setFontSize(12);
    doc.text(`Candidate: ${result.CandidateName}`, 20, 40);
    doc.text(`School: ${result.SchoolName}`, 20, 50);
    doc.text(`Roll Number: ${result.RollNumber}`, 20, 60);

    const rows = [];
    for (let i = 1; i <= 16; i++) {
      if (result[`Sub${i}_Name`]) {
        rows.push([
          result[`Sub${i}_Name`],
          result[`Sub${i}_Th_Marks`] || "-",
          result[`Sub${i}_Pr_Marks`] || "-",
          result[`Sub${i}_Tot_Marks`]
        ]);
      }
    }

    autoTable(doc, {
      head: [["Subject", "Theory", "Practical", "Total"]],
      body: rows,
      startY: 70,
    });

    // @ts-ignore
    const finalY = doc.lastAutoTable.finalY || 150;
    doc.text(`Final Result: ${result.FinalResult || "N/A"}`, 20, finalY + 10);
    
    doc.save(`Marksheet_${result.RollNumber}.pdf`);
  };

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8 border border-gray-100">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-blue-900 tracking-tight">Assam Result 2024</h1>
          <p className="text-gray-500 mt-2">SEBA & AHSEC Examination Portal</p>
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1 px-1">Roll</label>
              <input 
                type="text" 
                value={roll}
                onChange={(e) => setRoll(e.target.value)}
                placeholder="0001"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1 px-1">Number</label>
              <input 
                type="text" 
                value={no}
                onChange={(e) => setNo(e.target.value)}
                placeholder="10041"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
            </div>
          </div>

          <button 
            onClick={fetchResult}
            disabled={loading}
            className={`w-full bg-blue-700 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-blue-800 transition-transform active:scale-95 flex items-center justify-center ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            {loading ? (
              <svg className="animate-spin h-5 w-5 mr-3 text-white" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : "CHECK RESULT"}
          </button>
        </div>

        {error && (
          <div className="mt-6 p-4 bg-red-50 text-red-700 rounded-xl text-center font-medium border border-red-100">
            {error}
          </div>
        )}

        {result && (
          <div className="mt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-blue-50 rounded-2xl p-6 border border-blue-100">
              <h2 className="text-xl font-bold text-blue-900">{result.CandidateName}</h2>
              <p className="text-blue-700 text-sm opacity-80 mt-1">{result.SchoolName}</p>
              
              <div className="mt-6 space-y-3">
                <div className="flex justify-between text-sm border-b border-blue-100 pb-2 font-medium">
                  <span className="text-gray-600">Total Marks</span>
                  <span className="text-blue-900 font-bold">{result.Total_Marks_in_Figure || "N/A"}</span>
                </div>
                <div className="flex justify-between text-sm border-b border-blue-100 pb-2 font-medium">
                  <span className="text-gray-600">Final Result</span>
                  <span className="text-green-700 font-bold uppercase tracking-wide">{result.FinalResult || "PASS"}</span>
                </div>
              </div>

              <button 
                onClick={downloadPDF}
                className="mt-6 w-full bg-white text-blue-700 border-2 border-blue-100 font-bold py-3 rounded-xl hover:bg-blue-100 transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
                DOWNLOAD MARKSHEET
              </button>
            </div>
          </div>
        )}
      </div>
      
      <p className="fixed bottom-4 text-gray-400 text-xs text-center w-full">
        Serverless & Server-Cost Zero Powered by Lambda + DynamoDB
      </p>
    </main>
  );
}
