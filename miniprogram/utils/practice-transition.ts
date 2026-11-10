/** 首页到练习页的单次过渡；按实际卡片尺寸展开，离页或失败时恢复。 */
export type PracticeMotion = 'start' | 'continue';
type CardBounds = { left: number; top: number; width: number; height: number };
type TransitionHost = {
  measure(selector: string, done: (bounds?: CardBounds) => void): void;
  render(values: Record<string, unknown>): void;
  navigate(url: string, failed: () => void): void;
  failed(): void;
};

/** 同一次过渡只跳转一次；测量不可用时回退普通导航。 */
export function createPracticeTransition(host: TransitionHost) {
  let active = false;
  let generation = 0;
  let timers: ReturnType<typeof setTimeout>[] = [];

  function cancel() {
    generation += 1;
    active = false;
    timers.forEach(clearTimeout);
    timers = [];
    host.render({ practiceMotion: '', motionExpanded: false, motionBounds: '' });
  }

  function start(listId: string, motion: PracticeMotion) {
    if (active) return;
    active = true;
    const token = ++generation;
    let measured = false;
    const url = `/pages/practice/index?list=${encodeURIComponent(listId)}`;
    const later = (action: () => void, delay: number) => {
      timers.push(setTimeout(() => {
        if (generation === token) action();
      }, delay));
    };
    const failed = () => {
      if (generation !== token) return;
      cancel();
      host.failed();
    };
    const navigate = (animated: boolean) => {
      try {
        host.navigate(url + (animated ? `&entryMotion=${motion}` : ''), failed);
      } catch {
        failed();
      }
    };
    const measuredCard = (bounds?: CardBounds) => {
      if (generation !== token || measured) return;
      measured = true;
      if (!bounds || ![bounds.left, bounds.top, bounds.width, bounds.height].every(Number.isFinite)
        || bounds.width <= 0 || bounds.height <= 0) {
        navigate(false);
        return;
      }
      const radius = motion === 'start' ? 28 : 26;
      host.render({
        practiceMotion: motion,
        motionBounds: `left:${bounds.left}px;top:${bounds.top}px;width:${bounds.width}px;height:${bounds.height}px;border-radius:${radius}px;`,
        motionExpanded: false,
      });
      // 按钮反馈后展开卡片，省略 HTML 演示的停留与循环。
      later(() => host.render({ motionExpanded: true }), 320);
      later(() => navigate(true), 800);
    };
    later(() => measuredCard(), 160);
    try {
      host.measure(motion === 'start' ? '.welcome-card' : '.resume-card', measuredCard);
    } catch {
      measuredCard();
    }
  }

  return { start, cancel, isActive: () => active };
}
