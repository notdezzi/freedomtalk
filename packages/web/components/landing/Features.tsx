'use client';

import { Mic, MessageSquare, Video, Users } from 'lucide-react';

const features = [
  {
    title: 'Voice Channels',
    description: 'Hang out with voice channels. Drop in and out anytime—no calling required.',
    icon: Mic,
    gradient: 'from-accent to-accent-hover',
  },
  {
    title: 'Text Channels',
    description: 'Share ideas, images, links, and files in organized, topic-based channels.',
    icon: MessageSquare,
    gradient: 'from-secondary to-accent',
  },
  {
    title: 'Video Calls',
    description: 'Stream your screen or video chat with crystal-clear quality.',
    icon: Video,
    gradient: 'from-accent to-secondary',
  },
  {
    title: 'Communities',
    description: 'Create servers for any community, from small friend groups to large organizations.',
    icon: Users,
    gradient: 'from-secondary to-accent-hover',
  },
];

export function Features() {
  return (
    <section id="features" className="relative py-32 px-6 lg:px-8 overflow-hidden">
      {/* Smooth fade from previous section */}
      <div className="absolute top-0 left-0 right-0 h-48 bg-gradient-to-b from-background via-background/50 to-transparent pointer-events-none z-10" />

      {/* Background accent - subtle */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-accent/5 rounded-full blur-[100px]" />
      </div>

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Section header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Everything you need to <span className="gradient-text">connect</span>
          </h2>
          <p className="text-foreground-muted max-w-xl mx-auto">
            Powerful features designed to bring people together, whether you&apos;re gaming, working, or just hanging out.
          </p>
        </div>

        {/* Feature cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className="group relative"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="card h-full flex flex-col items-center text-center p-8 hover:border-accent/30 transition-all duration-300 bg-background-elevated/50 backdrop-blur-sm">
                  {/* Icon */}
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-6 transition-transform duration-300 group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-accent/20`}>
                    <Icon className="w-7 h-7 text-background" />
                  </div>

                  {/* Content */}
                  <h3 className="text-lg font-semibold mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-foreground-muted text-sm leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Smooth fade to next section */}
      {/* <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-background via-background/50 to-transparent pointer-events-none z-10" /> */}
    </section>
  );
}
