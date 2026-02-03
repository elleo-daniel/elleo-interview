import { GoogleGenAI } from "@google/genai";
import { InterviewRecord, Stage, Question } from '../types';

// Helper to flatten questions for context
const getAllQuestions = (stages: Stage[]): Question[] => {
  const questions: Question[] = [];
  stages.forEach(stage => {
    stage.sections.forEach(section => {
      section.questions?.forEach(q => questions.push(q));
    });
  });
  return questions;
};

export const analyzeInterview = async (record: InterviewRecord, stages: Stage[]): Promise<string> => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    return "API Key is missing. Please configure your environment.";
  }

  const ai = new GoogleGenAI({ apiKey: apiKey });
  const allQuestions = getAllQuestions(stages);

  // Construct a prompt context
  let context = `Candidate Name: ${record.basicInfo.name}\n`;
  context += `Position: ${record.basicInfo.position}\n`;
  context += `Interview Content:\n\n`;

  let hasContent = false;

  Object.entries(record.answers).forEach(([qId, answer]) => {
    if (!answer.trim()) return;
    const question = allQuestions.find(q => q.id === qId);
    if (question) {
      hasContent = true;
      context += `Q: ${question.text}\n`;
      context += `Checkpoints: ${question.checkpoints.join(', ')}\n`;
      context += `Interviewer Note/Answer: ${answer}\n\n`;
    }
  });

  if (!hasContent) {
    return "No interview notes recorded to analyze.";
  }

  const prompt = `
    You are an expert HR Interviewer for the Elleo Group. 
    
    [Core Persona & Hiring Stance]
    - You are a helpful HR expert for Elleo Group.
    - Your stance is **Generous and Practical**. Focus on "Trainability" and "Growth Potential".
    - Your goal is to provide actionable tips for managers to train new hires.
    - **Weekend Work Policy**: Weekend (Sat/Sun) work is **NOT** mandatory. Do not mark unavailability on weekends as a negative point or a "Concern Area". Focus on their overall availability and willingness to work.
    
    [CRITICAL INSTRUCTION - HANDLING INSINCERE/LOW-QUALITY ANSWERS]
    - If the candidate's answers are nonsensical (e.g., "ㅋㅋㅋ", "ㅎㅇㅎㅇ"), extremely short/dismissive, or completely irrelevant:
      1. Do NOT try to invent or infer strengths.
      2. In the "**핵심 강점**" section, EXPLICITLY state: "답변이 불성실하여 강점을 파악할 수 없음." (Strengths cannot be determined due to insincere attitude).
      3. Mark "**우려 사항**" as CRITICAL due to lack of sincerity.
      4. In "**종합 의견**", strongly advise against hiring.
      5. The final recommendation MUST be "**비추천**".

    [Important Formatting Rules - MUST FOLLOW]
    1. Provide the structured summary in Korean (Markdown format).
    2. Start the analysis report with this EXACT sentence: **'${record.basicInfo.name}'님의 인터뷰 분석 결과**
    3. **HARD PROHIBITION (NEVER WRITE THESE):**
       - NEVER use brand slogans like "더 건강한 선택", "탁월한 품질", "더 나은 내일" in the text.
       - NEVER mention ANY internal store situations like "인력 부족" (labor shortage), "인력난", "노동력 부족", or "현재 매장 상황".
       - NEVER mention YOUR own logic like "최대한 긍정적으로 검토하고자 했다" (tried to be positive).
       - NEVER use the phrase "최상의 환대 서비스". Instead, focus on the candidate's **"최고의 서비스를 제공하고자 하는 노력과 의지"**.
    4. The output must be 100% natural, professional Korean. (No English except "Elleo Group" and "AI").
    5. No extra preamble or conclusion text.

    [Output Structure - MUST USE THIS EXACT NUMBERING]
    1. **핵심 강점**: Focus on potential and attitude. (If insincere, state "답변 불성실로 파악 불가")
    2. **우려 사항**: Be objective but focus on trainable points. Mark insincere answers (e.g., "ㅋㅋㅋ") as red flags.
    3. **조직 적합성**: Assess alignment with team culture.
    4. **온보딩 & 코칭 가이드**: Provide 2-3 specific, actionable tips. Use bullet points (- ).
    5. **종합 의견**: Final perspective.
       - 마지막 줄은 반드시 "최종 추천 여부: [추천/보류/비추천]" 형식을 지키세요.

    ${context}
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text || "Could not generate summary.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "An error occurred while communicating with the AI assistant.";
  }
};