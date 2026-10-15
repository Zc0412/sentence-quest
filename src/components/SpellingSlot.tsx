import { WordInput } from './WordInput';
import { isCorrectPrefix } from '../utils/validator';
import { Button } from './ui/button';

interface Props {
  word: string;
  index: number;
  active: boolean;
  passed: boolean;
  typed: string;
  revealedLetters: number;
  error: string;
  focusSignal: number;
  onChange?: (value: string) => void;
  onSpeakWord: (word: string) => void;
}

export function SpellingSlot({
  word,
  index,
  active,
  passed,
  typed,
  revealedLetters,
  error,
  focusSignal,
  onChange,
  onSpeakWord,
}: Props) {
  return (
    <div className="word-spelling">
      {passed ? (
        <Button type="button" variant="ghost" className="completed-word" onClick={() => onSpeakWord(word)} title={`点击朗读 ${word}`} aria-label={`已完成 ${word}，点击朗读`}>{word}</Button>
      ) : (
        <div className="typing-word" aria-label={`${active ? '正在输入' : '待完成'}第 ${index + 1} 个单词，${word.length} 个字母`}>
          <span className="spelling-letters" aria-hidden="true">
            {Array.from(word).map((letter, letterIndex) => {
              const entered = active && letterIndex < typed.length;
              const hinted = active && !entered && letterIndex < revealedLetters;
              const good = entered && isCorrectPrefix(typed.slice(0, letterIndex + 1), word);
              return (
                <span key={letterIndex} className={`spelling-letter ${entered ? good ? 'is-correct' : 'is-wrong' : hinted ? 'is-hint' : 'is-hidden'}`}>
                  <span className="letter-width">{letter}</span>
                  <span className="letter-display">{entered ? typed[letterIndex] : hinted ? letter : '·'}</span>
                </span>
              );
            })}
          </span>
          {active && onChange && <WordInput value={typed} onChange={onChange} wordNumber={index + 1} error={error} focusSignal={focusSignal} />}
        </div>
      )}
    </div>
  );
}
