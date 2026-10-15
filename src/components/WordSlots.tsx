import type { CSSProperties } from 'react';
import type { Sentence } from '../types/game';
import { isCorrectPrefix } from '../utils/validator';
import { SpellingSlot } from './SpellingSlot';

interface Props {
  sentence: Sentence;
  index: number;
  revealedLetters?: number;
  typed?: string;
  error?: string;
  focusSignal?: number;
  onChange?: (value: string) => void;
  onSpeakWord: (word: string) => void;
}

export function WordSlots({ sentence, index, revealedLetters = 0, typed = '', error = '', focusSignal = 0, onChange, onSpeakWord }: Props) {
  const { words, annotations, grammar } = sentence;
  return (
    <div className="sentence-typing-board" aria-label="英文句子结构与拼写进度">
      {grammar.map((group) => (
        <div key={group.start} className="grammar-group" style={{ '--group-color': group.color } as CSSProperties} role="group" aria-label={group.role}>
          <span className="grammar-group-label">{group.role}</span>
          <div className="grammar-group-words">
            {words.slice(group.start, group.end).map((word, offset) => {
              const i = group.start + offset;
              const detail = annotations[i];
              const passed = i < index;
              const active = i === index;
              const incorrect = active && Boolean(typed) && !isCorrectPrefix(typed, word);
              return (
                <div key={`${i}-${word}`} className={`annotated-word ${active ? 'annotated-word-active' : ''} ${incorrect ? 'annotated-word-incorrect' : ''}`} style={{ '--word-color': detail.color } as CSSProperties}>
                  <span className="word-phonetic">{detail.phonetic}</span>
                  <SpellingSlot
                    word={word}
                    index={i}
                    active={active}
                    passed={passed}
                    typed={typed}
                    revealedLetters={revealedLetters}
                    error={error}
                    focusSignal={focusSignal}
                    onChange={onChange}
                    onSpeakWord={onSpeakWord}
                  />
                  <span className="word-color-line" />
                  <span className="word-meaning">{detail.meaning}</span>
                  <span className="word-pos">{detail.pos}</span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
