/** 长按删除：按下立即执行，延迟后连续执行；返回 false 时停止，避免空删。 */
export function createKeyRepeat(action: () => boolean) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let active = false;

  function stop() {
    active = false;
    clearTimeout(timer);
    timer = undefined;
  }

  function repeat() {
    if (!active || !action()) {
      stop();
      return;
    }
    timer = setTimeout(repeat, 65);
  }

  function start() {
    stop();
    active = true;
    if (!action()) {
      stop();
      return;
    }
    timer = setTimeout(repeat, 350);
  }

  return { start, stop };
}
