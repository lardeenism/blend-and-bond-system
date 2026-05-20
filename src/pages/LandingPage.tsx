import { useEffect, useState, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Coffee, Heart, Star, Clock, Truck, Shield, ChevronLeft, ChevronRight } from 'lucide-react';
import axios from 'axios';
import ProductCard from '../components/ProductCard';
import { getProductImage, getOwnerImage } from '../utils/imageMap';
import './LandingPage.css';

interface Size {
  size_label: string;
  volume_ml: number | null;
  price: number;
}

interface Product {
  id: number; name: string; description: string; base_price: number;
  image_filename: string; category_name: string; avg_rating: number;
  total_reviews: number; is_featured: boolean; is_best_seller: boolean;
  has_sizes: boolean; stock: number; sizes: Size[];
}

export default function LandingPage() {
  const [featured, setFeatured] = useState<Product[]>([]);
  const [bestSellers, setBestSellers] = useState<Product[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [heroIndex, setHeroIndex] = useState(0);
  const [promoIndex, setPromoIndex] = useState(0);
  const heroTimerRef = useRef<number | null>(null);
  const promoTimerRef = useRef<number | null>(null);
  
  // Default caffe americano product for immediate display
  const defaultProduct: Product = {
    id: 0,
    name: 'Caffe Americano',
    category_name: 'Coffee',
    description: 'Classic espresso and hot water',
    base_price: 0,
    image_filename: 'Caffe Americano.jpg',
    avg_rating: 0,
    total_reviews: 0,
    is_featured: false,
    is_best_seller: false,
    has_sizes: false,
    stock: 0,
    sizes: []
  };

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const [featRes, bestRes, allRes] = await Promise.all([
          axios.get('/api/products?featured=true'),
          axios.get('/api/products?best_seller=true'),
          axios.get('/api/products'),
        ]);
        setFeatured(featRes.data.products.slice(0, 8));
        setBestSellers(bestRes.data.products.slice(0, 6));
        // Pick one product per category for carousel
        const byCategory: Record<string, Product> = {};
        for (const p of allRes.data.products) {
          if (!byCategory[p.category_name]) byCategory[p.category_name] = p;
        }
        setAllProducts(Object.values(byCategory));
      } catch (err) {
        console.error('Failed to fetch products:', err);
      } finally { setLoading(false); }
    };
    fetchProducts();
  }, []);

  // Hero carousel auto-advance
  const heroProducts = allProducts.length > 0 ? allProducts : [defaultProduct];
  const heroLen = heroProducts.length;

  const nextHero = useCallback(() => {
    if (heroLen > 0) setHeroIndex(prev => (prev + 1) % heroLen);
  }, [heroLen]);

  const prevHero = useCallback(() => {
    if (heroLen > 0) setHeroIndex(prev => (prev - 1 + heroLen) % heroLen);
  }, [heroLen]);

  useEffect(() => {
    if (heroLen <= 1) return;
    heroTimerRef.current = window.setInterval(nextHero, 4000);
    return () => { if (heroTimerRef.current) clearInterval(heroTimerRef.current); };
  }, [heroLen, nextHero]);

  const resetHeroTimer = useCallback(() => {
    if (heroTimerRef.current) clearInterval(heroTimerRef.current);
    if (heroLen > 1) {
      heroTimerRef.current = window.setInterval(nextHero, 4000);
    }
  }, [heroLen, nextHero]);

  // Promo carousel
  const promoProducts = featured.slice(0, 6);
  const promoLen = promoProducts.length;

  const nextPromo = useCallback(() => {
    if (promoLen > 0) setPromoIndex(prev => (prev + 1) % promoLen);
  }, [promoLen]);

  useEffect(() => {
    if (promoLen <= 1) return;
    promoTimerRef.current = window.setInterval(nextPromo, 5000);
    return () => { if (promoTimerRef.current) clearInterval(promoTimerRef.current); };
  }, [promoLen, nextPromo]);

  const resetPromoTimer = useCallback(() => {
    if (promoTimerRef.current) clearInterval(promoTimerRef.current);
    if (promoLen > 1) {
      promoTimerRef.current = window.setInterval(nextPromo, 5000);
    }
  }, [promoLen, nextPromo]);

  // Swipe & Drag handlers for Hero Carousel
  const heroTrackRef = useRef<HTMLDivElement>(null);
  const heroDragStart = useRef<number | null>(null);
  const heroIsDragging = useRef<boolean>(false);

  const handleHeroTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
    if (e.type === 'mousedown') e.preventDefault();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    heroDragStart.current = clientX;
    heroIsDragging.current = true;
    if (heroTrackRef.current) {
      heroTrackRef.current.classList.add('dragging');
    }
  };

  const handleHeroTouchMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!heroIsDragging.current || heroDragStart.current === null) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const deltaX = clientX - heroDragStart.current;
    
    if (heroTrackRef.current) {
      const width = heroTrackRef.current.offsetWidth || 400;
      const baseTranslate = -heroIndex * 100;
      const pctOffset = (deltaX / width) * 100;
      heroTrackRef.current.style.transform = `translateX(${baseTranslate + pctOffset}%)`;
    }
  };

  const handleHeroTouchEnd = (e: React.TouchEvent | React.MouseEvent) => {
    if (!heroIsDragging.current || heroDragStart.current === null) return;
    
    let clientX = 0;
    if ('changedTouches' in e) {
      clientX = (e as unknown as React.TouchEvent).changedTouches[0].clientX;
    } else if ('touches' in e) {
      const touches = (e as unknown as React.TouchEvent).touches;
      clientX = touches.length > 0 ? touches[0].clientX : heroDragStart.current;
    } else {
      clientX = (e as React.MouseEvent).clientX;
    }
    
    const deltaX = clientX - heroDragStart.current;
    heroIsDragging.current = false;
    heroDragStart.current = null;
    
    if (heroTrackRef.current) {
      heroTrackRef.current.classList.remove('dragging');
      heroTrackRef.current.style.transform = '';
    }
    
    const threshold = 50;
    if (deltaX < -threshold) {
      nextHero();
      resetHeroTimer();
    } else if (deltaX > threshold) {
      prevHero();
      resetHeroTimer();
    }
  };

  // Swipe & Drag handlers for Promo Carousel
  const promoTrackRef = useRef<HTMLDivElement>(null);
  const promoDragStart = useRef<number | null>(null);
  const promoIsDragging = useRef<boolean>(false);

  const handlePromoTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
    if (e.type === 'mousedown') e.preventDefault();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    promoDragStart.current = clientX;
    promoIsDragging.current = true;
    if (promoTrackRef.current) {
      promoTrackRef.current.classList.add('dragging');
    }
  };

  const handlePromoTouchMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!promoIsDragging.current || promoDragStart.current === null) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const deltaX = clientX - promoDragStart.current;
    
    if (promoTrackRef.current) {
      const width = promoTrackRef.current.offsetWidth || 320;
      const baseTranslate = -promoIndex * 100;
      const pctOffset = (deltaX / width) * 100;
      promoTrackRef.current.style.transform = `translateX(${baseTranslate + pctOffset}%)`;
    }
  };

  const handlePromoTouchEnd = (e: React.TouchEvent | React.MouseEvent) => {
    if (!promoIsDragging.current || promoDragStart.current === null) return;
    
    let clientX = 0;
    if ('changedTouches' in e) {
      clientX = (e as unknown as React.TouchEvent).changedTouches[0].clientX;
    } else if ('touches' in e) {
      const touches = (e as unknown as React.TouchEvent).touches;
      clientX = touches.length > 0 ? touches[0].clientX : promoDragStart.current;
    } else {
      clientX = (e as React.MouseEvent).clientX;
    }
    
    const deltaX = clientX - promoDragStart.current;
    promoIsDragging.current = false;
    promoDragStart.current = null;
    
    if (promoTrackRef.current) {
      promoTrackRef.current.classList.remove('dragging');
      promoTrackRef.current.style.transform = '';
    }
    
    const threshold = 50;
    if (deltaX < -threshold) {
      nextPromo();
      resetPromoTimer();
    } else if (deltaX > threshold) {
      if (promoLen > 0) setPromoIndex(prev => (prev - 1 + promoLen) % promoLen);
      resetPromoTimer();
    }
  };

  // Scroll reveal
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('revealed'); }),
      { threshold: 0.1 }
    );
    document.querySelectorAll('.scroll-reveal').forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, [loading]);

  const testimonials = [
    { name: 'Maria Santos', text: 'The best coffee in Bohol! The ambiance is so cozy and the staff are wonderful.', rating: 5 },
    { name: 'John Rivera', text: 'Their croissants are to die for. I come here every morning before work.', rating: 5 },
    { name: 'Ana Garcia', text: 'Love the delivery service! Fresh coffee right at my doorstep. Amazing quality.', rating: 5 },
    { name: 'Carlos Mendoza', text: 'Perfect spot for work meetings. Great WiFi and even better Spanish Latte!', rating: 4 },
  ];

  return (
    <div className="landing-page">
      {/* Hero with Product Carousel */}
      <section className="hero">
        <div className="hero-bg">
          <div className="hero-particles">
            {[...Array(20)].map((_, i) => {
              const left = (i * 7 + 11) % 100;
              const delay = (i * 3 + 2) % 5;
              const duration = 3 + ((i * 13 + 5) % 4);
              return (
                <div
                  key={i}
                  className="particle"
                  style={{
                    left: `${left}%`,
                    animationDelay: `${delay}s`,
                    animationDuration: `${duration}s`
                  }}
                />
              );
            })}
          </div>
        </div>
        <div className="hero-content container">
          <div className="hero-text">
            <span className="hero-badge animate-fade-in-down"><Coffee size={16} /> Premium Cafe Experience</span>
            <h1 className="hero-title animate-fade-in-up">Where Every Cup<br /><span className="hero-accent">Creates a Bond</span></h1>
            <p className="hero-desc animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
              Handcrafted beverages, artisan pastries, and warm moments. Experience the perfect blend of taste and togetherness.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', width: 'fit-content' }}>
              <div className="hero-actions animate-fade-in-up" style={{ animationDelay: '0.15s', marginBottom: '24px' }}>
                <Link to="/menu" className="btn btn-primary btn-lg">Order Now <ArrowRight size={16} /></Link>
                <Link to="/about" className="btn btn-secondary btn-lg">Our Story</Link>
              </div>
              <div className="hero-stats animate-fade-in-up" style={{ animationDelay: '0.2s', justifyContent: 'center' }}>
                <div className="stat"><span className="stat-number">50+</span><span className="stat-label">Menu Items</span></div>
              </div>
            </div>
          </div>

          {/* Product Carousel */}
          <div className="hero-visual animate-scale-in">
            <div
              className="hero-carousel"
              onTouchStart={handleHeroTouchStart}
              onTouchMove={handleHeroTouchMove}
              onTouchEnd={handleHeroTouchEnd}
              onMouseDown={handleHeroTouchStart}
              onMouseMove={handleHeroTouchMove}
              onMouseUp={handleHeroTouchEnd}
              onMouseLeave={handleHeroTouchEnd}
              style={{ cursor: heroLen > 1 ? 'grab' : 'default' }}
            >
              <div
                className="hero-carousel-track"
                ref={heroTrackRef}
                style={{ transform: `translateX(-${heroIndex * 100}%)` }}
              >
                {heroProducts.map((p) => (
                  <div className="hero-carousel-slide" key={p.id}>
                    <div className="hero-image-wrapper">
                      <img
                        src={getProductImage(p.image_filename)}
                        alt={p.name}
                        className="hero-image"
                        draggable="false"
                      />
                      <div className="hero-image-glow" />
                    </div>
                    <div className="hero-carousel-info">
                      <span className="hero-carousel-cat">{p.category_name}</span>
                      <h3 className="hero-carousel-name">{p.name}</h3>
                    </div>
                  </div>
                ))}
              </div>

              {heroLen > 1 && (
                <div className="hero-carousel-dots">
                  {heroProducts.map((_, i) => (
                    <button
                      key={i}
                      className={`hero-dot ${i === heroIndex ? 'active' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setHeroIndex(i);
                        resetHeroTimer();
                      }}
                    />
                  ))}
                </div>
              )}

              {heroLen > 1 && (
                <>
                  <button
                    className="hero-carousel-btn hero-carousel-btn-prev"
                    onClick={(e) => {
                      e.stopPropagation();
                      prevHero();
                      resetHeroTimer();
                    }}
                  >
                    <ChevronLeft size={24} />
                  </button>
                  <button
                    className="hero-carousel-btn hero-carousel-btn-next"
                    onClick={(e) => {
                      e.stopPropagation();
                      nextHero();
                      resetHeroTimer();
                    }}
                  >
                    <ChevronRight size={24} />
                  </button>
                </>
              )}
            </div>

            <div className="hero-float-card float-card-1 animate-float">
              <Coffee size={16} /> <span>Fresh Brewed</span>
            </div>
            <div className="hero-float-card float-card-2 animate-float" style={{ animationDelay: '1s' }}>
              <Heart size={16} /> <span>Made with Love</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="features section">
        <div className="container">
          <div className="features-grid scroll-reveal">
            {[
              { icon: <Coffee size={24} />, title: 'Premium Quality', desc: 'Sourced from the finest coffee beans worldwide' },
              { icon: <Clock size={24} />, title: 'Quick Service', desc: 'Fresh preparation with minimal wait time' },
              { icon: <Truck size={24} />, title: 'Fast Delivery', desc: 'Hot coffee delivered right to your doorstep' },
              { icon: <Shield size={24} />, title: 'Hygiene First', desc: 'Strict food safety standards maintained' },
            ].map((f, i) => (
              <div key={i} className="feature-card glass-card">
                <div className="feature-icon">{f.icon}</div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="section featured-section">
        <div className="container">
          <div className="scroll-reveal">
            <h2 className="section-title">Featured Products</h2>
            <p className="section-subtitle">Handpicked favorites from our menu</p>
          </div>
          {loading ? (
            <div className="products-grid">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="skeleton-card">
                  <div className="skeleton" style={{ height: '200px' }} />
                  <div style={{ padding: '16px' }}>
                    <div className="skeleton" style={{ height: '20px', width: '60%', marginBottom: '8px' }} />
                    <div className="skeleton" style={{ height: '14px', width: '100%' }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="products-grid">
              {featured.map(product => <ProductCard key={product.id} product={product} />)}
            </div>
          )}
          <div className="section-cta scroll-reveal">
            <Link to="/menu" className="btn btn-accent btn-lg">View Full Menu <ArrowRight size={16} /></Link>
          </div>
        </div>
      </section>

      {/* Best Sellers */}
      <section className="section best-sellers-section">
        <div className="container">
          <div className="scroll-reveal"><h2 className="section-title">Best Sellers</h2><p className="section-subtitle">Our customers' all-time favorites</p></div>
          <div className="products-grid">
            {bestSellers.map(product => <ProductCard key={product.id} product={product} />)}
          </div>
        </div>
      </section>

      {/* Promo */}
      <section className="promo-section scroll-reveal">
        <div className="container">
          <div className="promo-card">
            <div className="promo-content">
              <span className="promo-badge"><Star size={14} /> Special Offer</span>
              <h2 className="promo-title">Free Delivery on Your First Order!</h2>
              <p className="promo-desc">Order through our website and enjoy free delivery anywhere in Calape, Bohol.</p>
              <Link to="/menu" className="btn btn-primary btn-lg">Order Now</Link>
            </div>
            <div className="promo-visual">
              <div
                className="promo-carousel"
                onTouchStart={handlePromoTouchStart}
                onTouchMove={handlePromoTouchMove}
                onTouchEnd={handlePromoTouchEnd}
                onMouseDown={handlePromoTouchStart}
                onMouseMove={handlePromoTouchMove}
                onMouseUp={handlePromoTouchEnd}
                onMouseLeave={handlePromoTouchEnd}
                style={{ cursor: promoLen > 1 ? 'grab' : 'default' }}
              >
                <div
                  className="promo-carousel-track"
                  ref={promoTrackRef}
                  style={{ transform: `translateX(-${promoIndex * 100}%)` }}
                >
                  {promoProducts.map((p) => (
                    <div className="promo-carousel-slide" key={p.id}>
                      <img
                        src={getProductImage(p.image_filename)}
                        alt="Promo Product"
                        className="promo-image"
                        draggable="false"
                      />
                    </div>
                  ))}
                </div>
                {promoLen > 1 && (
                  <div className="promo-carousel-dots">
                    {promoProducts.map((_, i) => (
                      <button
                        key={i}
                        className={`promo-dot ${i === promoIndex ? 'active' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setPromoIndex(i);
                          resetPromoTimer();
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="section testimonials-section">
        <div className="container">
          <div className="scroll-reveal"><h2 className="section-title">What Our Customers Say</h2><p className="section-subtitle">Real reviews from our beloved guests</p></div>
          <div className="testimonials-grid scroll-reveal">
            {testimonials.map((t, i) => (
              <div key={i} className="testimonial-card glass-card">
                <div className="testimonial-stars">
                  {[...Array(t.rating)].map((_, j) => <Star key={j} size={14} className="star-icon filled" />)}
                </div>
                <p className="testimonial-text">"{t.text}"</p>
                <div className="testimonial-author">
                  <div className="author-avatar">{t.name[0]}</div>
                  <span className="author-name">{t.name}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About Preview */}
      <section className="section about-preview scroll-reveal">
        <div className="container">
          <div className="about-grid">
            <div className="about-images">
              <img src={getOwnerImage('gerald')} alt="Gerald Y. Tesorio" className="owner-img owner-1" />
              <img src={getOwnerImage('des')} alt="Desiree D. Alombro" className="owner-img owner-2" />
            </div>
            <div className="about-text">
              <h2 className="section-title" style={{ textAlign: 'left' }}>Meet the Founders</h2>
              <p className="about-desc"><strong>Gerald Y. Tesorio</strong> and <strong>Desiree D. Alombro</strong> founded Blend & Bond Cafe with a simple dream — to create a space where great coffee brings people together.</p>
              <p className="about-desc">Every cup we serve carries our passion for quality and our commitment to building meaningful connections.</p>
              <Link to="/about" className="btn btn-secondary">Read Our Story <ArrowRight size={14} /></Link>
            </div>
          </div>
        </div>
      </section>

      {/* Contact */}
      <section className="section contact-section scroll-reveal">
        <div className="container">
          <h2 className="section-title">Visit Us</h2>
          <p className="section-subtitle">We'd love to see you!</p>
          <div className="contact-grid">
            <div className="contact-card glass-card">
              <Clock size={28} className="contact-icon" />
              <h3>Working Hours</h3>
              <p>Monday - Sunday</p>
              <p className="contact-highlight">8:00 AM — 9:00 PM</p>
            </div>
            <div className="contact-card glass-card">
              <Coffee size={28} className="contact-icon" />
              <h3>Location</h3>
              <p>Calape, Bohol</p>
              <p className="contact-highlight">Philippines</p>
            </div>
            <div className="contact-card glass-card">
              <Heart size={28} className="contact-icon" />
              <h3>Order Online</h3>
              <p>Dine-in / Take-out / Delivery</p>
              <Link to="/menu" className="contact-highlight contact-link">Start Ordering</Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
