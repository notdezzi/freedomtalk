import Link from 'next/link';
import { Download } from 'lucide-react';
import { BirdWave, Spark, Star5, Squiggle, PlusFloat } from './illustrations';

const GITHUB_RELEASES = 'https://github.com/notdezzi/freedomtalk/releases';

/* Decorative stickers, each absolutely placed in % so they hug the
   panel edges on every viewport instead of being cropped by a cover
   fit. Icons render as their own tiny SVGs, never distorted. */
function Sticker({
  style,
  className,
  children,
}: {
  style: React.CSSProperties;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span className={`ftl-cta-sticker ${className ?? ''}`} style={style} aria-hidden>
      {children}
    </span>
  );
}

export function BigCTA() {
  return (
    <section className="ftl-cta-wrap" aria-labelledby="cta-heading">
      <div className="ftl-container">
        <div className="ftl-cta" data-reveal>
          <Sticker style={{ left: '2.5%', bottom: '9%', width: 'clamp(60px, 9vw, 112px)' }} className="ftl-float-slow ftl-float-d2">
            <svg viewBox="-44 -8 264 248">
              <BirdWave />
            </svg>
          </Sticker>
          <Sticker style={{ right: '3%', top: '7%', width: 'clamp(54px, 8vw, 100px)' }} className="ftl-float ftl-float-d3">
            <svg viewBox="-44 -8 264 248">
              <BirdWave />
            </svg>
          </Sticker>
          <Sticker style={{ left: '22%', top: '14%', width: 34 }}>
            <svg viewBox="0 0 44 44">
              <Spark x={0} y={0} size={44} color="#ffffff" />
            </svg>
          </Sticker>
          <Sticker style={{ right: '20%', top: '12%', width: 44 }} className="ftl-float ftl-float-d1">
            <svg viewBox="0 0 48 48">
              <Star5 x={0} y={0} size={48} color="#fee75c" />
            </svg>
          </Sticker>
          <Sticker style={{ right: '23%', bottom: '16%', width: 64 }} className="ftl-float ftl-float-d2">
            <svg viewBox="0 0 84 34">
              <Squiggle x={3} y={3} w={72} color="#ffffff" />
            </svg>
          </Sticker>
          <Sticker style={{ left: '19%', bottom: '22%', width: 30 }} className="ftl-float-slow">
            <svg viewBox="0 0 44 44">
              <Spark x={0} y={0} size={44} color="#fee75c" />
            </svg>
          </Sticker>
          <Sticker style={{ right: '7%', bottom: '34%', width: 26 }} className="ftl-float-slow ftl-float-d1">
            <svg viewBox="0 0 34 34">
              <PlusFloat x={0} y={0} size={34} color="#ffffff" />
            </svg>
          </Sticker>

          <div style={{ position: 'relative', zIndex: 2 }}>
            <h2 id="cta-heading" className="ftl-display ftl-h2">
              Your crew is waiting.
            </h2>
            <p className="ftl-cta-sub">
              Open FreedomTalk right in your browser — no download required.
              The download is there when you want it.
            </p>
            <div className="ftl-cta-btns">
              <Link href="/app" className="ftl-btn ftl-btn-white">
                Open in your browser
              </Link>
              <a
                href={GITHUB_RELEASES}
                target="_blank"
                rel="noopener noreferrer"
                className="ftl-btn ftl-btn-outline"
              >
                <Download size={20} aria-hidden />
                Download
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
