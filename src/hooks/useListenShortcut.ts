import { useEffect } from 'react';

export function useListenShortcut(word: string, onSpeak: (word: string) => void, enabled = true) {
  useEffect(() => {
    if (!enabled || !word) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.repeat || event.isComposing
        || !event.altKey || event.ctrlKey || event.metaKey || event.shiftKey
        || event.code !== 'KeyP' || document.querySelector('[aria-modal="true"]')) return;
      event.preventDefault();
      onSpeak(word);
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [word, onSpeak, enabled]);
}
