'use client';

import { useState } from 'react';
import {
  ArrowRight, BookOpen, BookOpenCheck, CalendarDays, Check, ChevronRight, CircleHelp,
  Flame, GraduationCap, Lightbulb, LockKeyhole, RotateCcw,
  SkipForward, Sparkles, Trophy, Volume2, X, Zap,
} from 'lucide-react';
import { CompletionPanel } from './components/CompletionPanel';
import { ActivityHeatmap } from './components/ActivityHeatmap';
import { ProgressBar } from './components/ProgressBar';
import { WordSlots } from './components/WordSlots';
import { sentences } from './data';
import { useSentenceGame } from './hooks/useSentenceGame';
import { setPronunciationType } from './utils/speech';
import type { PronunciationType } from './utils/speech';

function App() {
  const game = useSentenceGame();
  const [pronunciationType, setSelectedPronunciationType] = useState<PronunciationType>('1');
  const [showInstructions, setShowInstructions] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [showActivity, setShowActivity] = useState(false);
  const mistakesTotal = Object.values(game.progress.mistakes).reduce((sum, count) => sum + count, 0);
  const isPlaying = game.ready && game.phase === 'playing';
  const isFinished = game.ready && game.phase === 'success';
  const wordProgress = game.wordIndex;

  return (
    <div className="app-background viewport-app">
      <div className="pointer-events-none absolute -left-32 top-16 h-[470px] w-[470px] rounded-full bg-[#e9e2ff] opacity-55 blur-[110px]" />
      <div className="pointer-events-none absolute -right-32 top-[400px] h-[530px] w-[530px] rounded-full bg-[#e5edff] opacity-70 blur-[120px]" />
      <div className="app-shell" inert={showInstructions || showReset || showActivity}>
        <header className="app-header flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-[48px] w-[48px] items-center justify-center rounded-[17px] bg-gradient-to-br from-[#9c83f5] to-[#7456db] text-white shadow-[0_9px_24px_#8670d952]">
              <BookOpenCheck size={26} strokeWidth={2.4} />
            </div>
            <div>
              <div className="text-[20px] font-black leading-tight tracking-[-0.04em] text-ink">Sentence Quest<span className="text-[#8e73ed]">.</span></div>
              <p className="mt-0.5 text-[12px] font-medium tracking-[0.06em] text-[#968faa]">一句一句，玩会英语</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <button type="button" onClick={() => setShowActivity(true)} className="flex shrink-0 items-center gap-1.5 rounded-2xl border border-[#e7e2f4] bg-white px-2.5 py-2.5 text-[12px] font-bold text-[#7669a0] shadow-sm transition-colors hover:bg-[#f7f4ff] sm:px-3" aria-label="查看学习热力图">
              <CalendarDays size={17} /><span className="hidden sm:inline">学习统计</span>
            </button>
            <div role="group" aria-label="发音口音" className="flex shrink-0 items-center rounded-2xl border border-[#e7e2f4] bg-white p-1 shadow-sm">
              {([
                ['1', '英音'],
                ['2', '美音'],
              ] as const).map(([type, label]) => (
                <button
                  key={type}
                  type="button"
                  aria-pressed={pronunciationType === type}
                  onClick={() => {
                    setSelectedPronunciationType(type);
                    setPronunciationType(type);
                  }}
                  className={`rounded-xl px-2 py-2 text-[12px] font-bold transition-colors ${pronunciationType === type ? 'bg-[#f0edff] text-[#795ee0]' : 'text-[#968faa] hover:text-[#65558e]'}`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="hidden items-center gap-2 rounded-2xl border border-[#e7e2f4] bg-white/85 px-4 py-3 text-sm font-semibold text-[#7669a0] shadow-sm sm:flex">
              <Flame size={17} className="text-[#f19b67]" /> 连对 <span className="text-ink">{game.streak}</span> 词
            </div>
            <div className="flex items-center gap-2 rounded-2xl border border-[#e7e2f4] bg-white px-4 py-3 text-sm font-black text-ink shadow-sm">
              <Zap size={18} className="fill-[#f6c665] text-[#e0a936]" /> {game.progress.xp} <span className="font-medium text-[#a29bb2]">XP</span>
            </div>
          </div>
        </header>

        <main className="app-main">
          <aside className="app-sidebar">
            <div className="surface-card p-[18px]">
              <p className="section-overline mb-3 px-1">LEARN MODE</p>
              <div className="space-y-2">
                <button type="button" onClick={() => game.changeMode('challenge')} disabled={!game.ready} className={`mode-link ${game.mode === 'challenge' ? 'mode-link-active' : ''}`}>
                  <BookOpen size={19} /> <span className="flex-1 text-left">句子闯关</span> <ChevronRight size={16} className="opacity-50" />
                </button>
                <button type="button" onClick={() => game.changeMode('review')} disabled={!game.ready} className={`mode-link ${game.mode === 'review' ? 'mode-link-active' : ''}`}>
                  <RotateCcw size={19} /> <span className="flex-1 text-left">错题复习</span>
                  {game.reviewCount > 0 && <span className="rounded-full bg-[#f2eafa] px-2 py-0.5 text-[11px] font-bold text-[#9368c6]">{game.reviewCount}</span>}
                </button>
              </div>
            </div>
            <div className="surface-card p-5">
              <p className="section-overline">YOUR JOURNEY</p>
              <div className="mt-5 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#f0edff] text-[#8b71eb]"><GraduationCap size={23} /></div>
                <div><p className="text-[15px] font-bold text-ink">Level 01</p><p className="mt-0.5 text-xs text-[#9e97ae]">日常表达入门</p></div>
              </div>
              <div className="mt-5"><ProgressBar value={game.completedCount} total={sentences.length} label="课程进度" /></div>
              <div className="mt-5 space-y-3 border-t border-[#f0edf7] pt-5">
                <div className="flex items-center gap-2 text-[13px] font-semibold text-[#5c526f]"><div className="step-marker step-marker-current"><Check size={13} /></div> 01 · 日常表达 <span className="ml-auto text-[11px] text-[#a9a1b9]">进行中</span></div>
                <div className="flex items-center gap-2 text-[13px] font-medium text-[#aaa3b9]"><div className="step-marker"><LockKeyhole size={12}/></div> 02 · 旅行英语 <span className="ml-auto text-[11px]">即将推出</span></div>
                <div className="flex items-center gap-2 text-[13px] font-medium text-[#aaa3b9]"><div className="step-marker"><LockKeyhole size={12}/></div> 03 · 职场对话 <span className="ml-auto text-[11px]">即将推出</span></div>
              </div>
            </div>
            <div className="sidebar-stats surface-card">
              <p className="section-overline">学习数据</p>
              <div><span>已学句子</span><strong>{game.completedCount} / {sentences.length}</strong></div>
              <div><span>正确单词</span><strong>{game.progress.totalCorrectWords}</strong></div>
              <div><span>完美通关</span><strong>{game.progress.perfectSentences}</strong></div>
              <div><span>错误次数</span><strong>{mistakesTotal}</strong></div>
            </div>
          </aside>

          <section className="exercise-section">
            <div className="exercise-toolbar flex items-center justify-between gap-2 px-1">
              <div className="flex items-center gap-2 text-[13px] font-medium text-[#8c83a2]">
                <span>{game.mode === 'review' ? '练习中心' : '日常表达入门'}</span><ChevronRight size={14} /><span className="font-bold text-[#5f5480]">{game.mode === 'review' ? '错题复习' : `句子 ${game.courseIndex + 1}`}</span>
              </div>
              <div className="flex items-center gap-2"><button type="button" onClick={() => setShowReset(true)} disabled={!game.ready} className="reset-action" aria-label="清空全部学习记录"><RotateCcw size={15}/></button><button onClick={() => setShowInstructions(true)} className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-semibold text-[#8674b8] hover:bg-white/70" type="button"><CircleHelp size={16}/> 玩法说明</button></div>
            </div>

            <div className="game-card">
              {!game.ready && (
                <div className="end-state flex flex-col items-center justify-center gap-3" role="status" aria-live="polite">
                  <div className="h-9 w-9 animate-spin rounded-full border-[3px] border-[#e6e0ff] border-t-[#8a70e4]" />
                  <p className="text-sm font-semibold text-[#817498]">正在从 IndexedDB 恢复学习进度…</p>
                </div>
              )}
              {isPlaying && (
                <>
                  <div className="flex items-center justify-between gap-3">
                    <span className="rounded-full bg-[#f3f0ff] px-3.5 py-1.5 text-[11px] font-black tracking-[0.12em] text-[#8a70e4]">{game.mode === 'review' ? 'REVIEW MODE' : 'LEVEL 01 · BEGINNER'}</span>
                    <span className="text-[13px] font-bold text-[#aaa2bb]">{game.mode === 'review' ? '重温难点' : `${game.courseIndex + 1} / ${sentences.length}`}</span>
                  </div>
                  <div className="mt-4"><ProgressBar value={wordProgress} total={game.sentence.words.length} /></div>
                  <div className="sentence-prompt text-center">
                    <div className="mb-4 flex items-center justify-center gap-2 text-[12px] font-bold uppercase tracking-[0.16em] text-[#a09ab4]"><Sparkles size={15} className="text-[#ae93ec]"/> TRANSLATE THIS SENTENCE</div>
                    <h1 className="text-[27px] font-extrabold leading-[1.55] tracking-tight text-ink sm:text-[36px]">{game.sentence.zh}</h1>
                    <p className="mt-4 text-[14px] text-[#a39ab5]">直接敲键盘开始输入，拼对自动进入下一词</p>
                  </div>
                  <WordSlots
                    sentence={game.sentence}
                    index={game.wordIndex}
                    revealedLetters={game.revealedLetters}
                    typed={game.typed}
                    error={game.error}
                    focusSignal={game.focusSignal}
                    onChange={game.changeTyped}
                    onSpeakWord={game.speakWord}
                  />
                  <div className="word-counter text-center text-[12px] font-semibold text-[#968da9]">WORD {game.wordIndex + 1} OF {game.sentence.words.length}</div>
                  <div id="typing-feedback" role="status" aria-live="polite" className={`typing-feedback text-center text-[13px] font-medium ${game.error ? 'text-rose-500' : 'text-[#a49bb5]'}`}>
                    {game.error || <><span className="sm:hidden">点击高亮单词输入，拼对自动进入下一词</span><span className="hidden sm:inline">直接敲键盘，拼对自动通过 · <kbd>Backspace</kbd> 删除 · <kbd>Esc</kbd> 清空</span></>}
                  </div>
                  <div className="typing-actions flex flex-wrap items-center justify-center gap-2">
                    <button type="button" onClick={() => game.speakWord(game.currentWord)} className="text-action"><Volume2 size={17} /> 听当前单词</button>
                    <button type="button" onClick={game.revealHint} disabled={game.revealedLetters >= game.currentWord.length} className="text-action"><Lightbulb size={17} /> 多给一个字母</button>
                    <button type="button" onClick={game.skipSentence} className="text-action"><SkipForward size={17} /> 跳过这句</button>
                  </div>
                </>
              )}

              {isFinished && (
                <div className="completion-container">
                  <CompletionPanel sentence={game.sentence} earnedXp={game.earnedXp} mistakes={game.mistakesThisSentence} hints={game.hintsThisSentence} onNext={game.nextSentence} onReplay={game.restartSentence}/>
                </div>
              )}

              {game.ready && game.phase === 'allDone' && (
                <div className="end-state flex flex-col items-center justify-center text-center">
                  <div className="mb-7 flex h-[104px] w-[104px] items-center justify-center rounded-[30px] bg-[#fff3d7] text-[#e5a647]"><Trophy size={51}/></div>
                  <span className="section-overline text-[#b79749]">LEVEL 01 CLEARED</span>
                  <h2 className="mt-3 text-[32px] font-extrabold text-ink sm:text-[38px]">第一关，全部通关！</h2>
                  <p className="mt-4 max-w-md leading-7 text-[#978ea8]">你完成了全部 {sentences.length} 个句子。重复练习可以巩固记忆，遇到困难的句子也可以前往错题本。</p>
                  <div className="mt-8 flex flex-wrap justify-center gap-3"><button className="primary-button" onClick={game.replayCourse}><RotateCcw size={18}/> 重新练习本关</button><button className="secondary-button" onClick={() => game.changeMode('review')}><BookOpen size={18}/> 复习错题</button></div>
                </div>
              )}

              {game.ready && game.phase === 'reviewDone' && (
                <div className="end-state flex flex-col items-center justify-center text-center">
                  <div className="mb-7 flex h-[104px] w-[104px] items-center justify-center rounded-[30px] bg-[#e7faf0] text-[#2eb781]"><Trophy size={50}/></div>
                  <span className="section-overline text-[#32a67a]">REVIEW COMPLETE</span>
                  <h2 className="mt-3 text-[32px] font-extrabold text-ink">错题复习完成！</h2>
                  <p className="mt-4 max-w-md leading-7 text-[#978ea8]">你已经重温了本轮全部错题。可以重新复习，或继续新的闯关。</p>
                  <div className="mt-8 flex flex-wrap justify-center gap-3"><button className="secondary-button" onClick={() => game.changeMode('review')}><RotateCcw size={18}/> 再复习一轮</button><button className="primary-button" onClick={() => game.changeMode('challenge')}>继续闯关 <ArrowRight size={18}/></button></div>
                </div>
              )}

              {game.ready && game.phase === 'noMistakes' && (
                <div className="end-state flex flex-col items-center justify-center text-center">
                  <div className="mb-7 flex h-[104px] w-[104px] items-center justify-center rounded-[30px] bg-[#e7faf0] text-[#2eb781]"><BookOpenCheck size={50}/></div>
                  <span className="section-overline text-[#32a67a]">LOOKING GOOD</span>
                  <h2 className="mt-3 text-[32px] font-extrabold text-ink">暂时没有错题</h2>
                  <p className="mt-4 max-w-md leading-7 text-[#978ea8]">做错过的句子会自动出现在这里，随时可以回来巩固学习。</p>
                  <button className="primary-button mt-8" onClick={() => game.changeMode('challenge')}>继续句子闯关 <ArrowRight size={18}/></button>
                </div>
              )}
            </div>
            <p className="storage-status text-center text-[12px] leading-5 text-[#aaa2ba]">
              {game.storageStatus === 'memory'
                ? <span className="font-semibold text-rose-600" role="alert">IndexedDB 读取或保存失败，当前进度只保存在内存，刷新页面可能丢失本次练习。请检查隐私模式、存储权限或关闭其他同站点标签页。{game.storageWarning ? `（${game.storageWarning}）` : ''}</span>
                : '你的学习进度自动保存在当前浏览器的 IndexedDB · 每句都值得认真练习'}
            </p>
          </section>


        </main>

      </div>

      {showActivity && (
        <div className="modal-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowActivity(false); }}>
          <div role="dialog" aria-modal="true" aria-labelledby="activity-title" className="modal-card activity-modal-card">
            <button autoFocus type="button" onClick={() => setShowActivity(false)} className="modal-close" aria-label="关闭学习统计"><X size={19}/></button>
            <div className="modal-icon"><CalendarDays size={23}/></div>
            <h2 id="activity-title" className="mt-4 text-[23px] font-black text-ink">学习热力图</h2>
            <p className="mb-5 mt-2 text-sm leading-6 text-[#887e99]">记录每天完成练习的单词与句子，帮助你持续积累。</p>
            <ActivityHeatmap activityByDate={game.progress.activityByDate} />
          </div>
        </div>
      )}

      {showInstructions && (
        <div className="modal-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowInstructions(false); }}>
          <div role="dialog" aria-modal="true" aria-labelledby="instructions-title" className="modal-card">
            <button autoFocus type="button" onClick={() => setShowInstructions(false)} className="modal-close" aria-label="关闭玩法说明"><X size={19}/></button>
            <div className="modal-icon"><Lightbulb size={24}/></div>
            <h2 id="instructions-title" className="mt-4 text-[23px] font-black text-ink">怎么玩？</h2>
            <div className="mt-5 space-y-4 text-[14px] leading-7 text-[#726981]">
              <p><strong>① 看中文：</strong>理解句意，回忆合适的英文表达。</p>
              <p><strong>② 逐词输入：</strong>直接敲键盘即可输入，拼对自动进入下一词；手机上轻点单词唤起键盘。</p>
              <p><strong>③ 使用提示：</strong>默认不显示字母，点击「多给一个字母」可从首字母开始逐个显示。</p>
              <p><strong>④ 完成领奖：</strong>每个词答对后自动播放单词发音；完整句子可在结算页朗读。</p>
            </div>
            <button type="button" className="primary-button mt-7 w-full" onClick={() => setShowInstructions(false)}>明白了，开始练习 <ArrowRight size={18}/></button>
          </div>
        </div>
      )}
      {showReset && (
        <div className="modal-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowReset(false); }}>
          <div role="dialog" aria-modal="true" aria-labelledby="reset-title" className="modal-card">
            <button autoFocus type="button" onClick={() => setShowReset(false)} className="modal-close" aria-label="关闭清空确认"><X size={19}/></button>
            <div className="modal-icon !bg-rose-50 !text-rose-500"><RotateCcw size={23}/></div>
            <h2 id="reset-title" className="mt-4 text-[23px] font-black text-ink">确定清空学习记录？</h2>
            <p className="mt-3 text-sm leading-7 text-[#887e99]">已完成的句子、积分和错题记录都会被删除，且无法恢复。</p>
            <div className="mt-7 flex gap-3"><button className="secondary-button flex-1" onClick={() => setShowReset(false)}>取消</button><button className="primary-button flex-1 !bg-rose-500 hover:!bg-rose-600" onClick={() => {game.resetProgress();setShowReset(false);}}>确认清空</button></div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
