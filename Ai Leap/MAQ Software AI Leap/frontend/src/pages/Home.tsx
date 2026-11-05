import { useEffect, useState, useRef } from "react";
import { Sparkles, TrendingUp, Users, Zap, ChevronDown, Play, Star, ArrowRight } from "lucide-react";
import Header from "@/components/Header";
import DomainCard from "@/components/DomainCard";
import agentsData from "@/data/agents.json";

// Custom hook for intersection observer
const useIntersectionObserver = (options = {}) => {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [hasIntersected, setHasIntersected] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      setIsIntersecting(entry.isIntersecting);
      if (entry.isIntersecting && !hasIntersected) {
        setHasIntersected(true);
      }
    }, {
      threshold: 0.1,
      rootMargin: '50px',
      ...options,
    });

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [hasIntersected, options]);

  return { ref, isIntersecting, hasIntersected };
};

// Animation wrapper component
const ScrollAnimatedSection = ({ 
  children, 
  className = "", 
  animationType = "slideUp",
  delay = 0 
}: { 
  children: React.ReactNode; 
  className?: string;
  animationType?: "slideUp" | "slideLeft" | "slideRight" | "fadeIn" | "scaleIn";
  delay?: number;
}) => {
  const { ref, hasIntersected } = useIntersectionObserver();
  
  const getAnimationClass = () => {
    switch (animationType) {
      case "slideLeft":
        return hasIntersected ? "animate-slideInLeft" : "opacity-0 translate-x-8";
      case "slideRight":
        return hasIntersected ? "animate-slideInRight" : "opacity-0 -translate-x-8";
      case "fadeIn":
        return hasIntersected ? "animate-fadeIn" : "opacity-0";
      case "scaleIn":
        return hasIntersected ? "animate-scaleIn" : "opacity-0 scale-95";
      default: // slideUp
        return hasIntersected ? "animate-slideInUp" : "opacity-0 translate-y-8";
    }
  };

  return (
    <div 
      ref={ref} 
      className={`transition-all duration-700 ease-out ${getAnimationClass()} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
};

// Testimonial Component
const TestimonialCard = ({ name, role, content, rating, index }: {
  name: string;
  role: string;
  content: string;
  rating: number;
  index?: number;
}) => (
  <ScrollAnimatedSection animationType="scaleIn" delay={index ? index * 200 : 0}>
    <div className="bg-card/80 backdrop-blur-sm rounded-2xl border border-card-border p-6 shadow-lg hover:shadow-xl transition-all duration-300">
      <div className="flex items-center mb-4">
        {[...Array(rating)].map((_, i) => (
          <Star key={i} className="w-4 h-4 text-yellow-400 fill-current" />
        ))}
      </div>
      <p className="text-card-foreground mb-4 italic">"{content}"</p>
      <div>
        <div className="font-semibold text-card-foreground">{name}</div>
        <div className="text-sm text-muted-foreground">{role}</div>
      </div>
    </div>
  </ScrollAnimatedSection>
);

// Feature Highlight Component
const FeatureHighlight = ({ icon: Icon, title, description, index }: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  index?: number;
}) => (
  <ScrollAnimatedSection animationType="slideUp" delay={index ? index * 150 : 0}>
    <div className="text-center group">
      <div className="w-16 h-16 bg-gradient-to-br from-primary/0 to-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
        <Icon className="w-8 h-8 text-primary" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-muted-foreground text-sm">{description}</p>
    </div>
  </ScrollAnimatedSection>
);

const Home = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (sectionId: string) => {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-gradient-hero relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-40 right-10 w-96 h-96 bg-secondary/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
        <div className="absolute bottom-20 left-1/4 w-64 h-64 bg-accent/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '4s' }} />
      </div>

      <Header />
      
      {/* Main Content */}
      <main className="pt-24 pb-16 px-6 lg:px-8 relative z-10">
        <div className="max-w-7xl mx-auto">
          {/* Enhanced Hero Section */}
          <div 
            ref={heroRef}
            className={`text-center mb-32 ${isVisible ? "hero-enter" : "opacity-0"}`}
            style={{ transform: `translateY(${scrollY * 0.1}px)` }}
          >
            <ScrollAnimatedSection animationType="fadeIn">
              <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6 border border-primary/20">
                <Sparkles className="w-4 h-4" />
                Next-Gen AI Solutions
              </div>
            </ScrollAnimatedSection>

            <h1 className="text-4xl lg:text-7xl font-bold text-foreground mb-6 leading-tight">
              AI Agents{" "}
              <span className="text-gradient relative">
                Showcase
                <div className="absolute -bottom-2 left-0 right-0 h-1 bg-gradient-to-r from-primary to-secondary rounded-full" />
              </span>
            </h1>
            
            <p className="text-xl lg:text-2xl text-muted-foreground max-w-4xl mx-auto leading-relaxed mb-12">
              Explore intelligent automation solutions across different business domains. 
              Discover how AI agents can <span className="text-primary font-semibold">transform your workflows</span> and drive unprecedented efficiency.
            </p>
            

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-16">
              <button 
                onClick={() => scrollToSection('domains')}
                className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-3 rounded-xl font-medium transition-all duration-300 hover:scale-105 hover:shadow-lg group"
              >
                Explore Domains
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
              {/* <button className="inline-flex items-center gap-2 bg-card/60 backdrop-blur-sm hover:bg-card/80 text-card-foreground border border-card-border px-6 py-3 rounded-xl font-medium transition-all duration-300 hover:scale-105 hover:shadow-lg group">
                <Play className="w-4 h-4" />
                Watch Demo
              </button> */}
            </div>
            
            {/* Enhanced Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto cards-grid-symmetric">
              <ScrollAnimatedSection animationType="slideUp" delay={200}>
                <div className="bg-card/60 backdrop-blur-lg rounded-2xl border border-card-border p-8 shadow-lg hover:shadow-xl transition-all duration-300 group">
                  <div className="text-4xl font-bold text-black mb-2 group-hover:scale-110 transition-transform">
                    {agentsData.domains.length}+
                  </div>
                  <div className="text-muted-foreground font-medium">Business Domains</div>
                  <div className="text-xs text-muted-foreground mt-1">Across Industries</div>
                </div>
              </ScrollAnimatedSection>
              
              <ScrollAnimatedSection animationType="slideUp" delay={400}>
                <div className="bg-card/60 backdrop-blur-lg rounded-2xl border border-card-border p-8 shadow-lg hover:shadow-xl transition-all duration-300 group">
                  <div className="text-4xl font-bold text-black mb-2 group-hover:scale-110 transition-transform">
                    {agentsData.domains.reduce((acc, d) => acc + (d.use_cases?.length || 0), 0)}+
                  </div>
                  <div className="text-muted-foreground font-medium">AI Use Cases</div>
                  <div className="text-xs text-muted-foreground mt-1">Ready to Deploy</div>
                </div>
              </ScrollAnimatedSection>
              
              <ScrollAnimatedSection animationType="slideUp" delay={600}>
                <div className="bg-card/60 backdrop-blur-lg rounded-2xl border border-card-border p-8 shadow-lg hover:shadow-xl transition-all duration-300 group">
                  <div className="text-4xl font-bold text-black mb-2 group-hover:scale-110 transition-transform">
                    85%
                  </div>
                  <div className="text-muted-foreground font-medium">Efficiency Gain</div>
                  <div className="text-xs text-muted-foreground mt-1">Average Improvement</div>
                </div>
              </ScrollAnimatedSection>
            </div>

            {/* Scroll indicator */}
            <div className="mt-16">
              <button 
                onClick={() => scrollToSection('domains')}
                className="text-muted-foreground hover:text-primary transition-colors animate-bounce"
              >
                <ChevronDown className="w-6 h-6 mx-auto" />
              </button>
            </div>
          </div>


          {/* Domains Grid */}
          <section id="domains">
            <ScrollAnimatedSection animationType="slideUp">
              <div className="text-center mb-16">
                <h2 className="text-3xl lg:text-5xl font-bold text-foreground mb-6">
                  Explore <span className="text-gradient">AI Domains</span>
                </h2>
                <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
                  Discover specialized AI agents tailored for your industry and use case
                </p>
              </div>
            </ScrollAnimatedSection>

            <ScrollAnimatedSection animationType="slideUp" delay={300}>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 cards-grid-symmetric">
                {agentsData.domains.map((domain, index) => (
                  <DomainCard
                    key={domain.id}
                    id={domain.id}
                    domain={domain.domain}
                    description={domain.description}
                    icon={domain.icon}
                    useCaseCount={domain.use_cases.length}
                    index={index}
                  />
                ))}
              </div>
            </ScrollAnimatedSection>
          </section>


           {/* Features Section */}
          <section id="features" className="mb-16 mt-32">
            <ScrollAnimatedSection animationType="slideUp">
              <div className="text-center mb-16">
                <h2 className="text-3xl lg:text-5xl font-bold text-foreground mb-6">
                  Why Choose Our <span className="text-gradient">AI Agents</span>
                </h2>
                <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
                  Built with cutting-edge technology and designed for real-world impact
                </p>
              </div>
            </ScrollAnimatedSection>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 cards-grid-symmetric">
              <FeatureHighlight
                icon={Zap}
                title="Lightning Fast"
                description="Process thousands of requests in seconds with our optimized AI infrastructure"
                index={0}
              />
              <FeatureHighlight
                icon={TrendingUp}
                title="Scalable Solutions"
                description="Grow from prototype to enterprise with our flexible and robust platform"
                index={1}
              />
              <FeatureHighlight
                icon={Users}
                title="Expert Support"
                description="Get dedicated support from our AI specialists throughout your journey"
                index={2}
              />
            </div>
          </section>


          {/* CTA Section */}
          {/* <section className="mt-32 text-center">
            <ScrollAnimatedSection animationType="scaleIn">
              <div className="bg-gradient-to-r from-primary/10 via-secondary/10 to-primary/10 rounded-3xl border border-primary/20 p-12">
                <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-6">
                  Ready to Transform Your Business?
                </h2>
                <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
                  Join thousands of companies already using our AI agents to automate workflows and drive growth.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <button className="btn-primary text-lg px-8 py-4">
                    Start Free Trial
                  </button>
                  <button className="btn-secondary text-lg px-8 py-4">
                    Schedule Demo
                  </button>
                </div>
              </div>
            </ScrollAnimatedSection>
          </section> */}
        </div>
      </main>
    </div>
  );
};

export default Home;