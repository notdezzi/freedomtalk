'use client';

import { useScrollReveal } from '@/hooks/useScrollReveal';
import { ArrowRight, Github, Zap } from 'lucide-react';
import Link from 'next/link';

// Animated energy grid
function EnergyGrid() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Horizontal lines */}
      {[...Array(10)].map((_, i) => (
        <div
          key={`h-${i}`}
          className="absolute h-[1px] bg-gradient-to-r from-transparent via-energy/20 to-transparent"
          style={{
            top: `${10 + i * 10}%`,
            left: 0,
            right: 0,
            animation: `pulse-line 4s ease-in-out infinite`,
            animationDelay: `${i * 0.3}s`,
          }}
        />
      ))}

      {/* Vertical lines */}
      {[...Array(8)].map((_, i) => (
        <div
          key={`v-${i}`}
          className="absolute w-[1px] bg-gradient-to-b from-transparent via-energy/15 to-transparent"
          style={{
            left: `${12.5 + i * 12.5}%`,
            top: 0,
            bottom: 0,
            animation: `pulse-line 5s ease-in-out infinite`,
            animationDelay: `${i * 0.4}s`,
          }}
        />
      ))}

      {/* Corner accent nodes */}
      <div className="absolute top-4 left-4 w-3 h-3 rounded-full bg-energy/30 animate-node-pulse" />
      <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-systems/30 animate-node-pulse" style={{ animationDelay: '0.5s' }} />
      <div className="absolute bottom-4 left-4 w-2 h-2 rounded-full bg-systems/30 animate-node-pulse" style={{ animationDelay: '1s' }} />
      <div className="absolute bottom-4 right-4 w-3 h-3 rounded-full bg-energy/30 animate-node-pulse" style={{ animationDelay: '1.5s' }} />
    </div>
  );
}

// Terminal-style text animation
function TerminalText({ text, delay = 0 }: { text: string; delay?: number }) {
  return (
    <div
      className="font-mono text-sm text-foreground-subtle"
      style={{
        animation: `terminal-appear 0.5s ease-out ${delay}s forwards`,
        opacity: 0,
      }}
    >
      <span className="text-energy mr-2">&gt;</span>
      {text}
    </div>
  );
}

export function CTA() {
  const [ref, isVisible] = useScrollReveal<HTMLElement>({ threshold: 0.2 });

  return (
    <section
      ref={ref}
      className="relative py-32 lg:py-48 overflow-hidden"
    >
      {/* Background layers */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background-warm/20 to-background" />
      <EnergyGrid />

      {/* Central glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] rounded-full bg-energy/5 blur-3xl" />

      <div className="max-w-4xl mx-auto px-6 lg:px-8 relative z-10">
        <div
          className={`relative rounded-2xl border border-energy/20 bg-background-elevated/60 backdrop-blur-xl overflow-hidden transition-all duration-1000 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'
          }`}
        >
          {/* Inner border accent */}
          <div className="absolute inset-0 rounded-2xl p-[1px]">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-energy/30 via-transparent to-systems/20" style={{ mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)', maskComposite: 'xor', WebkitMaskComposite: 'xor' }} />
          </div>

          {/* Content */}
          <div className="relative p-12 lg:p-16 text-center">
            {/* Icon */}
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-energy-muted border border-energy/30 mb-8 animate-glow-pulse">
              <Zap className="w-8 h-8 text-energy" />
            </div>

            {/* Headline */}
            <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight mb-6">
              <span className="text-foreground">Ready to build your</span>
              <br />
              <span className="text-energy-gradient">infrastructure</span>
              <span className="text-foreground">?</span>
            </h2>

            {/* Description */}
            <p className="text-lg text-foreground-muted max-w-xl mx-auto mb-10">
              Deploy in minutes. Own your communication stack forever.
              No vendor lock-in, no surprise costs, no compromises.
            </p>

            {/* Terminal preview */}
            <div className="max-w-md mx-auto mb-10 p-4 rounded-lg bg-background/80 border border-border font-mono text-left">
              <div className="flex gap-2 mb-3">
                <div className="w-3 h-3 rounded-full bg-error/60" />
                <div className="w-3 h-3 rounded-full bg-warning/60" />
                <div className="w-3 h-3 rounded-full bg-success/60" />
              </div>
              <div className="space-y-2">
                {isVisible && (
                  <>
                    <TerminalText text="git clone github.com/freedomtalk/freedomtalk" delay={0.3} />
                    <TerminalText text="cd freedomtalk && docker-compose up -d" delay={0.8} />
                    <TerminalText text="Your instance is live." delay={1.5} />
                  </>
                )}
              </div>
            </div>

            {/* CTA buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
              <Link href="/auth/register" className="btn btn-primary text-base px-8 py-4 group">
                Deploy Your Instance
                <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary text-base px-8 py-4 group"
              >
                <Github className="w-5 h-5" />
                View Source
              </Link>
            </div>

            {/* Trust badges */}
            <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-foreground-subtle">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-success" />
                <span>MIT License</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-success" />
                <span>Self-hosted</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-success" />
                <span>No credit card required</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes pulse-line {
          0%, 100% {
            opacity: 0.1;
          }
          50% {
            opacity: 0.4;
          }
        }

        @keyframes terminal-appear {
          from {
            opacity: 0;
            transform: translateX(-10px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </section>
  );
}
