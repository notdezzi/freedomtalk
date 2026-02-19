'use client';

import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';

export function CTA() {
  return (
    <section id="community" className="relative py-32 px-6 lg:px-8 overflow-hidden">
      {/* Gradient background - more subtle */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[500px] bg-gradient-to-br from-accent/10 via-secondary/5 to-transparent rounded-full blur-[100px]" />
      </div>

      <div className="max-w-4xl mx-auto relative z-10">
        <div className="card p-12 md:p-16 text-center relative overflow-hidden bg-background-elevated/50 backdrop-blur-sm border-border">
          {/* Inner glow - subtle */}
          <div className="absolute inset-0 bg-gradient-to-br from-accent/3 to-secondary/3 pointer-events-none" />

          {/* Content */}
          <div className="relative">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent-muted border border-accent/20 mb-6">
              <Sparkles className="w-4 h-4 text-accent" />
              <span className="text-sm font-medium text-accent">Join the Community</span>
            </div>

            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Ready to start your journey?
            </h2>

            <p className="text-foreground-muted max-w-lg mx-auto mb-8">
              Join thousands of users who have already made the switch. Create your free account in seconds and start connecting.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/auth/register" className="btn btn-primary text-base px-8 py-4 group">
                Get Started for Free
                <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link href="https://github.com" target="_blank" rel="noopener noreferrer" className="btn btn-secondary text-base px-8 py-4">
                View on GitHub
              </Link>
            </div>

            <p className="mt-6 text-sm text-foreground-subtle">
              No credit card required · Free forever · Cancel anytime
            </p>
          </div>
        </div>
      </div>

      {/* Smooth fade to footer */}
      {/* <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background via-background/50 to-transparent pointer-events-none z-10" /> */}
    </section>
  );
}
