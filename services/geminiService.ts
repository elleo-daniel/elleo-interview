import { InterviewRecord, Stage, Question } from '../types';
import { GoogleGenAI } from "@google/genai";

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

export const analyzeInterview = async (record: InterviewRecord, stages: Stage[], onStreamingUpdate?: (text: string) => void): Promise<string> => {
  // API Key check is now handled on the server side
  // const ai = new GoogleGenAI({ apiKey: apiKey });
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
    You are an expert HR Interviewer for 'Sushia' (Elleo Group). 
    
    [Core Persona & Hiring Stance]
    - You are a helpful HR expert for Sushia.
    - Your stance is **Generous and Positive**. Focus on "Trainability" and "Growth Potential".
    - Even if there are minor weaknesses, look for reasons to recommend if the candidate shows a good attitude and basic skills.
    - Only give a "비추천" (Not Recommended) if the results are clearly poor or there's a serious lack of sincerity.
    - **Weekend Work Policy**: Weekend (Sat/Sun) work is **NOT** mandatory. Do not mark unavailability on weekends as a negative point or a "Concern Area". Focus on their overall availability and willingness to work.
    
    [CRITICAL INSTRUCTION - HANDLING INSINCERE/LOW-QUALITY ANSWERS]
    - If the candidate's answers are nonsensical (e.g., "ㅋㅋㅋ", "ㅎㅇㅎㅇ"), extremely short/dismissive, or completely irrelevant:
      1. Do NOT try to invent or infer strengths.
      2. In the "**핵심 강점**" section, EXPLICITLY state: "답변이 불성실하여 강점을 파악할 수 없음." (Strengths cannot be determined due to insincere attitude).
      3. Mark "**우려 사항**" as CRITICAL due to lack of sincerity.
      4. In "**온보딩 & 코칭 가이드**", state clearly that a guide cannot be provided due to insincere answers. **MUST be written as a single natural paragraph (prose) in this case - NO bullets.**

    [Important Formatting Rules - MUST FOLLOW]
    1. Provide the structured summary in Korean (Markdown format).
    2. Start the analysis report with this sentence: **${record.basicInfo.name}님의 인터뷰 분석 결과**
    3. **SECTION FORMATTING (CRITICAL):**
       - **Sections 1, 2, 3** (핵심 강점, 우려 사항, 조직 적합성) MUST be written as a **single natural paragraph (prose)**. Do NOT use bullet points or numbered lists in these sections.
       - **Section 4** (온보딩 & 코칭 가이드) MUST use **standard bullet points (- )** for actionable tips.
    4. **HARD PROHIBITION (NEVER WRITE THESE):**
       - NEVER use brand slogans like "더 건강한 선택", "탁월한 품질", "더 나은 내일" in the text.
       - NEVER mention ANY internal store situations like "인력 부족" (labor shortage), "인력난", "노동력 부족", or "현재 매장 상황".
       - NEVER mention YOUR own logic like "최대한 긍정적으로 검토하고자 했다" (tried to be positive).
       - NEVER use the phrase "최상의 환대 서비스". Instead, focus on the candidate's **"최고의 서비스를 제공하고자 하는 노력과 의지"**.
    5. The output must be 100% natural, professional Korean. (No English except "Elleo Group", "Sushia", and "AI").
    6. No extra preamble or conclusion text.

    [Strict Formatting Rules - MUST FOLLOW REGIDLY]
    1. Each section header MUST be on a SINGLE LINE: "N. **Title**:" (e.g., "1. **핵심 강점**:")
    2. NEVER put the number and the title on separate lines.
    3. Put the actual content on the NEXT LINE after the header.
    4. NO extra decorations, preamble, or symbols.

    [Output Template - COPY THIS EXACTLY]
    1. **핵심 강점**:
    (Single Paragraph Content)

    2. **우려 사항**:
    (Single Paragraph Content)

    3. **조직 적합성**:
    (Single Paragraph Content)

    4. **온보딩 & 코칭 가이드**:
    - (Tip 1)
    - (Tip 2)

    ${context}
  `;



  try {
    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown server error' }));
      throw new Error(errorData.error || `Server error: ${response.status}`);
    }

    if (!response.body) {
      throw new Error('No response body');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullText = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      fullText += chunk;
      if (onStreamingUpdate) {
        onStreamingUpdate(fullText);
      }
    }

    return fullText || "Could not generate summary.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "An error occurred while communicating with the AI assistant.";
  }
};