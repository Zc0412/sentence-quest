"""Import the public catalog used by TypeWords /dict-list (Python 3 stdlib only)."""
import concurrent.futures
import datetime
import hashlib
import json
from pathlib import Path
import re
import time
import urllib.parse
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
BASE = 'https://files.typewords.cc'
OUT = ROOT / 'public/dictionaries/words'
OUT.mkdir(parents=True, exist_ok=True)
# Explicitly removed from the app; do not reimport during future syncs.
EXCLUDED_FILES = {'CET-4-frequency.json'}

def download(url):
    for attempt in range(3):
        try:
            with urllib.request.urlopen(url, timeout=90) as response:
                return json.load(response)
        except Exception:
            if attempt == 2:
                raise
            time.sleep(attempt + 1)

def normalize(item):
    name = str(item.get('word') or item.get('name') or '').strip()
    trans = []
    for meaning in item.get('trans') or []:
        text = meaning if isinstance(meaning, str) else ' '.join(filter(None, [meaning.get('pos'), meaning.get('cn')]))
        if text.strip() and text.strip() not in trans:
            trans.append(text.strip())
    if not name or not trans:
        raise ValueError(f'Missing word or translation: {name!r}')
    return {'name': name, 'trans': trans, 'ukphone': item.get('phonetic0') or item.get('ukphone') or '', 'usphone': item.get('phonetic1') or item.get('usphone') or ''}

def import_dict(entry):
    filename = entry['url']
    if not re.fullmatch(r'[A-Za-z0-9_.-]+\.json', filename):
        raise ValueError(f'Unexpected filename: {filename}')
    list_id = filename[:-5]
    source = f"{BASE}/dicts/{entry['language']}/word/{urllib.parse.quote(filename)}"
    raw = download(source)
    if not isinstance(raw, list) or not raw:
        raise ValueError(f'Empty dictionary: {filename}')
    words, seen, skipped = [], {}, []
    for item in raw:
        try:
            word = normalize(item)
        except ValueError:
            skipped.append(str(item.get('word') or item.get('name') or ''))
            continue
        key = word['name'].lower().replace('’', "'").replace('‘', "'")
        if key in seen:
            existing = words[seen[key]]
            existing['trans'] = list(dict.fromkeys(existing['trans'] + word['trans']))
        else:
            seen[key] = len(words)
            words.append(word)
    if not words:
        raise ValueError(f'No usable words: {filename}')
    # Existing progress indexes refer to the original order of these two lists.
    legacy = OUT / filename
    if list_id in ('CET4_T', 'CET6_T') and legacy.exists():
        words = json.loads(legacy.read_text())
    content = json.dumps(words, ensure_ascii=False, separators=(',', ':')) + '\n'
    (OUT / filename).write_text(content)
    print(f'{list_id}: {len(words)} words', flush=True)
    return {'id': list_id, 'label': entry['name'], 'description': entry.get('description') or entry['name'], 'wordCount': len(words), 'category': entry['category'], 'tags': entry.get('tags', []), 'sourceId': entry['id'], 'sourceUrl': source, 'sourceWordCount': len(raw), 'skippedWords': skipped, 'sha256': hashlib.sha256(content.encode()).hexdigest()}

if __name__ == '__main__':
    catalog = download(f'{BASE}/list/word.json')
    assert catalog and len({item['url'] for item in catalog}) == len(catalog), 'Invalid catalog'
    catalog = [entry for entry in catalog if entry['url'] not in EXCLUDED_FILES]
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
        manifest = list(pool.map(import_dict, catalog))
    (ROOT / 'src/data/vocabulary-catalog.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
    (OUT / 'source.json').write_text(json.dumps({'catalogUrl': f'{BASE}/list/word.json', 'project': 'https://github.com/zyronon/TypeWords', 'fetchedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'dictionaryCount': len(manifest), 'catalog': catalog}, ensure_ascii=False, indent=2) + '\n')
    print(f'Imported {len(manifest)} dictionaries, {sum(x["wordCount"] for x in manifest)} words.')
