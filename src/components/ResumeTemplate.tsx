import React from 'react'
import { Award } from 'lucide-react'
import { Author, CaseStudy as CaseStudyType } from '../types'
import logoImg from '../img/logo-white.png'

// ── Utilities ─────────────────────────────────────────────────────────────────

function normalizedProjectKey(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
}

function parseTechStackBlocks(raw: string | undefined): { title: string; tags: string[] }[] {
  if (!raw?.trim()) return []
  const segments = raw.split(/\n\n+/).map(s => s.trim()).filter(Boolean)
  const blocks: { title: string; tags: string[] }[] = []

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i]
    const lines = seg.split(/\n/).map(l => l.trim()).filter(Boolean)
    const firstLine = (lines[0] ?? '').replace(/^\s*[\d.]+\s*/, '').trim()
    const bulletItems = lines.slice(1).filter(l => l.startsWith('•')).map(l => l.replace(/^•\s*/, '').trim())
    const otherLines = lines.slice(1).filter(l => !l.startsWith('•'))
    const fromOther = otherLines.flatMap(line =>
      line.split(/[,;]|\s+and\s+/i).map(t => t.trim()).filter(Boolean)
    )
    let title = firstLine
    let tags = [...bulletItems, ...fromOther]

    if (lines.length === 1 && i + 1 < segments.length) {
      const nextSeg = segments[i + 1]
      const nextLines = nextSeg.split(/\n/).map(l => l.trim()).filter(Boolean)
      const nextBullets = nextLines.filter(l => l.startsWith('•')).map(l => l.replace(/^•\s*/, '').trim())
      const nextOther = nextLines.filter(l => !l.startsWith('•'))
      const nextFromOther = nextOther.flatMap(line =>
        line.split(/[,;]|\s+and\s+/i).map(t => t.trim()).filter(Boolean)
      )
      tags = [...nextBullets, ...nextFromOther]
      i++
    }
    const trimmedTags = tags.filter(Boolean)
    if (title || trimmedTags.length > 0) blocks.push({ title, tags: trimmedTags })
  }
  return blocks
}

function parseEducationLine(line: string): {
  institution: string; degree: string; spec: string; year: string; grade: string
} {
  // Split on em-dash, en-dash, or hyphen surrounded by spaces
  const dashIdx = line.search(/\s+[—–-]\s+/)
  let institution = line.trim()
  let rest = ''
  if (dashIdx >= 0) {
    institution = line.substring(0, dashIdx).trim()
    rest        = line.substring(dashIdx).replace(/^\s*[—–-]\s*/, '').trim()
  }

  let degree = '', spec = '', year = '', grade = ''
  if (rest) {
    const segs = rest.split(',').map(s => s.trim()).filter(Boolean)
    degree = segs[0] ?? ''

    // Detect which segments are year / grade / spec
    const yearSeg  = segs.find(s => /\b20\d{2}\b|\b19\d{2}\b/.test(s)) ?? ''
    const gradeSeg = segs.find(s => /cgpa|gpa|%|grade/i.test(s) && s !== yearSeg) ?? ''
    const specSegs = segs.slice(1).filter(s => s !== yearSeg && s !== gradeSeg && s !== degree)

    if (yearSeg)  year  = yearSeg.match(/\b(20|19)\d{2}\b/)?.[0] ?? yearSeg
    if (gradeSeg) grade = gradeSeg.replace(/cgpa\s*[:\-]?\s*/i, 'CGPA: ').trim()
    if (!grade.startsWith('CGPA:') && /cgpa/i.test(gradeSeg)) grade = `CGPA: ${grade}`
    spec = specSegs.join(', ')

    // Spec inside parentheses in degree
    if (!spec && degree.includes('(')) {
      const m = degree.match(/^(.*?)\s*\((.*?)\)$/)
      if (m) { degree = m[1].trim(); spec = m[2].trim() }
    }
  }

  return { institution, degree, spec, year, grade }
}

