'use client';

import { useScrollReveal } from '@/hooks/useScrollReveal';
import { ArrowRight, Cpu, Network, Radio, Users } from 'lucide-react';
import Link from 'next/link';

// ============================================
// NARRATIVE 1: ENERGY CONDUITS (Voice Channels)
// ============================================

function EnergyWave() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Animated wave lines */}
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          className="absolute h-[2px] bg-gradient-to-r from-transparent via-energy-bright/40 to-transparent"
          style={{
            top: `${20 + i * 15}%`,
            left: '-100%',
            right: '-100%',
            animation: `wave-flow ${3 + i * 0.5}s ease-in-out infinite`,
            animationDelay: `${i * 0.3}s`,
          }}
        />
      ))}

      {/* Central pulse point */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64">
        <div className="absolute inset-0 rounded-full border border-energy/20 animate-ping" style={{ animationDuration: '3s' }} />
        <div className="absolute inset-4 rounded-full border border-energy/30 animate-ping" style={{ animationDuration: '3s', animationDelay: '0.5s' }} />
        <div className="absolute inset-8 rounded-full border border-energy/40 animate-ping" style={{ animationDuration: '3s', animationDelay: '1s' }} />
      </div>
    </div>
  );
}

function SoundNode({ x, y, delay }: { x: string; y: string; delay: number }) {
  return (
    <div
      className="absolute w-4 h-4 rounded-full bg-energy/30 border border-energy/50 animate-node-pulse"
      style={{
        left: x,
        top: y,
        animationDelay: `${delay}s`,
      }}
    />
  );
}

