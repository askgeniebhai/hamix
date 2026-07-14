import React from 'react';
import { GlassCard } from './UI/GlassCard';
import { Search, Users, TrendingUp } from 'lucide-react';

export const PlatformSection = () => {
  const features = [
    {
      icon: Search,
      title: 'Find Customers',
      description: 'Discover high-potential customers across multiple channels.',
    },
    {
      icon: Users,
      title: 'Build Relationships',
      description: 'Automate outreach and engage customers that matter.',
    },
    {
      icon: TrendingUp,
      title: 'Grow Revenue',
      description: 'Convert leads, close deals, and grow revenue — predictably.',
    },
  ];

  return (
    <section id="platform" className="py-32">
      <div className="container mx-auto px-6">
        <div className="text-center mb-20">
          <span className="text-xs font-bold uppercase tracking-[0.3em] text-primary mb-4 block">All you need to grow</span>
          <h2 className="text-4xl font-bold mb-4">The Complete Platform for Business Operations</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((feature, idx) => (
            <GlassCard key={idx} className="flex flex-col items-center text-center p-12">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-8 border border-primary/20">
                <feature.icon className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-2xl font-bold mb-4">{feature.title}</h3>
              <p className="text-white/50 leading-relaxed">
                {feature.description}
              </p>
            </GlassCard>
          ))}
        </div>
      </div>
    </section>
  );
};
