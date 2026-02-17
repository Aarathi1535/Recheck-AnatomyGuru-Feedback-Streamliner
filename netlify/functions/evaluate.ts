
import { GoogleGenAI, Type } from "@google/genai";
import { EvaluationReport, FileData } from "../types";

export const generateStructuredFeedback = async (
  sourceDoc: FileData,
  dirtyFeedbackDoc: FileData
): Promise<EvaluationReport> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const systemInstruction = `
    You are the "Anatomy Guru Master Evaluator". You are conducting a high-stakes medical audit.
      
      YOUR DATA SOURCES:
      1. STUDENT ANSWER SHEET: This is the PRIMARY EVIDENCE. You must read the student's actual handwritten or typed words here.
      2. FACULTY NOTES: This is a GUIDE. It contains the MARKS and shorthand observations (e.g., "missing clinicals", "q4 incomplete").

      STRICT EVALUATION PROTOCOL:
      - STEP 1 (MARKS): Extract the marks for each question EXACTLY as written in the Faculty Notes. You have zero authority to change these numbers.
      - STEP 2 (VERIFICATION): For every question, locate the corresponding answer in the "Student Answer Sheet". 
      - STEP 3 (ENHANCEMENT): Do NOT rewrite the faculty's shorthand. Instead, compare the student's actual answer against the faculty's critique. 
        * Example: If faculty says "Missing diagrams", check the script. If the student attempted a diagram but it's poor, say: "Your sketch of the Axillary Artery lacks the specific anatomical relations to the cords of the Brachial Plexus."
        * Example: If faculty says "Content weak", read the student's answer and identify the specific medical terminology or clinical correlation they failed to mention.
      
      STRICT RULES:
      - NO TRANSCRIPTION: Never copy-paste the faculty's notes word-for-word into the feedback.
      - NO HALLUCINATION: If the student didn't write anything for a question, state "Not attempted" or "No content found in script". Do not make up medical facts the student didn't include and Do not skip the questions that are not attempted.
      - MEDICAL PRECISION: Use high-level anatomical and clinical terminology.
      
      GENERAL FEEDBACK (8-POINT STRUCTURE - MANDATORY):
      1. Overall Performance: High-level summary of the student's standing.
      2. MCQs: Specific patterns found in their MCQ choices.
      3. Content Accuracy: Highlighting factual errors vs. correct assertions in their script.
      4. Completeness of Answers: Detailing missing components.
      5. Presentation & Diagrams: Professional critique of their actual drawing/handwriting quality.
      6. Investigations: Reviewing the student's knowledge of diagnostic tests mentioned in the script.
      7. Attempting All Questions: Feedback on coverage and time management evidence.
      8. What to do next (Action points): 3-5 high-yield study targets.

      OUTPUT: Valid JSON only. Ensure all feedback sections are arrays of strings (bullet points).
  `;

  const createPart = (data: FileData, label: string) => {
    if (data.isDocx && data.text) {
      return [
        { text: `${label}: (Extracted from Word Document)\n${data.text}` }
      ];
    } else if (data.base64 && data.mimeType) {
      return [
        { text: `${label}: (Binary File)` },
        { inlineData: { data: data.base64, mimeType: data.mimeType } }
      ];
    }
    return [{ text: `${label}: No data available.` }];
  };

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [
      {
        parts: [
          ...createPart(sourceDoc, "Source Document (QP + Key + Student Answers)"),
          ...createPart(dirtyFeedbackDoc, "Dirty Feedback Document (Manual Notes)"),
          { text: "Please process these and return the evaluation report in JSON format following the specified schema." }
        ]
      }
    ],
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          studentName: { type: Type.STRING },
          testTitle: { type: Type.STRING },
          testTopics: { type: Type.STRING },
          testDate: { type: Type.STRING },
          totalScore: { type: Type.NUMBER },
          maxScore: { type: Type.NUMBER },
          questions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                qNo: { type: Type.STRING },
                feedbackPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
                marks: { type: Type.NUMBER },
                maxMarks: { type: Type.NUMBER },
                isCorrect: { type: Type.BOOLEAN }
              },
              required: ["qNo", "feedbackPoints", "marks", "maxMarks", "isCorrect"]
            }
          },
          generalFeedback: {
            type: Type.OBJECT,
            properties: {
              overallPerformance: { type: Type.ARRAY, items: { type: Type.STRING } },
              mcqs: { type: Type.ARRAY, items: { type: Type.STRING } },
              contentAccuracy: { type: Type.ARRAY, items: { type: Type.STRING } },
              completenessOfAnswers: { type: Type.ARRAY, items: { type: Type.STRING } },
              presentationDiagrams: { type: Type.ARRAY, items: { type: Type.STRING } },
              investigations: { type: Type.ARRAY, items: { type: Type.STRING } },
              attemptingQuestions: { type: Type.ARRAY, items: { type: Type.STRING } },
              actionPoints: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: [
              "overallPerformance", "mcqs", "contentAccuracy", "completenessOfAnswers", 
              "presentationDiagrams", "investigations", "attemptingQuestions", "actionPoints"
            ]
          }
        },
        required: ["studentName", "testTitle", "testTopics", "testDate", "totalScore", "maxScore", "questions", "generalFeedback"]
      }
    }
  });

  try {
    const data = JSON.parse(response.text);
    return data as EvaluationReport;
  } catch (error) {
    console.error("Failed to parse Gemini response:", error);
    throw new Error("Could not generate structured feedback. Please try again with clearer documents.");
  }
};
