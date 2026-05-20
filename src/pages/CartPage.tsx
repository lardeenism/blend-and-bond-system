import { Link } from 'react-router-dom';
import { Trash2, Plus, Minus, ArrowLeft, ShoppingCart } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { getProductImage } from '../utils/imageMap';
import { formatCurrency } from '../utils/helpers';
import './CartPage.css';

export default function CartPage() {
  const { items, removeFromCart, updateQuantity, clearCart, getSubtotal } = useCart();

  if (items.length === 0) {
    return (
      <div className="cart-page">
        <div className="container">
          <div className="cart-empty">
            <ShoppingCart size={56} className="empty-cart-icon" />
            <h2>Your cart is empty</h2>
            <p>Add some delicious items from our menu!</p>
            <Link to="/menu" className="btn btn-primary btn-lg"><ArrowLeft size={16} /> Browse Menu</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="cart-page">
      <div className="container">
        <div className="cart-header">
          <h1><ShoppingCart size={24} /> Your Cart</h1>
          <button onClick={clearCart} className="btn btn-secondary btn-sm clear-btn"><Trash2 size={14} /> Clear All</button>
        </div>
        <div className="cart-layout">
          <div className="cart-items">
            {items.map((item, idx) => (
              <div key={`${item.id}-${item.size_label || idx}`} className="cart-item glass-card">
                <img src={getProductImage(item.image_filename)} alt={item.name} className="cart-item-image" loading="lazy" />
                <div className="cart-item-details">
                  <h3 className="cart-item-name">{item.name}</h3>
                  {item.size_label && <span className="cart-item-size">{item.size_label} {item.volume_ml ? `(${item.volume_ml}ml)` : ''}</span>}
                  <span className="cart-item-price">{formatCurrency(item.price)}</span>
                </div>
                <div className="cart-item-qty">
                  <button onClick={() => updateQuantity(item.id, item.quantity - 1, item.size_label)} className="qty-btn"><Minus size={12} /></button>
                  <span className="qty-value">{item.quantity}</span>
                  <button onClick={() => updateQuantity(item.id, item.quantity + 1, item.size_label)} className="qty-btn"><Plus size={12} /></button>
                </div>
                <div className="cart-item-total">{formatCurrency(item.price * item.quantity)}</div>
                <button onClick={() => removeFromCart(item.id, item.size_label)} className="cart-item-remove"><Trash2 size={14} /></button>
              </div>
            ))}
          </div>
          <div className="cart-summary glass-card">
            <h3>Order Summary</h3>
            <div className="summary-lines">
              {items.map((item, idx) => (
                <div key={`${item.id}-${item.size_label || idx}`} className="summary-line">
                  <span>{item.name}{item.size_label ? ` (${item.size_label})` : ''} x {item.quantity}</span>
                  <span>{formatCurrency(item.price * item.quantity)}</span>
                </div>
              ))}
            </div>
            <div className="summary-divider" />
            <div className="summary-line summary-subtotal"><span>Subtotal</span><span>{formatCurrency(getSubtotal())}</span></div>
            <p className="summary-note">Delivery fee will be calculated at checkout</p>
            <Link to="/checkout" className="btn btn-primary btn-lg checkout-btn">Proceed to Checkout</Link>
            <Link to="/menu" className="btn btn-secondary continue-btn"><ArrowLeft size={14} /> Continue Shopping</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
