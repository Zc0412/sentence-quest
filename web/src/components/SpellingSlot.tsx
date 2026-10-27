import { WordInput } from './WordInput';
import { isCorrectPrefix } from '../utils/validator';

interface Props {
  word: string;
  index: number;
  active: boolean;
  passed: boolean;
  typed: string;
  revealedLetters: number;
  error: string;
  focusSignal: number;
  suppressIme?: boolean;
  onSelect?: () => void;
  onMoveWord?: (direction: number) => void;
  showDraft?: boolean;
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
  suppressIme,
  onSelect,
  onMoveWord,
  showDraft = false,
  onChange,
  onSpeakWord,
}: Props) {
  const letters = (
    <span className="spelling-letters" aria-hidden="true">
      {Array.from(word).map((letter, letterIndex) => {
        const entered = (active || showDraft) && letterIndex < typed.length;
        const hinted = (active || showDraft) && !entered && letterIndex < revealedLetters;
        const good = entered && isCorrectPrefix(typed.slice(0, letterIndex + 1), word);
        const displayed = passed ? letter : entered ? typed[letterIndex] : hinted ? letter : '·';
        return (
          <span key={letterIndex} className={`spelling-letter ${passed ? 'is-correct' : entered ? good ? 'is-correct' : 'is-wrong' : hinted ? 'is-hint' : 'is-hidden'}`}>
            <span className="letter-width">{letter === ' ' ? '\u00a0' : letter}</span>
            <span className="letter-display">{displayed === ' ' ? '\u00a0' : displayed}</span>
          </span>
        );
      })}
    </span>
  );

  return (
    <div className="word-spelling">
      {passed ? (
        <button type="button" className="completed-word" onClick={() => onSpeakWord(word)} title={`点击朗读 ${word}`} aria-label={`已完成 ${word}，点击朗读`}>{letters}</button>
      ) : !active && onSelect ? (
        <button type="button" className="completed-word" onClick={onSelect} aria-label={`输入第 ${index + 1} 个单词，${word.length} 个字母`}>{letters}</button>
      ) : (
        <div className="typing-word" aria-label={`${active ? '正在输入' : '待完成'}第 ${index + 1} 个单词，${word.length} 个字母`}>
          {letters}
          {active && onChange && <WordInput value={typed} onChange={onChange} wordNumber={index + 1} error={error} focusSignal={focusSignal} suppressIme={suppressIme} inputCharacters={word} onMoveWord={onMoveWord} />}
        </div>
      )}
    </div>
  );
}
