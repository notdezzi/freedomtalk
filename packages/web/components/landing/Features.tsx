'use client';

import {
  Zap,
  Shield,
  Globe,
  MessageSquare,
  Users,
  Sparkles,
  Lock,
  Mic,
} from 'lucide-react';

const features = [
  {
    icon: Zap,
    title: 'Lightning Fast',
    description:
      'Built on modern infrastructure with WebSocket support for real-time messaging without the lag.',
    gradient: 'from-yellow-400 to-orange-500',
  },
  {
    icon: Shield,
    title: 'Enterprise Security',
    description:
      'End-to-end encryption, 2FA support, and advanced moderation tools to keep your community safe.',
    gradient: 'from-accent to-teal-500',
  },
  {
    icon: Globe,
    title: 'Global Scale',
    description:
      'Distributed architecture ensures low latency connections worldwide, no matter where your members are.',
    gradient: 'from-blue-400 to-cyan-500',
  },
  {
    icon: MessageSquare,
    title: 'Rich Messaging',
    description:
      'Support for markdown, code blocks, file attachments, embeds, reactions, and threaded conversations.',
    gradient: 'from-purple-400 to-pink-500',
  },
  {
    icon: Users,
    title: 'Community Tools',
    description:
      'Roles, permissions, channels, categories, and invites. Everything you need to organize your community.',
    gradient: 'from-secondary to-purple-500',
  },
  {
    icon: Sparkles,
    title: 'Smart Features',
    description:
      'AI-powered spam detection, smart notifications, and intelligent search to find anything instantly.',
    gradient: 'from-accent to-secondary',
  },
  {
    icon: Lock,
    title: 'Privacy First',
    description:
      'No ads, no tracking, no selling data. Your conversations stay yours. Open source and transparent.',
    gradient: 'from-emerald-400 to-teal-500',
  },
  {
    icon: Mic,
    title: 'Voice & Video',
    description:
      'High-quality voice channels and video calls with screen sharing, coming soon to all communities.',
    gradient: 'from-rose-400 to-red-500',
  },
];

export default function Features() {
  return (
    <section id="features" className="py-24 md:py-32 relative">
      <div className="container">
        {/* Section Header */}
        <div className="max-w-3xl mx-auto text-center mb-16 md:mb-20">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary-muted border border-secondary/20 mb-6">
            <span className="text-sm font-medium text-secondary">Features</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6">
            Everything you need to
            <br />
            <span className="gradient-text">build your community</span>
          </h2>
          <p className="text-lg text-foreground-muted">
            Powerful features designed for modern communities. From small groups to
            large organizations, FreedomTalk scales with you.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className="card group cursor-default"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              {/* Icon */}
              <div
                className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.gradient} p-0.5 mb-4 group-hover:scale-110 transition-transform duration-300`}
              >
                <div className="w-full h-full rounded-[10px] bg-background-elevated flex items-center justify-center">
                  <feature.icon className="w-5 h-5 text-foreground" />
                </div>
              </div>

              {/* Content */}
              <h3 className="text-lg font-semibold mb-2 group-hover:text-accent transition-colors">
                {feature.title}
              </h3>
              <p className="text-sm text-foreground-muted leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
