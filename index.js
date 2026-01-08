
import { GoogleGenAI, Type } from "@google/genai";
import * as docx from "docx";

// --- CONSTANTS ---
const KLevel = { K1: 'K1', K2: 'K2', K3: 'K3', K4: 'K4' };

const INITIAL_TEMPLATE_SLOTS = [
  { slotId: 'Q1', part: 'A', coReq: 'CO1', kReq: 'K2', marks: 2, isMCQ: false, label: '1.' },
  { slotId: 'Q2', part: 'A', coReq: 'CO1', kReq: 'K3', marks: 2, isMCQ: true, label: '2.' },
  { slotId: 'Q3', part: 'A', coReq: 'CO1', kReq: 'K1', marks: 2, isMCQ: false, label: '3.' },
  { slotId: 'Q4', part: 'A', coReq: 'CO2', kReq: 'K3', marks: 2, isMCQ: true, label: '4.' },
  { slotId: 'Q5', part: 'A', coReq: 'CO2', kReq: 'K2', marks: 2, isMCQ: false, label: '5.' },
  { slotId: 'Q6A1', part: 'B', coReq: 'CO1', kReq: 'K2', marks: 8, isMCQ: false, label: '6 (a)' },
  { slotId: 'Q6B1', part: 'B', coReq: 'CO1', kReq: 'K2', marks: 8, isMCQ: false, label: '6 (b)' },
  { slotId: 'Q7A1', part: 'C', coReq: 'CO1', kReq: 'K3', marks: 16, isMCQ: false, label: '7 (a)' },
  { slotId: 'Q7B1', part: 'C', coReq: 'CO1', kReq: 'K3', marks: 16, isMCQ: false, label: '7 (b)' },
  { slotId: 'Q8A1', part: 'C', coReq: 'CO2', kReq: 'K3', marks: 16, isMCQ: false, label: '8 (a)' },
  { slotId: 'Q8B1', part: 'C', coReq: 'CO2', kReq: 'K3', marks: 16, isMCQ: false, label: '8 (b)' },
];

// --- STATE ---
let bankMetadata = null;
let allQuestions = [];
let templateSlots = [...INITIAL_TEMPLATE_SLOTS];
let bankFile = null;
let templateFile = null;

// --- DOM ELEMENTS ---
const elements = {
    inputBank: document.getElementById('input-bank'),
    inputTemplate: document.getElementById('input-template'),
    nameBank: document.getElementById('name-bank'),
    nameTemplate: document.getElementById('name-template'),
    btnProcess: document.getElementById('btn-process'),
    btnDownload: document.getElementById('btn-download'),
    loader: document.getElementById('loader'),
    loaderMsg: document.getElementById('loader-msg'),
    errorContainer: document.getElementById('error-container'),
    errorMessage: document.getElementById('error-message'),
    previewSection: document.getElementById('preview-section'),
    emptyState: document.getElementById('empty-state'),
    courseHeader: document.getElementById('preview-course-header'),
    metaTags: document.getElementById('preview-meta-tags'),
    coList: document.getElementById('co-list'),
    examParts: document.getElementById('exam-parts')
};

// --- INITIALIZE ICONS ---
if (window.lucide) window.lucide.createIcons();

// --- HELPERS ---
const hideError = () => elements.errorContainer.classList.add('hidden');
const showError = (msg) => {
    elements.errorMessage.innerText = msg;
    elements.errorContainer.classList.remove('hidden');
};

const readFileAsBase64 = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};

// --- API ---
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const parseBank = async (base64, mimeType) => {
    const model = "gemini-3-pro-preview";
    const systemInstruction = `Extract academic exam metadata and questions from the archive. Return JSON ONLY. Identify CO index (e.g., CO1), K-Level (K1-K4), Marks, and MCQ status. For MCQs, extract 4 options (a,b,c,d).`;
    
    const response = await ai.models.generateContent({
        model,
        contents: [{ parts: [{ inlineData: { data: base64, mimeType } }, { text: "Extract data in the requested JSON structure." }] }],
        config: {
            systemInstruction,
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    metadata: {
                        type: Type.OBJECT,
                        properties: {
                            department: { type: Type.STRING },
                            courseCode: { type: Type.STRING },
                            courseName: { type: Type.STRING },
                            subjectIncharge: { type: Type.STRING },
                            semester: { type: Type.STRING },
                            year: { type: Type.STRING },
                            coStatements: {
                                type: Type.ARRAY,
                                items: {
                                    type: Type.OBJECT,
                                    properties: { index: { type: Type.STRING }, description: { type: Type.STRING } }
                                }
                            }
                        }
                    },
                    questions: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                text: { type: Type.STRING },
                                co: { type: Type.STRING },
                                kLevel: { type: Type.STRING },
                                marks: { type: Type.NUMBER },
                                isMCQ: { type: Type.BOOLEAN },
                                options: {
                                    type: Type.OBJECT,
                                    properties: { a: { type: Type.STRING }, b: { type: Type.STRING }, c: { type: Type.STRING }, d: { type: Type.STRING } }
                                }
                            }
                        }
                    }
                }
            }
        }
    });

    return JSON.parse(response.text);
};

