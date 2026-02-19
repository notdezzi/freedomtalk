'use client';

const features = [
  {
    title: 'Voice Channels',
    description: 'Hang out with voice channels. No calling required.',
    icon: '🎤',
  },
  {
    title: 'Text Channels',
    description: 'Share ideas, images, and links in organized channels.',
    icon: '💬',
  },
  {
    title: 'Video Calls',
    description: 'Stream your screen or video chat with friends.',
    icon: '📹',
  },
  {
    title: 'Communities',
    description: 'Create servers for any community, big or small.',
    icon: '👥',
  },
];

export function Features() {
  return (
    <section className="py-20 px-4 bg-gray-800/50">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold text-white text-center mb-12">
          Everything you need to connect
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="bg-gray-800 rounded-lg p-6 text-center"
            >
              <div className="text-4xl mb-4">{feature.icon}</div>
              <h3 className="text-lg font-semibold text-white mb-2">
                {feature.title}
              </h3>
              <p className="text-gray-400">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
