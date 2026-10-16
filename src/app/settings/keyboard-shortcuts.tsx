'use client';

import { useKeyboardPlatform } from '@/hooks/useKeyboardPlatform';

const groups = [
  {
    title: '常用练习操作',
    description: '在练习页使用，与“听当前单词”“多给一个字母”“跳过”按钮的效果一致。',
    shortcuts: [
      { keys: ['Alt', 'P'], action: '听当前单词', detail: '播放当前正在拼写的单词，使用已选择的英音或美音，不改变输入内容。' },
      { keys: ['Alt', 'H'], action: '多给一个字母', detail: '每按一次显示下一个字母，不会自动填入答案。需先在“练习设置”中启用字母提示；按钮隐藏或禁用时，快捷键也不可用。' },
      { keys: ['Alt', 'N'], action: '跳过当前词 / 短语 / 句子', detail: '单词模式跳到下一个单词；短语、句子模式跳过当前整题，不会把跳过的内容记为已掌握。仅切换短语内的单词请使用 Tab。' },
    ],
  },
  {
    title: '练习输入',
    description: '适用于正在输入的单词、短语和句子。',
    shortcuts: [
      { keys: ['A–Z'], action: '输入字母', detail: '拼写不区分大小写，输入会自动转换；拼写正确后自动通过，无需按回车确认。' },
      { keys: ['Backspace'], action: '删除输入', detail: '删除前一个字母；有选中文字时删除选中内容。' },
      { keys: ['Esc'], action: '清空当前单词的输入', detail: '不会清空学习记录。弹窗打开时，Esc 用于关闭弹窗。' },
    ],
  },
  {
    title: '短语中的单词切换',
    description: '仅在短语练习的单词输入区域聚焦时生效，包括首页精选短语。',
    shortcuts: [
      { keys: ['Tab'], action: '下一未完成词', detail: '跳过已完成的词，到末尾后循环查找。' },
      { keys: ['Shift', 'Tab'], action: '上一未完成词', detail: '反向查找未完成词，保留当前词的输入草稿。' },
    ],
  },
  {
    title: '句子 / 短语完成后',
    description: '在“漂亮，完成一句！”界面使用，不适用于单词模式的完成停留。',
    shortcuts: [
      { keys: ['R'], action: '再练一次', detail: '重新练习当前句子。' },
      { keys: ['Enter'], action: '继续下一句', detail: '焦点在其他按钮或链接上时，优先执行该控件的操作。' },
    ],
  },

];

export default function KeyboardShortcuts() {
  const { isMac, keyLabel } = useKeyboardPlatform();
  return (
    <div className="space-y-5 pb-20">
      <header>
        <h1 className="text-2xl font-bold">快捷键</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">当前显示 {isMac ? 'Mac' : 'Windows'} 快捷键。</p>
      </header>
      {groups.map((group) => (
        <section key={group.title} className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
          <h2 className="font-semibold text-slate-900">{group.title}</h2>
          <p className="mt-1 text-xs leading-5 text-slate-500">{group.description}</p>
          <dl className="mt-3 divide-y divide-slate-100">
            {group.shortcuts.map((shortcut) => (
              <div key={shortcut.action} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-start sm:gap-5">
                <dt className="flex shrink-0 flex-wrap items-center gap-1.5 sm:w-56" aria-label={shortcut.keys.map(keyLabel).join(shortcut.keys[0] === 'Shift' || shortcut.keys[0] === 'Alt' ? ' + ' : ' / ')}>
                  {shortcut.keys.map((key, index) => <span key={key} className="inline-flex items-center gap-1.5">
                    {index > 0 && <span aria-hidden="true" className="text-xs text-slate-400">{shortcut.keys[0] === 'Shift' || shortcut.keys[0] === 'Alt' ? '+' : '/'}</span>}
                    <kbd className="whitespace-nowrap rounded-md border border-slate-200 bg-slate-50 px-2 py-1 font-mono text-xs font-semibold text-slate-700 shadow-sm">{keyLabel(key)}</kbd>
                  </span>)}
                </dt>
                <dd className="min-w-0">
                  <p className="text-sm font-medium text-slate-800">{shortcut.action}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">{shortcut.detail.replace(/\b(Enter|Tab|Esc)\b/g, keyLabel)}</p>
                </dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
      <p className="text-xs leading-6 text-slate-500">单词模式中，词组空格自动补齐，也可手动输入；数字及标点按目标词条输入。弹窗打开时，听单词、字母提示和跳过快捷键暂停。</p>
    </div>
  );
}
