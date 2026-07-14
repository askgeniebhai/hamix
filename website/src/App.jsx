import React from 'react';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { PlatformSection } from './components/PlatformSection';
import { SolutionsSection } from './components/SolutionsSection';
import { TrustSection } from './components/TrustSection';
import { CTASection } from './components/CTASection';
import { Footer } from './components/Footer';

function App() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main>
        <Hero />
        <PlatformSection />
        <SolutionsSection />
        <TrustSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
}

export default App;
