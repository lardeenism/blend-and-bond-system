import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Search, Package, Check, ChefHat, ShoppingBag, Truck, MapPin, PackageSearch } from 'lucide-react';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { ProductReviewForm, OverallReviewForm } from '../components/ReviewComponents';
import { getProductImage } from '../utils/imageMap';
import './TrackingPage.css';

interface TrackingLog {
  id: number;
  status: string;
  message: string;
  created_at: string;
}

interface OrderItem {
  id: number;
  product_id: number;
  product_name: string;
  product_image: string;
  quantity: number;
  price: number;
  subtotal: number;
  size_label: string | null;
}

interface Order {
  id: number;
  order_number: string;
  status: string;
  order_type: string;
  customer_name: string;
  total: number;
  items: OrderItem[];
  tracking_logs: TrackingLog[];
}

const statusSteps = {
  'dine-in': ['pending', 'confirmed', 'preparing', 'ready', 'served', 'completed'],
  'take-out': ['pending', 'confirmed', 'preparing', 'ready', 'completed'],
  'delivery': ['pending', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'completed'],
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'pending': return <Package size={20} />;
    case 'confirmed': return <Check size={20} />;
    case 'preparing': return <ChefHat size={20} />;
    case 'ready': return <ShoppingBag size={20} />;
    case 'served': return <Check size={20} />;
    case 'out_for_delivery': return <Truck size={20} />;
    case 'delivered': return <MapPin size={20} />;
    case 'completed': return <Check size={20} />;
    default: return <Package size={20} />;
  }
};

