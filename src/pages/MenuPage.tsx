import { useEffect, useState, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import axios from 'axios';
import ProductCard from '../components/ProductCard';
import { useDebounce } from '../utils/useDebounce';
import { getProductImage, getLogoImage } from '../utils/imageMap';
import './MenuPage.css';

interface Size {
  size_label: string;
  volume_ml: number | null;
  price: number;
}

interface Product {
  id: number; name: string; description: string; base_price: number;
  image_filename: string; category_name: string; category_icon: string;
  avg_rating: number; total_reviews: number; is_featured: boolean; is_best_seller: boolean;
  has_sizes: boolean; stock: number; sizes: Size[];
}

interface Category {
  id: number; name: string; icon: string; slug: string;
}

// Simple in-memory cache to eliminate loading delay on subsequent visits
let cachedProducts: Product[] | null = null;
let cachedCategories: Category[] | null = null;

export default function MenuPage() {
  const [products, setProducts] = useState<Product[]>(cachedProducts || []);
  const [categories, setCategories] = useState<Category[]>(cachedCategories || []);
  const [loading, setLoading] = useState(!cachedProducts);
  const [search, setSearch] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();
  const activeCategory = searchParams.get('category') || 'All';

  // Debounce search to prevent lag on every keystroke
  const debouncedSearch = useDebounce(search, 300);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [prodRes, catRes] = await Promise.all([
          axios.get('/api/products'),
          axios.get('/api/categories'),
        ]);
        cachedProducts = prodRes.data.products;
        cachedCategories = catRes.data.categories;
        setProducts(cachedProducts || []);
        setCategories(cachedCategories || []);
      } catch (err) {
        console.error('Failed to fetch menu:', err);
      } finally { setLoading(false); }
    };
    
    // Always fetch in background to keep data fresh, but skip loading state if cached
    fetchData();
  }, []);

  const setCategory = useCallback((cat: string) => {
    const next = new URLSearchParams(searchParams);
    if (cat === 'All') { next.delete('category'); }
    else { next.set('category', cat); }
    setSearchParams(next);
  }, [searchParams, setSearchParams]);

  // Memoize filtered products — only recomputes when products, category, or debounced search changes
  const filtered = useMemo(() => {
    return products.filter(p => {
      const matchCat = activeCategory === 'All' || p.category_name === activeCategory;
      const q = debouncedSearch.toLowerCase();
      const matchSearch = !q || p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
  }, [products, activeCategory, debouncedSearch]);

  // Map category names to representative product images
  const categoryImages = useMemo(() => {
    const map: Record<string, string> = {};
    for (const product of products) {
      if (!map[product.category_name]) {
        map[product.category_name] = getProductImage(product.image_filename);
      }
    }
    return map;
  }, [products]);

  return (
    <div className="menu-page">
      <div className="menu-header">
        <div className="container">
          <h1 className="menu-title">Our Menu</h1>
          <p className="menu-subtitle">Discover our carefully crafted selection of beverages and treats</p>
        </div>
      </div>

      <div className="container">
        <div className="menu-controls">
          <div className="search-box">
            <Search size={16} className="search-icon" />
            <input type="text" placeholder="Search menu..." value={search}
              onChange={e => setSearch(e.target.value)} className="search-input" />
            {search && <button onClick={() => setSearch('')} className="search-clear"><X size={14} /></button>}
          </div>

          <div className="category-filters">
            <button className={`category-pill ${activeCategory === 'All' ? 'active' : ''}`}
              onClick={() => setCategory('All')}>
              <img src={getLogoImage()} alt="All" className="category-pill-img" />
              <span className="category-pill-label">All</span>
            </button>
            {categories.map(cat => (
              <button key={cat.id}
                className={`category-pill ${activeCategory === cat.name ? 'active' : ''}`}
                onClick={() => setCategory(cat.name)}>
                <img src={categoryImages[cat.name] || getProductImage(null)} alt={cat.name} className="category-pill-img" />
                <span className="category-pill-label">{cat.name}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="menu-results">
          <span className="results-count">{filtered.length} {filtered.length === 1 ? 'item' : 'items'} found</span>
        </div>

        {loading ? (
          <div className="products-grid">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="skeleton-card">
                <div className="skeleton" style={{ height: '200px' }} />
                <div style={{ padding: '16px' }}>
                  <div className="skeleton" style={{ height: '20px', width: '60%', marginBottom: '8px' }} />
                  <div className="skeleton" style={{ height: '14px', width: '100%', marginBottom: '8px' }} />
                  <div className="skeleton" style={{ height: '14px', width: '40%' }} />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="menu-empty">
            <Search size={40} className="empty-icon" style={{ display: 'block', margin: '0 auto 16px', opacity: 0.3 }} />
            <h3>No items found</h3>
            <p>Try adjusting your search or filter</p>
          </div>
        ) : (
          <div className="products-grid">
            {filtered.map((product, idx) => (
              <div key={product.id} className="product-card-wrapper" style={{ animationDelay: `${Math.min(idx * 0.02, 0.15)}s` }}>
                <ProductCard product={product} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
