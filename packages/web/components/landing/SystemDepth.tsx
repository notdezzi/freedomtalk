'use client';

import { useScrollReveal } from '@/hooks/useScrollReveal';
import { Shield, Server, Lock, Eye, Code2, GitBranch } from 'lucide-react';

// Animated shield layers
function ShieldLayers() {
  return (
    <div className="relative w-64 h-64 lg:w-80 lg:h-80">
      {/* Outer layer - Transparency */}
      <div
        className="absolute inset-0 rounded-2xl border-2 border-dashed border-energy/30 animate-rotate-slow"
        style={{ animationDuration: '30s' }}
      >
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-background text-xs text-energy/70 rounded">
          Transparent
        </div>
      </div>

      {/* Middle layer - Encryption */}
      <div
        className="absolute inset-8 rounded-xl border border-systems/40 bg-systems/5 backdrop-blur-sm animate-rotate-reverse"
        style={{ animationDuration: '25s' }}
      >
        <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-background text-xs text-systems/70 rounded flex items-center gap-1">
          <Lock className="w-3 h-3" /> Encrypted
        </div>
      </div>

      {/* Inner layer - Your Data */}
      <div className="absolute inset-16 lg:inset-20 rounded-lg bg-gradient-to-br from-energy-bright/20 to-energy-dim/10 border border-energy/30 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 lg:w-16 lg:h-16 mx-auto rounded-full bg-energy/20 border border-energy/40 flex items-center justify-center mb-2 animate-glow-pulse">
            <Shield className="w-6 h-6 lg:w-8 lg:h-8 text-energy" />
          </div>
          <span className="text-xs text-energy-bright font-medium">Your Data</span>
        </div>
      </div>

      {/* Connection nodes */}
      {[
        { angle: 45, label: 'Auth' },
        { angle: 135, label: 'Store' },
        { angle: 225, label: 'Sync' },
        { angle: 315, label: 'Backup' },
      ].map(({ angle, label }) => {
        const rad = (angle * Math.PI) / 180;
        const x = 50 + Math.cos(rad) * 42;
        const y = 50 + Math.sin(rad) * 42;
        return (
          <div
            key={angle}
            className="absolute w-8 h-8 -translate-x-1/2 -translate-y-1/2 rounded-full bg-background-elevated border border-energy/30 flex items-center justify-center animate-node-pulse"
            style={{
              left: `${x}%`,
              top: `${y}%`,
              animationDelay: `${angle / 100}s`,
            }}
          >
            <div className="w-2 h-2 rounded-full bg-energy/60" />
          </div>
        );
      })}
    </div>
  );
}

// Infrastructure diagram
function InfrastructureDiagram() {
  return (
    <div className="relative w-full max-w-md">
      {/* Server rack visualization */}
      <div className="space-y-3">
        {/* User layer */}
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-energy-muted border border-energy/30 flex items-center justify-center">
            <Server className="w-6 h-6 text-energy" />
          </div>
          <div className="flex-1 h-[2px] bg-gradient-to-r from-energy/40 via-energy/20 to-transparent" />
          <span className="text-sm text-foreground-muted">Your Instance</span>
        </div>

        {/* Connection line */}
        <div className="ml-6 w-[2px] h-8 bg-gradient-to-b from-energy/40 to-systems/40" />

        {/* Infrastructure layer */}
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-systems-muted border border-systems/30 flex items-center justify-center">
            <Code2 className="w-6 h-6 text-systems" />
          </div>
          <div className="flex-1 h-[2px] bg-gradient-to-r from-systems/40 via-systems/20 to-transparent" />
          <span className="text-sm text-foreground-muted">Open Source Code</span>
        </div>

        {/* Connection line */}
        <div className="ml-6 w-[2px] h-8 bg-gradient-to-b from-systems/40 to-warm/40" />

        {/* Data layer */}
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-warm-muted border border-warm/30 flex items-center justify-center">
            <Eye className="w-6 h-6 text-warm" />
          </div>
          <div className="flex-1 h-[2px] bg-gradient-to-r from-warm/40 via-warm/20 to-transparent" />
          <span className="text-sm text-foreground-muted">Full Transparency</span>
        </div>
      </div>

      {/* Version control indicator */}
      <div className="absolute -right-4 top-1/2 -translate-y-1/2 flex flex-col items-center gap-1">
        <GitBranch className="w-4 h-4 text-foreground-subtle" />
        <span className="text-xs text-foreground-subtle rotate-90 origin-center translate-y-4">v1.0</span>
      </div>
    </div>
  );
}

