/** 品牌标识：透明图标搭配名称与后台说明，供登录页和侧栏共用。 */
export default function Brand() {
  return (
    <>
      <img
        className="brand-logo"
        src="/admin/sentleap-app-icon.png"
        alt=""
        width={56}
        height={56}
      />
      <span className="brand-copy">
        <span className="brand-name">SentLeap</span>
        <span className="brand-caption">句跃 · 内容管理</span>
      </span>
    </>
  );
}
