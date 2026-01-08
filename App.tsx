
import React, { useState, useEffect } from 'react';
import { FileUp, Download, RefreshCw, AlertCircle, ChevronRight, BookOpen, Loader2, Sparkles, CheckCircle, X } from 'lucide-react';
import { AppState, Question, TemplateSlot, KLevel } from './types';
import { parseQuestionBank } from './services/geminiService';
import { generateExamDoc } from './services/docxGenerator';
import { INITIAL_TEMPLATE_SLOTS } from './constants';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    isProcessing: false,
    error: null,
    bankMetadata: null,
    allQuestions: [],
    templateSlots: INITIAL_TEMPLATE_SLOTS,
  });

  const [files, setFiles] = useState<{ bank?: File; template?: File }>({});
  const [loadingMessage, setLoadingMessage] = useState("");

  const loadingMessages = [
    "Analyzing your AQA Question Bank...",
    "Extracting Course Outcomes and Knowledge Levels...",
    "Mapping questions to your institutional template...",
    "Almost there! Preparing your exam preview...",
    "Ensuring all COs and BTL levels match perfectly..."
  ];

  useEffect(() => {
    let interval: any;
    if (state.isProcessing) {
      let i = 0;
      setLoadingMessage(loadingMessages[0]);
      interval = setInterval(() => {
        i = (i + 1) % loadingMessages.length;
        setLoadingMessage(loadingMessages[i]);
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [state.isProcessing]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'bank' | 'template') => {
    if (e.target.files && e.target.files[0]) {
      setFiles(prev => ({ ...prev, [type]: e.target.files![0] }));
      setState(prev => ({ ...prev, error: null }));
    }
  };

  const readFileAsBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]);
      };
      reader.onerror = () => reject(new Error("Failed to read the file. It might be corrupted or in use."));
      reader.readAsDataURL(file);
    });
  };

  const findBestQuestion = (allQuestions: Question[], slot: TemplateSlot, usedIds: Set<string>): Question | undefined => {
    return allQuestions.find(q => 
      !usedIds.has(q.id) &&
      q.co.trim().toUpperCase() === slot.coReq.trim().toUpperCase() &&
      q.kLevel === slot.kReq &&
      q.marks === slot.marks &&
      q.isMCQ === slot.isMCQ
    );
  };

  const processFiles = async () => {
    if (!files.bank) {
      setState(prev => ({ ...prev, error: "Please upload the Question Bank file first." }));
      return;
    }

    setState(prev => ({ ...prev, isProcessing: true, error: null }));

    try {
      const base64 = await readFileAsBase64(files.bank);
      const result = await parseQuestionBank(base64, files.bank.type);
      
      const usedIds = new Set<string>();
      const initialSlots = INITIAL_TEMPLATE_SLOTS.map(slot => {
        const match = findBestQuestion(result.questions, slot, usedIds);
        if (match) usedIds.add(match.id);
        return { ...slot, question: match };
      });

      setState(prev => ({
        ...prev,
        isProcessing: false,
        bankMetadata: result.metadata,
        allQuestions: result.questions,
        templateSlots: initialSlots,
        error: null
      }));
    } catch (err: any) {
      console.error("Processing Error:", err);
      setState(prev => ({ 
        ...prev, 
        isProcessing: false, 
        error: err.message || "Failed to process files. Ensure the document is readable and try again." 
      }));
    }
  };

  const shuffleQuestion = (slotId: string) => {
    setState(prev => {
      const usedIds = new Set(prev.templateSlots.map(s => s.question?.id).filter(Boolean) as string[]);
      const currentSlot = prev.templateSlots.find(s => s.slotId === slotId);
      if (!currentSlot) return prev;

      const currentQuestionId = currentSlot.question?.id;
      if (currentQuestionId) usedIds.delete(currentQuestionId);

      const alternatives = prev.allQuestions.filter(q => 
        !usedIds.has(q.id) &&
        q.id !== currentQuestionId &&
        q.co.trim().toUpperCase() === currentSlot.coReq.trim().toUpperCase() &&
        q.kLevel === currentSlot.kReq &&
        q.marks === currentSlot.marks &&
        q.isMCQ === currentSlot.isMCQ
      );

      if (alternatives.length === 0) {
        return { ...prev, error: `No alternative questions found matching criteria: ${currentSlot.coReq}, ${currentSlot.kReq}, ${currentSlot.marks}M` };
      }

      const newQuestion = alternatives[Math.floor(Math.random() * alternatives.length)];

      return {
        ...prev,
        error: null,
        templateSlots: prev.templateSlots.map(s => s.slotId === slotId ? { ...s, question: newQuestion } : s)
      };
    });
  };

  const downloadPaper = async () => {
    if (!state.bankMetadata) return;
    try {
      const blob = await generateExamDoc(state.bankMetadata, state.templateSlots);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${state.bankMetadata.courseCode}_Internal_Assessment.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      setState(prev => ({ ...prev, error: "Failed to generate document. Please check your data and try again." }));
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      {/* Header */}
      <header className="mb-12 text-center">
        <div className="inline-flex items-center justify-center p-3 bg-blue-50 rounded-2xl mb-4">
          <BookOpen className="w-8 h-8 text-blue-600" />
        </div>
        <h1 className="text-5xl font-black text-slate-900 mb-4 tracking-tight">
          AQA Assessment <span className="text-blue-600">Automator</span>
        </h1>
        <p className="text-lg text-slate-500 max-w-2xl mx-auto">
          Intelligent exam paper generation from archive banks. Validates CO, BTL level, and Marks before final export.
        </p>
      </header>

      {/* Upload Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
        <div className="lg:col-span-2 bg-white rounded-3xl shadow-sm border border-slate-100 p-8">
          <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
            <FileUp className="w-5 h-5 text-blue-500" />
            Upload Sources
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Question Bank (PDF/DOCX/IMG)</label>
              <div className={`relative border-2 border-dashed rounded-2xl p-8 transition-all flex flex-col items-center justify-center gap-3 group ${files.bank ? 'border-green-400 bg-green-50/50' : 'border-slate-200 hover:border-blue-400 hover:bg-blue-50/30'}`}>
                <FileUp className={`w-12 h-12 transition-transform group-hover:-translate-y-1 ${files.bank ? 'text-green-500' : 'text-slate-300'}`} />
                <input type="file" onChange={(e) => handleFileUpload(e, 'bank')} className="absolute inset-0 opacity-0 cursor-pointer" accept=".pdf,.docx,.doc,image/*" />
                <div className="text-center">
                  <p className="text-sm font-semibold text-slate-700">{files.bank ? files.bank.name : 'Select Archive File'}</p>
                  <p className="text-xs text-slate-400 mt-1">Upload the full AQA Question bank</p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Paper Template (PDF/DOCX/IMG)</label>
              <div className={`relative border-2 border-dashed rounded-2xl p-8 transition-all flex flex-col items-center justify-center gap-3 group ${files.template ? 'border-green-400 bg-green-50/50' : 'border-slate-200 hover:border-blue-400 hover:bg-blue-50/30'}`}>
                <FileUp className={`w-12 h-12 transition-transform group-hover:-translate-y-1 ${files.template ? 'text-green-500' : 'text-slate-300'}`} />
                <input type="file" onChange={(e) => handleFileUpload(e, 'template')} className="absolute inset-0 opacity-0 cursor-pointer" accept=".pdf,.docx,.doc,image/*" />
                <div className="text-center">
                  <p className="text-sm font-semibold text-slate-700">{files.template ? files.template.name : 'Select Template'}</p>
                  <p className="text-xs text-slate-400 mt-1">Institutional standard layout file</p>
                </div>
              </div>
            </div>
          </div>

          <button 
            onClick={processFiles}
            disabled={state.isProcessing || !files.bank}
            className="mt-8 w-full bg-slate-900 hover:bg-blue-600 text-white font-bold py-4 rounded-2xl shadow-xl transition-all disabled:opacity-50 flex items-center justify-center gap-3"
          >
            {state.isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
            {state.isProcessing ? 'Generating Assessment...' : 'Generate Exam Paper'}
          </button>
        </div>

        <div className="bg-slate-900 text-white rounded-3xl p-8 shadow-xl">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-blue-400" />
            System Rules
          </h3>
          <ul className="space-y-4 text-sm text-slate-300">
            <li className="flex gap-3">
              <span className="w-5 h-5 rounded-full bg-blue-900/50 flex items-center justify-center text-[10px] shrink-0">1</span>
              <span>Questions are mapped strictly by <b>CO (Course Outcome)</b> requirements.</span>
            </li>
            <li className="flex gap-3">
              <span className="w-5 h-5 rounded-full bg-blue-900/50 flex items-center justify-center text-[10px] shrink-0">2</span>
              <span>BTL Levels (K1-K4) are matched to ensure standard rigor.</span>
            </li>
            <li className="flex gap-3">
              <span className="w-5 h-5 rounded-full bg-blue-900/50 flex items-center justify-center text-[10px] shrink-0">3</span>
              <span>MCQ slots are populated with detected multiple-choice questions only.</span>
            </li>
            <li className="flex gap-3">
              <span className="w-5 h-5 rounded-full bg-blue-900/50 flex items-center justify-center text-[10px] shrink-0">4</span>
              <span>You can shuffle any individual question if the first selection isn't ideal.</span>
            </li>
          </ul>
        </div>
      </div>

      {state.isProcessing && (
        <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-4">
          <div className="bg-white p-12 rounded-3xl shadow-2xl text-center max-w-md border border-slate-100 animate-in zoom-in-95 duration-300">
            <Loader2 className="w-16 h-16 text-blue-600 animate-spin mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Processing Assessment</h2>
            <p className="text-slate-500 animate-pulse">{loadingMessage}</p>
          </div>
        </div>
      )}

      {state.error && (
        <div className="mb-8 bg-rose-50 border border-rose-200 p-4 rounded-2xl flex items-start justify-between gap-3 animate-in slide-in-from-top-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="text-rose-500 w-6 h-6 shrink-0 mt-0.5" />
            <div>
              <p className="text-rose-800 font-bold mb-0.5">Analysis Failed</p>
              <p className="text-rose-700 text-sm leading-relaxed">{state.error}</p>
            </div>
          </div>
          <button onClick={() => setState(prev => ({ ...prev, error: null }))} className="p-1 hover:bg-rose-100 rounded-lg transition-colors text-rose-400">
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Preview Section */}
      {state.bankMetadata && (
        <section className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-700">
          <div className="bg-slate-50 p-8 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="bg-blue-600 text-white text-[10px] font-black uppercase px-2 py-0.5 rounded shadow-sm">Live Preview</span>
                <h2 className="text-3xl font-black text-slate-900 tracking-tight">{state.bankMetadata.courseCode}: {state.bankMetadata.courseName}</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="bg-white text-slate-600 text-xs font-bold px-3 py-1 rounded-lg border border-slate-200">Dept: {state.bankMetadata.department}</span>
                <span className="bg-white text-slate-600 text-xs font-bold px-3 py-1 rounded-lg border border-slate-200">Sem: {state.bankMetadata.semester}</span>
                <span className="bg-white text-slate-600 text-xs font-bold px-3 py-1 rounded-lg border border-slate-200">Expert: {state.bankMetadata.subjectExpert}</span>
              </div>
            </div>
            <button 
              onClick={downloadPaper}
              className="bg-green-600 hover:bg-green-700 text-white px-8 py-4 rounded-2xl font-black flex items-center gap-3 shadow-lg transition-all hover:scale-105 active:scale-95 shrink-0"
            >
              <Download className="w-5 h-5" />
              DOWNLOAD FILLED TEMPLATE
            </button>
          </div>

          <div className="p-8">
             {/* CO Table Preview */}
             <div className="mb-12">
               <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Course Outcomes</h3>
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                 {state.bankMetadata.coStatements.map((co, i) => (
                   <div key={i} className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                     <span className="text-blue-600 font-black text-xs block mb-1">{co.index}</span>
                     <p className="text-xs text-slate-600 leading-relaxed font-medium line-clamp-2">{co.description}</p>
                   </div>
                 ))}
               </div>
             </div>

            <div className="space-y-16">
              {['A', 'B', 'C'].map(part => (
                <div key={part}>
                  <div className="flex items-center gap-4 mb-8">
                    <div className="w-12 h-12 bg-slate-900 text-white flex items-center justify-center font-black text-xl rounded-2xl shadow-lg">
                      {part}
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-slate-900">
                        PART {part}
                      </h3>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                        {part === 'A' ? 'Conceptual understanding • 5 x 2 = 10 Marks' : part === 'B' ? 'Application & Analysis • 1 x 8 = 8 Marks' : 'Deep Synthesis • 2 x 16 = 32 Marks'}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-6">
                    {state.templateSlots.filter(s => s.part === part).map(slot => (
                      <div key={slot.slotId} className="group relative bg-white border-2 border-slate-50 rounded-3xl p-6 transition-all hover:border-blue-100 hover:bg-blue-50/10 shadow-sm hover:shadow-md">
                        <div className="flex justify-between items-start gap-6">
                          <div className="flex gap-6">
                            <div className="flex flex-col items-center shrink-0">
                               <span className="text-2xl font-black text-slate-300 group-hover:text-blue-200 transition-colors">{slot.label.split(' ')[0]}</span>
                               {slot.isMCQ && <span className="text-[10px] font-black text-blue-500 bg-blue-50 px-1.5 rounded mt-1">MCQ</span>}
                            </div>
                            <div>
                              <div className="flex flex-wrap items-center gap-3 mb-4">
                                <span className="bg-slate-100 text-slate-500 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">{slot.coReq}</span>
                                <span className="bg-slate-100 text-slate-500 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">{slot.kReq}</span>
                                <span className="bg-slate-100 text-slate-500 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">{slot.marks}M</span>
                              </div>
                              <h4 className="text-lg font-bold text-slate-800 leading-snug">
                                {slot.question ? slot.question.text : (
                                  <div className="flex items-center gap-2 text-rose-500 italic">
                                    <AlertCircle className="w-4 h-4" />
                                    No suitable match found in bank
                                  </div>
                                )}
                              </h4>
                              
                              {slot.question?.isMCQ && slot.question.options && (
                                <div className="grid grid-cols-2 gap-4 mt-6">
                                  {Object.entries(slot.question.options).map(([key, val]) => (
                                    <div key={key} className="flex gap-3 text-sm text-slate-600 bg-white p-3 rounded-xl border border-slate-100">
                                      <span className="font-black text-blue-600">{key})</span>
                                      <span>{val}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                          <button 
                            onClick={() => shuffleQuestion(slot.slotId)}
                            className="p-3 bg-slate-50 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-2xl transition-all active:rotate-180 duration-500"
                            title="Replace with another match"
                          >
                            <RefreshCw className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Empty State */}
      {!state.bankMetadata && !state.isProcessing && (
        <div className="text-center py-32 bg-white rounded-[3rem] border-2 border-dashed border-slate-100 flex flex-col items-center justify-center">
          <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6">
             <Sparkles className="w-10 h-10 text-slate-200" />
          </div>
          <h3 className="text-2xl font-bold text-slate-300">Awaiting Assessment Data</h3>
          <p className="text-slate-400 max-w-sm mt-2 font-medium">Upload your archive to see how questions fit within your institutional template structure.</p>
        </div>
      )}
    </div>
  );
};

export default App;
