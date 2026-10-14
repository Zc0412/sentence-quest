import type { CSSProperties } from 'react';
import type { Sentence } from '../types/game';
import { WordInput } from './WordInput';
import { isCorrectPrefix } from '../utils/validator';

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
                  <div className="word-spelling">
                    {passed ? (
                      <button type="button" className="completed-word" onClick={() => onSpeakWord(word)} title={`点击朗读 ${word}`} aria-label={`已完成 ${word}，点击朗读`}>{word}</button>
                    ) : (
                      <div className="typing-word" aria-label={`${active ? '正在输入' : '待完成'}第 ${i + 1} 个单词，${word.length} 个字母`}>
                        <span className="spelling-letters" aria-hidden="true">
                          {Array.from(word).map((letter, j) => {
                            const entered = active && j < typed.length;
                            const hinted = active && !entered && j < revealedLetters;
                            const good = entered && isCorrectPrefix(typed.slice(0, j + 1), word);
                            return <span key={j} className={`spelling-letter ${entered ? good ? 'is-correct' : 'is-wrong' : hinted ? 'is-hint' : 'is-hidden'}`}><span className="letter-width">{letter}</span><span className="letter-display">{entered ? typed[j] : hinted ? letter : '·'}</span></span>;
                          })}
                        </span>
                        {active && onChange && <WordInput value={typed} onChange={onChange} wordNumber={i + 1} error={error} focusSignal={focusSignal} />}
                      </div>
                    )}
                  </div>
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
