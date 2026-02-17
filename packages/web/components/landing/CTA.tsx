'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export default function CTA() {
  return (
    <section className="py-24 md:py-32 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-accent/10 rounded-full blur-3xl" />
      </div>

      <div className="container relative">
        <div className="max-w-4xl mx-auto">
          <div className="card !p-0 overflow-hidden">
            {/* Gradient border effect */}
            <div className="p-[1px] bg-gradient-to-r from-accent via-secondary to-accent">
              <div className="bg-background-elevated px-8 py-12 md:px-16 md:py-20 text-center">
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6">
                  Ready to build your
                  <br />
                  <span className="gradient-text">community?</span>
                </h2>
                <p className="text-lg text-foreground-muted max-w-xl mx-auto mb-10">
                  Join thousands of communities already using FreedomTalk.
                  Get started for free and see why people are making the switch.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <Link
                    href="/auth/register"
                    className="btn btn-primary text-base px-8 py-4 group"
                  >
                    Create Free Account
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </Link>
                  <Link
                    href="#"
                    className="btn btn-secondary text-base px-8 py-4"
                  >
                    Contact Sales
                  </Link>
                </div>
                <p className="mt-6 text-sm text-foreground-subtle">
                  No credit card required. Free forever for personal use.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