// --- RENDERING ---
const renderPreview = () => {
    elements.previewSection.classList.remove('hidden');
    elements.emptyState.classList.add('hidden');
    
    // Header
    elements.courseHeader.innerText = `${bankMetadata.courseCode}: ${bankMetadata.courseName}`;
    elements.metaTags.innerHTML = `
        <span class="bg-white text-slate-600 text-xs font-bold px-3 py-1 rounded-lg border border-slate-200">Dept: ${bankMetadata.department}</span>
        <span class="bg-white text-slate-600 text-xs font-bold px-3 py-1 rounded-lg border border-slate-200">Sem: ${bankMetadata.semester}</span>
        <span class="bg-white text-slate-600 text-xs font-bold px-3 py-1 rounded-lg border border-slate-200">Lead: ${bankMetadata.subjectIncharge}</span>
    `;

    // CO List
    elements.coList.innerHTML = bankMetadata.coStatements.map(co => `
        <div class="p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <span class="text-blue-600 font-black text-xs block mb-1">${co.index}</span>
            <p class="text-xs text-slate-600 leading-relaxed font-medium line-clamp-2">${co.description}</p>
        </div>
    `).join('');

    // Parts
    const parts = ['A', 'B', 'C'];
    elements.examParts.innerHTML = parts.map(p => {
        const slots = templateSlots.filter(s => s.part === p);
        if (slots.length === 0) return '';
        
        return `
            <div>
                <div class="flex items-center gap-4 mb-8">
                    <div class="w-12 h-12 bg-slate-900 text-white flex items-center justify-center font-black text-xl rounded-2xl shadow-lg">${p}</div>
                    <div>
                        <h3 class="text-xl font-black text-slate-900">PART ${p}</h3>
                        <p class="text-xs font-bold text-slate-400 uppercase tracking-widest">
                            ${p === 'A' ? 'Knowledge Assessment • 2M each' : p === 'B' ? 'Application • 8M each' : 'Comprehensive Analysis • 16M each'}
                        </p>
                    </div>
                </div>
                <div class="grid grid-cols-1 gap-6">
                    ${slots.map(slot => `
                        <div class="group relative bg-white border-2 border-slate-50 rounded-3xl p-6 transition-all hover:border-blue-100 hover:bg-blue-50/10 shadow-sm">
                            <div class="flex justify-between items-start gap-6">
                                <div class="flex gap-6">
                                    <div class="flex flex-col items-center shrink-0">
                                        <span class="text-2xl font-black text-slate-300 group-hover:text-blue-200 transition-colors">${slot.label}</span>
                                        ${slot.isMCQ ? '<span class="text-[10px] font-black text-blue-500 bg-blue-50 px-1.5 rounded mt-1">MCQ</span>' : ''}
                                    </div>
                                    <div class="flex-1">
                                        <div class="flex flex-wrap items-center gap-3 mb-4">
                                            <span class="bg-slate-100 text-slate-500 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">${slot.coReq}</span>
                                            <span class="bg-slate-100 text-slate-500 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">${slot.kReq}</span>
                                            <span class="bg-slate-100 text-slate-500 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">${slot.marks}M</span>
                                        </div>
                                        <h4 class="text-lg font-bold text-slate-800 leading-snug">
                                            ${slot.question ? slot.question.text : '<span class="text-rose-400 italic">No exact match found in bank</span>'}
                                        </h4>
                                        ${slot.question?.options ? `
                                            <div class="grid grid-cols-2 gap-4 mt-4">
                                                ${Object.entries(slot.question.options).map(([k, v]) => `
                                                    <div class="text-sm bg-slate-50 p-2 rounded-lg border border-slate-100"><span class="font-bold text-blue-600">${k})</span> ${v}</div>
                                                `).join('')}
                                            </div>
                                        ` : ''}
                                    </div>
                                </div>
                                <button data-shuffle="${slot.slotId}" class="p-3 bg-slate-50 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-2xl transition-all">
                                    <i data-lucide="refresh-cw" class="w-5 h-5"></i>
                                </button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }).join('');

    if (window.lucide) window.lucide.createIcons();
    
    document.querySelectorAll('[data-shuffle]').forEach(btn => {
        btn.onclick = (e) => {
            const slotId = e.currentTarget.getAttribute('data-shuffle');
            if (slotId) shuffleSlot(slotId);
        };
    });
};

