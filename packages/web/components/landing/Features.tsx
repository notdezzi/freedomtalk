import { Hash, ShieldCheck, Palette, Users, Link2, MessageCircle, Volume2, AudioWaveform, Globe } from 'lucide-react';
import { CustomizeArt, FriendsArt, HangoutArt } from './illustrations';

type PointTint = { bg: string; fg: string };
type Point = { icon: React.ComponentType<{ size?: number | string }>; label: string; tint: PointTint };

function PointList({ points }: { points: Point[] }) {
  return (
    <ul className="ftl-feature-points">
      {points.map(({ icon: Icon, label, tint }) => (
        <li key={label}>
          <span className="ftl-point-icon" style={{ background: tint.bg, color: tint.fg }}>
            <Icon size={16} aria-hidden />
          </span>
          {label}
        </li>
      ))}
    </ul>
  );
}

export function Features() {
  return (
    <div id="features">
      {/* Make it yours */}
      <section className="ftl-section" aria-labelledby="customize-heading">
        <div className="ftl-container">
          <div className="ftl-feature" data-reveal>
            <div className="ftl-feature-copy">
              <h2 id="customize-heading" className="ftl-display ftl-h2">
                Your space, your rules.
              </h2>
              <p className="ftl-lede">
                Spin up a server for your squad, your raid team, or forty thousand
                of your closest internet strangers. Channels, roles, emoji, and
                colors — you decide how it looks and who gets in.
              </p>
              <PointList
                points={[
                  { icon: Hash, label: 'Channels for every obsession', tint: { bg: 'rgba(235,69,158,0.14)', fg: '#ff7ac2' } },
                  { icon: ShieldCheck, label: 'Roles & permissions that make sense', tint: { bg: 'rgba(87,242,135,0.14)', fg: '#7ee9a4' } },
                  { icon: Palette, label: 'Custom emoji, colors & vibes', tint: { bg: 'rgba(254,231,92,0.14)', fg: '#fee75c' } },
                ]}
              />
            </div>
            <div className="ftl-feature-art">
              <CustomizeArt />
            </div>
          </div>
        </div>
      </section>

      {/* Find your crew */}
      <section className="ftl-section" aria-labelledby="friends-heading">
        <div className="ftl-container">
          <div className="ftl-feature ftl-feature-art-first" data-reveal>
            <div className="ftl-feature-copy">
              <h2 id="friends-heading" className="ftl-display ftl-h2">
                Find your crew.
              </h2>
              <p className="ftl-lede">
                A friends list that shows who&rsquo;s online, who&rsquo;s queueing,
                and who&rsquo;s already in voice. Share an invite link and your
                whole group chat shows up before the match starts.
              </p>
              <PointList
                points={[
                  { icon: Users, label: 'See who’s online at a glance', tint: { bg: 'rgba(88,101,242,0.18)', fg: '#8b95f5' } },
                  { icon: Link2, label: 'One-tap invite links', tint: { bg: 'rgba(254,231,92,0.14)', fg: '#fee75c' } },
                  { icon: MessageCircle, label: 'DMs & group chats', tint: { bg: 'rgba(87,242,135,0.14)', fg: '#7ee9a4' } },
                ]}
              />
            </div>
            <div className="ftl-feature-art">
              <FriendsArt />
            </div>
          </div>
        </div>
      </section>

      {/* Hang out together */}
      <section id="hang-out" className="ftl-section" aria-labelledby="hangout-heading">
        <div className="ftl-container">
          <div className="ftl-feature" data-reveal>
            <div className="ftl-feature-copy">
              <h2 id="hangout-heading" className="ftl-display ftl-h2 ftl-h2-chiprow">
                Hang out, together.
                <span className="ftl-chip-beta">BETA</span>
              </h2>
              <p className="ftl-lede">
                Drop into a voice room and just talk — no ringing, no dialing, no
                &ldquo;can you hear me?&rdquo; Perfect for game night, late-night
                catch-ups, or co-working in comfortable silence.
              </p>
              <PointList
                points={[
                  { icon: Volume2, label: 'Voice rooms for every crew', tint: { bg: 'rgba(87,242,135,0.14)', fg: '#7ee9a4' } },
                  { icon: AudioWaveform, label: 'Live presence & speaking indicators', tint: { bg: 'rgba(235,69,158,0.14)', fg: '#ff7ac2' } },
                  { icon: Globe, label: 'One click away, right in the browser', tint: { bg: 'rgba(88,101,242,0.18)', fg: '#8b95f5' } },
                ]}
              />
            </div>
            <div className="ftl-feature-art">
              <HangoutArt />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
