import { useState } from 'react';
import type { Sentence } from '../types/game';

export function GrammarExplanation({ sentence }: { sentence: Sentence; complete?: boolean }) {
  const [selected, setSelected] = useState<{ id: string; index: number } | null>(null);
  const index = selected?.id === sentence.id ? selected.index : -1;
  const group = sentence.grammar[index];
  return (
    <section className="grammar-explanation" aria-label="语法说明">
      <div className="grammar-explanation-heading">
        <h3>语法说明</h3>
        <div className="grammar-tabs" aria-label="选择语法解析">
          <button type="button" aria-pressed={!group} onClick={() => setSelected(null)}>整句</button>
          {sentence.grammar.map((item, i) => <button type="button" key={item.start} aria-pressed={index === i} style={{ color: item.color }} onClick={() => setSelected({ id: sentence.id, index: i })}>{item.role}</button>)}
        </div>
      </div>
      <p className="grammar-note" aria-live="polite">{group?.explanation ?? sentence.note}</p>
    </section>
  );
}