function formatEducationInline(education: string): React.ReactNode {
  const lines = education.split(/\n/).map(s => s.trim()).filter(Boolean)
  if (lines.length === 0) return null

  return (
    <div className="flex flex-col" style={{ gap: 8 }}>
      {lines.map((line, i) => {
        const { institution, degree, spec, year, grade } = parseEducationLine(line)

        // Fallback: couldn't parse — show raw
        if (!degree && !institution) {
          return (
            <div key={i} className="text-[10px] text-slate-700 leading-snug">{line}</div>
          )
        }

        return (
          <div
            key={i}
            className="pl-[8px] border-l-[2px] border-primary/30"
            style={{ paddingBottom: i < lines.length - 1 ? 4 : 0 }}
          >
            {/* Degree + Institution */}
            <div className="text-[10px] font-semibold text-slate-800 leading-snug">
              {degree || institution}
              {degree && institution && (
                <span className="font-normal text-slate-500"> — {institution}</span>
              )}
            </div>
            {/* Spec */}
            {spec && (
              <div className="text-[9px] text-slate-500 leading-snug mt-[1px]">{spec}</div>
            )}
            {/* Year + Grade inline */}
            {(year || grade) && (
              <div className="flex items-center gap-2 mt-[2px]">
                {year  && <span className="text-[9px] text-slate-500">{year}</span>}
                {year && grade && <span className="text-[9px] text-slate-300">·</span>}
                {grade && <span className="text-[9px] font-medium text-primary/70">{grade}</span>}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Style tokens ──────────────────────────────────────────────────────────────
const avoidBreak      = 'html2pdf__page-break-avoid break-inside-avoid'
const sectionWrap     = `w-full mt-[13px] ${avoidBreak}`
const noBreak: React.CSSProperties = { breakInside: 'avoid', pageBreakInside: 'avoid' }
const sectionTitle    = 'block w-full text-[10px] font-bold tracking-[0.1em] uppercase text-primary border-b-2 border-slate-300 pb-1 mb-2 text-left'
const bodyText        = 'text-[10px] text-slate-700 leading-snug'
const mutedText       = 'text-[9px] text-slate-500'
const clampThree: React.CSSProperties = {
  display: '-webkit-box',
  WebkitLineClamp: 3,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
  lineHeight: 1.4,
  maxHeight: 44,
}

// ── Component ─────────────────────────────────────────────────────────────────
export function ResumeTemplate({ author }: { author: Author }) {
  const bio        = (author.aboutMe ?? author.bio ?? '').trim()
  const techBlocks = parseTechStackBlocks(author.techStack)

  // ── Projects (right column) ──────────────────────────────────────────────
  const caseStudiesRaw: CaseStudyType[] = author.caseStudies ?? []
  const seenTitles = new Set<string>()
  const caseStudiesDeduped = caseStudiesRaw.filter(cs => {
    const k = (cs.title ?? '').trim()
    if (!k || seenTitles.has(k)) return false
    seenTitles.add(k)
    return true
  })
  const caseStudyKeys = new Set(caseStudiesDeduped.map(cs => normalizedProjectKey(cs.title)))
  const resumeOnlyProjects: CaseStudyType[] = (author.projects ?? [])
    .filter(p => !caseStudyKeys.has(normalizedProjectKey(p.title)))
    .map(p => ({ title: p.title, description: p.description, technology: p.technology, link: p.link }))
  // Show ALL projects — multi-page layout handles overflow
  const allProjects = [...caseStudiesDeduped, ...resumeOnlyProjects]

  // ── Experience (sidebar) ─────────────────────────────────────────────────
  // Show ALL experience entries — multi-page layout handles long lists
  const experiences = author.experience ?? []

  // ── Skills (sidebar) ─────────────────────────────────────────────────────
  const fromProfile = [...(author.expertise ?? []), ...(author.specializations ?? [])]
    .filter(Boolean).slice(0, 7).map(n => ({ name: String(n).trim(), level: 75 }))
  const skills =
    author.skills && author.skills.length > 0
      ? author.skills
      : fromProfile.length >= 4
        ? fromProfile.slice(0, 7)
        : []
  const sidebarSkills = skills.slice(0, 7)

  // ── Interests (sidebar) ──────────────────────────────────────────────────
  const interests = (author.interests ?? []).filter(Boolean).slice(0, 8)

  // ── Education ────────────────────────────────────────────────────────────
  const educationNode = author.education?.trim()
    ? formatEducationInline(author.education.trim())
    : null

  // ── Certifications ───────────────────────────────────────────────────────
  const certs = author.certifications ?? []

  return (
    <div
      id="resume-document-template"
      className="bg-white font-sans text-gray-900 antialiased"
      style={{ width: 794 }}
    >
      {/*
        Printable area: min-height = A4. Content overflows downward for multi-page.
        No hard clip — inner flex row stretches both columns to equal height.
      */}
      <div
        id="resume-printable-area"
        className="bg-white"
        style={{ width: 794, minHeight: 1122 }}
      >
        <div style={{ display: 'flex', width: '100%', alignItems: 'stretch' }}>

          {/* ── LEFT SIDEBAR ──────────────────────────────────────────────── */}
          <aside
            style={{ width: '32%', flexShrink: 0, borderRight: '1px solid #f1f5f9' }}
            className="bg-white px-4 py-3 flex flex-col items-start text-left"
          >

            {/* Logo / Avatar block */}
            <div className={`w-full ${avoidBreak}`} style={{ maxWidth: 160 }}>
              <div className="grid gap-2 w-full" style={{ gridTemplateColumns: author.avatar ? '1fr 1fr' : '72px' }}>
                {author.avatar && (
                  <div className="w-full aspect-square rounded-[12px] overflow-hidden bg-gray-200 border border-gray-100 shadow-sm">
                    <img src={author.avatar} alt={author.name} className="w-full h-full object-cover" loading="eager" />
                  </div>
                )}
                <div
                  className="rounded-[12px] overflow-hidden border border-gray-200 shadow-sm flex items-center justify-center bg-[#1a1a2e]"
                  style={{ width: 72, height: 72 }}
                >
                  <img src={logoImg} alt="Company Logo" className="object-contain" style={{ width: '78%', height: '78%' }} loading="eager" />
                </div>
              </div>
            </div>

            {/* Technical Expertise — only if skills exist */}
            {sidebarSkills.length > 0 && (
              <div className={sectionWrap} style={noBreak}>
                <div className={sectionTitle}>Technical Expertise</div>
                {/* Use explicit inline styles for all layout so html2canvas renders correctly */}
                <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 9 }}>
                  {sidebarSkills.map((s, i) => {
                    const pct = Math.max(10, Math.min(100, s.level ?? 70))
                    return (
                      <div key={i} style={{ width: '100%' }}>
                        {/* Label row — fully inline so canvas honours the layout */}
                        <div style={{
                          display: 'flex',
                          flexDirection: 'row',
                          alignItems: 'flex-start',
                          justifyContent: 'space-between',
                          marginBottom: 3,
                          width: '100%',
                        }}>
                          <span style={{
                            fontSize: 10,
                            color: '#334155',
                            fontWeight: 500,
                            lineHeight: 1.3,
                            flex: 1,
                            minWidth: 0,
                            wordBreak: 'break-word',
                            paddingRight: 4,
                          }}>{s.name}</span>
                          <span style={{
                            fontSize: 9,
                            color: '#94a3b8',
                            flexShrink: 0,
                            fontVariantNumeric: 'tabular-nums',
                            lineHeight: 1.3,
                          }}>{pct}%</span>
                        </div>
                        {/* Progress bar — explicit height + border-radius */}
                        <div style={{
                          height: 4,
                          width: '100%',
                          borderRadius: 9999,
                          backgroundColor: '#f1f5f9',
                          overflow: 'hidden',
                        }}>
                          <div style={{
                            height: '100%',
                            width: `${pct}%`,
                            borderRadius: 9999,
                            backgroundColor: '#c0392b',
                          }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Interests — only if they exist */}
            {interests.length > 0 && (
              <div className={sectionWrap} style={noBreak}>
                <div className={sectionTitle}>Interests</div>
                <div className="flex flex-wrap w-full mt-1">
                  {interests.map((it, i) => (
                    <div key={i} className="flex items-baseline text-[10px] text-slate-700 font-medium leading-snug w-[50%] mb-1 pr-2">
                      <span className="text-primary shrink-0 text-[12px] leading-none mr-1.5" aria-hidden>•</span>
                      <span style={{ wordBreak: 'break-word' }}>{it}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Experience — ALL entries (replaces Case Studies + Blogs) */}
            {experiences.length > 0 && (
              <div className={`w-full mt-[13px]`}>
                <div className={sectionTitle}>Experience</div>
                <div className="flex flex-col">
                  {experiences.map((exp, i) => (
                    <div
                      key={i}
                      className={`pb-[9px] mb-[9px] border-b border-gray-100 last:border-b-0 last:pb-0 last:mb-0 ${avoidBreak}`}
                      style={noBreak}
                    >
                      {/* Role */}
                      <div className="text-[10px] font-bold text-slate-800 leading-tight">
                        {exp.role}
                      </div>

                      {/* Company · Period on one line */}
                      <div className="flex items-center flex-wrap gap-x-1 mt-[2px]">
                        {exp.company && (
                          <span className="text-[9px] text-primary font-semibold">{exp.company}</span>
                        )}
                        {exp.company && (exp.period ?? exp.duration) && (
                          <span className="text-[9px] text-slate-300">·</span>
                        )}
                        {(exp.period ?? exp.duration) && (
                          <span className="text-[9px] text-slate-500">{exp.period ?? exp.duration}</span>
                        )}
                      </div>

                      {/* Location · Type */}
                      {(exp.location || exp.type) && (
                        <div className="text-[9px] text-slate-400 mt-[1px]">
                          {[exp.type, exp.location].filter(Boolean).join(' · ')}
                        </div>
                      )}

                      {/* ALL highlights / achievements */}
                      {(exp.highlights ?? []).length > 0 && (
                        <div className="mt-[4px] flex flex-col gap-[2px]">
                          {(exp.highlights ?? []).map((h, j) => (
                            <div key={j} className="flex items-start">
                              <span
                                className="text-primary shrink-0 leading-none mr-[5px] mt-[2px]"
                                style={{ fontSize: 9 }}
                                aria-hidden
                              >▸</span>
                              <span className="text-[9px] text-slate-600 leading-[1.45]">{h}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

          </aside>

          {/* ── RIGHT MAIN ────────────────────────────────────────────────── */}
          <main
            style={{ flex: 1, minWidth: 0 }}
            className="px-4 py-3 flex flex-col text-left"
          >

            {/* Header band */}
            <section
              className={`w-full rounded-lg bg-[#fcf5f6] border border-primary/10 ${avoidBreak}`}
              style={{ ...noBreak, padding: 14 }}
            >
              <div className="text-[9px] font-bold text-primary tracking-[0.1em] uppercase mb-0.5">
                {author.role ?? 'Professional'}
              </div>
              <h1 className="font-serif leading-tight font-semibold text-slate-900" style={{ fontSize: 18 }}>
                {author.name}
              </h1>

              {/* Bio — only render if non-empty */}
              {bio && (
                <p className="mt-1 text-[10px] text-slate-700" style={{ lineHeight: 1.4 }}>
                  {bio}
                </p>
              )}

              {/* Meta line */}
              {(author.yearsExperience || author.company || author.location) && (
                <div className="mt-1 flex flex-wrap items-baseline text-[9px] text-slate-500 gap-x-1.5">
                  {author.yearsExperience && (
                    <span>{author.yearsExperience.replace(/\+$/, '')}+ yrs</span>
                  )}
                  {author.yearsExperience && author.company && <span className="opacity-40">·</span>}
                  {author.company && <span>{author.company}</span>}
                  {author.company && author.location && <span className="opacity-40">·</span>}
                  {author.location && <span>{author.location}</span>}
                </div>
              )}
            </section>

            {/* Projects — ALL projects, no artificial limit */}
            {allProjects.length > 0 && (
              <section className={`w-full mt-[13px]`}>
                <div className={sectionTitle}>Projects</div>
                <div className="flex flex-col">
                  {allProjects.map((p, i) => (
                    <div
                      key={i}
                      className="pb-[8px] border-b border-gray-100 last:border-b-0 last:pb-0 mb-[8px] last:mb-0"
                      style={noBreak}
                    >
                      {/* Title + Live link */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {p.link ? (
                          <a
                            href={p.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] font-bold text-slate-900 hover:underline leading-tight"
                          >
                            {p.title}
                          </a>
                        ) : (
                          <span className="text-[10px] font-bold text-slate-900 leading-tight">{p.title}</span>
                        )}
                        {p.link && (
                          <a
                            href={p.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[9px] text-primary font-semibold hover:underline shrink-0"
                          >
                            Live →
                          </a>
                        )}
                      </div>

                      {/* Technology stack */}
                      {p.technology && (
                        <div className="text-[9px] text-slate-500 mt-[2px]">
                          <span className="font-semibold text-slate-600">Stack: </span>
                          {p.technology}
                        </div>
                      )}

                      {/* Description — clamped to 2 lines to save space when many projects */}
                      {p.description && (
                        <div
                          className="text-[9px] text-slate-600 mt-[2px] leading-snug"
                          style={{
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                          }}
                        >
                          {p.description}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <hr className="mt-[6px] border-t border-slate-200" />
              </section>
            )}

            {/* Education — only if it exists */}
            {educationNode && (
              <section className={sectionWrap} style={noBreak}>
                <div className={sectionTitle}>Education</div>
                <div className={bodyText}>{educationNode}</div>
              </section>
            )}

            {/* Intelligence Architecture — only if real techStack data exists */}
            {techBlocks.length > 0 && (
              <section className={sectionWrap} style={noBreak}>
                <div className={sectionTitle}>Intelligence Architecture</div>
                <div
                  className="w-full rounded-md border border-slate-200 bg-slate-50/50 p-1.5"
                  style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}
                >
                  {techBlocks.map((block, bi) => (
                    <div
                      key={bi}
                      className="rounded border border-slate-200 bg-white px-2 py-1.5"
                      style={{ ...noBreak, minHeight: '3rem' }}
                    >
                      <div className="text-[9px] font-bold text-slate-600 uppercase tracking-wider leading-tight mb-0.5">
                        {block.title}
                      </div>
                      <div className="space-y-0.5">
                        {block.tags.map((tag, ti) => (
                          <div key={ti} className="flex items-baseline text-[9px] text-slate-700 leading-snug">
                            <span className="text-primary shrink-0 text-[10px] leading-none mr-1.5" aria-hidden>•</span>
                            <span style={{ wordBreak: 'break-word' }}>{tag.trim()}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Certifications — only if they exist */}
            {certs.length > 0 && (
              <section className={sectionWrap} style={noBreak}>
                <div className={sectionTitle}>Certifications</div>
                <div
                  className="w-full rounded-md border border-slate-200 bg-slate-50/50 p-1.5"
                  style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}
                >
                  {certs.map((c, i) => (
                    <a
                      key={i}
                      href={c.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-start gap-1 rounded border border-slate-200 bg-white py-1 px-2 text-[9px] font-medium leading-snug text-slate-700 hover:bg-primary/5"
                      style={{ minHeight: '1.75rem' }}
                    >
                      <Award className="w-[11px] h-[11px] text-primary shrink-0 mt-[1px]" aria-hidden />
                      <span style={{ wordBreak: 'break-word' }}>{c.name}</span>
                    </a>
                  ))}
                </div>
              </section>
            )}

          </main>
        </div>
      </div>
    </div>
  )
}