export function NarrativeVoice() {
  const [ref, isVisible] = useScrollReveal<HTMLElement>({ threshold: 0.2 });

  return (
    <section
      id="narrative-1"
      ref={ref}
      className="relative py-32 lg:py-48 overflow-hidden"
    >
      {/* Background elements */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background-warm/30 to-background" />
        <EnergyWave />
      </div>

      <div className="max-w-6xl mx-auto px-6 lg:px-8 relative z-10">
        <div className={`grid lg:grid-cols-2 gap-16 items-center transition-all duration-1000 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
          {/* Visual side */}
          <div className="relative h-[400px] lg:h-[500px]">
            {/* Connection visualization */}
            <div className="absolute inset-0 flex items-center justify-center">
              {/* Outer ring */}
              <div className="absolute w-[300px] h-[300px] lg:w-[400px] lg:h-[400px] rounded-full border border-energy/10 animate-rotate-slow" />
              <div className="absolute w-[200px] h-[200px] lg:w-[280px] lg:h-[280px] rounded-full border border-energy/20 animate-rotate-reverse" />

              {/* Sound nodes */}
              <SoundNode x="10%" y="30%" delay={0} />
              <SoundNode x="85%" y="25%" delay={0.5} />
              <SoundNode x="15%" y="70%" delay={1} />
              <SoundNode x="80%" y="75%" delay={1.5} />
              <SoundNode x="50%" y="10%" delay={2} />
              <SoundNode x="50%" y="90%" delay={2.5} />

              {/* Central hub */}
              <div className="relative w-24 h-24 lg:w-32 lg:h-32 rounded-full bg-gradient-to-br from-energy/20 to-energy-dim/10 border border-energy/30 flex items-center justify-center animate-glow-pulse">
                <Radio className="w-10 h-10 lg:w-12 lg:h-12 text-energy" />
              </div>
            </div>

            {/* Connecting lines */}
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              <line x1="50" y1="50" x2="15" y2="35" stroke="currentColor" strokeWidth="0.2" className="text-energy/30" />
              <line x1="50" y1="50" x2="85" y2="30" stroke="currentColor" strokeWidth="0.2" className="text-energy/30" />
              <line x1="50" y1="50" x2="20" y2="70" stroke="currentColor" strokeWidth="0.2" className="text-energy/30" />
              <line x1="50" y1="50" x2="80" y2="75" stroke="currentColor" strokeWidth="0.2" className="text-energy/30" />
            </svg>
          </div>

          {/* Content side */}
          <div className={`space-y-8 ${isVisible ? 'translate-y-0' : 'translate-y-12'} transition-transform duration-1000 delay-300`}>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-energy-muted/50 border border-energy/20">
              <div className="w-2 h-2 rounded-full bg-energy animate-pulse" />
              <span className="text-sm font-medium text-energy-bright">Voice Channels</span>
            </div>

            <h2 className="font-display text-4xl lg:text-5xl font-bold leading-tight">
              <span className="text-foreground">Energy flows through</span>
              <br />
              <span className="text-energy-gradient">open channels</span>
            </h2>

            <p className="text-lg text-foreground-muted leading-relaxed max-w-lg">
              Voice communication that moves like electricity through a network. Drop in, connect,
              and let conversations flow naturally. No barriers, no friction—just pure connection.
            </p>

            <div className="space-y-4">
              {[
                'Always-on voice rooms with crystal clarity',
                'Spatial audio for natural conversations',
                'Seamless handoffs between channels',
              ].map((item) => (
                <div key={item} className="flex items-center gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-energy" />
                  <span className="text-foreground-muted">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes wave-flow {
          0%, 100% {
            transform: translateX(0) scaleX(0.8);
            opacity: 0;
          }
          50% {
            transform: translateX(50%) scaleX(1);
            opacity: 1;
          }
        }
      `}</style>
    </section>
  );
}

// ============================================
// NARRATIVE 2: INFORMATION NODES (Text Channels)
// ============================================

function DataStream() {
  return (
    <div className="absolute inset-0 overflow-hidden opacity-30">
      {[...Array(8)].map((_, i) => (
        <div
          key={i}
          className="absolute text-systems font-mono text-xs whitespace-nowrap"
          style={{
            left: `${10 + i * 12}%`,
            top: '-20px',
            animation: `data-fall ${8 + i * 2}s linear infinite`,
            animationDelay: `${i * 0.5}s`,
          }}
        >
          {Math.random().toString(36).substring(2, 15)}
        </div>
      ))}
    </div>
  );
}

function DataNode({ className, active = false }: { className?: string; active?: boolean }) {
  return (
    <div
      className={`relative ${className}`}
    >
      <div className={`w-3 h-3 rounded-sm ${active ? 'bg-systems-bright animate-node-pulse' : 'bg-systems/40'}`} />
      {active && <div className="absolute inset-0 w-3 h-3 rounded-sm bg-systems-bright/50 animate-ping" />}
    </div>
  );
}

export function NarrativeText() {
  const [ref, isVisible] = useScrollReveal<HTMLElement>({ threshold: 0.2 });

  return (
    <section
      ref={ref}
      className="relative py-32 lg:py-48 overflow-hidden bg-gradient-to-b from-background via-background-surface/50 to-background"
    >
      <DataStream />

      <div className="max-w-6xl mx-auto px-6 lg:px-8 relative z-10">
        <div className={`grid lg:grid-cols-2 gap-16 items-center transition-all duration-1000 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
          {/* Content side - reversed order */}
          <div className={`space-y-8 lg:order-1 ${isVisible ? 'translate-y-0' : 'translate-y-12'} transition-transform duration-1000 delay-300`}>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-systems-muted/50 border border-systems/20">
              <div className="w-2 h-2 rounded-full bg-systems animate-pulse" />
              <span className="text-sm font-medium text-systems-bright">Text Channels</span>
            </div>

            <h2 className="font-display text-4xl lg:text-5xl font-bold leading-tight">
              <span className="text-foreground">Information</span>
              <br />
              <span className="text-systems-gradient">finds its path</span>
            </h2>

            <p className="text-lg text-foreground-muted leading-relaxed max-w-lg">
              Every message travels through structured channels, organized by purpose.
              Knowledge accumulates, conversations branch, and nothing gets lost in the noise.
            </p>

            <div className="space-y-4">
              {[
                'Threaded conversations for deep discussions',
                'Rich formatting and code blocks',
                'Powerful search across all history',
              ].map((item) => (
                <div key={item} className="flex items-center gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-systems" />
                  <span className="text-foreground-muted">{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Visual side */}
          <div className="relative h-[400px] lg:h-[500px] lg:order-2">
            {/* Grid of data nodes */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="grid grid-cols-7 gap-6 lg:gap-8">
                {[...Array(49)].map((_, i) => (
                  <DataNode
                    key={i}
                    className=""
                    active={[5, 12, 16, 23, 27, 30, 34, 41].includes(i)}
                  />
                ))}
              </div>

              {/* Highlighted connection path */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
                <path
                  d="M 30 20 L 50 30 L 60 50 L 50 70 L 70 80"
                  stroke="currentColor"
                  strokeWidth="0.3"
                  fill="none"
                  className="text-systems/40 animate-circuit-pulse"
                  style={{
                    strokeDasharray: '50',
                  }}
                />
              </svg>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes data-fall {
          0% {
            transform: translateY(-20px);
            opacity: 0;
          }
          10% {
            opacity: 0.6;
          }
          90% {
            opacity: 0.6;
          }
          100% {
            transform: translateY(100vh);
            opacity: 0;
          }
        }
      `}</style>
    </section>
  );
}

// ============================================
// NARRATIVE 3: TRANSMISSION ARRAYS (Video Calls)
// ============================================

function LightBeam({ angle, delay }: { angle: number; delay: number }) {
  return (
    <div
      className="absolute top-1/2 left-1/2 w-[2px] h-[200px] origin-bottom"
      style={{
        transform: `translateX(-50%) rotate(${angle}deg)`,
      }}
    >
      <div
        className="absolute inset-0 bg-gradient-to-t from-energy-bright/40 via-energy/20 to-transparent"
        style={{
          animation: `beam-pulse 3s ease-in-out infinite`,
          animationDelay: `${delay}s`,
        }}
      />
    </div>
  );
}

function Lens({ className }: { className?: string }) {
  return (
    <div className={`relative ${className}`}>
      <div className="w-20 h-20 lg:w-28 lg:h-28 rounded-full bg-gradient-to-br from-energy-bright/20 to-energy-dim/10 border border-energy/40 flex items-center justify-center">
        <div className="w-12 h-12 lg:w-16 lg:h-16 rounded-full bg-background-warm/80 border border-energy/30 flex items-center justify-center">
          <div className="w-4 h-4 lg:w-6 lg:h-6 rounded-full bg-energy-bright/60" />
        </div>
      </div>
      <div className="absolute inset-0 rounded-full animate-ping bg-energy/10" style={{ animationDuration: '4s' }} />
    </div>
  );
}

export function NarrativeVideo() {
  const [ref, isVisible] = useScrollReveal<HTMLElement>({ threshold: 0.2 });

  return (
    <section
      ref={ref}
      className="relative py-32 lg:py-48 overflow-hidden"
    >
      {/* Atmospheric background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background-warm/20 to-background" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-energy/5 blur-3xl" />
      </div>

      {/* Light beams */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => (
          <LightBeam key={angle} angle={angle} delay={i * 0.2} />
        ))}
      </div>

      <div className="max-w-6xl mx-auto px-6 lg:px-8 relative z-10">
        <div className={`grid lg:grid-cols-2 gap-16 items-center transition-all duration-1000 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
          {/* Visual side */}
          <div className="relative h-[400px] lg:h-[500px]">
            <div className="absolute inset-0 flex items-center justify-center">
              <Lens />
            </div>

            {/* Connected screens */}
            <div className="absolute top-8 right-8 w-24 h-16 lg:w-32 lg:h-20 rounded-lg bg-background-elevated/60 border border-border backdrop-blur-sm overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-energy/10 to-transparent" />
              <div className="absolute bottom-1 left-2 flex gap-0.5">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="w-1 h-2 rounded-full bg-energy/40 animate-node-pulse" style={{ animationDelay: `${i * 0.2}s` }} />
                ))}
              </div>
            </div>

            <div className="absolute bottom-12 left-8 w-20 h-14 lg:w-28 lg:h-20 rounded-lg bg-background-elevated/60 border border-border backdrop-blur-sm overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-systems/10 to-transparent" />
            </div>
          </div>

          {/* Content side */}
          <div className={`space-y-8 ${isVisible ? 'translate-y-0' : 'translate-y-12'} transition-transform duration-1000 delay-300`}>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-energy-muted/50 border border-energy/20">
              <div className="w-2 h-2 rounded-full bg-energy animate-pulse" />
              <span className="text-sm font-medium text-energy-bright">Video Calls</span>
            </div>

            <h2 className="font-display text-4xl lg:text-5xl font-bold leading-tight">
              <span className="text-foreground">See through</span>
              <br />
              <span className="text-energy-gradient">the transmission</span>
            </h2>

            <p className="text-lg text-foreground-muted leading-relaxed max-w-lg">
              Crystal-clear video that connects you across any distance. Share your screen,
              your work, your ideas. When you can see each other, you understand each other.
            </p>

            <div className="space-y-4">
              {[
                'HD video with adaptive quality',
                'Screen sharing and collaborative tools',
                'Low-latency streaming for real-time sync',
              ].map((item) => (
                <div key={item} className="flex items-center gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-energy" />
                  <span className="text-foreground-muted">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes beam-pulse {
          0%, 100% {
            opacity: 0.3;
            transform: scaleY(0.8);
          }
          50% {
            opacity: 1;
            transform: scaleY(1);
          }
        }
      `}</style>
    </section>
  );
}

