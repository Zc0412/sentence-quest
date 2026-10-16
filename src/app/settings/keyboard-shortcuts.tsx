const groups = [
  {
    title: '练习输入',
    description: '适用于正在输入的单词、短语和句子。',
    shortcuts: [
      { keys: ['A–Z'], action: '输入字母', detail: '拼写正确后自动通过，无需按回车确认。' },
      { keys: ['Backspace'], action: '删除输入', detail: '删除前一个字母；有选中文字时删除选中内容。' },
      { keys: ['Esc'], action: '清空当前单词的输入', detail: '不会清空学习记录。弹窗打开时，Esc 用于关闭弹窗。' },
      { keys: ['Alt', 'P'], action: '听当前单词', detail: '练习过程中可用；弹窗打开时暂停。Mac 使用 Option + P。' },
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
  {
    title: '设置与弹窗操作',
    description: '聚焦对应控件后使用，遵循控件的键盘操作方式。',
    shortcuts: [
      { keys: ['Tab'], action: '聚焦下一个控件', detail: 'Shift + Tab 返回上一个控件；短语输入区使用上方的切词规则。' },
      { keys: ['←', '→'], action: '切换设置标签', detail: '焦点在设置标签上时，在学习内容、练习设置和快捷键之间切换。' },
      { keys: ['↑', '↓'], action: '切换下拉选项', detail: '下拉菜单打开后移动选项，Enter 确认选择，Esc 收起。' },
      { keys: ['Home', 'End'], action: '跳到首项或末项', detail: '焦点在设置标签或已打开的下拉菜单中时使用，两个按键分别操作。' },
      { keys: ['Space'], action: '切换开关或触发按钮', detail: '焦点在字母提示开关或按钮上时使用；Enter 也可触发按钮。' },
      { keys: ['Esc'], action: '关闭弹窗或下拉菜单', detail: '反馈正在提交时，弹窗暂时不能关闭。' },
    ],
  },
];

export default function KeyboardShortcuts() {
  return (
    <div className="space-y-5 pb-20">
      <header>
        <h1 className="text-2xl font-bold">快捷键</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">按使用场景查看键盘操作。组合键需同时按下，方向键可分别使用。</p>
      </header>
      {groups.map((group) => (
        <section key={group.title} className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
          <h2 className="font-semibold text-slate-900">{group.title}</h2>
          <p className="mt-1 text-xs leading-5 text-slate-500">{group.description}</p>
          <dl className="mt-3 divide-y divide-slate-100">
            {group.shortcuts.map((shortcut) => (
              <div key={shortcut.action} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-start sm:gap-5">
                <dt className="flex shrink-0 items-center gap-1.5 sm:w-36" aria-label={shortcut.keys.join(shortcut.keys[0] === 'Shift' || shortcut.keys[0] === 'Alt' ? ' + ' : ' / ')}>
                  {shortcut.keys.map((key) => <kbd key={key} className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 font-mono text-xs font-semibold text-slate-700 shadow-sm">{key}</kbd>)}
                </dt>
                <dd className="min-w-0">
                  <p className="text-sm font-medium text-slate-800">{shortcut.action}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">{shortcut.detail}</p>
                </dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
      <p className="text-xs leading-6 text-slate-500">单词模式中，词组空格自动补齐，也可手动输入；数字及标点按目标词条输入。“多给一个字母”和“跳过当前词”目前没有专用快捷键，可通过按钮操作。</p>
    </div>
  );
}
