import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { InterviewRecord } from '../types';
import { getRecords, deleteRecord } from '../services/db';
import { Button } from './Button';
import { Input } from './Input';
import { useModal } from '../contexts/ModalContext';
import { useAuth } from '../contexts/AuthContext';

const getInitial = (name: string): string => {
  if (!name) return '';
  const char = name.charAt(0);
  const code = char.charCodeAt(0);

  // Korean Hangul Syllables
  if (code >= 0xAC00 && code <= 0xD7A3) {
    const initialOffset = Math.floor((code - 0xAC00) / 588);
    const initials = [
      'ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'
    ];
    const initial = initials[initialOffset];
    const map: Record<string, string> = {
      'ㄲ': 'ㄱ', 'ㄸ': 'ㄷ', 'ㅃ': 'ㅂ', 'ㅆ': 'ㅅ', 'ㅉ': 'ㅈ'
    };
    return map[initial] || initial;
  }

  // English
  if (/[a-zA-Z]/.test(char)) {
    return char.toUpperCase();
  }

  return 'Other';
};

interface InterviewListProps {
  onNew: (type: 'STANDARD' | 'DEPTH' | 'HR') => void;
  onEdit: (record: InterviewRecord) => void;
}

export const InterviewList: React.FC<InterviewListProps> = ({ onNew, onEdit }) => {
  const [records, setRecords] = useState<InterviewRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const [viewMode, setViewMode] = useState<'GRID' | 'LIST'>('GRID');
  const [placeholder, setPlaceholder] = useState('지원자, 포지션, 매장, 답변 등...검색');
  const { showConfirm, showAlert } = useModal();
  const { role } = useAuth();

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 640) {
        setPlaceholder('지원자, 포지션, 매장, 답변 등...검색');
      } else {
        setPlaceholder('지원자, 포지션, 매장, 답변 등...검색');
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);

    // Close Dropdowns on Click Outside
    const handleClickOutside = (event: MouseEvent) => {
      const desktopMenu = document.getElementById('desktop-create-menu');
      const mobileMenu = document.getElementById('mobile-action-menu');

      // Close Desktop Menu if click is outside
      if (desktopMenu && !desktopMenu.contains(event.target as Node) && !document.getElementById('header-actions')?.contains(event.target as Node)) {
        desktopMenu.classList.add('hidden');
      }

      // Close Mobile Menu if click is outside
      if (mobileMenu && !mobileMenu.contains(event.target as Node) && !document.getElementById('header-actions')?.contains(event.target as Node)) {
        mobileMenu.classList.add('hidden');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    setPortalTarget(document.getElementById('header-actions'));
  }, []);

  useEffect(() => {
    const loadRecords = async () => {
      setLoading(true);
      const data = await getRecords();
      setRecords(data);
      setLoading(false);
    };
    loadRecords();
  }, []);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (await showConfirm('정말로 이 기록을 삭제하시겠습니까?')) {
      try {
        await deleteRecord(id);
        setRecords(prev => prev.filter(r => r.id !== id));
      } catch (error) {
        await showAlert('삭제 중 오류가 발생했습니다.');
      }
    }
  };

  const filteredRecords = records.filter(r => {
    const term = searchTerm.toLowerCase();
    // Smart Search: Split by space and check if EVERY keyword matches
    const keywords = term.split(/\s+/).filter(Boolean);
    if (keywords.length === 0) return true;

    // Helper check function for a single keyword
    const checkKeyword = (keyword: string) => {
      // Check if keyword matches the initial (for single char search)
      const initial = getInitial(r.basicInfo.name).toLowerCase();
      const matchesInitial = keyword.length === 1 && initial === keyword;

      return matchesInitial ||
        r.basicInfo.name.toLowerCase().includes(keyword) ||
        r.basicInfo.position.toLowerCase().includes(keyword) ||
        (r.basicInfo.store && r.basicInfo.store.toLowerCase().includes(keyword)) ||
        (r.basicInfo.date && r.basicInfo.date.includes(keyword)) || // Support date search
        Object.values(r.answers).some((answer: string) => answer.toLowerCase().includes(keyword));
    };

    return keywords.every(checkKeyword);
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      {/* Header Section */}
      <div className="flex flex-col items-center sm:flex-row sm:justify-center sm:items-end text-center gap-1 sm:gap-3 mb-8 sm:mb-12">
        <h1 className="text-2xl font-bold text-elleo-dark">면접 기록 DB</h1>
        <p className="text-slate-500 text-sm sm:text-base sm:pb-0.5">저장된 인터뷰 평가서를 검색하고 관리하세요.</p>
      </div>

      {portalTarget && createPortal(
        <>
          {/* Desktop Actions */}
          <div className="hidden sm:flex relative">
            <Button
              onClick={(e) => {
                e.stopPropagation();
                const menu = document.getElementById('desktop-create-menu');
                if (menu) menu.classList.toggle('hidden');
              }}
              variant="purple"
              bouncy
              shadow="sm"
              className="hover:shadow-none flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
              인터뷰 작성
              <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
            </Button>

            {/* Desktop Dropdown Menu */}
            <div id="desktop-create-menu" className="hidden absolute right-0 top-full mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden z-20 animate-in fade-in zoom-in-95 slide-in-from-top-2">
              <div className="p-1">
                {role !== 'hr_director' && (
                  <button
                    onClick={() => onNew('STANDARD')}
                    className="w-full text-left px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 rounded-lg transition-colors flex items-center gap-2"
                  >
                    <div className="w-2 h-2 rounded-full bg-elleo-purple"></div>
                    새 인터뷰 작성
                  </button>
                )}
                {role === 'admin' && (
                  <button
                    onClick={() => onNew('DEPTH')}
                    className="w-full text-left px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 rounded-lg transition-colors flex items-center gap-2"
                  >
                    <div className="w-2 h-2 rounded-full bg-slate-400"></div>
                    심층 인터뷰 작성
                  </button>
                )}
                {(role === 'admin' || role === 'hr_director') && (
                  <button
                    onClick={() => onNew('HR')}
                    className="w-full text-left px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 rounded-lg transition-colors flex items-center gap-2"
                  >
                    <div className="w-2 h-2 rounded-full bg-rose-500"></div>
                    HR 인터뷰 작성
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Mobile Actions (Dropdown) */}
          <div className="sm:hidden relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                const menu = document.getElementById('mobile-action-menu');
                if (menu) menu.classList.toggle('hidden');
              }}
              className="p-2 bg-elleo-purple text-white rounded-full shadow-lg shadow-elleo-purple/30 hover:shadow-none hover:bg-[#8f8ed3] transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
            </button>

            {/* Dropdown Menu */}
            <div id="mobile-action-menu" className="hidden absolute right-0 top-full mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden z-[60] animate-in fade-in zoom-in-95 duration-150 origin-top-right">
              <div className="p-1">
                {role !== 'hr_director' && (
                  <button onClick={() => onNew('STANDARD')} className="w-full text-left px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 rounded-lg flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-elleo-purple"></div>
                    새 인터뷰 작성
                  </button>
                )}
                {role === 'admin' && (
                  <button onClick={() => onNew('DEPTH')} className="w-full text-left px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 rounded-lg flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-slate-400"></div>
                    심층 인터뷰 작성
                  </button>
                )}
                {(role === 'admin' || role === 'hr_director') && (
                  <button onClick={() => onNew('HR')} className="w-full text-left px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 rounded-lg flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-rose-500"></div>
                    HR 인터뷰 작성
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Click outside listener to close menu */}
          <div className="fixed inset-0 z-[55] hidden" id="mobile-menu-backdrop" onClick={() => {
            document.getElementById('mobile-action-menu')?.classList.add('hidden');
            document.getElementById('mobile-menu-backdrop')?.classList.add('hidden');
          }}></div>
        </>,
        portalTarget
      )}

      {/* Search Input & View Toggle Row */}
      <div className="flex gap-2 mb-6">
        <div className="relative flex-grow">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2.5 bg-white border-[2px] border-elleo-purple rounded-xl leading-5 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-elleo-purple/20 text-[16px] sm:text-[16px] shadow-sm transition-shadow"
            placeholder={placeholder}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* View Toggle (Moved Next to Search) */}
        <div className="flex bg-slate-100 p-1 rounded-lg flex-shrink-0">
          <button
            onClick={() => setViewMode('GRID')}
            className={`p-2 rounded-md transition-all ${viewMode === 'GRID' ? 'bg-white text-elleo-purple shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
          </button>
          <button
            onClick={() => setViewMode('LIST')}
            className={`p-2 rounded-md transition-all ${viewMode === 'LIST' ? 'bg-white text-elleo-purple shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="w-12 h-12 border-4 border-elleo-purple/30 border-t-elleo-purple rounded-full animate-spin mb-4"></div>
          <p className="text-slate-500 font-medium">기록을 불러오는 중입니다...</p>
        </div>
      ) : filteredRecords.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border border-dashed border-slate-300">
          <svg className="mx-auto h-12 w-12 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="mt-4 text-slate-500 text-lg">기록된 인터뷰가 없습니다.</p>
          <p className="text-slate-400 text-sm">새 인터뷰 작성을 눌러 시작하세요.</p>
        </div>
      ) : (
        /* GRID VIEW (2 columns on mobile, 5 on lg) OR LIST VIEW */
        <div className={viewMode === 'GRID'
          ? "grid grid-cols-2 md:grid-cols-2 lg:grid-cols-5 xl:grid-cols-5 gap-3 sm:gap-4"
          : "flex flex-col gap-2"
        }>
          {filteredRecords.map(record => {
            const isDeep = record.basicInfo.interviewType === 'DEPTH';

            if (viewMode === 'LIST') {
              const answerCount = Object.keys(record.answers).filter(k => !k.startsWith('notice-') && !k.startsWith('consent-') && record.answers[k]).length;

              return (
                <div
                  key={record.id}
                  onClick={() => onEdit(record)}
                  className="bg-white rounded-lg shadow-sm border border-slate-200 p-3 hover:shadow-md hover:border-elleo-purple transition-all cursor-pointer group"
                >
                  {/* MOBILE LAYOUT: 2 Rows */}
                  <div className="flex flex-col gap-3 sm:hidden">
                    {/* Row 1: Name, Badges | Trash */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-1.5 flex-1 min-w-0">
                        <span className="text-md font-bold text-slate-800 truncate">{record.basicInfo.name}</span>
                        <span className="inline-block px-1.5 py-0.5 rounded text-[11px] font-medium border border-elleo-purple text-elleo-purple shrink-0">
                          {record.basicInfo.position || '포지션 미지정'}
                        </span>
                        {isDeep && (
                          <span className="px-1.5 py-0.5 rounded text-[11px] font-medium bg-elleo-purple text-white shrink-0">심층</span>
                        )}
                        {record.basicInfo.interviewType === 'HR' && (
                          <span className="px-1.5 py-0.5 rounded text-[11px] font-medium bg-rose-500 text-white shrink-0">HR</span>
                        )}
                      </div>
                      <button
                        onClick={(e) => handleDelete(record.id, e)}
                        className="text-slate-300 hover:text-red-500 p-1 flex-shrink-0"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>

                    {/* Row 2: Date, Store | AI Analysis, Answers */}
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex items-center gap-1 shrink-0">
                          <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                          <span>{record.basicInfo.date}</span>
                        </div>
                        <div className="flex items-center gap-1 min-w-0">
                          <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                          <span className="truncate">{record.basicInfo.store || '매장 미지정'}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {record.aiSummary && (
                          <span className="flex items-center gap-0.5 text-[11px] font-semibold text-elleo-dark bg-elleo-purple-light px-1.5 py-0.5 rounded leading-none">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                            AI 분석
                          </span>
                        )}
                        <span className="text-[11px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full shrink-0">
                          답변 {answerCount}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* DESKTOP LAYOUT (Existing) */}
                  <div className="hidden sm:flex items-center justify-between gap-4">
                    <div className="flex items-center gap-x-4 flex-wrap flex-1 min-w-0">
                      <span className="text-md font-bold text-slate-800 shrink-0">{record.basicInfo.name}</span>

                      <div className="flex items-center gap-1.5 text-xs text-slate-500 shrink-0">
                        <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        <span>{record.basicInfo.date}</span>
                      </div>

                      <div className="flex items-center gap-1.5 text-xs text-slate-500 shrink-0">
                        <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        <span className="truncate">{record.basicInfo.store || '매장 미지정'}</span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <span className="inline-block px-1.5 py-0.5 rounded text-[12px] font-medium border border-elleo-purple text-elleo-purple">
                          {record.basicInfo.position || '지원 포지션'}
                        </span>
                        {isDeep && (
                          <span className="px-1.5 py-0.5 rounded text-[12px] font-medium bg-elleo-purple text-white">심층</span>
                        )}
                        {record.basicInfo.interviewType === 'HR' && (
                          <span className="px-1.5 py-0.5 rounded text-[12px] font-medium bg-rose-500 text-white">HR</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {record.aiSummary && (
                        <span className="flex items-center gap-0.5 text-[12px] font-semibold text-elleo-dark bg-elleo-purple-light px-1.5 py-1 rounded leading-none shrink-0">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                          AI 분석
                        </span>
                      )}
                      <span className="text-[12px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full whitespace-nowrap">
                        답변 {answerCount}
                      </span>
                      <button
                        onClick={(e) => handleDelete(record.id, e)}
                        className="text-slate-300 hover:text-red-500 p-1"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  </div>
                </div>
              );
            }

            // GRID CARD (Optimized for 2-col mobile)
            return (
              <div
                key={record.id}
                onClick={() => onEdit(record)}
                className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 hover:shadow-md hover:border-elleo-purple transition-all cursor-pointer group flex flex-col justify-between h-full"
              >
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-base font-bold text-slate-800 group-hover:text-elleo-dark transition-colors truncate w-full pr-1">{record.basicInfo.name}</h3>
                    <button
                      onClick={(e) => handleDelete(record.id, e)}
                      className="text-slate-300 hover:text-red-500 p-0.5"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-1 mb-3">
                    <span className="inline-block px-1.5 py-0.5 rounded text-[12px] font-medium border border-elleo-purple text-elleo-purple truncate max-w-full">
                      {record.basicInfo.position || '지원 포지션'}
                    </span>
                    {isDeep && (
                      <span className="px-1.5 py-0.5 rounded text-[12px] font-medium bg-elleo-purple text-white">
                        심층
                      </span>
                    )}
                    {record.basicInfo.interviewType === 'HR' && (
                      <span className="px-1.5 py-0.5 rounded text-[12px] font-medium bg-rose-500 text-white">
                        HR
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-1 text-xs text-slate-500">
                  <div className="flex items-center gap-1.5 truncate">
                    <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    <span className="truncate">{record.basicInfo.date}</span>
                  </div>
                  <div className="flex items-center gap-1.5 truncate">
                    <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    <span className="truncate">{record.basicInfo.store || '매장 미지정'}</span>
                  </div>
                </div>

                <div className="pt-2 mt-[12px] border-t border-slate-100 flex justify-between items-center">
                  {/* Answer count hidden on mobile grid to save space, or kept tiny */}
                  <span className="text-[12px] text-slate-400">
                    답변 {Object.keys(record.answers).filter(k => !k.startsWith('notice-') && !k.startsWith('consent-') && record.answers[k]).length}
                  </span>
                  {record.aiSummary && (
                    <span className="flex items-center gap-0.5 text-[12px] font-semibold text-elleo-dark bg-elleo-purple-light px-1.5 py-0.5 rounded">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                      AI 분석
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )
      }
    </div >
  );
};