// ============================================
// NARRATIVE 4: PLATFORMS (Communities)
// ============================================

function FloatingStructure({ className, size = 'md', children }: { className?: string; size?: 'sm' | 'md' | 'lg'; children?: React.ReactNode }) {
  const sizes = {
    sm: 'w-16 h-12',
    md: 'w-24 h-16',
    lg: 'w-32 h-20',
  };

  return (
    <div
      className={`absolute ${sizes[size]} ${className}`}
      style={{
        animation: `platform-hover ${5 + Math.random() * 3}s ease-in-out infinite`,
        animationDelay: `${Math.random() * 2}s`,
      }}
    >
      <div className="w-full h-full rounded-lg bg-background-elevated/70 border border-border backdrop-blur-sm flex items-center justify-center">
        {children}
      </div>
      {/* Shadow / depth */}
      <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-3/4 h-2 bg-energy-dim/10 blur-sm rounded-full" />
    </div>
  );
}

function ConnectionBridge({ from, to }: { from: { x: string; y: string }; to: { x: string; y: string } }) {
  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
      <line
        x1={from.x}
        y1={from.y}
        x2={to.x}
        y2={to.y}
        stroke="currentColor"
        strokeWidth="0.15"
        className="text-energy/30"
        strokeDasharray="2 1"
      />
    </svg>
  );
}

