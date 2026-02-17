
import React from 'react';
import { EvaluationReport } from '../types';

// Using a placeholder logo path to avoid ESM import errors for non-JS files
const logo = 'https://www.anatomyguru.in/assets/img/logo.jpg';

interface FeedbackReportProps {
  report: EvaluationReport | null;
}

const FeedbackReport: React.FC<FeedbackReportProps> = ({ report }) => {
  if (!report) {
    return (
      <div className="flex items-center justify-center p-20 text-slate-400 font-bold uppercase tracking-widest">
        No report data available.
      </div>
    );
  }

  const calculatedSum = report.questions?.reduce((acc: number, q: any) => acc + (Number(q.marks) || 0), 0) || 0;

  const getQuestionStatus = (q: any) => {
    const marks = Number(q.marks) || 0;
    const feedbackText = q.feedbackPoints?.join(' ').toLowerCase() || '';
    
    if (marks === 0 || feedbackText.includes('not attempted') || feedbackText.includes('skipped')) {
      return 'unattempted';
    }
    
    if (feedbackText.includes('excellent') || feedbackText.includes('perfect') || feedbackText.includes('precise') || feedbackText.includes('correct')) {
      return 'correct';
    }
    
    return 'partial';
  };

  const reportStyle: React.CSSProperties = {
    fontFamily: '"Times New Roman", Times, serif',
  };

  const headingStyle: React.CSSProperties = {
    fontSize: '16px',
    fontWeight: '900',
  };

  const contentStyle: React.CSSProperties = {
    fontSize: '14px',
  };

  const sectionLabelStyle: React.CSSProperties = {
    fontSize: '14px',
    fontWeight: 'bold',
  };

  const renderBulletList = (items?: string[]) => {
    if (!items || items.length === 0) return <p className="ml-10 text-slate-400 italic" style={contentStyle}>No specific feedback provided.</p>;
    
    return (
      <ul className="list-disc list-outside ml-10 space-y-1 mb-2">
        {items.map((item, i) => {
          return (
            <li key={i} className="text-slate-800 leading-tight" style={contentStyle}>
               <span dangerouslySetInnerHTML={{ __html: item.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
            </li>
          );
        })}
      </ul>
    );
  };

  return (
    <div className="max-w-[850px] mx-auto my-10 bg-white shadow-none rounded-none border border-slate-300 report-container p-6 sm:p-12 text-[#1e1e1e] animate-fade-in" style={reportStyle}>
      
      {/* Brand Header */}
      <div className="flex flex-col items-center mb-2">
        <div className="flex items-center justify-center leading-none">
          <img
            src={logo}
            alt="Anatomy Guru Logo"
            className="w-64 object-contain block m-0 p-0 rounded"
          />
          </div>
      </div>

      {/* Metadata Section */}
      <div className="text-center mb-6">
        <h2 className="text-red-600 uppercase tracking-widest border-b border-red-100 pb-1 inline-block mb-3" style={headingStyle}>
          {report.testTitle || 'General Medicine Test'}
        </h2>
        <div className="space-y-1" style={contentStyle}>
          <p className="font-bold text-slate-800">Topics: {report.testTopics || 'N/A'}</p>
          <p className="font-black text-blue-800 uppercase tracking-widest">Date: {report.testDate || 'N/A'}</p>
        </div>
      </div>

      {/* Student Identification Row */}
      <div className="mb-4 flex items-center gap-2 border-t pt-4 border-slate-100" style={contentStyle}>
        <span className="text-red-600 font-black uppercase tracking-wide">Student Name:</span>
        <span className="font-black text-slate-900 underline underline-offset-4 decoration-2 decoration-red-600/30">{report.studentName || 'Unknown Student'}</span>
      </div>

      {/* Assessment Table */}
      <div className="border border-slate-400 overflow-hidden mb-8">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-slate-400 bg-white">
              <th className="w-[10%] p-2 border-r border-slate-400 text-red-600 uppercase tracking-wide text-center" style={headingStyle}>Q No</th>
              <th className="w-[75%] p-2 border-r border-slate-400 text-red-600 uppercase tracking-wide text-center" style={headingStyle}>Feedback</th>
              <th className="w-[15%] p-2 text-red-600 uppercase tracking-wide text-center" style={headingStyle}>Marks</th>
            </tr>
          </thead>
          <tbody>
            {report.questions?.map((q, idx) => {
              const status = getQuestionStatus(q);
              return (
                <tr key={idx} className={`border-b border-slate-300 ${status === 'unattempted' ? 'bg-red-50' : status === 'correct' ? 'bg-emerald-50' : ''}`}>
                  <td className="p-2 border-r border-slate-400 text-center font-bold text-slate-800 align-top" style={contentStyle}>{q.qNo}</td>
                  <td className="p-3 border-r border-slate-400 align-top">
                    <ul className="list-disc list-outside ml-4 space-y-1" style={contentStyle}>
                      {q.feedbackPoints?.map((point: string, pIdx: number) => (
                        <li key={pIdx} className={`font-semibold leading-relaxed ${status === 'unattempted' ? 'text-red-700 font-black italic' : 'text-slate-800'}`}>
                          <span dangerouslySetInnerHTML={{ __html: point.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
                        </li>
                      ))}
                    </ul>
                  </td>
                  <td className={`p-2 text-center font-bold align-top ${status === 'unattempted' ? 'text-red-600' : status === 'correct' ? 'text-emerald-700' : 'text-slate-800'}`} style={contentStyle}>
                    {q.marks}
                  </td>
                </tr>
              );
            })}
            <tr className="bg-slate-50 border-t border-slate-400">
              <td colSpan={2} className="p-3 border-r border-slate-400 text-right font-black uppercase tracking-widest text-slate-500" style={contentStyle}>
                Total Score Summation
              </td>
              <td className="p-3 text-center font-black text-red-600 bg-white" style={headingStyle}>
                {calculatedSum} / {report.maxScore || 100}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* General Feedback Section */}
      {report.generalFeedback && (
        <div className="mt-6 border border-slate-900 p-6">
          <h3 className="text-red-600 font-bold mb-2 underline" style={headingStyle}>General Feedback:</h3>
          
          <div className="space-y-4">
            <div>
              <h4 style={sectionLabelStyle}>1) Overall Performance</h4>
              {renderBulletList(report.generalFeedback.overallPerformance)}
            </div>

            <div>
              <h4 style={sectionLabelStyle}>2) MCQs</h4>
              {renderBulletList(report.generalFeedback.mcqs)}
            </div>

            <div>
              <h4 style={sectionLabelStyle}>3) Content Accuracy</h4>
              {renderBulletList(report.generalFeedback.contentAccuracy)}
            </div>

            <div>
              <h4 style={sectionLabelStyle}>4) Completeness of Answers</h4>
              {renderBulletList(report.generalFeedback.completenessOfAnswers)}
            </div>

            <div>
              <h4 style={sectionLabelStyle}>5) Presentation & Diagrams (Major drawback)</h4>
              {renderBulletList(report.generalFeedback.presentationDiagrams)}
            </div>

            <div>
              <h4 style={sectionLabelStyle}>6) Investigations (Must improve)</h4>
              {renderBulletList(report.generalFeedback.investigations)}
            </div>

            <div>
              <h4 style={sectionLabelStyle}>7) Attempting All Questions</h4>
              {renderBulletList(report.generalFeedback.attemptingQuestions)}
            </div>

            <div>
              <h4 style={sectionLabelStyle}>8) What to do next (Action points)</h4>
              {renderBulletList(report.generalFeedback.actionPoints)}
            </div>
          </div>
        </div>
      )}

      {/* Official Footer */}
      <div className="mt-12 flex justify-between items-center text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] border-t-2 border-slate-900 pt-8">
        <div className="flex items-center gap-6">
          <span>Digital Transcript</span>
          <span className="text-red-300">|</span>
          <span>ANATOMY GURU AUTHENTICATED</span>
        </div>
        <div className="text-slate-900 font-bold">VERIFIED © 2026</div>
      </div>
    </div>
  );
};

export default FeedbackReport;
