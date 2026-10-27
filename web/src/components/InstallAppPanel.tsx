'use client';

import { CheckCircle2, Download, MonitorSmartphone } from 'lucide-react';
import { usePwa } from './PwaProvider';
import { Button } from './ui/button';

export function InstallAppPanel() {
  const { ready, installed, canInstall, pending, secure, platform, message, install } = usePwa();
  return (
    <div className="space-y-6 pb-16">
      <div>
        <h1 className="text-2xl font-bold">安装应用</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">把 SentLeap 放到桌面或手机主屏幕，下次练习一键打开。</p>
      </div>
      <section aria-label="安装 SentLeap" className="rounded-2xl border border-blue-100 bg-white p-5 sm:p-7">
        <div className="flex items-center gap-4">
          <MonitorSmartphone className="h-12 w-12 shrink-0 rounded-2xl bg-blue-50 p-2.5 text-blue-600" />
          <div><h2 className="text-lg font-bold">SentLeap</h2><p className="mt-1 text-sm text-slate-500">一词一跃，玩会英语</p></div>
        </div>
        {!ready ? <p className="mt-6 text-sm text-slate-500">正在检查安装方式…</p> : installed ? (
          <p className="mt-6 flex items-center gap-2 font-semibold text-emerald-700" role="status"><CheckCircle2 size={20} />已在应用中打开或已完成安装</p>
        ) : !secure ? (
          <p className="mt-6 text-sm leading-7 text-slate-600">请通过网站的 HTTPS 地址打开，再安装到设备。当前连接不支持应用安装。</p>
        ) : (
          <div className="mt-6 space-y-4 text-sm leading-7 text-slate-600">
            {canInstall || pending ? <Button type="button" onClick={() => void install()} disabled={pending} className="h-12 w-full rounded-xl sm:w-auto"><Download size={18} />{pending ? '请在浏览器中确认…' : '安装 SentLeap'}</Button> : platform === 'ios' ? (
              <ol className="list-decimal space-y-2 pl-5"><li>在浏览器中打开分享菜单。</li><li>选择「添加到主屏幕」；如有「作为网页 App 打开」，保持开启。</li><li>点击「添加」，之后从主屏幕打开 SentLeap。</li></ol>
            ) : platform === 'mac' ? (
              <p>在 Safari 的「文件」或分享菜单中选择「添加到程序坞」，确认后即可从程序坞打开。需要支持此功能的 Safari 版本。</p>
            ) : platform === 'embedded' ? (
              <p>请先通过右上角菜单在系统浏览器中打开此页面，再安装或添加到主屏幕。</p>
            ) : (
              <p>在浏览器地址栏或菜单中查找「安装 SentLeap」「安装应用」或「添加到主屏幕」。浏览器允许快捷安装时，这里会显示安装按钮；如果没有对应菜单，可以尝试 Chrome 或 Edge。</p>
            )}
            {platform === 'ios' && <p className="text-slate-500">如果分享菜单里没有该选项，请用 Safari 打开本站。</p>}
          </div>
        )}
        {message && <p role="status" className="mt-4 text-sm leading-6 text-blue-700">{message}</p>}
      </section>
      <div className="space-y-3 text-sm leading-7 text-slate-500">
        <p>安装后以独立窗口打开，功能随网站更新。打开应用、加载新题库和播放在线发音需要网络；断网时重新打开会显示离线提示。</p>
        <p>学习进度保存在当前浏览器或应用中，尚不支持账号同步。不同浏览器和系统可能使用独立存储；请勿通过清除网站数据来排查安装问题，以免丢失学习记录。</p>
      </div>
    </div>
  );
}