export function NarrativeCommunities() {
  const [ref, isVisible] = useScrollReveal<HTMLElement>({ threshold: 0.2 });

  return (
    <section
      ref={ref}
      className="relative py-32 lg:py-48 overflow-hidden bg-gradient-to-b from-background via-background-surface/30 to-background"
    >
      <div className="max-w-6xl mx-auto px-6 lg:px-8 relative z-10">
        <div className={`grid lg:grid-cols-2 gap-16 items-center transition-all duration-1000 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
          {/* Content side */}
          <div className={`space-y-8 lg:order-1 ${isVisible ? 'translate-y-0' : 'translate-y-12'} transition-transform duration-1000 delay-300`}>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-warm-muted/50 border border-warm/20">
              <div className="w-2 h-2 rounded-full bg-warm animate-pulse" />
              <span className="text-sm font-medium text-warm">Communities</span>
            </div>

            <h2 className="font-display text-4xl lg:text-5xl font-bold leading-tight">
              <span className="text-foreground">Build your</span>
              <br />
              <span className="text-energy-gradient">own platforms</span>
            </h2>

            <p className="text-lg text-foreground-muted leading-relaxed max-w-lg">
              Create spaces that are truly yours. From small friend groups to large organizations,
              every community gets its own infrastructure. You control it. You own it.
            </p>

            <div className="space-y-4">
              {[
                'Unlimited servers and channels',
                'Granular roles and permissions',
                'Custom integrations and bots',
              ].map((item) => (
                <div key={item} className="flex items-center gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-warm" />
                  <span className="text-foreground-muted">{item}</span>
                </div>
              ))}
            </div>

            <Link href="/auth/register" className="btn btn-primary inline-flex group">
              Create Your Community
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>

          {/* Visual side - floating platforms */}
          <div className="relative h-[400px] lg:h-[500px] lg:order-2">
            {/* Main platform */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
              <div
                className="w-40 h-28 lg:w-52 lg:h-36 rounded-xl bg-gradient-to-br from-background-elevated to-background-warm border border-energy/30 flex items-center justify-center"
                style={{
                  boxShadow: '0 20px 60px rgba(212, 132, 60, 0.15)',
                }}
              >
                <Users className="w-10 h-10 lg:w-12 lg:h-12 text-energy" />
              </div>
            </div>

            {/* Satellite platforms */}
            <FloatingStructure className="top-[15%] left-[10%]" size="sm">
              <div className="w-3 h-3 rounded-full bg-systems/40" />
            </FloatingStructure>
            <FloatingStructure className="top-[20%] right-[15%]" size="md">
              <div className="flex gap-1">
                <div className="w-2 h-2 rounded-full bg-energy/40" />
                <div className="w-2 h-2 rounded-full bg-energy/30" />
              </div>
            </FloatingStructure>
            <FloatingStructure className="bottom-[25%] left-[5%]" size="md">
              <div className="w-6 h-4 rounded border border-systems/30" />
            </FloatingStructure>
            <FloatingStructure className="bottom-[15%] right-[10%]" size="lg">
              <div className="flex gap-1.5">
                <div className="w-2 h-2 rounded-full bg-warm/40" />
                <div className="w-2 h-2 rounded-full bg-warm/30" />
                <div className="w-2 h-2 rounded-full bg-warm/20" />
              </div>
            </FloatingStructure>

            {/* Connection bridges */}
            <ConnectionBridge from={{ x: '25', y: '50' }} to={{ x: '50', y: '50' }} />
            <ConnectionBridge from={{ x: '75', y: '50' }} to={{ x: '50', y: '50' }} />
            <ConnectionBridge from={{ x: '50', y: '30' }} to={{ x: '50', y: '50' }} />
            <ConnectionBridge from={{ x: '50', y: '70' }} to={{ x: '50', y: '50' }} />
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes platform-hover {
          0%, 100% {
            transform: translateY(0) translateX(0);
          }
          33% {
            transform: translateY(-8px) translateX(4px);
          }
          66% {
            transform: translateY(-4px) translateX(-4px);
          }
        }
      `}</style>
    </section>
  );
}
