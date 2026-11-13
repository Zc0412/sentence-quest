import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as vm from 'node:vm';
import * as ts from 'typescript';

/** 使用虚拟时钟验证长按与合并保存，不依赖真实等待或微信运行时。 */
export function testKeyboardTimers() {
  let now = 0;
  let nextId = 0;
  const timers = new Map<number, { at: number; run: () => void }>();
  const clock = {
    setTimeout(run: () => void, delay: number) {
      const id = ++nextId;
      timers.set(id, { at: now + delay, run });
      return id;
    },
    clearTimeout(id: number) {
      timers.delete(id);
    },
  };
  const advance = (duration: number) => {
    const end = now + duration;
    while (true) {
      const next = [...timers.entries()]
        .filter(([, timer]) => timer.at <= end)
        .sort((a, b) => a[1].at - b[1].at)[0];
      if (!next) break;
      timers.delete(next[0]);
      now = next[1].at;
      next[1].run();
    }
    now = end;
  };
  const load = (file: string, globals = {}) => {
    const exports: any = {};
    const source = fs.readFileSync(path.resolve(__dirname, '../miniprogram/utils', file), 'utf8');
    const compiled = ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    }).outputText;
    vm.runInNewContext(compiled, { exports, require, ...clock, ...globals });
    return exports;
  };

  const { createKeyRepeat } = load('key-repeat.ts');
  let letters = 20;
  const repeat = createKeyRepeat(() => --letters > 0);
  repeat.start();
  assert.equal(letters, 19, '按下立即删除');
  advance(349);
  assert.equal(letters, 19, '短按不会触发连续删除');
  advance(1 + 65 * 3);
  assert.equal(letters, 15, '长按延迟后连续删除');
  repeat.stop();
  advance(1000);
  assert.equal(letters, 15, '松手或页面取消后停止');
  letters = 2;
  repeat.start();
  advance(1000);
  assert.equal(letters, 0, '删除到空后停止，不继续触发回调');
  assert.equal(timers.size, 0);

  let saved: any;
  let writes = 0;
  let failWrite = false;
  let failRead = false;
  const wx = {
    getStorageSync() {
      if (failRead) throw new Error('read');
      return saved;
    },
    setStorageSync(_key: string, value: unknown) {
      if (failWrite) throw new Error('quota');
      writes += 1;
      saved = JSON.parse(JSON.stringify(value));
    },
    showToast() {},
  };
  const storageGlobals = {
    wx,
    require: () => ({ practiceXp: (first: boolean, perfect: boolean) => first ? (perfect ? 15 : 10) : 0 }),
  };
  const storage = load('storage.ts', storageGlobals);
  for (let index = 0; index < 10; index += 1) {
    storage.recordTyping({ input: 1, correct: 1 }, 'test', true);
    advance(40);
  }
  assert.equal(writes, 0, '快速输入不会逐字符同步写盘');
  assert.equal(storage.typingStats().input, 10, '内存统计立即可见');
  advance(100);
  assert.equal(writes, 1, '持续输入也按固定窗口保存');
  assert.equal(saved.typing.input, 10);
  storage.recordTyping({ input: 1, correct: 0 }, 'test', true);
  storage.flushTyping();
  assert.equal(saved.typing.input, 11, '离页补存最新统计');
  const afterFlush = writes;
  advance(1000);
  storage.flushTyping();
  assert.equal(writes, afterFlush, '补存取消旧定时器，没有数据时不重复写盘');
  storage.recordTyping({ input: 1, correct: 1 }, 'test', true);
  storage.complete('test', { id: 'one', words: ['cat'], english: 'cat' }, true, false);
  assert.equal(saved.typing.input, 12, '完成保存包含待落盘输入');
  assert.equal(saved.xp, 15);
  assert.equal(timers.size, 0, '关键进度保存后取消统计定时器');
  failWrite = true;
  storage.recordTyping({ input: 1, correct: 1 }, 'test', true);
  advance(500);
  assert.equal(storage.typingStats().input, 13, '写入失败仍保留内存统计');
  assert.equal(saved.typing.input, 12);
  failWrite = false;
  storage.flushTyping();
  assert.equal(saved.typing.input, 13, '写入失败后离页可以补存');
  failRead = true;
  const broken = load('storage.ts', storageGlobals);
  broken.recordTyping({ input: 1, correct: 1 }, 'test', true);
  broken.flushTyping();
  advance(1000);
  assert.equal(saved.typing.input, 13, '读取失败时不覆盖原记录');
}
