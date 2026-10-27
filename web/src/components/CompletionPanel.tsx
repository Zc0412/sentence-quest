import { useEffect } from 'react';
import { ArrowRight, RotateCcw, Check, Volume2 } from 'lucide-react';
import type { Sentence } from '../types/game';
import { speakEnglish, speakWord } from '../utils/speech';
import { WordSlots } from './WordSlots';
import { GrammarExplanation } from './GrammarExplanation';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

interface Props {
  sentence: Sentence;
  earnedXp: number;
  mistakes: number;
  hints: number;
  onNext: () => void;
  onReplay: () => void;
  shortcutsEnabled?: boolean;
}

export function CompletionPanel({ sentence, earnedXp, mistakes, hints, onNext, onReplay, shortcutsEnabled = true }: Props) {
  const isPerfect = mistakes === 0 && hints === 0;
  useEffect(() => {
    if (!shortcutsEnabled) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (document.querySelector('[aria-modal="true"], [data-learning-popover]')) return;
      if (event.defaultPrevented || event.repeat || event.isComposing || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
      const target = event.target;
      if (target instanceof HTMLElement && (target.closest('input, textarea, select') || target.isContentEditable)) return;
      if (event.key.toLowerCase() === 'r') {
        event.preventDefault();
        onReplay();
      } else if (event.key === 'Enter') {
        // 查看语法后，Enter 仍继续下一句；其他按钮、链接保留原生操作。
        if (target instanceof HTMLElement
          && target.closest('button, a, summary, [role="button"]')
          && !target.closest('.grammar-explanation')) return;
        event.preventDefault();
        onNext();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [shortcutsEnabled, onNext, onReplay]);
  return (
    <div className="completion-panel animate-appear">
      <div className="completion-heading"><span className="completion-check"><Check size={20} /></span><h2>漂亮，完成一句！</h2><Badge variant="secondary" className="completion-xp">{earnedXp > 0 ? `+${earnedXp} XP` : '练习完成'}</Badge></div>
      <p className="completion-translation">{sentence.zh}</p>
      <WordSlots sentence={sentence} index={sentence.words.length} onSpeakWord={speakWord} />
      <div className="completion-caption"><span>{isPerfect ? '完全正确 · 未使用提示' : `${mistakes} 次纠错 · ${hints} 次提示`}</span><Button type="button" variant="ghost" onClick={() => speakEnglish(sentence.english)} className="text-action h-auto"><Volume2 size={17} /> 朗读整句</Button></div>
      <div className="completion-actions"><Button type="button" variant="secondary" onClick={onReplay} aria-keyshortcuts="r" className="secondary-button"><RotateCcw size={18}/> 再练一次 <kbd>R</kbd></Button><Button type="button" onClick={onNext} aria-keyshortcuts="Enter" className="primary-button">继续下一句 <kbd>Enter</kbd><ArrowRight size={18}/></Button></div>
      <GrammarExplanation sentence={sentence} complete />
    </div>
  );
}
