import { ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react';
import type { CheatsheetData, CheatsheetSection } from '../types/lesson';

interface CheatsheetViewProps {
  data: CheatsheetData;
  onJumpToLesson: (slug: string, stepNumber?: number) => void;
  onBackToLearn: () => void;
}

/** 5 张 KPI 卡的彩色底：绿 / 蓝 / 紫 / 橙 / 白 */
const STAT_TONES = ['green', 'blue', 'violet', 'orange', 'neutral'];

/** 卡片 eyebrow 彩色：按序号轮换语义色 */
const CARD_TONES = ['green', 'blue', 'violet', 'orange', 'neutral'];

/** 把一句话描述机械拆成「触发 / 行为」两行：取第一个 ，/；后的内容为行为，前面为触发；
 *  没有分隔符时用签名（row[1]）作触发、全文作行为。不改写文案原意。 */
function splitTriggerBehavior(desc: string, fallbackTrigger: string): { trigger: string; behavior: string } {
  const idx = desc.search(/[，；]/);
  if (idx > 0) {
    return { trigger: desc.slice(0, idx), behavior: desc.slice(idx + 1) };
  }
  return { trigger: fallbackTrigger, behavior: desc };
}

/** 插件树挂载顺序大流程图：根在上，入口在下（数据取自本节 rows，顺序倒置）。 */
function SectionFlow({ section }: { section: CheatsheetSection }) {
  const nodes = [...section.rows].reverse();
  return (
    <div className="cheatsheet-flow" aria-label="插件树挂载顺序">
      {nodes.map((row, i) => (
        <div key={i} className="cheatsheet-flow-step">
          <div className={`cheatsheet-flow-node cheatsheet-flow-node--${CARD_TONES[i % CARD_TONES.length]}`}>
            <span className="cheatsheet-flow-type">{row[0]}</span>
            <span className="cheatsheet-flow-sig mono">{row[1]}</span>
          </div>
          {i < nodes.length - 1 && <ArrowDown size={14} className="cheatsheet-flow-arrow" />}
        </div>
      ))}
    </div>
  );
}

function SectionCards({ section, onJumpToLesson }: { section: CheatsheetSection; onJumpToLesson: (slug: string, stepNumber?: number) => void }) {
  return (
    <div className="cheatsheet-cards">
      {section.rows.map((row, i) => {
        const { trigger, behavior } = splitTriggerBehavior(row[2], row[1]);
        return (
          <div key={i} className="cheatsheet-card">
            <div className="cheatsheet-card-top">
              <span className={`cheatsheet-card-type cheatsheet-card-type--${CARD_TONES[i % CARD_TONES.length]}`}>{row[0]}</span>
              {section.lessonSlug && (
                <button type="button" className="cheatsheet-card-jump" onClick={() => onJumpToLesson(section.lessonSlug!, section.stepNumber)}>
                  交互演示 <ArrowRight size={12} />
                </button>
              )}
            </div>
            <div className="cheatsheet-card-sig mono">{row[1]}</div>
            <div className="cheatsheet-card-rows">
              <div className="cheatsheet-card-row">
                <span className="cheatsheet-card-row-label">触发</span>
                <span>{trigger}</span>
              </div>
              <div className="cheatsheet-card-row">
                <span className="cheatsheet-card-row-label">行为</span>
                <span>{behavior}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** 编号步骤横向卡（替代纯表格）：编号圆圈 + 阶段 + 谁在动 + 关键调用。 */
function SectionSteps({ section }: { section: CheatsheetSection }) {
  return (
    <div className="cheatsheet-steps">
      {section.rows.map((row, i) => (
        <div key={i} className="cheatsheet-step-card">
          <span className="cheatsheet-step-num mono">{i + 1}</span>
          <div className="cheatsheet-step-body">
            <div className="cheatsheet-step-stage">{row[0]}</div>
            <div className="cheatsheet-step-who">{row[1]}</div>
            <div className="cheatsheet-step-calls">{row[2]}</div>
          </div>
          {i < section.rows.length - 1 && <ArrowRight size={13} className="cheatsheet-step-arrow" />}
        </div>
      ))}
    </div>
  );
}

/** 事件表：方法名 mono 芯片 + 同步/异步 LEVEL 徽章 + 用量 mono。 */
function isEventsTable(section: CheatsheetSection): boolean {
  return section.id === 'events';
}

export function CheatsheetView({ data, onJumpToLesson, onBackToLearn }: CheatsheetViewProps) {
  const scrollToSection = (id: string) => {
    const el = document.getElementById(`cheatsheet-${id}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="cheatsheet">
      <section className="cheatsheet-hero">
        <div className="cheatsheet-hero-top">
          <div>
            <h1 className="cheatsheet-title">{data.hero.title}</h1>
          </div>
          <button type="button" className="tactile-btn tactile-btn--primary cheatsheet-hero-back" onClick={onBackToLearn}>
            <ArrowLeft size={14} /> 返回课程
          </button>
        </div>
        <div className="cheatsheet-stats">
          {data.hero.stats.map((s, i) => (
            <div key={s.label} className={`cheatsheet-stat cheatsheet-stat--${STAT_TONES[i % STAT_TONES.length]}`}>
              <div className="cheatsheet-stat-label">{s.label}</div>
              <div className="cheatsheet-stat-value mono">{s.value}</div>
            </div>
          ))}
        </div>
      </section>

      <nav className="cheatsheet-nav" aria-label="速查分区">
        {data.sections.map((section) => (
          <button
            key={section.id}
            type="button"
            className="cheatsheet-nav-pill"
            onClick={() => scrollToSection(section.id)}
          >
            <span className="cheatsheet-nav-num mono">{section.number}</span>
            {section.title}
          </button>
        ))}
      </nav>

      {data.sections.map((section) => (
        <section key={section.id} className="cheatsheet-section" id={`cheatsheet-${section.id}`}>
          <div className="cheatsheet-section-head">
            <span className="cheatsheet-section-num mono">{section.number}</span>
            <span className="cheatsheet-section-title">{section.title}</span>
            {section.lessonSlug && section.kind !== 'map' && (
              <button type="button" className="cheatsheet-jump" onClick={() => onJumpToLesson(section.lessonSlug!, section.stepNumber)}>
                对应课程 <ArrowRight size={12} style={{ verticalAlign: -1 }} />
              </button>
            )}
          </div>
          {section.kind === 'map' ? (
            <div className="cheatsheet-section-body">
              <SectionFlow section={section} />
              <SectionCards section={section} onJumpToLesson={onJumpToLesson} />
            </div>
          ) : section.kind === 'steps' ? (
            <div className="cheatsheet-section-body">
              <SectionSteps section={section} />
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
                      {row.map((cell, j) => (
                        <td key={j}>
                          {isEventsTable(section) && j === 0 ? (
                            <span className="cheatsheet-event-chip mono">{cell}</span>
                          ) : isEventsTable(section) && j === 1 ? (
                            <span>
                              <span className={`cheatsheet-level-badge cheatsheet-level-badge--${cell.startsWith('异步') ? 'async' : 'sync'}`}>
                                {cell.startsWith('异步') ? 'ASYNC' : 'SYNC'}
                              </span>{' '}
                              {cell}
                            </span>
                          ) : isEventsTable(section) && j === 3 ? (
                            <span className="mono">{cell}</span>
                          ) : (
                            cell
                          )}
                        </td>
                      ))}
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
