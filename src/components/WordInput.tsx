import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent, CompositionEvent, KeyboardEvent } from 'react';
import { Input } from './ui/input';

interface Props {
  value: string;
  onChange: (value: string) => void;
  wordNumber: number;
  focusSignal: number;
  error: string;
}

/**
 * 真正的 input 仍保留（移动端软键盘、输入法、辅助技术都需要它），
 * 但覆盖在当前单词卡片之上且透明；用户看到的是卡片内的逐字反馈。
 */
export function WordInput({ value, onChange, wordNumber, focusSignal, error }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const composing = useRef(false);
  const [compositionValue, setCompositionValue] = useState('');

  useEffect(() => {
    inputRef.current?.focus({ preventScroll: true });
  }, [wordNumber, focusSignal]);

  useEffect(() => {
    function resumeTyping(event: globalThis.KeyboardEvent) {
      const input = inputRef.current;
      if (!input || document.activeElement === input || event.defaultPrevented
        || event.ctrlKey || event.metaKey || event.altKey || event.isComposing
        || event.keyCode === 229 || document.querySelector('[aria-modal="true"]')) return;
      const target = event.target;
      if (target instanceof HTMLElement && target.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="textbox"]')) return;
      if (!/^[a-zA-Z'’-]$/.test(event.key) && event.key !== 'Backspace' && event.key !== 'Escape') return;
      // 主动接住重新聚焦的第一个按键，避免用户必须点击或丢失首字母。
      event.preventDefault();
      input.focus({ preventScroll: true });
      onChange(event.key === 'Escape' ? '' : event.key === 'Backspace' ? value.slice(0, -1) : value + event.key);
    }
    function resumeFocus() {
      const active = document.activeElement;
      if (document.querySelector('[aria-modal="true"]') || (active instanceof HTMLElement && active !== document.body && active !== inputRef.current)) return;
      inputRef.current?.focus({ preventScroll: true });
    }
    document.addEventListener('keydown', resumeTyping);
    window.addEventListener('focus', resumeFocus);
    return () => {
      document.removeEventListener('keydown', resumeTyping);
      window.removeEventListener('focus', resumeFocus);
    };
  }, [onChange, value]);

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    if (composing.current) {
      setCompositionValue(event.currentTarget.value);
      return;
    }
    onChange(event.currentTarget.value);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (composing.current || event.nativeEvent.isComposing || event.keyCode === 229) return;
    if (event.key === ' ' || event.key === 'Enter') {
      // 单词拼对后自动通过，无需空格和回车；拦截多余的空白。
      event.preventDefault();
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      onChange('');
    }
  }

  function handleCompositionEnd(event: CompositionEvent<HTMLInputElement>) {
    composing.current = false;
    setCompositionValue('');
    onChange(event.currentTarget.value);
  }

  return (
    <Input
      ref={inputRef}
      className="inline-typing-input"
      value={composing.current ? compositionValue : value}
      onChange={handleChange}
      onCompositionStart={() => { composing.current = true; }}
      onCompositionEnd={handleCompositionEnd}
      onKeyDown={handleKeyDown}
      type="text"
      autoComplete="off"
      autoCorrect="off"
      autoCapitalize="off"
      spellCheck={false}
      inputMode="text"
      enterKeyHint="done"
      aria-label={`第 ${wordNumber} 个英文单词，直接输入字母`}
      aria-invalid={Boolean(error)}
      aria-describedby="typing-feedback"
    />
  );
}
