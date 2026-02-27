'use client';

import Link from 'next/link';
import { ArrowRight, ChevronDown } from 'lucide-react';
import { useScrollReveal, useMouseParallax } from '@/hooks/useScrollReveal';
import { useCallback, useState, useEffect } from 'react';

// Animated energy particle
function EnergyParticle({ delay, duration, size, left }: { delay: number; duration: number; size: number; left: string }) {
  return (
    <div
      className="absolute rounded-full opacity-0"
      style={{
        width: size,
        height: size,
        left,
        bottom: '10%',
        background: `radial-gradient(circle, rgba(212, 132, 60, 0.8) 0%, rgba(212, 132, 60, 0) 70%)`,
        animation: `particle-rise ${duration}s ease-in-out ${delay}s infinite`,
      }}
    />
  );
}

// Floating platform component
function FloatingPlatform({ className, children, delay = 0 }: { className?: string; children: React.ReactNode; delay?: number }) {
  return (
    <div
      className={`absolute ${className}`}
      style={{
        animation: `platform-float ${6 + delay}s ease-in-out infinite`,
        animationDelay: `${delay}s`,
      }}
    >
      {children}
    </div>
  );
}

// Mechanical structure - gear
function Gear({ size, className }: { size: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      fill="none"
    >
      <circle cx="50" cy="50" r="30" stroke="currentColor" strokeWidth="2" opacity="0.3" />
      <circle cx="50" cy="50" r="20" stroke="currentColor" strokeWidth="1.5" opacity="0.2" />
      <circle cx="50" cy="50" r="8" fill="currentColor" opacity="0.4" />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
        <rect
          key={angle}
          x="46"
          y="5"
          width="8"
          height="15"
          fill="currentColor"
          opacity="0.25"
          transform={`rotate(${angle} 50 50)`}
        />
      ))}
    </svg>
  );
}

// Circuit line pattern
function CircuitLine({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 200 100"
      fill="none"
      preserveAspectRatio="none"
    >
      <path
        d="M0 50 L40 50 L50 30 L80 30 L90 70 L120 70 L130 50 L200 50"
        stroke="currentColor"
        strokeWidth="1"
        opacity="0.2"
        className="animate-circuit-pulse"
        style={{
          strokeDasharray: '100',
        }}
      />
      <circle cx="50" cy="30" r="3" fill="currentColor" opacity="0.4" className="animate-node-pulse" />
      <circle cx="90" cy="70" r="3" fill="currentColor" opacity="0.4" className="animate-node-pulse" style={{ animationDelay: '0.5s' }} />
      <circle cx="130" cy="50" r="3" fill="currentColor" opacity="0.4" className="animate-node-pulse" style={{ animationDelay: '1s' }} />
    </svg>
  );
}

// Energy conduit
function EnergyConduit({ className }: { className?: string }) {
  return (
    <div className={`relative ${className}`}>
      <div className="absolute inset-0 bg-gradient-to-b from-energy/20 via-energy/5 to-transparent blur-sm" />
      <div className="absolute inset-0 energy-line" style={{ backgroundSize: '200% 100%', animation: 'energy-flow 3s linear infinite' }} />
    </div>
  );
}

// Main background scene
function BackgroundScene() {
  const mousePosition = useMouseParallax(0.015);

  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Base gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-background-warm" />

      {/* Deep atmospheric layers */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          background: `
            radial-gradient(ellipse 80% 50% at 50% 0%, rgba(212, 132, 60, 0.08) 0%, transparent 50%),
            radial-gradient(ellipse 60% 40% at 70% 20%, rgba(45, 149, 150, 0.05) 0%, transparent 40%)
          `,
          transform: `translate(${mousePosition.x * 0.5}px, ${mousePosition.y * 0.5}px)`,
        }}
      />

      {/* Far background gears */}
      <div
        className="absolute -right-20 top-1/4 text-energy-dim/20 animate-rotate-slow"
        style={{ transform: `translate(${mousePosition.x * 0.3}px, ${mousePosition.y * 0.3}px)` }}
      >
        <Gear size={300} />
      </div>
      <div
        className="absolute -left-32 top-1/3 text-systems/10 animate-rotate-reverse"
        style={{ transform: `translate(${mousePosition.x * 0.2}px, ${mousePosition.y * 0.2}px)` }}
      >
        <Gear size={250} />
      </div>

      {/* Mid-ground mechanical elements */}
      <FloatingPlatform className="left-[10%] top-[20%]" delay={0.5}>
        <div className="w-32 h-32 border border-energy/15 rounded-lg bg-background-elevated/30 backdrop-blur-sm flex items-center justify-center">
          <div className="w-12 h-12 border-2 border-energy/30 rounded-full animate-pulse-energy" />
        </div>
      </FloatingPlatform>

      <FloatingPlatform className="right-[15%] top-[35%]" delay={1}>
        <div className="w-24 h-24 border border-systems/15 rounded-lg bg-background-elevated/20 backdrop-blur-sm" />
      </FloatingPlatform>

      <FloatingPlatform className="left-[20%] bottom-[30%]" delay={1.5}>
        <div className="w-16 h-16 border border-energy/20 rounded bg-background-elevated/40 backdrop-blur-sm rotate-12" />
      </FloatingPlatform>

      {/* Circuit lines */}
      <div className="absolute top-[25%] left-0 w-[40%] h-8 text-energy/30">
        <CircuitLine className="w-full h-full" />
      </div>
      <div className="absolute bottom-[35%] right-0 w-[35%] h-8 text-systems/20">
        <CircuitLine className="w-full h-full transform rotate-180" />
      </div>

      {/* Energy conduits - vertical lines */}
      <EnergyConduit className="absolute left-[8%] top-[30%] w-[2px] h-[30%]" />
      <EnergyConduit className="absolute right-[12%] top-[25%] w-[2px] h-[25%]" />
      <EnergyConduit className="absolute left-[25%] top-[15%] w-[1px] h-[20%]" />

      {/* Energy particles */}
      <EnergyParticle delay={0} duration={4} size={6} left="15%" />
      <EnergyParticle delay={1} duration={5} size={4} left="30%" />
      <EnergyParticle delay={2} duration={4.5} size={5} left="70%" />
      <EnergyParticle delay={0.5} duration={5.5} size={3} left="85%" />
      <EnergyParticle delay={1.5} duration={4} size={4} left="45%" />

      {/* Subtle grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(212, 132, 60, 0.5) 1px, transparent 1px),
            linear-gradient(90deg, rgba(212, 132, 60, 0.5) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }}
      />

      {/* Vignette */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background/80" />
      <div className="absolute inset-y-0 left-0 w-1/4 bg-gradient-to-r from-background/50 to-transparent" />
      <div className="absolute inset-y-0 right-0 w-1/4 bg-gradient-to-l from-background/50 to-transparent" />
    </div>
  );
}

