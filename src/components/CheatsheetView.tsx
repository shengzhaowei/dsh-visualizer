import { ArrowLeft, ArrowRight } from 'lucide-react';
import type { CheatsheetData } from '../types/lesson';

interface CheatsheetViewProps {
  data: CheatsheetData;
  onJumpToLesson: (slug: string, stepNumber?: number) => void;
  onBackToLearn: () => void;
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
              <div className="cheatsheet-stat-value">{s.value}</div>
              <div className="cheatsheet-stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {data.sections.map((section) => (
        <section key={section.id} className="cheatsheet-section" id={`cheatsheet-${section.id}`}>
          <div className="cheatsheet-section-head">
            <span className="cheatsheet-section-num">{section.number}</span>
            <span className="cheatsheet-section-title">{section.title}</span>
            {section.lessonSlug && (
              <button type="button" className="cheatsheet-jump" onClick={() => onJumpToLesson(section.lessonSlug!, section.stepNumber)}>
                去对应课程 <ArrowRight size={12} style={{ verticalAlign: -1 }} />
              </button>
            )}
            <span className="cheatsheet-section-subtitle">{section.subtitle}</span>
          </div>
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
        </section>
      ))}

      <button type="button" className="tactile-btn cheatsheet-back" onClick={onBackToLearn}>
        <ArrowLeft size={14} /> 回到学习
      </button>
    </div>
  );
}
