import { useEffect, useRef } from 'react';
import { Coffee, Heart, Users, Award, MapPin, Clock, Sparkles } from 'lucide-react';
import { getOwnerImage, getLogoImage } from '../utils/imageMap';
import './AboutPage.css';

const FbIcon = ({ size = 20 }: { size?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>
);

const IgIcon = ({ size = 20 }: { size?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
);

export default function AboutPage() {
  const counterRef = useRef<boolean>(false);

  useEffect(() => {
    // Intersection observer for scroll reveals with stagger
    const observer = new IntersectionObserver(
      entries => entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('revealed');
          // Stagger children if present
          const children = e.target.querySelectorAll('.stagger-child');
          children.forEach((child, i) => {
            (child as HTMLElement).style.animationDelay = `${i * 0.12}s`;
            child.classList.add('stagger-revealed');
          });
        }
      }),
      { threshold: 0.1 }
    );
    document.querySelectorAll('.scroll-reveal').forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  // Counter animation
  useEffect(() => {
    if (counterRef.current) return;
    const observer = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting && !counterRef.current) {
          counterRef.current = true;
          document.querySelectorAll('.counter-value').forEach(el => {
            const target = parseInt(el.getAttribute('data-target') || '0');
            let current = 0;
            const step = Math.max(1, Math.floor(target / 40));
            const timer = setInterval(() => {
              current += step;
              if (current >= target) { current = target; clearInterval(timer); }
              el.textContent = current.toString();
            }, 30);
          });
        }
      });
    }, { threshold: 0.3 });
    const el = document.querySelector('.stats-section');
    if (el) observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="about-page">
      {/* Hero */}
      <section className="about-hero">
        <div className="about-hero-bg">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="about-particle" style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${4 + Math.random() * 6}s`,
            }} />
          ))}
        </div>
        <div className="container about-hero-inner">
          <div className="about-logo-wrapper animate-scale-in">
            <img src={getLogoImage()} alt="Blend & Bond Café" className="about-logo" />
          </div>
          <span className="about-badge animate-fade-in-down">
            <Sparkles size={14} /> Our Story
          </span>
          <h1 className="about-title animate-fade-in-up">
            Brewing Connections,<br />
            <span className="about-accent">One Cup at a Time</span>
          </h1>
          <p className="about-hero-desc animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            Blend & Bond Café was born from a passion for exceptional coffee and a belief
            that the best conversations happen over a warm cup.
          </p>
        </div>
      </section>

      {/* Stats Counter */}
      <section className="stats-section">
        <div className="container">
          <div className="about-stats-grid">
            {[
              { display: '2025', label: 'Founded' },
              { display: '50+', label: 'Menu Items' },
            ].map((stat, i) => (
              <div key={i} className="stat-card">
                <span className="stat-display-value">{stat.display}</span>
                <span className="stat-card-label">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Founders */}
      <section className="section founders-section">
        <div className="container">
          <div className="scroll-reveal">
            <h2 className="section-title">Meet Our Founders</h2>
            <p className="section-subtitle">The hearts and minds behind Blend & Bond</p>
          </div>

          <div className="founders-grid scroll-reveal">
            <div className="founder-card glass-card stagger-child">
              <div className="founder-image-wrapper">
                <img src={getOwnerImage('gerald')} alt="Gerald Y. Tesorio" className="founder-image" />
                <div className="founder-overlay">
                  <span className="founder-role-badge">Co-Founder & CEO</span>
                </div>
              </div>
              <div className="founder-info">
                <h3>Gerald Y. Tesorio</h3>
                <span className="founder-role">Co-Founder & CEO</span>
                <p>
                  With a deep love for coffee culture and entrepreneurship, Gerald envisioned 
                  a café that goes beyond serving drinks — a space where bonds are formed and 
                  communities thrive. His leadership drives the café's commitment to quality 
                  and innovation.
                </p>
                <div className="founder-socials">
                  <a href="https://www.facebook.com/gerald.tesorio.71" target="_blank" rel="noopener noreferrer" className="founder-social-link fb" aria-label="Facebook">
                    <FbIcon size={18} />
                  </a>
                  <a href="https://www.instagram.com/lard_eee/#" target="_blank" rel="noopener noreferrer" className="founder-social-link ig" aria-label="Instagram">
                    <IgIcon size={18} />
                  </a>
                </div>
              </div>
            </div>

            <div className="founder-card glass-card stagger-child">
              <div className="founder-image-wrapper">
                <img src={getOwnerImage('des')} alt="Desiree D. Alombro" className="founder-image" />
                <div className="founder-overlay">
                  <span className="founder-role-badge">Co-Founder & Creative Director</span>
                </div>
              </div>
              <div className="founder-info">
                <h3>Desiree D. Alombro</h3>
                <span className="founder-role">Co-Founder & Creative Director</span>
                <p>
                  Desiree brings creativity and warmth to every aspect of Blend & Bond. From 
                  curating the perfect menu to designing the cozy atmosphere, her attention to 
                  detail ensures every customer feels right at home. Her passion for baking 
                  inspires the café's artisan pastry collection.
                </p>
                <div className="founder-socials">
                  <a href="https://www.facebook.com/share/1BLPbDuLJu/" target="_blank" rel="noopener noreferrer" className="founder-social-link fb" aria-label="Facebook">
                    <FbIcon size={18} />
                  </a>
                  <a href="https://www.instagram.com/dezirey03?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw%3D%3D#" target="_blank" rel="noopener noreferrer" className="founder-social-link ig" aria-label="Instagram">
                    <IgIcon size={18} />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="section values-section">
        <div className="container">
          <div className="scroll-reveal">
            <h2 className="section-title">What We Stand For</h2>
            <p className="section-subtitle">The values that shape every cup we serve</p>
          </div>

          <div className="values-grid scroll-reveal">
            {[
              { icon: <Coffee />, title: 'Quality First', desc: 'We source only the finest ingredients and brew each cup with precision and care.', color: 'var(--primary)' },
              { icon: <Heart />, title: 'Made with Love', desc: 'Every item on our menu is crafted with passion and served with genuine warmth.', color: 'var(--error)' },
              { icon: <Users />, title: 'Community Bond', desc: 'We believe cafés are where friendships begin and communities grow stronger.', color: 'var(--info)' },
              { icon: <Award />, title: 'Excellence', desc: 'We strive for excellence in everything — from our beverages to customer service.', color: 'var(--gold)' },
            ].map((v, i) => (
              <div key={i} className="value-card glass-card stagger-child">
                <div className="value-icon" style={{ background: `linear-gradient(135deg, ${v.color} 0%, ${v.color}cc 100%)` }}>
                  {v.icon}
                </div>
                <h3>{v.title}</h3>
                <p>{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline Story */}
      <section className="section story-section">
        <div className="container">
          <div className="scroll-reveal">
            <h2 className="section-title">Our Journey</h2>
            <p className="section-subtitle">The milestones that shaped Blend & Bond</p>
          </div>

          <div className="timeline scroll-reveal">
            {[
              { year: '2025', title: 'The Dream Begins', desc: 'Gerald & Desiree unite their vision to create a café that blends flavors and bonds hearts in Calape, Bohol.' },
              { year: '2025', title: 'Doors Open', desc: 'Blend & Bond Café officially opens, welcoming the community with handcrafted beverages and warm smiles.' },
              { year: '2026', title: 'Growing Together', desc: 'Expanding the menu with artisan pastries, seasonal drinks, and adding delivery service to reach more customers.' },
              { year: '2026', title: 'Going Digital', desc: 'Launching our online ordering system to provide a seamless café experience from anywhere.' },
            ].map((item, i) => (
              <div key={i} className="timeline-item stagger-child">
                <div className="timeline-marker">
                  <span className="timeline-year">{item.year}</span>
                </div>
                <div className="timeline-content glass-card">
                  <h3>{item.title}</h3>
                  <p>{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Quote */}
      <section className="section quote-section scroll-reveal">
        <div className="container">
          <div className="quote-card">
            <div className="quote-mark">"</div>
            <blockquote>
              Every cup we serve is a chance to blend flavors and bond hearts.
            </blockquote>
            <div className="quote-authors">
              <img src={getOwnerImage('gerald')} alt="Gerald" className="quote-avatar" />
              <img src={getOwnerImage('des')} alt="Desiree" className="quote-avatar" />
              <span>— Gerald & Desiree</span>
            </div>
          </div>
        </div>
      </section>

      {/* Location CTA */}
      <section className="section location-section scroll-reveal">
        <div className="container">
          <div className="location-card glass-card">
            <div className="location-info">
              <h2>Visit Us Today</h2>
              <p><MapPin size={16} /> Calape, Bohol, Philippines</p>
              <p><Clock size={16} /> Open Daily: 8:00 AM — 9:00 PM</p>
            </div>
            <div className="location-cta">
              <a href="/menu" className="btn btn-primary btn-lg">Order Now</a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
