'use client';

import Link from 'next/link';
import { ArrowRight, Sparkles, Users, Zap } from 'lucide-react';

export default function Hero() {
  return (
    <section className="relative pt-32 pb-20 md:pt-40 md:pb-32 overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Floating orbs */}
        <div className="absolute top-1/4 left-[10%] w-64 h-64 bg-accent/10 rounded-full blur-3xl animate-float" />
        <div
          className="absolute top-1/3 right-[15%] w-48 h-48 bg-secondary/10 rounded-full blur-3xl animate-float"
          style={{ animationDelay: '2s' }}
        />
        <div
          className="absolute bottom-1/4 left-[20%] w-32 h-32 bg-accent/5 rounded-full blur-2xl animate-float"
          style={{ animationDelay: '4s' }}
        />

        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }}
        />
      </div>

      <div className="container relative">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent-muted border border-accent/20 mb-8 animate-fade-in-up opacity-0">
            <Sparkles className="w-4 h-4 text-accent" />
            <span className="text-sm font-medium text-accent">
              Now in public beta
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight mb-6 animate-fade-in-up opacity-0 delay-100">
            Where communities
            <br />
            <span className="gradient-text animate-gradient">
              come alive
            </span>
          </h1>

          {/* Subheadline */}
          <p className="text-lg sm:text-xl text-foreground-muted max-w-2xl mx-auto mb-10 animate-fade-in-up opacity-0 delay-200">
            FreedomTalk is the modern communication platform that brings people together.
            Build communities, share ideas, and connect in real-time with anyone, anywhere.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16 animate-fade-in-up opacity-0 delay-300">
            <Link href="/auth/register" className="btn btn-primary text-base px-8 py-4 group">
              Start for Free
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link href="#features" className="btn btn-secondary text-base px-8 py-4">
              Learn More
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-8 max-w-lg mx-auto animate-fade-in-up opacity-0 delay-400">
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold gradient-text mb-1">10K+</div>
              <div className="text-sm text-foreground-subtle">Active Users</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold gradient-text mb-1">500+</div>
              <div className="text-sm text-foreground-subtle">Communities</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold gradient-text mb-1">99.9%</div>
              <div className="text-sm text-foreground-subtle">Uptime</div>
            </div>
          </div>
        </div>

        {/* Preview Image/Illustration */}
        <div className="mt-20 relative animate-fade-in-up opacity-0 delay-500">
          <div className="relative max-w-5xl mx-auto">
            {/* Glow effect */}
            <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent z-10" />

            {/* Browser mockup */}
            <div className="rounded-2xl overflow-hidden border border-border shadow-2xl shadow-accent/5">
              {/* Browser header */}
              <div className="flex items-center gap-2 px-4 py-3 bg-background-elevated border-b border-border">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500/60" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                  <div className="w-3 h-3 rounded-full bg-green-500/60" />
                </div>
                <div className="flex-1 flex justify-center">
                  <div className="px-4 py-1.5 rounded-md bg-background-surface text-xs text-foreground-subtle">
                    freedomtalk.app
                  </div>
                </div>
              </div>

              {/* App preview */}
              <div className="bg-background-surface aspect-video relative">
                {/* Sidebar */}
                <div className="absolute left-0 top-0 bottom-0 w-16 bg-background-elevated border-r border-border flex flex-col items-center py-4 gap-2">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent to-secondary" />
                  <div className="w-8 h-8 rounded-full bg-background-surface mt-2" />
                  <div className="w-8 h-8 rounded-full bg-background-surface" />
                  <div className="w-8 h-8 rounded-full bg-background-surface" />
                  <div className="w-8 h-8 rounded-full bg-accent-muted border-2 border-dashed border-accent/30 flex items-center justify-center">
                    <span className="text-accent text-lg">+</span>
                  </div>
                </div>

                {/* Channels */}
                <div className="absolute left-16 top-0 bottom-0 w-52 bg-background-elevated border-r border-border p-3">
                  <div className="text-xs font-semibold text-foreground-subtle uppercase tracking-wider mb-3">
                    General
                  </div>
                  <div className="space-y-1">
                    {['# welcome', '# announcements', '# general', '# off-topic'].map((channel, i) => (
                      <div
                        key={channel}
                        className={`px-3 py-2 rounded-md text-sm ${
                          i === 2
                            ? 'bg-accent-muted text-accent'
                            : 'text-foreground-muted hover:bg-background-surface'
                        }`}
                      >
                        {channel}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Main chat area */}
                <div className="absolute left-[17rem] top-0 bottom-0 right-0 p-4">
                  <div className="h-full flex flex-col">
                    <div className="flex-1 space-y-4">
                      {[
                        { user: 'Alice', msg: 'Hey everyone! How\'s it going?', time: '10:30 AM' },
                        { user: 'Bob', msg: 'Great! Working on the new features 🚀', time: '10:31 AM' },
                        { user: 'Charlie', msg: 'Just joined! This looks amazing', time: '10:32 AM' },
                      ].map((chat, i) => (
                        <div key={i} className="flex gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent/50 to-secondary/50 flex-shrink-0" />
                          <div>
                            <div className="flex items-baseline gap-2">
                              <span className="font-semibold text-sm">{chat.user}</span>
                              <span className="text-xs text-foreground-subtle">{chat.time}</span>
                            </div>
                            <p className="text-sm text-foreground-muted">{chat.msg}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 flex items-center gap-2 px-4 py-3 rounded-xl bg-background-elevated border border-border">
                      <span className="text-foreground-subtle text-sm">Message #general</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
