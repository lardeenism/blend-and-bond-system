import { useState, useEffect, useCallback, memo } from 'react';
import { createPortal } from 'react-dom';
import { ShoppingCart, Plus, Minus, Star, X, GlassWater } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { getProductImage } from '../utils/imageMap';
import { formatCurrency } from '../utils/helpers';
import toast from 'react-hot-toast';
import './ProductCard.css';

interface Size {
  size_label: string;
  volume_ml: number | null;
  price: number;
}

interface Product {
  id: number;
  name: string;
  description: string;
  base_price: number;
  image_filename: string;
  category_name: string;
  avg_rating: number;
  total_reviews: number;
  is_featured?: boolean;
  is_best_seller?: boolean;
  is_available?: boolean | number;
  stock?: number;
  has_sizes?: boolean;
  sizes?: Size[];
}

const ProductCard = memo(function ProductCard({ product }: { product: Product }) {
  const { addToCart, getReservedQuantity } = useCart();
  const [qty, setQty] = useState(1);
  const [selectedSize, setSelectedSize] = useState<Size | null>(
    product.has_sizes && product.sizes?.length ? product.sizes[0] : null
  );
  const [imgLoaded, setImgLoaded] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [detailClosing, setDetailClosing] = useState(false);

  const isDrink = product.has_sizes && product.sizes && product.sizes.length > 0;
  const currentPrice = selectedSize ? Number(selectedSize.price) : Number(product.base_price);
  const lowestPrice = isDrink
    ? Math.min(...(product.sizes || []).map(s => Number(s.price)))
    : Number(product.base_price);
  const reservedQuantity = getReservedQuantity(product.id);
  const stockCount = typeof product.stock === 'number' ? Math.max(0, product.stock - reservedQuantity) : null;

  const isAvailable = product.is_available !== false && product.is_available !== 0 && (stockCount === null ? true : stockCount > 0);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (showDetail) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [showDetail]);

  useEffect(() => {
    if (!showDetail || stockCount === null) return;
    setQty(prev => Math.min(prev, Math.max(1, stockCount)));
  }, [showDetail, stockCount]);

  // Close on Escape key
  useEffect(() => {
    if (!showDetail) return;
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeDetail(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [showDetail]);

  const handleCartButtonClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAvailable) return;
    if (isDrink) {
      // Open modal for size selection
      setShowDetail(true);
    } else {
        addToCart({
          id: product.id,
          name: product.name,
          price: Number(product.base_price),
          image_filename: product.image_filename,
          category_name: product.category_name,
          stock_limit: product.stock,
        }, 1);
      toast.success(`${product.name} added to cart!`);
    }
  }, [isDrink, addToCart, product, stockCount]);

  const handleCardClick = useCallback(() => {
    if (isAvailable) setShowDetail(true);
  }, [isAvailable]);

  const closeDetail = useCallback(() => {
    setDetailClosing(true);
    setTimeout(() => {
      setShowDetail(false);
      setDetailClosing(false);
      setQty(1);
      // Reset size to first
      if (product.has_sizes && product.sizes?.length) {
        setSelectedSize(product.sizes[0]);
      }
    }, 300);
  }, [product]);

  const handleAddFromDetail = useCallback(() => {
    if (isDrink && !selectedSize) {
      toast.error('Please select a size');
      return;
    }
    if (stockCount !== null && qty > stockCount) {
      toast.error(`Only ${stockCount} left in stock`);
      return;
    }
    addToCart({
      id: product.id,
      name: product.name,
      price: currentPrice,
      image_filename: product.image_filename,
      category_name: product.category_name,
      size_label: selectedSize?.size_label || undefined,
      volume_ml: selectedSize?.volume_ml || undefined,
      stock_limit: product.stock,
    }, qty);
    toast.success(`${product.name} added to cart!`);
    closeDetail();
  }, [isDrink, selectedSize, addToCart, product, currentPrice, qty, closeDetail, isAvailable, stockCount]);

  const imgSrc = getProductImage(product.image_filename);

  // --- Product Detail Modal (portaled to body) ---
  const detailModal = showDetail ? createPortal(
    <div className={`product-modal-overlay ${detailClosing ? 'closing' : ''}`} onClick={closeDetail}>
      <div
        className={`product-modal ${detailClosing ? 'closing' : ''}`}
        onClick={e => e.stopPropagation()}
      >
        <button className="modal-close-btn" onClick={closeDetail} aria-label="Close">
          <X size={20} />
        </button>

        {/* Left: Product Image */}
        <div className="modal-image-section">
          <img src={imgSrc} alt={product.name} className="modal-product-image" />
          {!isAvailable && <div className="product-unavailable-overlay">Unavailable</div>}
          {isAvailable && !!product.is_best_seller && <span className="modal-badge best-seller">Best Seller</span>}
          {isAvailable && !!product.is_featured && !product.is_best_seller && <span className="modal-badge featured">Featured</span>}
        </div>

        {/* Right: Product Details */}
        <div className="modal-details-section">
          <div className="modal-details-scroll">
            <span className="modal-category">{product.category_name}</span>
            <h2 className="modal-product-name">{product.name}</h2>
            <p className="modal-product-desc">{product.description}</p>

            {/* Rating */}
            <div className="modal-rating">
              {[1, 2, 3, 4, 5].map(star => (
                <Star
                  key={star}
                  size={16}
                  className={`star-icon ${star <= Math.round(Number(product.avg_rating)) ? 'filled' : ''}`}
                />
              ))}
              <span className="modal-rating-text">
                {Number(product.avg_rating) > 0 ? Number(product.avg_rating).toFixed(1) : 'New'}
              </span>
            </div>

            {/* Size Selector (drinks only) */}
            {!!isDrink && (
              <div className="modal-sizes">
                <h4 className="modal-sizes-title">
                  <GlassWater size={16} /> Select Size
                </h4>
                <div className="modal-size-options">
                  {product.sizes!.map(size => (
                    <button
                      key={size.size_label}
                      className={`modal-size-btn ${selectedSize?.size_label === size.size_label ? 'active' : ''}`}
                      onClick={() => setSelectedSize(size)}
                    >
                      <span className="modal-size-label">{size.size_label}</span>
                      {size.volume_ml && <span className="modal-size-ml">{size.volume_ml}ml</span>}
                      <span className="modal-size-price">{formatCurrency(size.price)}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer: Qty + Add to Cart */}
          <div className="modal-footer">
            <div className="modal-qty-control">
              <button onClick={() => setQty(Math.max(1, qty - 1))} className="modal-qty-btn">
                <Minus size={14} />
              </button>
              <span className="modal-qty-value">{qty}</span>
              <button onClick={() => setQty(qty + 1)} className="modal-qty-btn" disabled={stockCount !== null && qty >= stockCount}>
                <Plus size={14} />
              </button>
            </div>
            <button onClick={handleAddFromDetail} className="modal-add-btn" disabled={!isAvailable || (stockCount !== null && qty > stockCount)}>
              <ShoppingCart size={16} />
              {isAvailable ? `Add to Cart — ${formatCurrency(currentPrice * qty)}` : 'Unavailable'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <>
      {/* === PRODUCT CARD === */}
      <div className={`product-card glass-card ${!isAvailable ? 'unavailable' : ''}`} onClick={handleCardClick}>
        <div className="product-image-wrapper">
          {!imgLoaded && <div className="skeleton product-skeleton" />}
          <img
            src={imgSrc}
            alt={product.name}
            className={`product-image ${imgLoaded ? 'loaded' : ''}`}
            onLoad={() => setImgLoaded(true)}
          />
          {!isAvailable && <div className="product-unavailable-overlay">Unavailable</div>}
          {isAvailable && !!product.is_best_seller && <span className="product-badge best-seller">Best Seller</span>}
          {isAvailable && !!product.is_featured && !product.is_best_seller && <span className="product-badge featured">Featured</span>}
        </div>

        <div className="product-info">
          <div className="product-category">{product.category_name}</div>
          <h3 className="product-name">{product.name}</h3>
          <p className="product-desc">{product.description}</p>

          {stockCount !== null && (
            <div className={`product-stock ${stockCount <= 0 ? 'out' : ''}`}>
              {stockCount > 0 ? `Stock: ${stockCount}` : 'Out of stock'}
            </div>
          )}

          <div className="product-rating">
            {[1, 2, 3, 4, 5].map(star => (
              <Star key={star} size={14} className={`star-icon ${star <= Math.round(Number(product.avg_rating)) ? 'filled' : ''}`} />
            ))}
            <span className="rating-text">
              {Number(product.avg_rating) > 0 ? Number(product.avg_rating).toFixed(1) : 'New'}
              {product.total_reviews > 0 && ` (${product.total_reviews})`}
            </span>
          </div>

          <div className="product-footer">
            <span className="product-price">
              {isDrink ? `From ${formatCurrency(lowestPrice)}` : formatCurrency(Number(product.base_price))}
            </span>
            <button onClick={handleCartButtonClick} className="add-to-cart-btn" disabled={!isAvailable}>
              {isAvailable ? <><ShoppingCart size={14} /> Add to Cart</> : 'Unavailable'}
            </button>
          </div>
        </div>
      </div>

      {/* Portaled modal */}
      {detailModal}
    </>
  );
});

export default ProductCard;
