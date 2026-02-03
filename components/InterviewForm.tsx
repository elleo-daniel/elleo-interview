import React, { useState, useEffect, useRef } from 'react';
import { useModal } from '../contexts/ModalContext';
import { createPortal } from 'react-dom';
import { v4 as uuidv4 } from 'uuid';
import { BasicInfo, InterviewRecord, Stage } from '../types';
import { Button } from './Button';
import { Input } from './Input';
import { saveRecord } from '../services/db';
import { analyzeInterview } from '../services/geminiService';

// Helper to parse bold text (**text**)
const parseBold = (text: string) => {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-bold text-slate-900">{part.slice(2, -2)}</strong>;
    }
    return part;
  });
};

// Helper to format AI Summary markdown
const formatAISummary = (text: string) => {
  if (!text) return null;

  // Pre-process: Collapse multiple spaces and trim each line
  const lines = text.split('\n').map(l => l.trim());

  return (
    <div className="space-y-3 text-slate-700 leading-relaxed">
      {lines.map((line, index) => {
        if (!line && index < lines.length - 1) return <div key={index} className="h-1" />;

        // Remove markdown bolding for detection purposes
        const cleanLine = line.replace(/\*\*/g, '');

        // 1. Handle Intro Sentence (Premium Card)
        // Detects "'Name'님의 인터뷰 분석 결과" or similar short title lines
        const isIntropattern = cleanLine.includes('인터뷰 분석 결과') && cleanLine.length < 50;
        if (isIntropattern && index < 5) {
          return (
            <div key={index} className="mb-10 text-center relative py-8 px-6 bg-gradient-to-br from-indigo-50/50 via-white to-elleo-purple/5 rounded-2xl border border-indigo-100/50 shadow-[0_15px_40px_-10px_rgba(79,70,229,0.12)] overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-[5px] bg-gradient-to-r from-transparent via-elleo-purple to-transparent opacity-80"></div>
              <div className="relative z-10 space-y-4">
                <div className="flex items-center justify-center gap-3">
                  <span className="h-[1px] w-6 bg-elleo-purple/20 rounded-full"></span>
                  <span className="text-[10px] font-black text-elleo-purple tracking-[0.3em] uppercase opacity-70">Insight Report</span>
                  <span className="h-[1px] w-6 bg-elleo-purple/20 rounded-full"></span>
                </div>
                <h2 className="text-[20px] sm:text-[24px] font-black text-slate-900 leading-tight tracking-tight max-w-2xl mx-auto">
                  {parseBold(line.replace(/\*\*인터뷰 분석 결과\*\*/, '인터뷰 분석 결과'))}
                </h2>
              </div>
            </div>
          );
        }

        // 2. Handle Verdict Header (Flexible Match)
        if (cleanLine.includes('종합 의견') && !cleanLine.includes('최종 추천 여부') && (line.startsWith('5.') || /^[5\s]*종합 의견/.test(cleanLine) || (index > 15))) {
          return (
            <div key={index} className="mt-14 mb-6 relative">
              <div className="flex items-center gap-4">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-elleo-purple uppercase tracking-widest leading-none mb-1">Final Verdict</span>
                  <h3 className="text-xl font-black text-elleo-dark tracking-tighter uppercase">종합 의견</h3>
                </div>
                <div className="flex-1 h-[2px] bg-gradient-to-r from-elleo-purple/30 via-elleo-purple/10 to-transparent rounded-full ml-2"></div>
              </div>
            </div>
          );
        }

        // 3. Handle Main Headers (1., 2., 3., 4.)
        // Matches "1. **Title**:" or "1. Title" etc.
        const headerMatch = line.match(/^(\d)\.\s*(?:\*\*)?(.*?)(?:\*\*)?[:]*$/);
        if (headerMatch && parseInt(headerMatch[1]) <= 4) {
          const num = headerMatch[1];
          // Strip trailing asterisks and colons from the content part
          const content = headerMatch[2].replace(/[:\*]+$/, '').trim();
          return (
            <h3 key={index} className="text-[18px] font-bold text-elleo-dark mt-10 mb-4 flex items-center gap-3 group">
              <span className="w-7 h-7 bg-white text-elleo-purple border-2 border-elleo-purple/20 flex items-center justify-center rounded-lg flex-shrink-0 font-montserrat font-black text-sm group-hover:bg-elleo-purple group-hover:text-white group-hover:border-elleo-purple transition-all duration-200">
                {num}
              </span>
              {parseBold(content)}
            </h3>
          );
        }

        // 4. Handle List Items
        if (line.startsWith('* ') || line.startsWith('- ')) {
          const content = line.replace(/^([\*\-])\s*/, '');
          return (
            <div key={index} className="flex items-start gap-2 ml-1 py-0">
              <span className="text-elleo-purple mt-1 text-[10px]">•</span>
              <p className="flex-1 text-[15.5px] font-medium text-slate-600 tracking-tight leading-relaxed">
                {parseBold(content)}
              </p>
            </div>
          );
        }

        // 5. Handle Final Recommendation
        if (line.includes('최종 추천 여부:')) {
          const statusPart = line.split(':')[1]?.trim() || '';
          const statusText = statusPart.replace(/\*/g, '').replace(/[\[\]]/g, '').trim();
          const isRecommended = statusText.includes('추천') && !statusText.includes('비추천');
          const isNotRecommended = statusText.includes('비추천');

          return (
            <div key={index} className="mt-12 p-5 bg-white border-2 border-slate-100 rounded-2xl flex items-center justify-center gap-5 shadow-sm w-fit mx-auto min-w-[280px]">
              <span className="text-[15px] font-bold text-slate-500 tracking-tight">최종 추천 여부</span>
              <div className="h-4 w-[1px] bg-slate-200"></div>
              <span className={`px-5 py-1.5 rounded-full text-[15px] font-black shadow-sm ${isRecommended
                ? 'bg-green-100 text-green-700 border border-green-200'
                : isNotRecommended
                  ? 'bg-red-100 text-red-700 border border-red-200'
                  : 'bg-orange-100 text-orange-700 border border-orange-200'
                }`}>
                {statusText}
              </span>
            </div>
          );
        }

        // 6. Regular Paragraphs
        if (line) {
          // Collapse multiple spaces that might cause layout issues
          const cleanedText = line.replace(/\s{2,}/g, ' ');
          return (
            <p key={index} className="text-[15.5px] leading-relaxed text-slate-600 mb-0.5">
              {parseBold(cleanedText)}
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

    // Create a temporary record for analysis
    const tempRecord: InterviewRecord = {
      id: 'temp',
      basicInfo,
      answers,
      createdAt: Date.now()
    };

    const summary = await analyzeInterview(tempRecord, stages);
    setAiSummary(summary);

    // Auto-save the record with the final summary
    const updatedRecord: InterviewRecord = {
      ...tempRecord,
      aiSummary: summary,
      id: recordId, // Ensure we use the persistent ID
      basicInfo: {
        ...tempRecord.basicInfo,
        interviewType: (interviewType as 'STANDARD' | 'DEPTH') || 'STANDARD'
      }
    };

    try {
      await saveRecord(updatedRecord);
    } catch (e) {
      console.error("Failed to auto-save AI summary", e);
    }

    setIsAnalyzeLoading(false);
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
      <div className="mt-8 bg-white rounded-xl shadow-sm border border-elleo-purple/30 p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="bg-elleo-purple-light p-2 rounded-lg">
              <svg className="w-6 h-6 text-elleo-purple" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-elleo-dark">AI 면접 분석</h3>
          </div>
          <Button variant="purple" onClick={handleAnalyze} isLoading={isAnalyzeLoading} className="text-[14px] sm:text-base px-5 shadow-md">
            {aiSummary ? '다시 분석하기' : 'AI 분석 생성'}
          </Button>
        </div>

        {aiSummary ? (
          <div className="bg-slate-50 rounded-lg px-4 sm:px-8 py-8 text-[15px] text-slate-700 border border-slate-200">
            {formatAISummary(aiSummary)}
          </div>
        ) : (
          <div className="text-center py-32 text-slate-400 text-sm border-2 border-dashed border-slate-200 rounded-lg">
            모든 질문에 답한 후 AI 분석을 실행하여 요약을 확인하세요.
          </div>
        )}
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