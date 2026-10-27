import type { CSSProperties } from 'react';
import { SpellingSlot } from './SpellingSlot';

interface Props {
  words: string[];
  phonetics: string[];
  activeIndex: number;
  typed: string;
  revealedLetters: number;
  error: string;
  focusSignal: number;
  label: string;
  onChange: (value: string) => void;
  onSpeakWord: (word: string) => void;
  completedIndices?: number[];
  drafts?: Record<number, { typed: string; error: string; revealed: number }>;
  onSelectWord?: (index: number) => void;
  onMoveWord?: (direction: number) => void;
}

export function PracticeSpellingBoard({ words, phonetics, activeIndex, typed, revealedLetters, error, focusSignal, label, onChange, onSpeakWord, completedIndices, drafts, onSelectWord, onMoveWord }: Props) {
  const characterCount = words.join(' ').length;

  return (
    <div className="sentence-typing-board" aria-label={label}>
      <div
        className="grammar-group vocabulary-grammar-group"
        style={{ '--group-color': '#3b82f6', '--vocabulary-font-size': `clamp(16px, ${Math.min(12, 125 / Math.max(1, characterCount))}vw, 108px)` } as CSSProperties}
        role="group"
        aria-label={label}
      >
        <div className="grammar-group-words">
          {words.map((word, index) => {
            const active = index === activeIndex;
            const incorrect = active && Boolean(error);
            return (
              <div key={`${index}-${word}`} className={`annotated-word ${active ? 'annotated-word-active' : ''} ${incorrect ? 'annotated-word-incorrect' : ''}`} style={{ '--word-color': '#3b82f6' } as CSSProperties}>
                <span className="word-phonetic">{phonetics[index] ?? ''}</span>
                <SpellingSlot
                  suppressIme
                  word={word}
                  index={index}
                  active={active}
                  passed={completedIndices ? completedIndices.includes(index) : index < activeIndex}
                  typed={active ? typed : drafts?.[index]?.typed ?? ''}
                  revealedLetters={active ? revealedLetters : drafts?.[index]?.revealed ?? 0}
                  showDraft={Boolean(drafts)}
                  onSelect={onSelectWord ? () => onSelectWord(index) : undefined}
                  onMoveWord={onMoveWord}
                  error={error}
                  focusSignal={focusSignal}
                  onChange={onChange}
                  onSpeakWord={onSpeakWord}
                />
                <span className={`word-color-line ${incorrect ? 'word-color-line-incorrect' : ''}`} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
