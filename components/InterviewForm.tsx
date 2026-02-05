import React, { useState, useEffect, useRef } from 'react';
import { useModal } from '../contexts/ModalContext';
import { createPortal } from 'react-dom';
import { v4 as uuidv4 } from 'uuid';
import { BasicInfo, InterviewRecord, Stage } from '../types';
import { Button } from './Button';
import { Input } from './Input';
import { saveRecord } from '../services/db';
import { analyzeInterview } from '../services/geminiService';

// Helper to parse bold text (**text**) - robust for streaming
const parseBold = (text: string) => {
  if (!text) return null;
  if (!text.includes('**')) return text;

  // Handle open bold tags during streaming to prevent showing "**" to user
  let processedText = text;
  const boldMatches = text.match(/\*\*/g);
  if (boldMatches && boldMatches.length % 2 !== 0) {
    processedText += '**';
  }

  const parts = processedText.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      const content = part.slice(2, -2);
      if (!content) return null;
      return <strong key={i} className="font-bold text-slate-900">{content}</strong>;
    }
    return part;
  });
};

// Helper to format AI Summary markdown
const formatAISummary = (text: string) => {
  if (!text) return null;

  // 1. Initial cleanup: split by lines and trim
  const rawLines = text.split('\n').map(l => l.trim());

  // 2. Pre-process: Sticky Merger for split headers
  // This logic is now much more aggressive to prevent splitting during streaming
  const mergedLines: string[] = [];
  for (let i = 0; i < rawLines.length; i++) {
    const current = rawLines[i];
    if (!current) {
      if (i < rawLines.length - 1) mergedLines.push("");
      continue;
    }

    // STRICT MERGER: Only merge if the line is PURELY a number (ignoring markdown/spaces)
    // Good: "1", "**1**", "1.", "### 1"
    // Bad: "1. Strength", "1. 핵심 강점"
    // Better: Remove standard markdown chars, then check regex.
    const cleanForCheck = current.replace(/[\*\#_\s]/g, ''); // "**1.**" -> "1."
    const isLoneNumber = /^(\d+)[\.\)]?$/.test(cleanForCheck);

    if (isLoneNumber && i < rawLines.length - 1) {
      let nextIdx = i + 1;
      while (nextIdx < rawLines.length && !rawLines[nextIdx]) nextIdx++;

      const nextLine = rawLines[nextIdx];

      if (nextLine) {
        // Check if next line is a Title (not another number)
        const nextClean = nextLine.replace(/[\*\#_\s]/g, '');
        const isNextNumber = /^(\d+)[\.\)]?$/.test(nextClean);

        if (!isNextNumber) {
          // Merge!
          // Clean the number part to be just "1."
          const numPart = cleanForCheck.match(/^(\d+)/)?.[1] || '';
          mergedLines.push(`${numPart}. ${nextLine}`);
          i = nextIdx;
          continue;
        }
      }
    }

    mergedLines.push(current);
  }

  // 1. Find the Intro Sentence index (e.g., 'NAME'님의 인터뷰 분석 결과)
  // Look for the first line that contains the core phrase, ignoring potential markdown or quotes
  const introIndex = mergedLines.findIndex(l => {
    const clean = l.replace(/[\*\#\'\"]/g, '').trim();
    return clean.includes('인터뷰 분석 결과') && clean.length < 100;
  });

  return (
    <div className="space-y-1 text-slate-700 leading-relaxed">
      {mergedLines.map((line, index) => {
        if (!line) return <div key={index} className="h-0" />;

        // 1. Handle Intro Sentence
        if (index === introIndex && introIndex >= 0 && introIndex < 10) {
          let displayTitle = line.replace(/[\*\#]/g, '').trim();

          // Better Idea: UI automatically handles quotes around the name
          // If the title is "홍길동님의...", make it "'홍길동'님의..."
          if (!displayTitle.includes("'") && !displayTitle.includes('"')) {
            displayTitle = displayTitle.replace(/^(.*)님의/, "'$1'님의");
          }

          return (
            <div key={index} className="mb-14 text-center relative py-10 px-6 bg-gradient-to-br from-indigo-50/50 via-white to-elleo-purple/5 rounded-2xl border border-indigo-100/50 shadow-[0_20px_50px_-15px_rgba(79,70,229,0.15)] overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-[6px] bg-gradient-to-r from-transparent via-elleo-purple to-transparent opacity-90"></div>
              <div className="relative z-10 space-y-5">
                <div className="flex items-center justify-center gap-3">
                  <span className="h-[1px] w-8 bg-elleo-purple/30 rounded-full"></span>
                  <span className="text-[11px] font-black text-elleo-purple tracking-[0.4em] opacity-80">INSIGHT REPORT</span>
                  <span className="h-[1px] w-8 bg-elleo-purple/30 rounded-full"></span>
                </div>
                <h2 className="text-[22px] sm:text-[26px] font-black text-slate-900 leading-tight tracking-tight max-w-2xl mx-auto">
                  {displayTitle}
                </h2>
              </div>
            </div>
          );
        }

        const cleanLine = line.replace(/\*\*/g, '').trim();

        // 2. Handle Final Recommendation
        const cleanRecLine = line.replace(/^[\*\-\s\d\.]+/, '').trim();
        if (cleanRecLine.includes('최종 추천 여부') && line.length < 200) {
          const statusPart = cleanRecLine.split('최종 추천 여부')[1]?.replace(/^[:\s\*\-]+/, '') || '';
          const statusText = statusPart.replace(/\*/g, '').replace(/[\[\]]/g, '').trim();
          const isRecommended = statusText.includes('추천') && !statusText.includes('비추천');
          const isNotRecommended = statusText.includes('비추천');

          return (
            <div key={index} className="!mt-12 !mb-8 py-4 px-8 bg-white border-2 border-slate-100 rounded-3xl flex items-center justify-center gap-8 shadow-sm w-fit mx-auto min-w-[320px]">
              <span className="text-[17px] font-bold text-slate-500 tracking-tight">최종 추천 여부</span>
              <div className="h-6 w-[1px] bg-slate-200"></div>
              <span className={`px-8 py-2.5 rounded-full text-[17px] font-black shadow-sm tracking-tight ${isRecommended
                ? 'bg-green-100 text-green-700 border border-green-200'
                : isNotRecommended
                  ? 'bg-red-100 text-red-700 border border-red-200'
                  : 'bg-orange-100 text-orange-700 border border-orange-200'
                }`}>
                {statusText || '판단 불가'}
              </span>
            </div>
          );
        }

        // 3. Handle Section 5 (Comprehensive Opinion) Specially - Restore Simple Design
        if (line.includes('종합 의견') && line.length < 50) {
          const content = line.replace(/^\d+[\.\)]\s*/, '').replace(/\*\*/g, '').replace(/:$/, '').trim();
          return (
            <div key={index} className="!mt-[35px] !mb-[10px]">
              <h3 className="text-[20px] font-black text-slate-900 tracking-tight border-l-[5px] border-elleo-purple pl-4 py-1 ml-1">
                {content.replace(/종합\s*의견/, '종합 의견')}
              </h3>
            </div>
          );
        }

        // 4. Handle Main Headers (1., 2., 3., 4.)
        // Robust match: Handles spaces, stars, and trailing colons flexibly
        // 4. Handle Main Headers (1., 2., 3., 4.)
        // Robust match: Handles two cases:
        // 1. "1. **Title**:" -> Title captured in group 2, Content in group 3
        // 2. "1. **Title**" (no colon) -> Title captured in group 5
        const headerRegex = /^(\d+)[\.\)]\s*(?:\*\*)?([^\:]+?)(?:\*\*)?[:]+\s*(.*)$|^(\d+)[\.\)]\s*(?:\*\*)?(.+)(?:\*\*)?$/;
        const sectionHeaderMatch = line.match(headerRegex);

        // Fallback check for legacy/incomplete lines
        let isFallback = false;
        let fallbackNum = '';
        let fallbackTitle = '';
        if (!sectionHeaderMatch) {
          const titles = ['핵심 강점', '우려 사항', '조직 적합성', '온보딩']; // Removed '종합 의견'
          const found = titles.find(t => cleanLine.includes(t));
          if (found && line.length < 60) {
            isFallback = true;
            fallbackNum = line.match(/\d+/)?.[0] || '•';
            fallbackTitle = line.replace(/^\d+[\.\)]\s*/, '').replace(/[:\*]+$/, '').trim();
          }
        }

        if (sectionHeaderMatch || isFallback) {
          // Extraction based on which group matched
          let num = fallbackNum;
          let title = fallbackTitle;
          let content = '';

          if (sectionHeaderMatch) {
            if (sectionHeaderMatch[1]) {
              // Case 1: Had colon
              num = sectionHeaderMatch[1];
              title = sectionHeaderMatch[2].replace(/[:\*]+$/, '').trim();
              content = sectionHeaderMatch[3]?.trim();
            } else {
              // Case 2: No colon
              num = sectionHeaderMatch[4];
              title = sectionHeaderMatch[5].replace(/[:\*]+$/, '').trim();
              content = ''; // No content on same line
            }
          }

          return (
            <React.Fragment key={index}>
              <h3 className="text-[17px] font-black text-slate-900 !mt-[25px] !mb-[5px] flex items-center gap-3.5 group">
                <span className="w-7 h-7 bg-white text-elleo-purple border-2 border-elleo-purple/20 flex items-center justify-center rounded-xl flex-shrink-0 font-montserrat font-black text-[13px] group-hover:bg-elleo-purple group-hover:text-white group-hover:border-elleo-purple transition-all duration-300 shadow-sm">
                  {num}
                </span>
                <span className="border-b border-transparent group-hover:border-elleo-purple/10 transition-all">
                  {parseBold(title)}
                </span>
              </h3>
              {content && (
                <p className="text-[16px] font-normal leading-normal text-slate-600 tracking-tight mb-3 ml-11">
                  {parseBold(content)}
                </p>
              )}
            </React.Fragment>
          );
        }

        // 4. Handle List Items
        if (line.startsWith('* ') || line.startsWith('- ')) {
          const content = line.replace(/^([\*\-])\s*/, '');
          return (
            <div key={index} className="flex items-start gap-4 ml-6 py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-elleo-purple/40 mt-[10px] flex-shrink-0"></span>
              <p className="flex-1 text-[16px] font-normal text-slate-600 tracking-tight leading-normal">
                {parseBold(content)}
              </p>
            </div>
          );
        }

        // 5. Regular Paragraphs
        if (line) {
          const isIndented = index > 0 && mergedLines[index - 1].match(/^\d\./);
          const isLikelyHeaderTitle = !line.includes('.') && line.includes('**') && line.length < 40;

          return (
            <p key={index} className={`text-[16px] leading-[30px] text-slate-600 font-normal tracking-tight ${isIndented || isLikelyHeaderTitle ? 'ml-11' : 'ml-1'} mr-0 sm:mr-16 ${isLikelyHeaderTitle ? 'mt-[-10px] mb-2' : 'mb-2'}`}>
              {parseBold(line)}
            </p>
          );
        }

        return null;
      })}
    </div>
  );
};

interface InterviewFormProps {
  initialData?: InterviewRecord;
  stages: Stage[];
  interviewType?: 'STANDARD' | 'DEPTH';
  onSave: () => void;
  onCancel: () => void;
}

export const InterviewForm: React.FC<InterviewFormProps> = ({ initialData, stages, interviewType = 'STANDARD', onSave, onCancel }) => {
  const [basicInfo, setBasicInfo] = useState<BasicInfo>({
    name: initialData?.basicInfo?.name || '',
    position: initialData?.basicInfo?.position || '',
    store: initialData?.basicInfo?.store || '',
    date: initialData?.basicInfo?.date || new Date().toISOString().split('T')[0],
    interviewer: initialData?.basicInfo?.interviewer || '',
    hasSushiExperience: initialData?.basicInfo?.hasSushiExperience ?? false,
    visaStatus: initialData?.basicInfo?.visaStatus || '',
    visaExpiryDate: initialData?.basicInfo?.visaExpiryDate || '',
    email: initialData?.basicInfo?.email || '',
    mobile: initialData?.basicInfo?.mobile || '',
    birthDate: initialData?.basicInfo?.birthDate || '',
  });

  const [answers, setAnswers] = useState<Record<string, string>>(initialData?.answers || {});
  const [resume, setResume] = useState<{ fileName: string, fileData: string } | undefined>(initialData?.resume);
  const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(new Set());
  const [isAnalyzeLoading, setIsAnalyzeLoading] = useState(false);
  const [aiSummary, setAiSummary] = useState<string>(initialData?.aiSummary || '');
  const [activeStageId, setActiveStageId] = useState<string>(stages[0].id);
  const [isSaveLoading, setIsSaveLoading] = useState(false);
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const [pendingFocusId, setPendingFocusId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showAlert } = useModal();

  // Persist the record ID for the session. 
  // If initialData exists, use it. Otherwise, generate one new ID and keep it.
  const [recordId] = useState<string>(() => initialData?.id || uuidv4());

  useEffect(() => {
    setPortalTarget(document.getElementById('header-actions'));
  }, []);

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const activeStage = stages.find(s => s.id === activeStageId) || stages[0];
  const activeStageIndex = stages.findIndex(s => s.id === activeStage.id);

  // Auto-focus next question when Tab is pressed
  useEffect(() => {
    if (pendingFocusId) {
      // Small delay to allow animation and DOM insertion
      const timeoutId = setTimeout(() => {
        const el = document.getElementById(`textarea-${pendingFocusId}`);
        if (el) {
          el.focus();
        }
        setPendingFocusId(null);
      }, 50);
      return () => clearTimeout(timeoutId);
    }
  }, [pendingFocusId, expandedQuestions]);

  const handleAnswerChange = (questionId: string, value: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const toggleQuestion = (questionId: string) => {
    const newSet = new Set(expandedQuestions);
    if (newSet.has(questionId)) {
      newSet.delete(questionId);
    } else {
      newSet.add(questionId);
    }
    setExpandedQuestions(newSet);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setResume({
          fileName: file.name,
          fileData: reader.result as string
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const clearResume = () => {
    setResume(undefined);
  };

  // Auto-expand questions that have answers when stage changes
  useEffect(() => {
    const newExpanded = new Set(expandedQuestions);
    activeStage.sections.forEach(section => {
      section.questions?.forEach(q => {
        if (answers[q.id]) {
          newExpanded.add(q.id);
        }
      });
    });
    setExpandedQuestions(newExpanded);
  }, [activeStageId]);

  const handleSave = async (shouldClose = false) => {
    if (!basicInfo.name) {
      await showAlert("지원자명을 입력해주세요.");
      return;
    }

    setIsSaveLoading(true);
    try {
      const record: InterviewRecord = {
        id: recordId, // Use the persistent ID
        basicInfo: {
          ...basicInfo,
          interviewType: (interviewType as 'STANDARD' | 'DEPTH') || 'STANDARD'
        },
        answers,
        resume,
        aiSummary,
        createdAt: initialData?.createdAt || Date.now()
      };

      await saveRecord(record);

      if (shouldClose) {
        onSave();
      } else {
        await showAlert("임시 저장되었습니다.");
      }
    } catch (error: any) {
      // Error is caught here and shown via modal
      console.error(error);
      await showAlert(`저장 실패: ${error.message || '알 수 없는 오류가 발생했습니다.'}`);
    } finally {
      setIsSaveLoading(false);
    }
  };

  // Scroll to top of stage content when stage changes
  const prevStageIdRef = useRef(activeStageId);
  useEffect(() => {
    if (prevStageIdRef.current !== activeStageId) {
      prevStageIdRef.current = activeStageId;

      // Add a small delay to ensure DOM is updated and layout is stable
      const timeoutId = setTimeout(() => {
        const content = document.getElementById('active-stage-content');
        if (content) {
          const contentTop = content.getBoundingClientRect().top + window.scrollY;
          // Scroll so the content card starts exactly where the tabs sticky header is (183px offset)
          window.scrollTo({ top: contentTop - 183, behavior: 'smooth' });
        }
      }, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [activeStageId]);

  const handleNextStage = () => {
    if (activeStageIndex < stages.length - 1) {
      setActiveStageId(stages[activeStageIndex + 1].id);
    } else {
      // Last stage - Save and Close
      handleSave(true);
    }
  };

  const handlePrevStage = () => {
    if (activeStageIndex > 0) {
      setActiveStageId(stages[activeStageIndex - 1].id);
    }
  };

  const handleBasicInfoKeyDown = (e: React.KeyboardEvent, nextId: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const nextEl = document.getElementById(nextId);
      if (nextEl) {
        (nextEl as HTMLElement).focus();
      }
    }
  };

  const handleAnalyze = async () => {
    if (!basicInfo.name) {
      await showAlert("분석을 위해 기본 정보를 먼저 입력해주세요.");
      return;
    }

    setIsAnalyzeLoading(true);
    setAiSummary(''); // Clear existing summary while loading

    // Create a temporary record for analysis
    const tempRecord: InterviewRecord = {
      id: 'temp',
      basicInfo,
      answers,
      createdAt: Date.now()
    };

    try {
      // Switch from streaming to static generation for visual stability
      const summary = await analyzeInterview(tempRecord, stages);
      setAiSummary(summary);

      // Auto-save the record with the final summary
      const updatedRecord: InterviewRecord = {
        id: recordId,
        basicInfo: {
          ...basicInfo,
          interviewType: (interviewType as 'STANDARD' | 'DEPTH' | 'HR') || 'STANDARD'
        },
        answers,
        resume,
        aiSummary: summary,
        createdAt: initialData?.createdAt || tempRecord.createdAt
      };

      await saveRecord(updatedRecord);
    } catch (e: any) {
      console.error("AI Analysis Error:", e);
      await showAlert(`인터뷰 분석 중 오류가 발생했습니다: ${e.message || '알 수 없는 오류'}`);
    } finally {
      setIsAnalyzeLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 pb-24">

      {/* Basic Info Form */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-6 mb-0 mt-6">
        <h2 className="text-xl font-bold text-elleo-dark mb-4 border-b pb-2">기본 정보</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          <Input
            id="info-name"
            label="지원자명"
            value={basicInfo.name}
            onChange={e => setBasicInfo({ ...basicInfo, name: e.target.value })}
            onKeyDown={e => handleBasicInfoKeyDown(e, 'info-email')}
          />
          <Input
            id="info-email"
            label="이메일"
            type="email"
            value={basicInfo.email || ''}
            onChange={e => setBasicInfo({ ...basicInfo, email: e.target.value })}
            onKeyDown={e => handleBasicInfoKeyDown(e, 'info-mobile')}
          />
          <Input
            id="info-mobile"
            type="tel"
            inputMode="numeric"
            label="연락처"
            value={basicInfo.mobile || ''}
            onChange={e => setBasicInfo({ ...basicInfo, mobile: e.target.value })}
            onKeyDown={e => handleBasicInfoKeyDown(e, 'info-birth')}
          />
          <Input
            id="info-birth"
            label="생년월일"
            type="date"
            className="text-center"
            value={basicInfo.birthDate || ''}
            onChange={e => setBasicInfo({ ...basicInfo, birthDate: e.target.value })}
            onKeyDown={e => handleBasicInfoKeyDown(e, 'info-visa')}
          />
          <div className="flex flex-col gap-1">
            <label className="block text-[12px] sm:text-sm font-bold text-slate-700">비자 상태</label>
            <select
              id="info-visa"
              value={basicInfo.visaStatus || ''}
              onChange={e => setBasicInfo({ ...basicInfo, visaStatus: e.target.value })}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  const nextId = (basicInfo.visaStatus === 'Australian Citizen' || basicInfo.visaStatus === 'Permanent Resident') ? 'info-position' : 'info-expiry';
                  const nextEl = document.getElementById(nextId);
                  if (nextEl) nextEl.focus();
                }
              }}
              className="block w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-elleo-purple/20 focus:border-elleo-purple text-[16px] sm:text-sm transition-shadow h-[42px]"
            >
              <option value="" disabled>Select status...</option>
              <option value="Australian Citizen">Australian Citizen</option>
              <option value="Permanent Resident">Permanent Resident</option>
              <option value="Partner / De facto">Partner / De facto</option>
              <option value="International Student">International Student</option>
              <option value="Working Holiday">Working Holiday</option>
              <option value="Temporary Skill Shortage (TSS)">Temporary Skill Shortage (TSS)</option>
              <option value="Others">Others</option>
            </select>
          </div>
          <Input
            id="info-expiry"
            label="비자 만료일"
            type="date"
            className="text-center"
            value={basicInfo.visaExpiryDate || ''}
            onChange={e => setBasicInfo({ ...basicInfo, visaExpiryDate: e.target.value })}
            disabled={basicInfo.visaStatus === 'Australian Citizen' || basicInfo.visaStatus === 'Permanent Resident'}
            onKeyDown={e => handleBasicInfoKeyDown(e, 'info-position')}
          />

          {/* Divider */}
          <div className="col-span-1 md:col-span-2 lg:col-span-3 my-2 border-b border-slate-200 border-dashed" />

          <Input
            id="info-position"
            label="지원 포지션"
            value={basicInfo.position}
            onChange={e => setBasicInfo({ ...basicInfo, position: e.target.value })}
            onKeyDown={e => handleBasicInfoKeyDown(e, 'info-store')}
          />
          <Input
            id="info-store"
            label="지원 매장"
            value={basicInfo.store}
            onChange={e => setBasicInfo({ ...basicInfo, store: e.target.value })}
            onKeyDown={e => handleBasicInfoKeyDown(e, 'info-interviewer')}
          />
          <Input
            id="info-interviewer"
            label="면접관"
            value={basicInfo.interviewer}
            onChange={e => setBasicInfo({ ...basicInfo, interviewer: e.target.value })}
            onKeyDown={e => handleBasicInfoKeyDown(e, 'info-date')}
          />
          <Input
            id="info-date"
            label="면접일자"
            type="date"
            className="text-center"
            value={basicInfo.date}
            onChange={e => setBasicInfo({ ...basicInfo, date: e.target.value })}
          />
          {interviewType !== 'DEPTH' && (
            <div className="flex flex-col justify-end pb-1">
              <label className="flex items-center gap-2 cursor-pointer py-2 px-4 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors h-[42px]">
                <input
                  type="checkbox"
                  className="w-4 h-4 text-elleo-purple border-slate-300 rounded focus:ring-elleo-purple accent-elleo-purple"
                  checked={basicInfo.hasSushiExperience}
                  onChange={e => setBasicInfo({ ...basicInfo, hasSushiExperience: e.target.checked })}
                />
                <span className="text-[12px] sm:text-sm font-bold text-slate-700">스시 경력 유무</span>
              </label>
            </div>
          )}
        </div>

        {/* Resume Upload Section */}
        <div className="mt-4 border-t border-slate-100 pt-4">
          <label className="block text-[12px] sm:text-sm font-bold text-slate-700 mb-2">이력서 첨부</label>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="application/pdf,image/*"
            className="hidden"
          />
          {!resume ? (
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="py-2 px-6 rounded-full border-0 text-sm font-semibold bg-elleo-purple text-white shadow-lg shadow-elleo-purple/30 transition-all cursor-pointer hover:bg-[#8f8ed3] hover:shadow-none hover:-translate-y-0"
              >
                Choose file
              </button>
              <span className="text-sm text-slate-300 select-none cursor-default pointer-events-none">
                No file chosen
              </span>
            </div>
          ) : (
            <div className="flex items-center justify-between bg-slate-50 p-3 rounded-lg border border-slate-200">
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-elleo-purple" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <a href={resume.fileData} download={resume.fileName} className="text-sm font-medium text-elleo-dark hover:text-elleo-purple hover:underline truncate max-w-[200px]">
                  {resume.fileName}
                </a>
              </div>
              <button onClick={clearResume} className="text-slate-400 hover:text-red-500">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Sticky Navigation Header */}
      {/* Removed negative margins to fix alignment issues. This bar now sits precisely within the content width. */}
      {/* Sticky Navigation Header - Candidate Info */}
      <div id="candidate-info-header" className="sticky top-[65px] z-50 bg-slate-50 pt-4 pb-4 sm:py-[28px] px-0 -mx-[1px]">
        <div className="bg-white border-2 border-elleo-purple rounded-xl overflow-hidden relative">
          <div className="bg-white px-4 py-3 sm:px-6 sm:py-4 border-b-2 border-elleo-purple/20 flex justify-between items-center">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <span className="font-bold text-elleo-dark text-[15px] sm:text-xl">{basicInfo.name || '지원자명'}</span>
              <span className="text-slate-300 transform scale-125 -translate-y-[2px]">|</span>
              <span className="text-slate-600 font-bold text-[13px] sm:text-lg">{basicInfo.position || '지원 포지션'}</span>
              <span className="text-slate-300 transform scale-125 -translate-y-[2px]">|</span>
              <span className="text-slate-600 font-bold text-[13px] sm:text-lg">{basicInfo.store || '지원 매장'}</span>
            </div>
            <div className="text-[10px] text-slate-400 font-montserrat uppercase tracking-wider hidden md:block">
              Interview Mate
            </div>
          </div>
        </div>
      </div>

      {/* Active Stage Form Content */}
      <div className="space-y-0 sm:space-y-8 px-0 mb-8 relative z-0">
        <div id="active-stage-content" className="bg-white shadow-sm border-x border-b border-slate-200 animate-fadeIn min-h-[500px]">

          {/* Sticky Tabs Header (Formerly Title) */}
          {/* Offset calculation: AppHeader(64px) + CandidateHeader(tightened) = ~115px on mobile */}
          <div className="sticky top-[151px] sm:top-[187px] z-40 bg-slate-50">
            <div className="bg-slate-50 -mx-[1px] px-4 sm:px-5 pt-3 pb-2 sm:pt-4 sm:pb-3 border border-slate-200 shadow-sm">
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  {/* Navigation Tabs mapped here */}
                  <div className="flex overflow-x-auto gap-2 w-full [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                    {stages.map((stage, index) => {
                      const isActive = activeStageId === stage.id;
                      return (
                        <button
                          key={stage.id}
                          onClick={() => setActiveStageId(stage.id)}
                          className={`px-4 sm:px-4 py-2 sm:py-2.5 rounded-lg text-[13px] sm:text-sm font-bold whitespace-nowrap transition-all border flex-shrink-0 ${isActive
                            ? 'bg-elleo-purple text-white border-elleo-purple shadow-sm'
                            : 'bg-white text-slate-500 border-slate-100 hover:border-slate-300 hover:text-slate-700 hover:bg-slate-50'
                            }`}
                        >
                          <span className="hidden sm:inline">{stage.title}</span>
                          <span className="sm:hidden">{index + 1}단계</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Optional Step Counter if space permits (hidden on small screens) */}
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider hidden lg:block ml-4 whitespace-nowrap">
                    Step {activeStageIndex + 1}/{stages.length}
                  </span>
                </div>

                {activeStage.description && (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 min-h-[20px]">
                    <p className="text-[13px] text-slate-500 font-medium pl-1 sm:pl-3 animate-fadeIn leading-relaxed w-full">
                      {activeStage.description}
                    </p>
                    {activeStage.id === 'stage2' && (
                      <button
                        onClick={() => setBasicInfo(prev => ({ ...prev, hasSushiExperience: !prev.hasSushiExperience }))}
                        className={`text-[11px] px-3 py-1.5 rounded-md border transition-all whitespace-nowrap self-start sm:self-auto ${basicInfo.hasSushiExperience
                          ? 'bg-elleo-purple/10 border-elleo-purple text-elleo-purple font-bold'
                          : 'bg-slate-50 border-slate-200 text-slate-400 hover:border-slate-300'}`}
                      >
                        {basicInfo.hasSushiExperience ? '✓ 경력 질문 활성화됨' : '+ 경력 질문 보기'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="px-3 py-4 pt-8 sm:p-6 sm:pt-10 space-y-6 sm:space-y-8">
            {(activeStage?.sections || [])
              .filter(section => {
                if (!section.condition) return true;
                const cond = section.condition.trim();
                if (cond === '') return true;
                if (cond === 'hasSushiExperience === true') return basicInfo.hasSushiExperience === true;
                if (cond === 'hasSushiExperience === false') return basicInfo.hasSushiExperience === false;
                return true;
              })
              .map(section => (
                <div key={section.id}>
                  {section.title && (
                    <div className="flex items-center gap-3 mb-5 border-l-[3px] border-elleo-purple pl-3 py-1 bg-slate-50/50 rounded-r-lg">
                      <h4 className="text-[15px] font-bold text-elleo-dark tracking-tight leading-none">
                        {section.title}
                      </h4>
                    </div>
                  )}
                  <div className="space-y-4">
                    {/* Render Notices as a Checklist */}
                    {section.notices && section.notices.length > 0 && (
                      <div className="bg-[#f8f7ff] border border-elleo-purple/20 rounded-lg p-3 sm:p-5 space-y-4">
                        <div className="space-y-3">
                          {section.notices.map((notice, idx) => {
                            const noticeKey = `notice-${section.id}-${idx}`;
                            const isChecked = answers[noticeKey] === 'true';
                            return (
                              <label
                                key={idx}
                                className={`flex items-start gap-3 p-3 rounded-lg border transition-all cursor-pointer ${isChecked ? 'bg-white border-elleo-purple shadow-sm' : 'bg-white/50 border-slate-100 hover:border-elleo-purple/20'
                                  }`}
                              >
                                <div className="mt-0.5">
                                  <input
                                    type="checkbox"
                                    className="w-4 h-4 text-elleo-purple border-slate-300 rounded focus:ring-elleo-purple accent-elleo-purple"
                                    checked={isChecked}
                                    onChange={(e) => {
                                      const newValue = e.target.checked ? 'true' : 'false';
                                      setAnswers(prev => {
                                        const next = { ...prev, [noticeKey]: newValue };
                                        // If unchecking any notice, also uncheck the main consent
                                        if (!e.target.checked) {
                                          next[`consent-${section.id}`] = 'false';
                                        }
                                        return next;
                                      });
                                    }}
                                  />
                                </div>
                                <p className={`${activeStageId === 'stage5' ? 'text-[13px] sm:text-[15px]' : 'text-sm'} leading-relaxed ${isChecked ? 'text-elleo-dark font-bold' : 'text-slate-600'}`}>
                                  {notice}
                                </p>
                              </label>
                            );
                          })}
                        </div>

                        {section.requireConsent && (
                          <div className="pt-4 mt-2 border-t border-elleo-purple/10">
                            <label className="flex items-center gap-3 cursor-pointer group">
                              <div className="relative flex items-center justify-center">
                                <input
                                  type="checkbox"
                                  id={`consent-${section.id}`}
                                  className="peer w-5 h-5 text-elleo-purple border-slate-300 rounded focus:ring-elleo-purple accent-elleo-purple"
                                  checked={answers[`consent-${section.id}`] === 'true'}
                                  onChange={(e) => {
                                    const isChecked = e.target.checked;
                                    setAnswers(prev => {
                                      const next = { ...prev, [`consent-${section.id}`]: isChecked ? 'true' : 'false' };
                                      // If checking the main consent, check all notices
                                      if (isChecked && section.notices) {
                                        section.notices.forEach((_, idx) => {
                                          next[`notice-${section.id}-${idx}`] = 'true';
                                        });
                                      } else if (!isChecked && section.notices) {
                                        // Optional: Uncheck all if main is unchecked
                                        section.notices.forEach((_, idx) => {
                                          next[`notice-${section.id}-${idx}`] = 'false';
                                        });
                                      }
                                      return next;
                                    });
                                  }}
                                />
                              </div>
                              <span className={`${activeStageId === 'stage5' ? 'text-[13px] sm:text-[15px]' : 'text-sm'} font-bold text-elleo-dark group-hover:text-elleo-purple transition-colors`}>
                                지원자에게 위 모든 고지사항을 안내하고 최종 동의를 확인했습니다.
                              </span>
                            </label>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Render Questions if they exist */}
                    {section.questions?.map(q => {
                      const isExpanded = expandedQuestions.has(q.id);
                      const hasAnswer = !!answers[q.id];

                      return (
                        <div key={q.id} className={`bg-slate-50 rounded-lg border transition-all duration-200 ${isExpanded ? 'border-elleo-purple ring-1 ring-elleo-purple/30 shadow-sm' : (hasAnswer ? 'border-elleo-purple' : 'border-slate-100 hover:border-elleo-purple/30')}`}>
                          <div
                            className="p-4 cursor-pointer flex justify-between items-start gap-4"
                            onClick={() => toggleQuestion(q.id)}
                          >
                            <div className="flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
                              <p className={`font-medium leading-snug text-[14px] sm:text-[15px] ${isExpanded ? 'text-elleo-dark' : 'text-slate-700'}`}>{q.text}</p>
                              {q.checkpoints && q.checkpoints.length > 0 && (
                                <div className="hidden sm:flex flex-wrap gap-2 flex-shrink-0">
                                  {q.checkpoints.map((cp, idx) => (
                                    <span key={idx} className="text-[10px] sm:text-xs bg-[#f5f3ff] text-elleo-purple border border-elleo-purple px-2 py-0.5 rounded-[4px]">
                                      {cp}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                            <div className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
                              <svg className="w-5 h-5 text-slate-400 group-hover:text-elleo-purple" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                              </svg>
                            </div>
                          </div>

                          {isExpanded && (
                            <div className="px-4 pb-4 animate-fadeIn">
                              <textarea
                                id={`textarea-${q.id}`}
                                name={`answer-${q.id}`}
                                className="w-full p-3 bg-white border border-slate-300 rounded-md focus:ring-0 focus:border-elleo-purple min-h-[100px] text-[16px] placeholder:text-[15px] sm:text-[15px] resize-y placeholder-slate-400 transition-shadow"
                                placeholder="평가 내용을 입력하세요..."
                                value={answers[q.id] || ''}
                                autoComplete="off"
                                spellCheck={false}
                                // @ts-ignore
                                autoCorrect="off"
                                onChange={e => handleAnswerChange(q.id, e.target.value)}
                                onKeyDown={(e) => {
                                  // Handle Tab or Shift+Enter to move to next field
                                  // Enter alone will now do a default newline as requested
                                  if (e.key === 'Tab' || (e.key === 'Enter' && e.shiftKey)) {
                                    e.preventDefault();

                                    // Detect all visible questions to find next/prev
                                    const visibleQuestions = (activeStage?.sections || [])
                                      .filter(section => {
                                        if (!section.condition) return true;
                                        const cond = section.condition.trim();
                                        if (cond === '') return true;
                                        if (cond === 'hasSushiExperience === true') return basicInfo.hasSushiExperience === true;
                                        if (cond === 'hasSushiExperience === false') return basicInfo.hasSushiExperience === false;
                                        return true;
                                      })
                                      .flatMap(s => s.questions || []);

                                    const currentIndex = visibleQuestions.findIndex(vq => vq.id === q.id);

                                    // Tab+Shift should go back, Tab or Shift+Enter should go forward
                                    const direction = (e.key === 'Tab' && e.shiftKey) ? -1 : 1;

                                    if (direction === 1 && currentIndex < visibleQuestions.length - 1) {
                                      const nextId = visibleQuestions[currentIndex + 1].id;
                                      setExpandedQuestions(prev => new Set(prev).add(nextId));
                                      setPendingFocusId(nextId);
                                    } else if (direction === -1 && currentIndex > 0) {
                                      const prevId = visibleQuestions[currentIndex - 1].id;
                                      setExpandedQuestions(prev => new Set(prev).add(prevId));
                                      setPendingFocusId(prevId);
                                    }
                                  }
                                }}
                                onClick={e => e.stopPropagation()}
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

            {/* Big Navigation Buttons */}
            <div className="grid grid-cols-2 gap-4 pt-8 border-t border-slate-100 mt-8">
              <Button
                variant="secondary"
                onClick={handlePrevStage}
                disabled={activeStageIndex === 0}
                className={`h-[52px] px-4 rounded-xl border font-bold text-slate-600 text-[14px] sm:text-base transition-all flex items-center justify-center gap-2 ${activeStageIndex === 0 ? 'opacity-0' : ''}`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                <span className="hidden sm:inline">이전 단계</span>
                <span className="sm:hidden">이전단계</span>
              </Button>

              <Button
                variant={activeStageIndex === stages.length - 1 ? 'primary' : 'purple'}
                onClick={handleNextStage}
                className="h-[52px] px-4 rounded-xl font-bold text-white text-[14px] sm:text-base shadow-md flex items-center justify-center gap-2"
              >
                {activeStageIndex === stages.length - 1 ? (
                  <>작성 완료 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg></>
                ) : (
                  <>
                    <span className="hidden sm:inline">다음 단계로 이동</span>
                    <span className="sm:hidden">다음단계</span>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* AI Summary Section */}
      <div className="mt-12 bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-200 overflow-hidden">
        <div className="p-6 sm:p-8 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="bg-elleo-purple p-3 rounded-xl shadow-lg shadow-elleo-purple/20">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight">AI 인터뷰 분석 리포트</h3>
              <p className="text-sm text-slate-500 font-medium">인공지능이 최적의 역량 매칭 포인트를 분석했습니다.</p>
            </div>
          </div>
          <Button
            variant="purple"
            onClick={handleAnalyze}
            isLoading={isAnalyzeLoading}
            className="w-full sm:w-auto text-[15px] font-black px-8 py-3 rounded-full shadow-lg shadow-elleo-purple/20 transition-all hover:-translate-y-0.5"
          >
            {aiSummary ? '분석 다시 실행' : 'AI 분석 레포트 생성'}
          </Button>
        </div>

        <div className="p-4 sm:p-[100px] sm:pl-[100px] sm:pr-[100px] sm:pt-[70px] sm:pb-[70px]">
          {isAnalyzeLoading ? (
            <div className="py-20 flex flex-col items-center text-center animate-fadeIn">
              <h4 className="text-xl font-black text-slate-900 mt-8 mb-2 flex items-center justify-center gap-3">
                <img
                  src="https://www.sushia.com.au/wp-content/uploads/2026/01/Elleo-Group-Symbel.svg"
                  alt="Elleo Group Logo"
                  className="w-8 h-8 animate-pulse"
                />
                <span>
                  면접 데이터를 분석중입니다
                  <span className="inline-flex w-8 justify-start">
                    <span className="animate-[loading_1.5s_infinite_0ms]">.</span>
                    <span className="animate-[loading_1.5s_infinite_200ms]">.</span>
                    <span className="animate-[loading_1.5s_infinite_400ms]">.</span>
                  </span>
                </span>
              </h4>
              <style>{`
                @keyframes loading {
                  0%, 100% { opacity: 0.2; }
                  50% { opacity: 1; }
                }
              `}</style>
            </div>
          ) : aiSummary ? (
            <div className="animate-fadeIn">
              {formatAISummary(aiSummary)}
            </div>
          ) : (
            <div className="py-24 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
              <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm border border-slate-100 text-slate-300">
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              </div>
              <p className="text-slate-600 font-black text-lg mb-2">작성된 분석 결과가 없습니다</p>
              <p className="text-slate-400 font-medium text-sm">인터뷰 작성을 완료하고 AI 분석 버튼을 눌러주세요.</p>
            </div>
          )}
        </div>
      </div>

      {/* Global Bottom Actions (Backup) */}
      {/* Global Bottom Actions (Backup) */}
      {/* Global Header Actions via Portal */}
      {
        portalTarget && createPortal(
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Button
              variant="secondary"
              onClick={onCancel}
              bouncy
              shadow="sm"
              className="px-2 sm:px-3 py-1.5 text-xs sm:text-sm h-9 border-slate-300 hover:bg-slate-50 hover:border-slate-400 text-slate-600 whitespace-nowrap"
            >
              나가기
            </Button>
            <Button
              onClick={() => handleSave(false)}
              variant="primary"
              bouncy
              isLoading={isSaveLoading}
              shadow="sm"
              className="px-2 sm:px-3 py-1.5 text-xs sm:text-sm bg-elleo-dark hover:bg-[#1a2639] h-9 whitespace-nowrap"
            >
              임시 저장
            </Button>
          </div>,
          portalTarget
        )
      }
    </div >
  );
};