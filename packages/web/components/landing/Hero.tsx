import Link from 'next/link';
import { Download } from 'lucide-react';
import { HeroScene, Spark, Star5, Squiggle, PlusFloat } from './illustrations';

const GITHUB_RELEASES = 'https://github.com/notdezzi/freedomtalk/releases';

/* Flat sprinkles around the copy — same sticker voice as the scene
   below, so the first viewport carries the world instead of empty
   ground. Purely decorative. */
function HeroDecor() {
  return (
    <>
      <span className="ftl-hero-decor ftl-decor-spark ftl-float-slow ftl-float-d2" aria-hidden>
        <svg viewBox="0 0 44 44">
          <Spark x={0} y={0} size={44} color="#fee75c" />
        </svg>
      </span>
      <span className="ftl-hero-decor ftl-decor-star ftl-float ftl-float-d1" aria-hidden>
        <svg viewBox="0 0 48 48">
          <Star5 x={0} y={0} size={48} color="#eb459e" />
        </svg>
      </span>
      <span className="ftl-hero-decor ftl-decor-squiggle ftl-float ftl-float-d3" aria-hidden>
        <svg viewBox="0 0 84 34">
          <Squiggle x={3} y={3} w={72} color="#57f287" />
        </svg>
      </span>
      <span className="ftl-hero-decor ftl-decor-ring" aria-hidden>
        <svg viewBox="0 0 30 30">
          <circle cx="15" cy="15" r="12" fill="none" stroke="#5865f2" strokeWidth="4" />
        </svg>
      </span>
      <span className="ftl-hero-decor ftl-decor-plus ftl-float ftl-float-d1" aria-hidden>
        <svg viewBox="0 0 34 34">
          <PlusFloat x={0} y={0} size={34} color="#ffffff" />
        </svg>
      </span>
      <span className="ftl-hero-decor ftl-decor-dot ftl-float-slow ftl-float-d3" aria-hidden>
        <svg viewBox="0 0 20 20">
          <circle cx="10" cy="10" r="8" fill="#eb459e" />
        </svg>
      </span>
    </>
  );
}

export function Hero() {
  return (
    <header className="ftl-hero">
      <div className="ftl-container">
        <HeroDecor />
        <div className="ftl-hero-copy">
          <h1 className="ftl-display ftl-h1" data-pop="1">
            Group chat that&rsquo;s all <span className="ftl-accent">fun&nbsp;&amp;&nbsp;games</span>.
          </h1>
          <p className="ftl-lede ftl-hero-sub" data-pop="2">
            Talk, play, and chill with your people — or build a whole worldwide
            community. Your crew&rsquo;s new home base is one click away.
          </p>
          <div className="ftl-hero-ctas" data-pop="3">
            <Link href="/app" className="ftl-btn ftl-btn-primary">
              Open in your browser
            </Link>
            <a
              href={GITHUB_RELEASES}
              target="_blank"
              rel="noopener noreferrer"
              className="ftl-btn ftl-btn-white"
            >
              <Download size={20} aria-hidden />
              Download
            </a>
          </div>
          <p className="ftl-hero-note" data-pop="4">
            <span>Free to use</span>
            <span>Open source</span>
            <span>Your data stays yours</span>
          </p>
        </div>
      </div>

      <div className="ftl-hero-scene" data-pop="5">
        <HeroScene />
      </div>
    </header>
  );
}
