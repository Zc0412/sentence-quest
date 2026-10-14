import { ArrowRight, RotateCcw, Check, Volume2 } from 'lucide-react';
import type { Sentence } from '../types/game';
import { speakEnglish, speakWord } from '../utils/speech';
import { WordSlots } from './WordSlots';
import { GrammarExplanation } from './GrammarExplanation';

interface Props {
  sentence: Sentence;
  earnedXp: number;
  mistakes: number;
  hints: number;
  onNext: () => void;
  onReplay: () => void;
}

export function CompletionPanel({ sentence, earnedXp, mistakes, hints, onNext, onReplay }: Props) {
  const isPerfect = mistakes === 0 && hints === 0;
  return (
    <div className="completion-panel animate-appear">
      <div className="completion-heading"><span className="completion-check"><Check size={20} /></span><h2>漂亮，完成一句！</h2><span className="completion-xp">{earnedXp > 0 ? `+${earnedXp} XP` : '练习完成'}</span></div>
      <p className="completion-translation">{sentence.zh}</p>
      <WordSlots sentence={sentence} index={sentence.words.length} onSpeakWord={speakWord} />
      <div className="completion-caption"><span>{isPerfect ? '完全正确 · 未使用提示' : `${mistakes} 次纠错 · ${hints} 次提示`}</span><button type="button" onClick={() => speakEnglish(sentence.english)} className="text-action"><Volume2 size={17} /> 朗读整句</button></div>
      <div className="completion-actions"><button type="button" onClick={onReplay} className="secondary-button"><RotateCcw size={18}/> 再练一次</button><button type="button" onClick={onNext} className="primary-button">继续下一句 <ArrowRight size={18}/></button></div>
      <GrammarExplanation sentence={sentence} complete />
    </div>
  );
}
