"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { FiClock, FiChevronRight, FiSend, FiType, FiEye, FiCheckCircle } from "react-icons/fi";
import toast from "react-hot-toast";
import { startInterview as apiStartInterview, evaluateAnswer, saveResult } from "@/lib/api";
import type { SessionData, CurrentScore } from "@/lib/types";

function InterviewContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const domain = searchParams.get("domain") || "frontend";
  const level = searchParams.get("level") || "all";

  const [session, setSession] = useState<SessionData | null>(null);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<CurrentScore | null>(null);
  const [timeLeft, setTimeLeft] = useState(300); // 5 mins per question
  const [tabSwitches, setTabSwitches] = useState(0);

  useEffect(() => {
    // Start Interview Session
    apiStartInterview(domain, level)
      .then(setSession)
      .catch(() => toast.error("Failed to start session. Check backend."));

    // Proctoring: Detect Tab Switching
    const handleVis = () => { if(document.hidden) setTabSwitches(p => p + 1); };
    document.addEventListener("visibilitychange", handleVis);
    return () => document.removeEventListener("visibilitychange", handleVis);
  }, []);

  // Timer Logic
  useEffect(() => {
    if(loading || feedback) return;
    const timer = setInterval(() => {
      setTimeLeft(t => {
        if(t <= 1) { handleSubmit(); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [loading, feedback, index]);

  // Reset timer on new question
  useEffect(() => {
    setTimeLeft(300);
  }, [index]);

  const handleSubmit = async () => {
    if(!session || !answer.trim()) return;
    setLoading(true);
    
    try {
      // Send text only (image/audio are null)
      const res = await evaluateAnswer(session.session_id, index, answer, null, null);
      setFeedback(res.current_score);
      
      // Save result to DB
      await saveResult(session.interviewId, res.current_score, res.finished, res.final_result);
      
      if(res.finished) {
        toast.success("Interview Complete! Generating Report...", { duration: 3000 });
        setTimeout(() => router.push(`/report?id=${session.interviewId}&session_id=${session.session_id}`), 2000);
      }
    } catch {
      toast.error("Error submitting answer. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const nextQ = () => {
    setFeedback(null);
    setAnswer("");
    setIndex(p => p + 1);
  };

  if (!session) return (
    <div className="min-h-screen bg-dark-950 flex flex-col items-center justify-center text-white">
      <div className="w-12 h-12 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin mb-4" />
      <p className="text-slate-400">Initializing Session...</p>
    </div>
  );

  const currentQ = session.questions[index];
  const progress = ((index + 1) / session.total_questions) * 100;

  return (
    <div className="min-h-screen bg-dark-950 text-white relative font-sans">
      <div className="fixed inset-0 particles-bg opacity-10 pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 flex justify-between items-center px-8 py-5 border-b border-dark-800 bg-dark-950/80 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-gradient-to-br from-primary-600 to-purple-600 rounded-xl flex items-center justify-center text-lg font-bold shadow-lg">AI</div>
          <div>
            <h1 className="font-bold text-lg leading-tight">Technical Interview</h1>
            <p className="text-xs text-slate-400 uppercase tracking-widest">{domain} • {level}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="hidden md:block w-48 h-2 bg-dark-800 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-primary-500 to-purple-500 transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
          
          <div className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${timeLeft < 60 ? "bg-red-500/10 border-red-500/30 text-red-400" : "bg-dark-800 border-dark-700 text-slate-300"}`}>
            <FiClock /> 
            <span className="font-mono font-bold">{Math.floor(timeLeft/60)}:{(timeLeft%60).toString().padStart(2,'0')}</span>
          </div>

          {tabSwitches > 0 && (
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/30 text-yellow-500 text-xs font-bold animate-pulse">
              <FiEye /> Focus Alert
            </div>
          )}
        </div>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto px-6 py-10 grid grid-cols-1 lg:grid-cols-2 gap-10">
        
        {/* Left Column: Question & Feedback */}
        <div className="space-y-8">
          <motion.div 
            key={index}
            initial={{ opacity: 0, x: -20 }} 
            animate={{ opacity: 1, x: 0 }} 
            className="glass-card p-10 border-l-4 border-primary-500 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-4 opacity-10"><FiType size={100} /></div>
            <span className="text-xs font-bold text-primary-400 uppercase tracking-widest mb-2 block">Question {index + 1} of {session.total_questions}</span>
            <h2 className="text-2xl md:text-3xl font-bold leading-tight">{currentQ?.q}</h2>
            <div className="mt-6 flex flex-wrap gap-2">
              <span className="px-3 py-1 rounded-md bg-white/5 text-xs text-slate-400 font-medium uppercase tracking-wider">{currentQ?.category || "Technical"}</span>
              <span className="px-3 py-1 rounded-md bg-white/5 text-xs text-slate-400 font-medium uppercase tracking-wider">{currentQ?.difficulty || "Medium"}</span>
            </div>
          </motion.div>

          <AnimatePresence mode="wait">
            {feedback && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }} 
                animate={{ opacity: 1, y: 0 }} 
                exit={{ opacity: 0, y: -20 }}
                className="glass-card p-8 bg-green-500/5 border-green-500/20"
              >
                <div className="flex items-center gap-3 mb-4">
                  <FiCheckCircle className="text-green-400 text-xl" />
                  <h3 className="font-bold text-green-400 text-lg">AI Feedback Analysis</h3>
                </div>
                
                <p className="text-slate-300 leading-relaxed mb-6 italic border-l-2 border-green-500/30 pl-4">
                  {feedback.feedback}
                </p>
                
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="text-center p-3 rounded-xl bg-dark-900/40">
                    <div className="text-2xl font-bold text-white">{Math.round(feedback.overall_percentage)}%</div>
                    <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mt-1">Score</div>
                  </div>
                  <div className="text-center p-3 rounded-xl bg-dark-900/40">
                    <div className="text-2xl font-bold text-white">{Math.round(feedback.breakdown.relevance)}%</div>
                    <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mt-1">Relevance</div>
                  </div>
                  <div className="text-center p-3 rounded-xl bg-dark-900/40">
                    <div className="text-2xl font-bold text-white">{Math.round(feedback.breakdown.clarity)}%</div>
                    <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mt-1">Clarity</div>
                  </div>
                </div>

                <button 
                  onClick={nextQ} 
                  className="w-full py-4 rounded-xl bg-green-600 hover:bg-green-500 text-white font-bold shadow-lg shadow-green-500/20 transition-all flex justify-center items-center gap-2"
                >
                  Continue to Next Question <FiChevronRight />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right Column: Answer Input */}
        <div className="flex flex-col h-full">
          <div className="flex-1 relative group">
            <textarea 
              value={answer}
              onChange={e => setAnswer(e.target.value)}
              disabled={loading || !!feedback}
              placeholder="Type your detailed answer here..."
              className="w-full h-[500px] bg-dark-900/40 backdrop-blur-sm border border-white/10 rounded-2xl p-8 text-lg leading-relaxed focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none resize-none transition-all placeholder:text-slate-600"
            />
            <div className="absolute bottom-6 right-6 text-xs text-slate-500 font-mono bg-black/40 px-2 py-1 rounded">
              {answer.length} chars
            </div>
          </div>
          
          {!feedback && (
            <button 
              onClick={handleSubmit}
              disabled={loading || !answer.trim()}
              className="mt-6 w-full py-4 rounded-xl bg-gradient-to-r from-primary-600 to-purple-600 hover:from-primary-500 hover:to-purple-500 text-white font-bold text-lg shadow-xl shadow-primary-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-3"
            >
              {loading ? (
                <>Analyzing Answer<span className="animate-pulse">...</span></>
              ) : (
                <><FiSend /> Submit Answer</>
              )}
            </button>
          )}
        </div>

      </main>
    </div>
  );
}

// Suspense Wrapper
export default function InterviewPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-dark-950 flex items-center justify-center text-white">Loading...</div>}>
      <InterviewContent />
    </Suspense>
  );
}