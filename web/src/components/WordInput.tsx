import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent, CompositionEvent, KeyboardEvent } from 'react';
import { Input } from './ui/input';
import { getTypingKey } from '../utils/typingKey';

interface Props {
  value: string;
  onChange: (value: string) => void;
  wordNumber: number;
  focusSignal: number;
  error: string;
  suppressIme?: boolean;
  inputCharacters?: string;
  onMoveWord?: (direction: number) => void;
}


/**
 * 真正的 input 仍保留（移动端软键盘、输入法、辅助技术都需要它），
 * 但覆盖在当前单词卡片之上且透明；用户看到的是卡片内的逐字反馈。
 */
export function WordInput({ value, onChange, wordNumber, focusSignal, error, suppressIme = false, inputCharacters = '', onMoveWord }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const composing = useRef(false);
  const physicalComposition = useRef(false);
  const [compositionValue, setCompositionValue] = useState('');
  const [useSoftKeyboard, setUseSoftKeyboard] = useState(false);
  const readOnly = suppressIme && !useSoftKeyboard;

  useEffect(() => {
    const query = window.matchMedia('(pointer: coarse)');
    const update = () => setUseSoftKeyboard(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    inputRef.current?.focus({ preventScroll: true });
  }, [wordNumber, focusSignal]);

  useEffect(() => {
    function resumeTyping(event: globalThis.KeyboardEvent) {
      const input = inputRef.current;
      if (!input || document.activeElement === input || event.defaultPrevented
        || event.ctrlKey || event.metaKey || event.altKey || document.querySelector('[aria-modal="true"], [data-learning-popover]')) return;
      const target = event.target;
      if (target instanceof HTMLElement && target.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="textbox"]')) return;
      const key = getTypingKey(event, inputCharacters);
      if (!key) return;
      // 主动接住重新聚焦的第一个按键，避免用户必须点击或丢失首字母。
      event.preventDefault();
      input.focus({ preventScroll: true });
      onChange(key === 'Escape' ? '' : key === 'Backspace' ? value.slice(0, -1) : value + key);
    }
    function resumeFocus() {
      const active = document.activeElement;
      if (document.querySelector('[aria-modal="true"], [data-learning-popover]') || (active instanceof HTMLElement && active !== document.body && active !== inputRef.current)) return;
      inputRef.current?.focus({ preventScroll: true });
    }
    document.addEventListener('keydown', resumeTyping);
    window.addEventListener('focus', resumeFocus);
    return () => {
      document.removeEventListener('keydown', resumeTyping);
      window.removeEventListener('focus', resumeFocus);
    };
  }, [onChange, value, inputCharacters]);

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    if (physicalComposition.current) {
      if (!composing.current) physicalComposition.current = false;
      return;
    }
    if (composing.current) {
      setCompositionValue(event.currentTarget.value);
      return;
    }
    onChange(event.currentTarget.value);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.key === 'Tab' && onMoveWord && !composing.current && !event.nativeEvent.isComposing) {
      event.preventDefault();
      onMoveWord(event.shiftKey ? -1 : 1);
      return;
    }
    const key = getTypingKey(event, inputCharacters);
    if (key) {
      event.preventDefault();
      // IME 可能将 key 设为 Process/Unidentified，code 仍表示实际字母键。
      if (composing.current || event.nativeEvent.isComposing || event.keyCode === 229) {
        physicalComposition.current = true;
      } else {
        physicalComposition.current = false;
      }
      const input = event.currentTarget;
      const start = readOnly || composing.current ? value.length : input.selectionStart ?? value.length;
      const end = readOnly || composing.current ? value.length : input.selectionEnd ?? value.length;
      onChange(key === 'Escape' ? '' : key === 'Backspace'
        ? value.slice(0, start === end ? Math.max(0, start - 1) : start) + value.slice(end)
        : value.slice(0, start) + key + value.slice(end));
      return;
    }
    if (composing.current || event.nativeEvent.isComposing) return;
    if (event.key === ' ' || event.key === 'Enter') {
      // 单词拼对后自动通过，无需空格和回车；拦截多余的空白。
      event.preventDefault();
    }
  }

  function handleCompositionEnd(event: CompositionEvent<HTMLInputElement>) {
    composing.current = false;
    setCompositionValue('');
    if (!physicalComposition.current) onChange(event.currentTarget.value);
  }

  return (
    <Input
      ref={inputRef}
      className="inline-typing-input"
      value={composing.current && !physicalComposition.current ? compositionValue : value}
      onChange={handleChange}
      onCompositionStart={() => { composing.current = true; physicalComposition.current = false; }}
      onCompositionEnd={handleCompositionEnd}
      onKeyDown={handleKeyDown}
      type="text"
      // 只读输入仍接收 keydown，但不会启动系统 IME；触屏保留软键盘。
      readOnly={readOnly}
      autoComplete="off"
      autoCorrect="off"
      autoCapitalize="off"
      spellCheck={false}
      lang="en"
      inputMode="text"
      enterKeyHint="done"
      aria-label={`第 ${wordNumber} 个英文单词，直接输入字母`}
      aria-invalid={Boolean(error)}
      aria-describedby="typing-feedback"
    />
  );
}
