export function getTypingKey(event: { code: string; key: string; shiftKey: boolean }, inputCharacters = '') {
  if (/^Key[A-Z]$/.test(event.code)) return event.code.slice(3).toLowerCase();
  if (event.code === 'Quote' && !event.shiftKey) return "'";
  if (event.code === 'Minus' && !event.shiftKey) return '-';
  if (event.code === 'Backspace' || event.code === 'Escape') return event.code;
  const symbols: Record<string, string> = {
    Space: '  ', Period: '.>', Comma: ',<', Slash: '/?', Semicolon: ';:',
    Quote: '\'"', Minus: '-_', Equal: '=+', BracketLeft: '[{', BracketRight: ']}',
    Backslash: '\\|', Backquote: '`~',
    Digit0: '0)', Digit1: '1!', Digit2: '2@', Digit3: '3#', Digit4: '4$',
    Digit5: '5%', Digit6: '6^', Digit7: '7&', Digit8: '8*', Digit9: '9(',
  };
  const symbol = symbols[event.code]?.[event.shiftKey ? 1 : 0];
  if (symbol && inputCharacters.includes(symbol)) return symbol;
  if (/^[a-zA-Z'’-]$/.test(event.key) || event.key === 'Backspace' || event.key === 'Escape') return event.key;
  if (event.key.length === 1 && inputCharacters.includes(event.key)) return event.key;
  return null;
}
