// Split only at a part-of-speech label, preserving semicolons inside a meaning.
function wordDefinitions(item) {
  const annotation = (item.annotations || [])[0] || {};
  const sources = item.definitions || [annotation.meaning || item.zh || ''];
  const rows = sources.flatMap((source) => source.split(/[；;]\s*(?=(?:vt|vi|n|v|adj|adv|a|ad|prep|pron|conj|interj|num|art|aux|pref|abbr)\.)/i));
  return rows.filter((row) => row.trim()).map((row, index) => {
    const match = row.trim().match(/^((?:[a-z]+\.)\s*(?:&\s*[a-z]+\.)?)\s*(.*)$/i);
    const pos = match ? match[1].trim() : annotation.pos || '';
    const color = pos === 'vt.' ? '#b45309' : /^(v|vi)\./.test(pos) ? '#be123c' : '#2f6fed';
    return { index, pos, meaning: match ? match[2] : row.trim(), color };
  });
}
module.exports = { wordDefinitions };
