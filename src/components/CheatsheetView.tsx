import { ArrowLeft, ArrowRight } from 'lucide-react';
import type { CheatsheetData, CheatsheetSection } from '../types/lesson';

interface CheatsheetViewProps {
  data: CheatsheetData;
  onJumpToLesson: (slug: string, stepNumber?: number) => void;
  onBackToLearn: () => void;
}

function SectionCards({ section, onJumpToLesson }: { section: CheatsheetSection; onJumpToLesson: (slug: string, stepNumber?: number) => void }) {
  return (
    <div className="cheatsheet-cards">
      {section.rows.map((row, i) => (
        <div key={i} className="cheatsheet-card">
          <div className="cheatsheet-card-top">
            <span className="cheatsheet-card-type">{row[0]}</span>
            {section.lessonSlug && (
              <button type="button" className="cheatsheet-card-jump" onClick={() => onJumpToLesson(section.lessonSlug!, section.stepNumber)}>
                交互演示 <ArrowRight size={12} />
              </button>
            )}
          </div>
          <div className="cheatsheet-card-sig mono">{row[1]}</div>
          <div className="cheatsheet-card-desc">{row[2]}</div>
        </div>
      ))}
    </div>
  );
}

export function CheatsheetView({ data, onJumpToLesson, onBackToLearn }: CheatsheetViewProps) {
  return (
    <div className="cheatsheet">
      <section className="cheatsheet-hero">
        <div className="cheatsheet-eyebrow">{data.hero.eyebrow}</div>
        <h1 className="cheatsheet-title">{data.hero.title}</h1>
        <p className="cheatsheet-subtitle">{data.hero.subtitle}</p>
        <div className="cheatsheet-notes">
          <div>{data.hero.repoNote}</div>
          <div>{data.hero.scopeNote}</div>
        </div>
        <div className="cheatsheet-stats">
          {data.hero.stats.map((s) => (
            <div key={s.label} className="cheatsheet-stat">
              <div className="cheatsheet-stat-label">{s.label}</div>
              <div className="cheatsheet-stat-value mono">{s.value}</div>
            </div>
          ))}
        </div>
      </section>

      <nav className="cheatsheet-nav" aria-label="速查分区">
        {data.sections.map((section) => (
          <a key={section.id} className="cheatsheet-nav-pill" href={`#cheatsheet-${section.id}`}>
            <span className="cheatsheet-nav-num mono">{section.number}</span>
            {section.title}
          </a>
        ))}
      </nav>

      {data.sections.map((section) => (
        <section key={section.id} className="cheatsheet-section" id={`cheatsheet-${section.id}`}>
          <div className="cheatsheet-section-head">
            <span className="cheatsheet-section-num mono">{section.number}</span>
            <span className="cheatsheet-section-title">{section.title}</span>
            {section.lessonSlug && section.kind !== 'map' && (
              <button type="button" className="cheatsheet-jump" onClick={() => onJumpToLesson(section.lessonSlug!, section.stepNumber)}>
                去对应课程 <ArrowRight size={12} style={{ verticalAlign: -1 }} />
              </button>
            )}
            <span className="cheatsheet-section-subtitle">{section.subtitle}</span>
          </div>
          {section.kind === 'map' ? (
            <div className="cheatsheet-section-body">
              <SectionCards section={section} onJumpToLesson={onJumpToLesson} />
            </div>
          ) : (
            <div className="cheatsheet-table-wrap">
              <table className="cheatsheet-table">
                <thead>
                  <tr>
                    {section.headers.map((h) => <th key={h}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {section.rows.map((row, i) => (
                    <tr key={i}>
                      {row.map((cell, j) => <td key={j}>{cell}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ))}

      <button type="button" className="tactile-btn cheatsheet-back" onClick={onBackToLearn}>
        <ArrowLeft size={14} /> 回到学习
      </button>
    </div>
  );
}
