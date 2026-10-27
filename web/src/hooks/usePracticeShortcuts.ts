import { useEffect } from 'react';

export function usePracticeShortcuts({ listen, hint, skip, enabled = true }: {
  listen: () => void;
  hint?: () => void;
  skip?: () => void;
  enabled?: boolean;
}) {
  useEffect(() => {
    if (!enabled) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.repeat || event.isComposing
        || !event.altKey || event.ctrlKey || event.metaKey || event.shiftKey
        || document.querySelector('[aria-modal="true"], [role="dialog"][data-state="open"], [data-learning-popover]')) return;
      if (!['KeyP', 'KeyH', 'KeyN'].includes(event.code)) return;
      // Prevent Option-letter characters from being inserted on macOS, even when an action is disabled.
      event.preventDefault();
      const action = { KeyP: listen, KeyH: hint, KeyN: skip }[event.code];
      action?.();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [listen, hint, skip, enabled]);
}
