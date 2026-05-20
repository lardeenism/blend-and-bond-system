import { Link } from 'react-router-dom';
import { Coffee, Mail, Phone, MapPin, Globe, Heart, ExternalLink, Clock } from 'lucide-react';
import { getLogoImage } from '../utils/imageMap';
import './Footer.css';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-wave">
        <svg viewBox="0 0 1200 100" preserveAspectRatio="none">
          <path d="M0,50 C300,100 900,0 1200,50 L1200,100 L0,100Z" fill="var(--bg-secondary)" />
        </svg>
      </div>
      <div className="footer-content">
        <div className="container">
          <div className="footer-grid">
            <div className="footer-brand">
              <div className="footer-logo">
                <img src={getLogoImage()} alt="Blend & Bond" className="footer-logo-img" />
                <div>
                  <h3>Blend & Bond</h3>
                  <span>C A F E</span>
                </div>
              </div>
              <p>Where every cup creates a connection. Premium coffee, artisan pastries, and warm hospitality since 2025.</p>
              <div className="footer-social">
                <a href="#" aria-label="Website"><Globe /></a>
                <a href="#" aria-label="Love"><Heart /></a>
                <a href="#" aria-label="Other"><ExternalLink /></a>
              </div>
            </div>

            <div className="footer-links-group">
              <h4>Quick Links</h4>
              <Link to="/">Home</Link>
              <Link to="/menu">Menu</Link>
              <Link to="/track">Track Order</Link>
              <Link to="/about">About Us</Link>
            </div>

            <div className="footer-links-group">
              <h4>Categories</h4>
              <Link to="/menu?category=Coffee">Coffee</Link>
              <Link to="/menu?category=Non Coffee">Non Coffee</Link>
              <Link to="/menu?category=Meals">Meals</Link>
              <Link to="/menu?category=Desserts">Desserts</Link>
              <Link to="/menu?category=Pastries">Pastries</Link>
              <Link to="/menu?category=Cookies">Cookies</Link>
            </div>

            <div className="footer-links-group">
              <h4>Contact</h4>
              <div className="footer-contact">
                <MapPin /> <span>Calape, Bohol, Philippines</span>
              </div>
              <div className="footer-contact">
                <Phone /> <span>0992 596 6736</span>
              </div>
              <div className="footer-contact">
                <Mail /> <span>hello@blendandbond.cafe</span>
              </div>
              <div className="footer-contact" style={{ marginTop: '12px' }}>
                <Clock /> <span>Open Daily: 8:00 AM — 9:00 PM</span>
              </div>
            </div>
          </div>

          <div className="footer-bottom">
            <p>© {new Date().getFullYear()} Blend & Bond Cafe. All rights reserved.</p>
            <p className="footer-credit">Crafted with <Coffee size={14} style={{ display: 'inline', verticalAlign: 'middle' }} /> by Gerald & Desiree</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