const TrackingPage: React.FC = () => {
  const [orderNumber, setOrderNumber] = useState('');
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);
  
  const [productReviews, setProductReviews] = useState<any[]>([]);
  const [overallReview, setOverallReview] = useState<any>(null);

  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const orderNum = params.get('order');
    if (orderNum) {
      setOrderNumber(orderNum);
      fetchOrder(orderNum);
    }
  }, [location]);

  const fetchReviews = async (orderId: number) => {
    try {
      const [prodRes, overallRes] = await Promise.all([
        axios.get(`/api/reviews?order_id=${orderId}`),
        axios.get(`/api/reviews/overall/${orderId}`)
      ]);
      setProductReviews(prodRes.data.reviews || []);
      setOverallReview(overallRes.data.review || null);
    } catch (err) {
      console.error('Error fetching reviews:', err);
    }
  };

  const [isCancelling, setIsCancelling] = useState(false);

  const fetchOrder = async (searchNum: string) => {
    if (!searchNum) return;
    setLoading(true);
    try {
      const res = await axios.get(`/api/orders/track/${searchNum}`);
      setOrder(res.data.order);
      if (res.data.order.status === 'completed') {
        await fetchReviews(res.data.order.id);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Order not found');
      setOrder(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderNumber.trim()) return;
    navigate(`/track?order=${orderNumber}`);
  };

  const handleCancelOrder = async () => {
    if (!order || order.status !== 'pending') return;
    if (!window.confirm('Are you sure you want to cancel this order? This action cannot be undone.')) return;

    setIsCancelling(true);
    try {
      await axios.put(`/api/orders/0/cancel`, {
        order_number: order.order_number,
        cancel_reason: 'Cancelled by customer via tracking page'
      });
      toast.success('Order cancelled successfully');
      fetchOrder(order.order_number); // Refresh order to show cancelled status
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to cancel order');
    } finally {
      setIsCancelling(false);
    }
  };

  const renderTimeline = () => {
    if (!order) return null;
    if (order.status === 'cancelled') {
      return (
        <div className="glass-panel tracking-cancelled">
          <div className="cancelled-icon">⚠️</div>
          <h3>Order Cancelled</h3>
          <p>This order has been cancelled.</p>
        </div>
      );
    }

    const steps = statusSteps[order.order_type as keyof typeof statusSteps] || statusSteps['dine-in'];
    const currentIndex = steps.indexOf(order.status);

    return (
      <div className="glass-panel tracking-timeline">
        <h3>Live Tracking</h3>
        <motion.div 
          className="timeline"
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0 },
            visible: { opacity: 1, transition: { staggerChildren: 0.15 } }
          }}
        >
          {steps.map((step, index) => {
            const isCompleted = index <= currentIndex;
            const isCurrent = index === currentIndex;
            return (
              <motion.div 
                key={step} 
                className={`timeline-step ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''}`}
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
                }}
              >
                <div className="timeline-dot">
                  {getStatusIcon(step)}
                </div>
                <div className="timeline-label">
                  {step.replace(/_/g, ' ')}
                </div>
                {index < steps.length - 1 && (
                  <div className={`timeline-line ${index < currentIndex ? 'completed' : ''}`} />
                )}
              </motion.div>
            );
          })}
        </motion.div>
        
        {order.tracking_logs && order.tracking_logs.length > 0 && (
          <div className="tracking-logs" style={{ marginTop: '32px' }}>
            <h4 style={{ color: 'var(--text-primary)', marginBottom: '16px' }}>Status Updates</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {order.tracking_logs.map(log => (
                <div key={log.id} style={{ display: 'flex', gap: '16px', fontSize: '0.9rem' }}>
                  <div style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                    {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div style={{ color: 'var(--text-primary)' }}>{log.message}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderReviewSection = () => {
    if (!order || order.status !== 'completed') return null;

    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        style={{ marginTop: '40px' }}
      >
        <h2 style={{ textAlign: 'center', marginBottom: '24px', color: 'var(--primary)' }}>Rate Your Experience</h2>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
          {order.items.map(item => {
            const review = productReviews.find(r => r.product_id === item.product_id);
            return (
              <ProductReviewForm
                key={item.product_id}
                orderId={order.id}
                productId={item.product_id}
                productName={item.product_name}
                customerName={order.customer_name}
                existingReview={review}
                onReviewSubmitted={() => fetchReviews(order.id)}
              />
            );
          })}
        </div>

        <OverallReviewForm
          orderId={order.id}
          customerName={order.customer_name}
          orderType={order.order_type}
          existingReview={overallReview}
          onReviewSubmitted={() => fetchReviews(order.id)}
        />
      </motion.div>
    );
  };

  return (
    <main className="tracking-page container">
      <div className="tracking-header">
        <motion.h1 initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          Track Your Order
        </motion.h1>
        <p>Monitor your delicious order in real-time</p>
      </div>

      <div className="tracking-search glass-panel">
        <form onSubmit={handleSearch} className="tracking-input-group">
          <Search className="tracking-search-icon" />
          <input
            type="text"
            className="tracking-input"
            placeholder="Enter Order Number (e.g. BB-20231015-1234)"
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value)}
          />
          <button type="submit" className="btn btn-primary" disabled={loading || !orderNumber}>
            {loading ? 'Searching...' : 'Track'}
          </button>
        </form>
      </div>

      {!order && !loading && (
        <motion.div 
          className="tracking-empty glass-panel"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
        >
          <div className="empty-icon-container">
            <PackageSearch size={64} />
          </div>
          <h3>Ready to Track</h3>
          <p>Enter a valid order number above to see its current status.</p>
        </motion.div>
      )}

      {order && (
        <div className="tracking-result">
          <div className="tracking-left-col">
            <div className="glass-panel tracking-status-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <div className="status-info">
                  <span className="order-num">{order.order_number}</span>
                </div>
                <div className="order-meta">
                  <span>{order.order_type.replace('-', ' ')}</span> • 
                  <span>{order.items.length} items</span> • 
                  <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>₱{Number(order.total).toFixed(2)}</span>
                </div>
              </div>
              
              {order.status === 'pending' && (
                <button 
                  className="btn btn-secondary cancel-order-btn" 
                  onClick={handleCancelOrder}
                  disabled={isCancelling}
                >
                  {isCancelling ? 'Cancelling...' : 'Cancel Order'}
                </button>
              )}
            </div>

            {renderTimeline()}
          </div>

          <div className="tracking-right-col">
            <div className="glass-panel tracking-items">
              <h3>Order Details</h3>
              <motion.div
                initial="hidden"
                animate="visible"
                variants={{
                  hidden: { opacity: 0 },
                  visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
                }}
              >
                {order.items.map((item, idx) => (
                  <motion.div 
                    key={idx} 
                    className="tracking-item"
                    variants={{
                      hidden: { opacity: 0, x: -20 },
                      visible: { opacity: 1, x: 0 }
                    }}
                  >
                    <img src={getProductImage(item.product_image)} alt={item.product_name} className="tracking-item-img" />
                    <div className="tracking-item-info">
                      <span className="tracking-item-name">{item.product_name}</span>
                      <span className="tracking-item-qty">
                        {item.size_label ? `${item.size_label} • ` : ''}Qty: {item.quantity}
                      </span>
                    </div>
                    <span className="tracking-item-price">₱{Number(item.subtotal).toFixed(2)}</span>
                  </motion.div>
                ))}
              </motion.div>
            </div>

            {renderReviewSection()}
          </div>
        </div>
      )}
    </main>
  );
};

export default TrackingPage;
