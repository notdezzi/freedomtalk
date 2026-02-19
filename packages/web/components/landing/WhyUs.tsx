'use client';

import { Code, Gift, Zap, Shield, Lock, Globe } from 'lucide-react';

const stats = [
  {
    value: '100%',
    label: 'Open Source',
    description: 'Fully transparent codebase',
    icon: Code,
  },
  {
    value: '$0',
    label: 'Free Forever',
    description: 'No premium tiers or paywalls',
    icon: Gift,
  },
  {
    value: '∞',
    label: 'Possibilities',
    description: 'Extend and customize freely',
    icon: Zap,
  },
];

const benefits = [
  {
    icon: Shield,
    title: 'Privacy First',
    description: 'Your data stays yours. No tracking, no ads, no selling your information.',
  },
  {
    icon: Lock,
    title: 'End-to-End Encryption',
    description: 'Military-grade encryption for all your messages and calls.',
  },
  {
    icon: Globe,
    title: 'Self-Hostable',
    description: 'Run your own instance for complete control over your community.',
  },
];

export function WhyUs() {
  return (
    <section id="why-us" className="relative py-32 px-6 lg:px-8 overflow-hidden">
      {/* Background elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-secondary/8 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-accent/8 rounded-full blur-[100px]" />
      </div>

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Section header */}
        <div className="text-center mb-20">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Why choose <span className="gradient-text">FreedomTalk</span>?
          </h2>
          <p className="text-foreground-muted max-w-xl mx-auto">
            Built by the community, for the community. We believe communication should be free and private.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className="text-center group"
              >
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-background-surface/50 border border-border mb-6 transition-all duration-300 group-hover:border-accent/30 group-hover:bg-accent-muted backdrop-blur-sm">
                  <Icon className="w-8 h-8 text-accent" />
                </div>
                <div className="text-5xl sm:text-6xl font-bold gradient-text mb-2">
                  {stat.value}
                </div>
                <div className="text-lg font-semibold mb-1">{stat.label}</div>
                <div className="text-sm text-foreground-muted">{stat.description}</div>
              </div>
            );
          })}
        </div>

        {/* Benefits */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {benefits.map((benefit) => {
            const Icon = benefit.icon;
            return (
              <div
                key={benefit.title}
                className="card p-6 flex gap-4 items-start hover:border-accent/30 transition-all duration-300 bg-background-elevated/50 backdrop-blur-sm"
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-secondary flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5 text-background" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">{benefit.title}</h3>
                  <p className="text-sm text-foreground-muted">{benefit.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Smooth fade to next section */}
      <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-background via-background/50 to-transparent pointer-events-none z-10" />
    </section>
  );
}
