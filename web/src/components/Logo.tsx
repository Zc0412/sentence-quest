import Image from 'next/image';
import Link from 'next/link';

export function Logo() {
  return (
    <Link href="/" aria-label="句跃 SentLeap 首页" className="inline-flex h-10 w-[120px] shrink-0 rounded-md">
      <Image
      src="/sentleap-logo.png"
      alt="句跃 SentLeap"
      width={120}
      height={40}
      priority
      className="h-10 w-[120px] shrink-0 object-contain"
      />
    </Link>
  );
}
