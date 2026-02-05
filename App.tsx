import React, { useState, useEffect, useRef } from 'react';
import { ViewState, InterviewRecord, Stage } from './types';
import { InterviewForm } from './components/InterviewForm';
import { InterviewList } from './components/InterviewList';
import { Login } from './components/Login';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ModalProvider } from './contexts/ModalContext';

import { INTERVIEW_STAGES as STANDARD_STAGES } from './constants';
import { INTERVIEW_STAGES_EN as STANDARD_STAGES_EN } from './constants_en';
import { INTERVIEW_STAGES as DEPTH_STAGES } from './constants_in-depth';
import { INTERVIEW_STAGES_EN as DEPTH_STAGES_EN } from './constants_in-depth_en';
import { INTERVIEW_STAGES as HR_STAGES } from './constants_HR';
import { INTERVIEW_STAGES_EN as HR_STAGES_EN } from './constants_HR_en';
import { supabase } from './services/supabase';

const AppContent: React.FC = () => {
  const { user, role, loading, signOut } = useAuth();
  const [view, setView] = useState<ViewState>('LIST');

  const [selectedRecord, setSelectedRecord] = useState<InterviewRecord | undefined>(undefined);
  const [currentInterviewType, setCurrentInterviewType] = useState<'STANDARD' | 'DEPTH' | 'HR'>('STANDARD');
  const [language, setLanguage] = useState<'KO' | 'EN'>('KO');
  const [currentStages, setCurrentStages] = useState<Stage[]>(STANDARD_STAGES);

  const [showLogout, setShowLogout] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowLogout(false);
      }
    };

    if (showLogout) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showLogout]);

  // Update stages whenever language or interview type changes
  useEffect(() => {
    if (currentInterviewType === 'STANDARD') {
      setCurrentStages(language === 'KO' ? STANDARD_STAGES : STANDARD_STAGES_EN);
    } else if (currentInterviewType === 'DEPTH') {
      setCurrentStages(language === 'KO' ? DEPTH_STAGES : DEPTH_STAGES_EN);
    } else {
      setCurrentStages(language === 'KO' ? HR_STAGES : HR_STAGES_EN);
    }
  }, [language, currentInterviewType]);

  // Only show full-screen loader if we don't know who the user is yet
  if (loading && !user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white">
        <div className="flex flex-col items-center animate-pulse">
          <img
            src="https://www.sushia.com.au/wp-content/uploads/2026/01/Elleo-Group-Logo-B.svg"
            alt="Elleo Group"
            className="h-16 w-auto mb-8"
          />
          {/* Optional: Add a small spinner or text below if desired, but clean is better */}
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  const handleNewInterview = (type: 'STANDARD' | 'DEPTH' | 'HR') => {
    setSelectedRecord(undefined);
    setCurrentInterviewType(type);
    // Stage update is handled by useEffect
    setView('FORM');
  };

  const handleEditInterview = async (partialRecord: InterviewRecord) => {
    const type = partialRecord.basicInfo.interviewType || 'STANDARD';
    setCurrentInterviewType(type);
    // Stage update is handled by useEffect

    try {
      const { getRecordById } = await import('./services/db');
      const fullRecord = await getRecordById(partialRecord.id);

      if (fullRecord) {
        setSelectedRecord(fullRecord);
      } else {
        alert('기록을 불러올 수 없습니다.');
        return;
      }

      setView('FORM');
    } catch (error) {
      console.error("Failed to load full record", error);
      alert('기록 불러오기 실패');
    }
  };

  const handleSaveComplete = () => {
    setView('LIST');
    setSelectedRecord(undefined);
  };

  const handleCancel = () => {
    setView('LIST');
    setSelectedRecord(undefined);
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 flex flex-col">
      {/* Top Navigation Bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-[100] shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center cursor-pointer gap-3" onClick={() => setView('LIST')}>
              <img
                src="https://www.sushia.com.au/wp-content/uploads/2026/01/Elleo-Group-Logo-B.svg"
                alt="Elleo Group Logo"
                className="h-8 w-auto object-contain transition-transform hover:scale-95"
              />
              <span className="text-lg font-bold text-elleo-dark border-l border-slate-300 pl-3 hidden sm:block font-montserrat uppercase tracking-tight">
                Interview Mate
              </span>
            </div>

            <div className="flex items-center gap-4">
              {/* Profile Badge - Toggles Logout Dropdown */}
              <div className="relative z-50" ref={dropdownRef}>
                <button
                  onClick={() => setShowLogout(!showLogout)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all ${showLogout
                    ? 'bg-white border-indigo-200 shadow-md ring-2 ring-indigo-50'
                    : 'bg-slate-50 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                    }`}
                >
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${showLogout ? 'bg-indigo-600 shadow-inner' : 'bg-indigo-100'
                    }`}>
                    <span className={`text-[10px] font-bold ${showLogout ? 'text-white' : 'text-indigo-700'
                      }`}>
                      {user.email?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="hidden sm:flex flex-col text-left">
                    <span className="text-xs font-semibold text-slate-700 leading-tight">
                      {user.email?.split('@')[0]}
                    </span>
                    {role && (
                      <span className={`text-[9px] uppercase tracking-wider font-bold ${role === 'admin' ? 'text-rose-600' : 'text-indigo-600'
                        }`}>
                        {role}
                      </span>
                    )}
                  </div>
                  <svg className={`w-3 h-3 text-slate-400 transition-transform duration-200 ${showLogout ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Dropdown Menu */}
                {showLogout && (
                  <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 slide-in-from-top-2 duration-150 transform origin-top-right">
                    <div className="p-1">
                      {/* Mobile User Info */}
                      <div className="sm:hidden px-3 py-3 border-b border-slate-100 mb-1 bg-slate-50/50">
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-slate-800">
                            {user?.email?.split('@')[0]}
                          </span>
                          {role && (
                            <span className={`text-[9px] uppercase tracking-wider font-bold ${role === 'admin' ? 'text-rose-600' : 'text-indigo-600'}`}>
                              {role}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Language Toggle - Only visible in FORM view */}
                      {view === 'FORM' && (
                        <div className="px-3 pt-2 pb-3 border-b border-slate-100 mb-1">
                          <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-2">
                            Interview Language
                          </label>
                          <div className="flex bg-slate-100 p-0.5 rounded-lg">
                            <button
                              onClick={(e) => {
                                e.stopPropagation(); // Prevent closing dropdown
                                setLanguage('KO');
                              }}
                              className={`flex-1 py-1.5 rounded-md text-xs font-bold transition-all ${language === 'KO'
                                ? 'bg-white text-elleo-dark shadow-sm'
                                : 'text-slate-500 hover:text-slate-700'
                                }`}
                            >
                              한글
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation(); // Prevent closing dropdown
                                setLanguage('EN');
                              }}
                              className={`flex-1 py-1.5 rounded-md text-xs font-bold transition-all ${language === 'EN'
                                ? 'bg-white text-elleo-purple shadow-sm'
                                : 'text-slate-500 hover:text-slate-700'
                                }`}
                            >
                              ENG
                            </button>
                          </div>
                        </div>
                      )}

                      <button
                        onClick={signOut}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-rose-600 hover:bg-rose-50 text-xs font-bold rounded-lg transition-colors group"
                      >
                        <div className="w-7 h-7 bg-rose-100 rounded-md flex items-center justify-center group-hover:bg-rose-200 transition-colors">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                          </svg>
                        </div>
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons (New Interview) */}
              <div id="header-actions" className="flex items-center gap-3">
                {/* Portals will render here */}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-grow">
        {view === 'LIST' && (
          <InterviewList onNew={handleNewInterview} onEdit={handleEditInterview} />
        )}

        {view === 'FORM' && (
          <InterviewForm
            initialData={selectedRecord}
            stages={currentStages}
            interviewType={currentInterviewType}
            onSave={handleSaveComplete}
            onCancel={handleCancel}
          />
        )}
      </main>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <ModalProvider>
        <AppContent />
      </ModalProvider>
    </AuthProvider>
  );
};

export default App;