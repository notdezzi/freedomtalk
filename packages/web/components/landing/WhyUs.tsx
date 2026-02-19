'use client';

export function WhyUs() {
  return (
    <section className="py-20 px-4">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-3xl font-bold text-white mb-8">
          Why FreedomTalk?
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <div className="text-4xl font-bold text-blue-500 mb-2">100%</div>
            <div className="text-gray-400">Open Source</div>
          </div>
          <div>
            <div className="text-4xl font-bold text-green-500 mb-2">0$</div>
            <div className="text-gray-400">Free Forever</div>
          </div>
          <div>
            <div className="text-4xl font-bold text-purple-500 mb-2">∞</div>
            <div className="text-gray-400">Possibilities</div>
          </div>
        </div>
      </div>
    </section>
  );
}
