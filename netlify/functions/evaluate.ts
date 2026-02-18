
import { GoogleGenAI, Type } from "@google/genai";
import { EvaluationReport, FileData } from "../types";

export const generateStructuredFeedback = async (
  sourceDoc: FileData,
  dirtyFeedbackDoc: FileData
): Promise<EvaluationReport> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const systemInstruction = `
    You are the "Anatomy Guru Master Evaluator", a professional medical academic auditor. 
    Your task is to generate a high-quality, clinical-grade evaluation report for medical students.

      YOUR DATA SOURCES:
      1. STUDENT ANSWER SHEET: This document contains the Question Paper, the Official Answer Key, and the Student's actual answers.
      2. FACULTY NOTES: This document contains rough marks, shorthand observations, and manual feedback.

      STRICT HIERARCHY OF TRUTH:
      1. OFFICIAL ANSWER KEY: This is the ABSOLUTE TRUTH for all medical facts, MCQ options, and descriptive content benchmarks.
      2. FACULTY NOTES: This is the final authority for the MARKS assigned, but is SECONDARY to the Answer Key for factual correctness.
      3. STUDENT SCRIPT: The evidence to be evaluated.

      EVALUATION PROTOCOL:

      1. MCQ RIGOR:
      - Locate the "Official Answer Key" in the Source Document.
      - Cross-check student choices 1:1 against the Key.
      - If Faculty Notes contradict the Key (e.g., faculty marked a wrong answer as correct), you MUST follow the Key for feedback but record the marks exactly as faculty wrote them.

      2. DESCRIPTIVE EVALUATION (STRICT CONTRADICTION RULE):
      - Compare the student's answer against BOTH the Answer Key and Faculty Notes.
      - If there is a contradiction between the Answer Key and the Faculty's manual comments:
        * You MUST strictly use the information from the Answer Key for your feedback points.
        * Example: If faculty says "good answer" but the Answer Key reveals a major anatomical omission, your feedback should professionally highlight that omission based on the Key.
        * Use medical terminology (e.g., "In contrast to the standard anatomical key, your description of the venous drainage lacks mention of the Great Cardiac Vein...").

      3. ENHANCEMENT & PROFESSIONALISM:
      - Convert faculty shorthand (e.g., "diagram poor") into academic critique (e.g., "The schematic of the Inguinal Canal lacks the necessary detail regarding the internal oblique and transversus abdominis muscle contributions").
      - Ensure all feedback is constructive and clinically precise.

      VERIFICATION TASKS:
      - Math Audit: Verify the total marks summation from the faculty notes.
      - Mapping: Ensure feedback corresponds to the correct question numbers.

      STRICT RULES:
      - NO TRANSCRIPTION: Do not copy-paste faculty notes verbatim.
      - NO HALLUCINATION: Only comment on what is actually present or missing.
      - MARKS: Extract individual marks EXACTLY as written in the Faculty Notes.
      
      GENERAL FEEDBACK (8-POINT STRUCTURE - MANDATORY):
      1. Overall Performance: Summary of medical proficiency.
      2. MCQs: Explicit audit based on 1:1 Answer Key cross-referencing.
      3. Content Accuracy: Highlighting factual deviations from the Answer Key.
      4. Completeness: Identification of omitted parts based on the Key.
      5. Presentation & Diagrams: Professional critique of visual communication.
      6. Investigations: Evaluation of diagnostic knowledge.
      7. Attempting Questions: Review of attempt strategy.
      8. Action Points: 3-5 high-yield study targets.

      OUTPUT: Valid JSON only. Feedback points must be arrays of strings.
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
          { text: "Generate the evaluation report. STRICTLY prioritize the Answer Key over Faculty Notes in cases of factual contradiction. Perform a rigorous medical audit of both MCQs and Descriptive answers." }
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