// --- LOGIC ---
const findQuestion = (slot, usedIds) => {
    return allQuestions.find(q => 
        !usedIds.has(q.id) &&
        q.co.toUpperCase() === slot.coReq &&
        q.kLevel === slot.kReq &&
        q.marks === slot.marks &&
        q.isMCQ === slot.isMCQ
    );
};

const shuffleSlot = (slotId) => {
    const slotIndex = templateSlots.findIndex(s => s.slotId === slotId);
    if (slotIndex === -1) return;
    
    const usedIds = new Set(templateSlots.map(s => s.question?.id).filter(Boolean));
    const currentQId = templateSlots[slotIndex].question?.id;
    if (currentQId) usedIds.delete(currentQId);

    const match = findQuestion(templateSlots[slotIndex], usedIds);
    if (match) {
        templateSlots[slotIndex].question = match;
        renderPreview();
    } else {
        showError("No other questions in the bank match these criteria.");
    }
};

const processFiles = async () => {
    if (!bankFile) return showError("Upload the archive first.");
    
    elements.loader.classList.remove('hidden');
    elements.btnProcess.disabled = true;

    try {
        const base64 = await readFileAsBase64(bankFile);
        const result = await parseBank(base64, bankFile.type);
        
        bankMetadata = result.metadata;
        allQuestions = result.questions.map((q, i) => ({ ...q, id: `q-${i}-${Date.now()}` }));
        
        const usedIds = new Set();
        templateSlots = INITIAL_TEMPLATE_SLOTS.map(slot => {
            const q = findQuestion(slot, usedIds);
            if (q) usedIds.add(q.id);
            return { ...slot, question: q };
        });

        renderPreview();
    } catch (err) {
        console.error(err);
        showError("Failed to parse archives. Check your file content and API limits.");
    } finally {
        elements.loader.classList.add('hidden');
        elements.btnProcess.disabled = false;
    }
};

const downloadPaper = async () => {
    const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, BorderStyle } = docx;
    
    const doc = new Document({
        sections: [{
            children: [
                new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "INTERNAL ASSESSMENT TEST", bold: true, size: 28 })] }),
                new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: bankMetadata.department.toUpperCase(), bold: true, size: 24 })] }),
                new Paragraph({ spacing: { after: 200 } }),
                new Paragraph({ children: [new TextRun({ text: `Course: ${bankMetadata.courseCode} - ${bankMetadata.courseName}`, bold: true })] }),
                new Paragraph({ children: [new TextRun({ text: `Outcome: ${bankMetadata.coStatements.map(c => c.index).join(', ')}` })] }),
                new Paragraph({ spacing: { after: 400 } }),
                
                ...templateSlots.map(s => {
                    const children = [new Paragraph({ children: [new TextRun({ text: `${s.label} ${s.question?.text || '[Missing]'}`, bold: false })] })];
                    if (s.question?.options) {
                        children.push(new Paragraph({ children: [new TextRun({ text: `a) ${s.question.options.a}    b) ${s.question.options.b}` })] }));
                        children.push(new Paragraph({ children: [new TextRun({ text: `c) ${s.question.options.c}    d) ${s.question.options.d}` })] }));
                    }
                    return new Table({
                        width: { size: 100, type: WidthType.PERCENTAGE },
                        borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
                        rows: [new TableRow({ children: [new TableCell({ children })] })]
                    });
                })
            ]
        }]
    });

    const blob = await Packer.toBlob(doc);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${bankMetadata.courseCode}_Internal_Assessment.docx`;
    a.click();
};

// --- EVENTS ---
elements.inputBank.onchange = (e) => {
    if (e.target.files && e.target.files[0]) {
        bankFile = e.target.files[0];
        elements.nameBank.innerText = bankFile.name;
        hideError();
    }
};
elements.inputTemplate.onchange = (e) => {
    if (e.target.files && e.target.files[0]) {
        templateFile = e.target.files[0];
        elements.nameTemplate.innerText = templateFile.name;
        hideError();
    }
};
elements.btnProcess.onclick = processFiles;
elements.btnDownload.onclick = downloadPaper;

window.hideError = hideError;
