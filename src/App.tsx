import React, { useState, useRef, useCallback } from 'react'
import {
  FileText, Upload, Zap, ChevronLeft, ChevronRight, Download,
  Trash2, AlertCircle, CheckCircle2, Loader2, FileSearch,
  Sun, Moon, Sparkles, RotateCcw, FilePlus2, Eye, X,
} from 'lucide-react'
import axios from 'axios'
import { ResumeFile, Author } from './types'
import { ResumeTemplate } from './components/ResumeTemplate'

function uid() {
  return Math.random().toString(36).slice(2, 9)
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: ResumeFile['status'] }) {
  const map = {
    pending:    'bg-slate-500/20 text-slate-400',
    processing: 'bg-amber-400/20 text-amber-400',
    done:       'bg-emerald-400/20 text-emerald-400',
    error:      'bg-red-400/20 text-red-400',
  }
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-semibold ${map[status]}`}>
      {status === 'processing' && <Loader2 className="w-2.5 h-2.5 animate-spin" />}
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}

function ThemeToggle({ dark, onToggle }: { dark: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      aria-label="Toggle theme"
      className={`relative flex items-center w-[52px] h-7 rounded-full p-0.5 transition-colors duration-300 focus:outline-none ${
        dark ? 'bg-indigo-600/40 border border-indigo-500/30' : 'bg-slate-200 border border-slate-300'
      }`}
    >
      <span
        className={`w-6 h-6 rounded-full flex items-center justify-center shadow transition-all duration-300 ${
          dark
            ? 'translate-x-[24px] bg-indigo-500'
            : 'translate-x-0 bg-white'
        }`}
      >
        {dark
          ? <Moon className="w-3.5 h-3.5 text-white" />
          : <Sun className="w-3.5 h-3.5 text-amber-500" />
        }
      </span>
    </button>
  )
}

interface DropZoneProps {
  dark: boolean
  dragOver: boolean
  onDragOver: (e: React.DragEvent) => void
  onDragLeave: () => void
  onDrop: (e: React.DragEvent) => void
  onClick: () => void
  icon: React.ElementType
  heading: React.ReactNode
  hint: string
  primary?: boolean
}

function DropZone({ dark, dragOver, onDragOver, onDragLeave, onDrop, onClick, icon: Icon, heading, hint, primary }: DropZoneProps) {
  const idle = dark
    ? 'border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]'
    : 'border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white'
  const active = dark ? 'border-red-500/50 bg-red-500/5' : 'border-red-400/50 bg-red-50'

  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={onClick}
      className={`relative cursor-pointer rounded-2xl border-2 border-dashed p-5 text-center transition-all duration-200 group ${dragOver ? active : idle}`}
    >
      {primary && !dragOver && (
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-red-600/5 via-transparent to-transparent pointer-events-none" />
      )}
      <div className={`w-10 h-10 rounded-xl mx-auto mb-3 flex items-center justify-center transition-transform duration-200 group-hover:scale-105 ${
        primary
          ? 'bg-gradient-to-br from-red-600 to-red-500 shadow-lg shadow-red-900/30'
          : dark ? 'bg-white/5' : 'bg-slate-100'
      }`}>
        <Icon className={`w-5 h-5 ${primary ? 'text-white' : dark ? 'text-slate-400' : 'text-slate-500'}`} />
      </div>
      <p className={`text-sm font-semibold leading-snug mb-1 ${dark ? 'text-slate-200' : 'text-slate-700'}`}>{heading}</p>
      <p className={`text-[11px] leading-snug ${dark ? 'text-slate-500' : 'text-slate-400'}`}>{hint}</p>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// App
// ─────────────────────────────────────────────────────────────────────────────

export default function App() {
  const [dark, setDark] = useState(true)
  const [jdFile, setJdFile] = useState<File | null>(null)
  const [resumeFiles, setResumeFiles] = useState<ResumeFile[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  const [jdDrag, setJdDrag] = useState(false)
  const [resumeDrag, setResumeDrag] = useState(false)

  const jdRef = useRef<HTMLInputElement>(null)
  const resumeRef = useRef<HTMLInputElement>(null)
  const previewRef = useRef<HTMLDivElement>(null)

  const selected = resumeFiles.find(r => r.id === selectedId)
  const done = resumeFiles.filter(r => r.status === 'done')
  const pendingCount = resumeFiles.filter(r => r.status === 'pending' || r.status === 'error').length
  const selectedDoneIdx = done.findIndex(r => r.id === selectedId)

  // ── drag handlers ──
  const handleJdDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setJdDrag(false)
    const f = e.dataTransfer.files[0]
    if (f) setJdFile(f)
  }, [])

  const handleResumeDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setResumeDrag(false)
    addFiles(Array.from(e.dataTransfer.files))
  }, [])

  function addFiles(files: File[]) {
    setResumeFiles(prev => [
      ...prev,
      ...files.map(f => ({ id: uid(), file: f, name: f.name, status: 'pending' as const })),
    ])
  }

  // ── process ──
  async function processAll() {
    const queue = resumeFiles.filter(r => r.status === 'pending' || r.status === 'error')
    if (!queue.length) return
    setProcessing(true)
    for (const rf of queue) {
      setResumeFiles(prev => prev.map(r => r.id === rf.id ? { ...r, status: 'processing' } : r))
      setSelectedId(rf.id)
      try {
        const fd = new FormData()
        fd.append('resume', rf.file)
        if (jdFile) fd.append('jd', jdFile)
        const { data } = await axios.post<Author>('/api/parse-resume', fd)
        setResumeFiles(prev => prev.map(r => r.id === rf.id ? { ...r, status: 'done', result: data } : r))
        setSelectedId(rf.id)
      } catch (err: any) {
        const msg = err?.response?.data?.detail || err.message || 'Processing failed'
        setResumeFiles(prev => prev.map(r => r.id === rf.id ? { ...r, status: 'error', error: msg } : r))
      }
    }
    setProcessing(false)
  }

  function remove(id: string) {
    setResumeFiles(prev => prev.filter(r => r.id !== id))
    if (selectedId === id) {
      const rem = resumeFiles.filter(r => r.id !== id && r.status === 'done')
      setSelectedId(rem.length ? rem[0].id : null)
    }
  }

  function reset() {
    setResumeFiles([]); setJdFile(null); setSelectedId(null)
  }

  async function exportPdf() {
    const el = previewRef.current?.querySelector('#resume-document-template') as HTMLElement
    if (!el) return

    // Open a blank window — we'll render the resume there using the browser's
    // own layout engine so it looks pixel-perfect, identical to the preview.
    const win = window.open('', '_blank')
    if (!win) {
      alert('Please allow pop-ups for this site, then click Export PDF again.')
      return
    }

    // Collect ALL CSS rules that are live on this page (Tailwind, custom, etc.)
    // This includes Vite-injected style sheets that have no <link> tag.
    let allCSS = ''
    Array.from(document.styleSheets).forEach(sheet => {
      try {
        allCSS += Array.from(sheet.cssRules).map(r => r.cssText).join('\n')
      } catch {
        // Cross-origin sheet — skip silently
      }
    })

    const name = selected?.result?.name ?? 'Resume'

    win.document.write(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${name}</title>
  <style>${allCSS}</style>
  <style>
    /* Print-specific overrides */
    @page { size: A4 portrait; margin: 0; }
    html, body {
      margin: 0; padding: 0;
      background: white;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    /* Page-break hints for multi-page resumes */
    .html2pdf__page-break-avoid { break-inside: avoid; page-break-inside: avoid; }
  </style>
</head>
<body>${el.outerHTML}</body>
</html>`)
    win.document.close()

    // Print once everything (fonts, images) has loaded
    let printed = false
    const doPrint = () => {
      if (printed) return
      printed = true
      win.focus()
      win.print()
    }
    win.addEventListener('load', () => setTimeout(doPrint, 400))
    // Safety fallback in case 'load' already fired
    setTimeout(doPrint, 1800)
  }

  // ── theme tokens ──
  const D = dark
  const bg      = D ? 'bg-[#0b0b14]'                         : 'bg-slate-100'
  const sidebar  = D ? 'bg-[#10101e] border-white/[0.06]'    : 'bg-white border-slate-200'
  const hdr     = D ? 'bg-[#0b0b14]/80 border-white/[0.06]' : 'bg-white/80 border-slate-200'
  const preview  = D ? 'bg-[#0b0b14]'                        : 'bg-slate-200/60'
  const navBar   = D ? 'bg-[#10101e] border-white/[0.06]'   : 'bg-white border-slate-200'
  const sep      = D ? 'border-white/[0.06]'                 : 'border-slate-200'
  const txt      = D ? 'text-slate-100'                      : 'text-slate-900'
  const txtM     = D ? 'text-slate-400'                      : 'text-slate-500'
  const txtS     = D ? 'text-slate-500'                      : 'text-slate-400'
  const card     = D ? 'bg-white/[0.03] border-white/[0.08]' : 'bg-slate-50 border-slate-200'
  const cardSel  = D ? 'bg-red-500/10 border-red-500/30'     : 'bg-red-50 border-red-300/50'
  const cardHov  = D ? 'hover:bg-white/[0.05] hover:border-white/[0.14]' : 'hover:bg-white hover:border-slate-300'
  const iconBg   = D ? 'bg-white/[0.06]'                     : 'bg-slate-100'
  const emptyBox = D ? 'border-white/[0.06] bg-white/[0.02]' : 'border-slate-200 bg-slate-50'

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-300 ${bg}`}>

      {/* ── HEADER ────────────────────────────────────────────────────────── */}
      <header className={`sticky top-0 z-50 border-b backdrop-blur-xl transition-colors duration-300 ${hdr}`}>
        {/* subtle gradient glow */}
        <div className="absolute inset-0 bg-gradient-to-r from-red-600/5 via-transparent to-violet-600/5 pointer-events-none" />
        <div className="relative max-w-screen-2xl mx-auto px-5 h-16 flex items-center justify-between">

          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-600 to-red-500 flex items-center justify-center shadow-lg shadow-red-900/40 shrink-0">
              <FileText className="w-4.5 h-4.5 text-white" style={{ width: 18, height: 18 }} />
            </div>
            <div className="leading-none">
              <div className={`font-bold text-[15px] tracking-tight ${txt}`}>ResumeForge</div>
              <div className={`text-[10px] font-medium ${txtS}`}>AI-Powered Resume Builder</div>
            </div>
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-2.5">
            {/* file stats */}
            {resumeFiles.length > 0 && (
              <div className="hidden sm:flex items-center gap-2">
                <span className={`text-[11px] px-2.5 py-1 rounded-full border font-medium ${card} ${txtM}`}>
                  {resumeFiles.length} file{resumeFiles.length !== 1 ? 's' : ''}
                </span>
                {done.length > 0 && (
                  <span className="text-[11px] px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-medium">
                    {done.length} done
                  </span>
                )}
              </div>
            )}

            {/* OpenRouter badge */}
            <div className={`hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border font-semibold text-[10px] ${
              D ? 'bg-violet-500/10 border-violet-500/20 text-violet-400' : 'bg-violet-50 border-violet-200 text-violet-600'
            }`}>
              <Sparkles className="w-3 h-3" />
              OpenRouter · GPT-4o
            </div>

            {/* Export PDF */}
            {selected?.status === 'done' && (
              <button
                onClick={exportPdf}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-red-600 to-red-500 text-white text-xs font-bold shadow-md shadow-red-900/30 hover:opacity-90 active:scale-95 transition-all"
              >
                <Download className="w-3.5 h-3.5" />
                Export PDF
              </button>
            )}

            <ThemeToggle dark={D} onToggle={() => setDark(d => !d)} />
          </div>
        </div>
      </header>

      <div className="flex flex-1 max-w-screen-2xl mx-auto w-full overflow-hidden" style={{ height: 'calc(100vh - 64px)' }}>

        {/* ── SIDEBAR ───────────────────────────────────────────────────────── */}
        <aside className={`w-[360px] shrink-0 border-r flex flex-col transition-colors duration-300 overflow-hidden ${sidebar}`}>
          <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-5">

            {/* ── JD section ── */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${iconBg}`}>
                    <FileSearch className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                  <span className={`text-sm font-bold ${txt}`}>Job Description</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${D ? 'bg-white/[0.06] text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
                    Optional
                  </span>
                </div>
                {jdFile && (
                  <button onClick={() => setJdFile(null)} className={`p-1 rounded-lg transition-colors ${txtM} hover:text-red-400 hover:bg-red-500/10`}>
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {jdFile ? (
                <div className={`flex items-center gap-3 p-3 rounded-xl border ${D ? 'bg-emerald-900/20 border-emerald-700/30' : 'bg-emerald-50 border-emerald-200'}`}>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${D ? 'bg-emerald-800/40' : 'bg-emerald-100'}`}>
                    <FileText className="w-4 h-4 text-emerald-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className={`text-xs font-semibold truncate ${D ? 'text-emerald-300' : 'text-emerald-700'}`}>{jdFile.name}</div>
                    <div className={`text-[10px] mt-0.5 ${D ? 'text-emerald-600' : 'text-emerald-500'}`}>{(jdFile.size / 1024).toFixed(1)} KB · JD loaded</div>
                  </div>
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                </div>
              ) : (
                <>
                  <DropZone
                    dark={D} dragOver={jdDrag}
                    onDragOver={e => { e.preventDefault(); setJdDrag(true) }}
                    onDragLeave={() => setJdDrag(false)}
                    onDrop={handleJdDrop}
                    onClick={() => jdRef.current?.click()}
                    icon={FileSearch}
                    heading={<>Drop JD or <span className="text-red-400">browse</span></>}
                    hint="PDF, DOC, DOCX — tailors resume to match the role"
                  />
                  <input ref={jdRef} type="file" className="hidden" accept=".pdf,.doc,.docx,.txt"
                    onChange={e => { if (e.target.files?.[0]) setJdFile(e.target.files[0]); e.target.value = '' }} />
                </>
              )}
            </div>

            {/* divider */}
            <div className={`border-t ${sep}`} />

            {/* ── Resume upload ── */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-red-500/20 flex items-center justify-center">
                    <FilePlus2 className="w-3.5 h-3.5 text-red-400" />
                  </div>
                  <span className={`text-sm font-bold ${txt}`}>Resumes</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400 font-semibold">Required</span>
                </div>
                {resumeFiles.length > 0 && (
                  <button onClick={reset} className={`flex items-center gap-1 text-[11px] font-medium transition-colors ${txtS} hover:text-red-400`}>
                    <RotateCcw className="w-3 h-3" /> Reset all
                  </button>
                )}
              </div>

              <DropZone
                dark={D} dragOver={resumeDrag}
                onDragOver={e => { e.preventDefault(); setResumeDrag(true) }}
                onDragLeave={() => setResumeDrag(false)}
                onDrop={handleResumeDrop}
                onClick={() => resumeRef.current?.click()}
                icon={Upload}
                heading={<>Drop files or <span className="text-red-400">browse</span></>}
                hint="Multiple resumes — PDF, DOC, DOCX supported"
                primary
              />
              <input ref={resumeRef} type="file" className="hidden" accept=".pdf,.doc,.docx,.txt" multiple
                onChange={e => { if (e.target.files) addFiles(Array.from(e.target.files)); e.target.value = '' }} />
            </div>

            {/* ── File list ── */}
            {resumeFiles.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <div className={`flex items-center justify-between mb-1`}>
                  <span className={`text-[10px] font-bold uppercase tracking-widest ${txtS}`}>Files</span>
                  <span className={`text-[10px] font-semibold tabular-nums ${txtS}`}>{resumeFiles.length}</span>
                </div>

                {resumeFiles.map(rf => {
                  const isSel = selectedId === rf.id && rf.status === 'done'
                  return (
                    <div
                      key={rf.id}
                      onClick={() => rf.status === 'done' && setSelectedId(rf.id)}
                      className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all duration-150 ${
                        isSel ? cardSel : `${card} ${cardHov} border`
                      } ${rf.status === 'done' ? 'cursor-pointer' : 'cursor-default'}`}
                    >
                      {/* left accent bar */}
                      {isSel && (
                        <div className="absolute left-0 top-3 bottom-3 w-0.5 rounded-full bg-red-500" />
                      )}

                      {/* icon */}
                      <div className={`w-8 h-8 rounded-lg shrink-0 flex items-center justify-center ${
                        rf.status === 'done'      ? 'bg-emerald-500/10' :
                        rf.status === 'processing'? 'bg-amber-400/10'   :
                        rf.status === 'error'     ? 'bg-red-500/10'     :
                        iconBg
                      }`}>
                        {rf.status === 'pending'    && <FileText className={`w-4 h-4 ${txtM}`} />}
                        {rf.status === 'processing' && <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />}
                        {rf.status === 'done'       && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                        {rf.status === 'error'      && <AlertCircle className="w-4 h-4 text-red-400" />}
                      </div>

                      {/* text */}
                      <div className="flex-1 min-w-0">
                        <div className={`text-xs font-semibold truncate leading-snug ${txt}`}>{rf.name}</div>
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          <StatusBadge status={rf.status} />
                          {rf.status === 'done' && rf.result?.name && (
                            <span className={`text-[10px] truncate max-w-[100px] ${txtS}`}>{rf.result.name}</span>
                          )}
                          {rf.status === 'error' && (
                            <span className="text-[10px] text-red-400 truncate max-w-[140px]">{rf.error}</span>
                          )}
                        </div>
                      </div>

                      {/* actions */}
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        {rf.status === 'done' && (
                          <button
                            onClick={e => { e.stopPropagation(); setSelectedId(rf.id) }}
                            className={`p-1.5 rounded-lg transition-colors ${iconBg} ${txtM} hover:text-white`}
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={e => { e.stopPropagation(); remove(rf.id) }}
                          className="p-1.5 rounded-lg transition-colors hover:bg-red-500/10 text-red-400"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* ── Process button ── */}
            {resumeFiles.length > 0 && (
              <button
                onClick={processAll}
                disabled={processing || pendingCount === 0}
                className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all duration-200 select-none ${
                  processing || pendingCount === 0
                    ? `${D ? 'bg-white/[0.04] text-slate-500' : 'bg-slate-100 text-slate-400'} cursor-not-allowed`
                    : 'bg-gradient-to-r from-red-600 to-red-500 text-white shadow-lg shadow-red-900/25 hover:from-red-700 hover:to-red-600 active:scale-[0.98]'
                }`}
              >
                {processing ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing…</>
                ) : pendingCount === 0 ? (
                  <><CheckCircle2 className="w-4 h-4" /> All Processed</>
                ) : (
                  <><Zap className="w-4 h-4" /> Process {pendingCount} Resume{pendingCount !== 1 ? 's' : ''}</>
                )}
              </button>
            )}

            {/* ── Empty hint ── */}
            {resumeFiles.length === 0 && (
              <div className={`rounded-xl border p-4 text-center ${emptyBox}`}>
                <p className={`text-[11px] leading-relaxed ${txtS}`}>
                  Upload one or more resumes above.<br />
                  Add a JD to tailor the output to a specific role.
                </p>
              </div>
            )}

          </div>
        </aside>

        {/* ── PREVIEW PANEL ─────────────────────────────────────────────────── */}
        <main className={`flex-1 flex flex-col min-h-0 transition-colors duration-300 ${preview}`}>

          {/* Resume navigator (only when >1 done) */}
          {done.length > 1 && (
            <div className={`flex items-center justify-between px-5 py-2.5 border-b transition-colors ${navBar}`}>
              <button
                disabled={selectedDoneIdx <= 0}
                onClick={() => setSelectedId(done[selectedDoneIdx - 1].id)}
                className={`flex items-center gap-1 text-xs font-semibold transition-colors disabled:opacity-25 ${txtM} hover:text-red-400`}
              >
                <ChevronLeft className="w-4 h-4" /> Prev
              </button>

              <div className="flex items-center gap-1.5">
                {done.map(r => (
                  <button
                    key={r.id}
                    onClick={() => setSelectedId(r.id)}
                    className={`rounded-full transition-all duration-200 ${
                      r.id === selectedId
                        ? 'w-4 h-2 bg-red-500'
                        : `w-2 h-2 ${D ? 'bg-white/20 hover:bg-white/40' : 'bg-slate-300 hover:bg-slate-400'}`
                    }`}
                  />
                ))}
              </div>

              <button
                disabled={selectedDoneIdx >= done.length - 1}
                onClick={() => setSelectedId(done[selectedDoneIdx + 1].id)}
                className={`flex items-center gap-1 text-xs font-semibold transition-colors disabled:opacity-25 ${txtM} hover:text-red-400`}
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Resume preview */}
          {selected?.status === 'done' && selected.result ? (
            <div ref={previewRef} className="flex-1 overflow-auto flex items-start justify-center p-8">
              <div
                className="shadow-2xl shadow-black/40 rounded overflow-hidden"
                style={{ width: 794, outline: '1px solid rgba(0,0,0,0.08)' }}
              >
                <ResumeTemplate author={selected.result} />
              </div>
            </div>
          ) : (
            /* ── Empty / loading state ── */
            <div className="flex-1 flex flex-col items-center justify-center p-8">
              {processing ? (
                <div className="text-center">
                  {/* animated ring */}
                  <div className="relative w-20 h-20 mx-auto mb-6">
                    <div className="absolute inset-0 rounded-full border-2 border-red-500/20 animate-ping" />
                    <div className={`w-20 h-20 rounded-full border-2 border-red-500/30 flex items-center justify-center ${D ? 'bg-red-500/5' : 'bg-red-50'}`}>
                      <Loader2 className="w-9 h-9 text-red-500 animate-spin" />
                    </div>
                  </div>
                  <h2 className={`text-xl font-bold mb-2 ${txt}`}>Analyzing Resume</h2>
                  <p className={`text-sm max-w-[260px] text-center leading-relaxed ${txtM}`}>
                    OpenRouter · GPT-4o is parsing and structuring
                    {jdFile ? ' — tailored to your JD' : ' the resume content'}…
                  </p>
                </div>
              ) : (
                <div className="text-center">
                  {/* decorative circles */}
                  <div className="relative w-20 h-20 mx-auto mb-6">
                    <div className={`w-20 h-20 rounded-full border-2 flex items-center justify-center ${D ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-slate-100'}`}>
                      <FileText className={`w-9 h-9 ${txtS}`} />
                    </div>
                  </div>
                  <h2 className={`text-xl font-bold mb-2 ${txt}`}>Resume Preview</h2>
                  <p className={`text-sm max-w-[260px] text-center leading-relaxed ${txtM}`}>
                    {resumeFiles.length === 0
                      ? 'Upload resume files on the left to get started'
                      : pendingCount > 0
                        ? `Hit "Process ${pendingCount} Resume${pendingCount !== 1 ? 's' : ''}" to analyze with AI`
                        : 'Select a processed resume from the list to preview it'}
                  </p>

                  {resumeFiles.length === 0 && (
                    <button
                      onClick={() => resumeRef.current?.click()}
                      className="mt-5 flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-red-600 to-red-500 text-white text-xs font-bold shadow-md shadow-red-900/25 hover:opacity-90 active:scale-95 transition-all mx-auto"
                    >
                      <Upload className="w-3.5 h-3.5" /> Upload Resume
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
