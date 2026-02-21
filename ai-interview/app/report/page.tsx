"use client";

import React, { useState, useEffect, Suspense, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  FiArrowLeft, FiAward, FiTarget, FiTrendingUp,
  FiSmile, FiBookOpen, FiBarChart2, FiDownload, FiCheckCircle
} from "react-icons/fi";
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  Radar, ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Cell
} from "recharts";
import CountUp from "react-countup";
import { getInterviewResult, getSessionData } from "@/lib/api";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import toast from "react-hot-toast";
import type {
  InterviewRecord, SessionResponse, FinalResult,
  SkillChartData, QuestionScoreData, CurrentScore, AnswerRecord
} from "@/lib/types";

const COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

interface StatDisplayItem {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: string | number;
  color: string;
}

// --- TYPE GUARDS & HELPERS (To avoid 'any') ---

// Check if item is from DB (AnswerRecord) which has nested scores
function isAnswerRecord(item: CurrentScore | AnswerRecord): item is AnswerRecord {
  return (item as AnswerRecord).scores !== undefined && 'technical_accuracy' in (item as AnswerRecord).scores;
}

// Safe extractor for Percentage
function getSafePercentage(item: CurrentScore | AnswerRecord): number {
  if (isAnswerRecord(item)) {
    return item.scores.overall_percentage || (item.scores.overall_marks || 0) * 10;
  }
  return item.overall_percentage || (item.overall_marks || 0) * 10;
}

// Safe extractor for Marks
function getSafeMarks(item: CurrentScore | AnswerRecord): number {
  if (isAnswerRecord(item)) {
    return item.scores.overall_marks || 0;
  }
  return item.overall_marks || 0;
}

// Safe extractor for Category
function getSafeCategory(item: CurrentScore | AnswerRecord): string {
  return item.category || "technical";
}

// Safe extractor for Transcript
function getSafeTranscript(item: CurrentScore | AnswerRecord): string {
  return item.transcript || "";
}

// Safe extractor for Breakdown
function getSafeBreakdown(item: CurrentScore | AnswerRecord) {
  if (isAnswerRecord(item)) {
    return {
      relevance: item.scores.relevance || 0,
      clarity: item.scores.clarity || 0,
      completeness: item.scores.completeness || 0,
      confidence: item.scores.text_confidence || 0,
    };
  }
  return {
    relevance: item.breakdown?.relevance || 0,
    clarity: item.breakdown?.clarity || 0,
    completeness: item.breakdown?.completeness || 0,
    confidence: item.breakdown?.text_confidence || 0,
  };
}

// Safe extractor for Feedback
function getSafeFeedback(item: CurrentScore | AnswerRecord): string {
  return item.feedback || "No feedback available.";
}

function ReportContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const interviewId = searchParams.get("id");
  const sessionId = searchParams.get("session_id");
  const reportRef = useRef<HTMLDivElement>(null);

  const [interview, setInterview] = useState<InterviewRecord | null>(null);
  const [sessionData, setSessionData] = useState<SessionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    loadReport();
  }, []);

  const loadReport = async () => {
    try {
      if (interviewId) {
        const result = await getInterviewResult(interviewId);
        setInterview(result.interview);
      }
      if (sessionId) {
        const session = await getSessionData(sessionId);
        setSessionData(session);
      }
    } catch (err: unknown) {
      console.error("Report load error", err);
      toast.error("Failed to load report data");
    } finally {
      setLoading(false);
    }
  };

  const downloadPDF = async () => {
    if (!reportRef.current) return;
    setDownloading(true);
    const toastId = toast.loading("Generating PDF...");
    try {
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        backgroundColor: "#020617",
        useCORS: true,
        logging: false,
      });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      pdf.save(`Interview-Report-${new Date().toISOString().slice(0, 10)}.pdf`);
      toast.success("PDF Downloaded!", { id: toastId });
    } catch {
      toast.error("Failed to generate PDF", { id: toastId });
    } finally {
      setDownloading(false);
    }
  };

  const getScoreColor = (score: number): string => {
    if (score >= 80) return "text-green-400";
    if (score >= 50) return "text-yellow-400";
    return "text-red-400";
  };

  const getCircleColor = (score: number): string => {
    if (score >= 80) return "#22c55e"; 
    if (score >= 50) return "#eab308";
    return "#ef4444";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
      </div>
    );
  }

  // --- DATA PREPARATION ---
  
  const reportDomain = interview?.domain || sessionData?.domain || "General";
  const reportLevel = interview?.level || sessionData?.level || "All";
  
  // Combine data sources safely
  const rawList: (CurrentScore | AnswerRecord)[] = sessionData?.scores || interview?.answers || [];
  
  // Create safe Final Result object
  const defaultSkills = { technical: 0, communication: 0, problem_solving: 0, confidence: 0 };
  const rawResult = sessionData?.final_result || (interview as unknown as FinalResult); // Type assertion for shared props

  // Calculate totals if missing
  let totalMarks = 0;
  rawList.forEach(item => {
    totalMarks += getSafeMarks(item);
  });
  
  const totalQuestions = rawList.length || 1;
  // ✅ FIX: Calculate Average Score manually if missing
  const calculatedAvg = totalMarks > 0 ? (totalMarks / totalQuestions) : 0;
  const apiAvg = rawResult?.average_score ? Number(rawResult.average_score) : 0;
  const finalAvg = apiAvg > 0 ? apiAvg : calculatedAvg;
  
  const finalPct = rawResult?.percentage ? Number(rawResult.percentage) : (finalAvg * 10);

  // ✅ FIX: Emotion Default
  const rawEmotion = rawResult?.dominant_emotion;
  const finalEmotion = (rawEmotion && rawEmotion !== "neutral" && rawEmotion !== "N/A") 
    ? rawEmotion 
    : "Neutral / Text Mode";

  // ✅ FIX: Grade Logic
  let finalGrade = rawResult?.grade || "N/A";
  if (finalGrade === "N/A" || !finalGrade) {
    if (finalPct >= 80) finalGrade = "A";
    else if (finalPct >= 60) finalGrade = "B";
    else finalGrade = "C";
  }

  const skillAverages = rawResult?.skill_averages || defaultSkills;

  // Chart Data
  const skillData: SkillChartData[] = Object.entries(skillAverages).map(([key, value]) => ({
    skill: key.replace("_", " ").toUpperCase(),
    score: Math.round(Number(value)),
    fullMark: 100,
  }));

  const questionScores: QuestionScoreData[] = rawList.map((item, i) => ({
    name: `Q${i + 1}`,
    score: Math.round(getSafePercentage(item)),
    category: getSafeCategory(item),
  }));

  const displayStats: StatDisplayItem[] = [
    { icon: FiTarget, label: "Questions", value: totalQuestions, color: "from-blue-500 to-cyan-500" },
    { icon: FiSmile, label: "Emotion", value: finalEmotion, color: "from-purple-500 to-pink-500" },
    // ✅ FIX: Display calculated average formatted correctly
    { icon: FiTrendingUp, label: "Avg Score", value: `${finalAvg.toFixed(1)}/10`, color: "from-green-500 to-emerald-500" },
    // ✅ FIX: Use Award icon instead of Mic
    { icon: FiAward, label: "Grade", value: finalGrade, color: "from-orange-500 to-red-500" },
  ];

  return (
    <div className="min-h-screen bg-dark-950 relative font-sans">
      <div className="fixed inset-0 particles-bg opacity-10" />

      <header className="relative z-10 flex justify-between items-center px-6 py-4 border-b border-dark-800 bg-dark-950/80 backdrop-blur-md">
        <button onClick={() => router.push("/dashboard")} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
          <FiArrowLeft /> Back to Dashboard
        </button>
        <div className="flex gap-3">
          <button onClick={downloadPDF} disabled={downloading} className="btn-primary flex items-center gap-2 text-sm py-2 px-4 shadow-lg shadow-primary-500/20">
            {downloading ? "Generating..." : <><FiDownload /> Download Report</>}
          </button>
        </div>
      </header>

      <main ref={reportRef} className="relative z-10 max-w-6xl mx-auto px-6 py-8 space-y-8 bg-dark-950">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
            Interview Performance Report
          </h1>
          <p className="text-slate-500 text-sm mt-2 uppercase tracking-widest">
            {new Date().toLocaleDateString()} • {reportDomain.toUpperCase()} • {reportLevel.toUpperCase()}
          </p>
        </div>

        {/* Hero Score Card */}
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="glass-card p-10 text-center relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-primary-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
          
          <div className="relative w-48 h-48 mx-auto my-6">
            <svg viewBox="0 0 36 36" className="w-48 h-48 -rotate-90 drop-shadow-2xl">
              <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="2" />
              <motion.path 
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" 
                fill="none" 
                stroke={getCircleColor(finalPct)} 
                strokeWidth="2" 
                strokeLinecap="round" 
                initial={{ strokeDasharray: "0, 100" }} 
                animate={{ strokeDasharray: `${finalPct}, 100` }} 
                transition={{ duration: 2, ease: "easeOut" }} 
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-5xl font-bold ${getScoreColor(finalPct)} drop-shadow-lg`}>
                <CountUp end={Math.round(finalPct)} duration={2} />%
              </span>
              <span className="text-xs text-slate-400 mt-1 font-medium tracking-wide">OVERALL SCORE</span>
            </div>
          </div>
          
          <div className={`inline-flex items-center gap-3 px-6 py-2 rounded-full border bg-dark-900/50 backdrop-blur-md ${finalPct >= 70 ? "border-green-500/30 text-green-400" : "border-yellow-500/30 text-yellow-400"} shadow-lg`}>
            <FiCheckCircle className="text-xl" />
            <span className="text-xl font-bold">Grade: {finalGrade}</span>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {displayStats.map((stat, i) => (
            <motion.div key={i} initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: i * 0.1 }} className="glass-card p-6 flex items-center gap-4 hover:bg-white/5 transition-colors">
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-lg`}><stat.icon size={22} className="text-white" /></div>
              <div><p className="text-xl font-bold capitalize text-white">{stat.value}</p><p className="text-xs text-slate-400 font-medium uppercase tracking-wide">{stat.label}</p></div>
            </motion.div>
          ))}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.3 }} className="glass-card p-6">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2 text-white"><FiTarget className="text-primary-400" /> Skill Breakdown</h3>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={skillData}>
                <PolarGrid stroke="rgba(255,255,255,0.1)" />
                <PolarAngleAxis dataKey="skill" tick={{ fill: "#94a3b8", fontSize: 11, fontWeight: 500 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                <Radar dataKey="score" stroke="#6366f1" fill="#6366f1" fillOpacity={0.4} strokeWidth={2} />
                <Tooltip contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #334155", borderRadius: "8px", color: "#fff" }} />
              </RadarChart>
            </ResponsiveContainer>
          </motion.div>

          <motion.div initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.4 }} className="glass-card p-6">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2 text-white"><FiBarChart2 className="text-primary-400" /> Question Performance</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={questionScores} barSize={40}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #334155", borderRadius: "8px", color: "#fff" }} />
                <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                  {questionScores.map((_, i) => <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </motion.div>
        </div>

        {/* Detailed Breakdown */}
        <div className="glass-card p-8">
          <h3 className="text-xl font-bold mb-8 flex items-center gap-2 text-white"><FiBookOpen className="text-primary-400" /> Detailed Analysis</h3>
          <div className="space-y-6">
            {rawList.map((item, i) => {
              const scorePct = getSafePercentage(item);
              const transcript = getSafeTranscript(item);
              const feedback = getSafeFeedback(item);
              const breakdown = getSafeBreakdown(item);

              return (
                <div key={i} className="p-6 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 transition-all page-break-inside-avoid">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-xs px-2.5 py-1 rounded-md bg-primary-500/20 text-primary-300 font-bold uppercase tracking-wider">
                          {getSafeCategory(item)}
                        </span>
                        <span className="text-xs text-slate-500 font-mono">Q{i + 1}</span>
                      </div>
                      <p className="text-lg font-medium text-slate-200">{item.question}</p>
                    </div>
                    <div className={`text-2xl font-bold ${getScoreColor(scorePct)}`}>{Math.round(scorePct)}%</div>
                  </div>
                  
                  {transcript && (
                    <div className="p-4 rounded-xl bg-black/20 border border-white/5 mb-4">
                      <p className="text-xs text-slate-500 mb-2 uppercase font-bold tracking-wider">Your Answer</p>
                      <p className="text-sm text-slate-300 leading-relaxed">{transcript}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                    {Object.entries(breakdown).map(([k, v], j) => (
                      <div key={j} className="text-center p-3 rounded-xl bg-white/5">
                        <p className={`text-lg font-bold ${getScoreColor(v)}`}>{Math.round(v)}%</p>
                        <p className="text-[10px] text-slate-500 uppercase font-bold mt-1 tracking-wider">{k.replace("_", " ")}</p>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-3 items-start p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
                    <div className="mt-1"><FiBookOpen className="text-blue-400" /></div>
                    <div>
                      <p className="text-xs text-blue-400 font-bold uppercase tracking-wider mb-1">AI Feedback</p>
                      <p className="text-sm text-slate-300 italic">{feedback}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}

export default function ReportPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-dark-950 flex items-center justify-center"><div className="w-12 h-12 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" /></div>}>
      <ReportContent />
    </Suspense>
  );
}