export function Hero() {
  const [contentRef, isContentVisible] = useScrollReveal<HTMLElement>({ threshold: 0.1 });

  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToFeatures = useCallback(() => {
    document.getElementById('narrative-1')?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
      <BackgroundScene />

      {/* Main content */}
      <main
        ref={contentRef}
        className="relative z-10 max-w-5xl mx-auto px-6 lg:px-8 text-center"
        style={{
          transform: `translateY(${scrollY * 0.15}px)`,
          opacity: Math.max(0, 1 - scrollY / 600),
        }}
      >
        {/* Status indicator */}
        <div
          className={`inline-flex items-center gap-3 px-5 py-2.5 rounded-full bg-background-elevated/60 backdrop-blur-md border border-border-energy/50 mb-10 transition-all duration-1000 ${
            isContentVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-energy-bright opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-energy" />
          </span>
          <span className="text-sm font-medium text-foreground-muted tracking-wide">
            Open Source Infrastructure
          </span>
        </div>

        {/* Main headline */}
        <h1
          className={`font-display text-5xl sm:text-6xl lg:text-7xl xl:text-8xl font-bold leading-[1.1] mb-8 transition-all duration-1000 delay-200 ${
            isContentVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <span className="block text-foreground">Communication</span>
          <span className="block text-energy-gradient">Infrastructure</span>
          <span className="block text-foreground/90 text-4xl sm:text-5xl lg:text-6xl xl:text-7xl mt-2">for Everyone</span>
        </h1>

        {/* Subheadline */}
        <p
          className={`text-lg sm:text-xl text-foreground-muted max-w-2xl mx-auto mb-12 leading-relaxed transition-all duration-1000 delay-300 ${
            isContentVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          Build communities on a platform designed for trust. Self-hosted, end-to-end encrypted,
          fully transparent. Your infrastructure, your rules.
        </p>

        {/* CTA Buttons */}
        <div
          className={`flex flex-col sm:flex-row items-center justify-center gap-4 mb-16 transition-all duration-1000 delay-400 ${
            isContentVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <Link href="/auth/register" className="btn btn-primary text-base px-8 py-4 group">
            Deploy Your Instance
            <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
          </Link>
          <Link href="/app" className="btn btn-secondary text-base px-8 py-4">
            Explore the Network
          </Link>
        </div>

        {/* Trust indicators - mechanical style */}
        <div
          className={`flex flex-wrap items-center justify-center gap-8 text-sm text-foreground-subtle transition-all duration-1000 delay-500 ${
            isContentVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          {[
            { label: 'End-to-End Encrypted', icon: '◆' },
            { label: 'Self-Hostable', icon: '◇' },
            { label: 'Zero Tracking', icon: '○' },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-2.5">
              <span className="text-energy">{item.icon}</span>
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      </main>

      {/* Scroll indicator */}
      <button
        onClick={scrollToFeatures}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2 text-foreground-subtle hover:text-energy transition-colors cursor-pointer group"
        aria-label="Scroll to features"
      >
        <span className="text-xs uppercase tracking-widest">Explore</span>
        <ChevronDown className="w-5 h-5 animate-bounce" />
      </button>

      {/* CSS for particle animation */}
      <style jsx>{`
        @keyframes particle-rise {
          0% {
            opacity: 0;
            transform: translateY(0) scale(1);
          }
          10% {
            opacity: 0.8;
          }
          90% {
            opacity: 0.3;
          }
          100% {
            opacity: 0;
            transform: translateY(-100vh) scale(0.5);
          }
        }
      `}</style>
    </section>
  );
}