// Feature card with depth
function DepthCard({
  icon: Icon,
  title,
  description,
  color,
  delay,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  color: 'energy' | 'systems' | 'warm';
  delay: number;
}) {
  const colorClasses = {
    energy: 'border-energy/20 hover:border-energy/40 text-energy',
    systems: 'border-systems/20 hover:border-systems/40 text-systems',
    warm: 'border-warm/20 hover:border-warm/40 text-warm',
  };

  const [ref, isVisible] = useScrollReveal<HTMLDivElement>({ threshold: 0.3 });

  return (
    <div
      ref={ref}
      className={`relative p-6 rounded-xl bg-background-elevated/50 border ${colorClasses[color]} backdrop-blur-sm transition-all duration-500 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      }`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {/* Corner accents */}
      <div className="absolute top-0 left-0 w-3 h-3 border-t border-l current-color opacity-50" />
      <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r current-color opacity-50" />

      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-lg bg-current/10 flex items-center justify-center shrink-0">
          <Icon className="w-5 h-5 current-color" />
        </div>
        <div>
          <h3 className="font-display font-semibold text-foreground mb-1">{title}</h3>
          <p className="text-sm text-foreground-muted leading-relaxed">{description}</p>
        </div>
      </div>
    </div>
  );
}

export function SystemDepth() {
  const [ref, isVisible] = useScrollReveal<HTMLElement>({ threshold: 0.1 });

  return (
    <section
      ref={ref}
      className="relative py-32 lg:py-48 overflow-hidden"
    >
      {/* Background atmosphere */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background-warm/10 to-background" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-[500px] bg-gradient-radial opacity-30" />

        {/* Subtle grid */}
        <div
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(212, 132, 60, 0.5) 1px, transparent 1px),
              linear-gradient(90deg, rgba(212, 132, 60, 0.5) 1px, transparent 1px)
            `,
            backgroundSize: '80px 80px',
          }}
        />
      </div>

      <div className="max-w-6xl mx-auto px-6 lg:px-8 relative z-10">
        {/* Section header */}
        <div className={`text-center mb-20 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-background-elevated/60 border border-border mb-6">
            <div className="w-1.5 h-1.5 rounded-full bg-energy animate-pulse" />
            <span className="text-sm font-medium text-foreground-muted">Under the Hood</span>
          </div>

          <h2 className="font-display text-4xl lg:text-5xl font-bold leading-tight mb-6">
            <span className="text-foreground">See inside the</span>
            <br />
            <span className="text-energy-gradient">infrastructure</span>
          </h2>

          <p className="text-lg text-foreground-muted max-w-2xl mx-auto">
            No black boxes. No hidden tracking. Every layer is transparent, verifiable,
            and under your control.
          </p>
        </div>

        {/* Main content grid */}
        <div className={`grid lg:grid-cols-2 gap-16 items-center mb-20 transition-all duration-1000 delay-200 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
          {/* Shield visualization */}
          <div className="flex justify-center">
            <ShieldLayers />
          </div>

          {/* Infrastructure diagram */}
          <div className="flex justify-center">
            <InfrastructureDiagram />
          </div>
        </div>

        {/* Feature cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <DepthCard
            icon={Lock}
            title="End-to-End Encryption"
            description="Messages encrypted before they leave your device. Only your intended recipients can read them."
            color="energy"
            delay={0}
          />
          <DepthCard
            icon={Server}
            title="Self-Hostable"
            description="Run your own instance on any infrastructure. Complete control over your data and users."
            color="systems"
            delay={100}
          />
          <DepthCard
            icon={Code2}
            title="Fully Open Source"
            description="Every line of code is public. Audit it, modify it, contribute to it. No secrets."
            color="warm"
            delay={200}
          />
          <DepthCard
            icon={Shield}
            title="Zero Data Tracking"
            description="No analytics, no telemetry, no selling your data. Your conversations stay yours."
            color="energy"
            delay={300}
          />
          <DepthCard
            icon={Eye}
            title="Transparent Operations"
            description="See exactly how your data is processed. Full audit logs and operational transparency."
            color="systems"
            delay={400}
          />
          <DepthCard
            icon={GitBranch}
            title="Community Governed"
            description="Development decisions happen in the open. Your voice shapes the platform."
            color="warm"
            delay={500}
          />
        </div>
      </div>
    </section>
  );
}
