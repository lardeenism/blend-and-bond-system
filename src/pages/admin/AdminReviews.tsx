import { useState, useEffect } from 'react';
import { Star, Flag } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { formatDateTime } from '../../utils/helpers';

let cachedReviews: any[] = [];
let cachedOverallReviews: any[] = [];

export default function AdminReviews() {
  const [activeTab, setActiveTab] = useState<'product' | 'overall'>('product');
  const [reviews, setReviews] = useState<any[]>(cachedReviews);
  const [overallReviews, setOverallReviews] = useState<any[]>(cachedOverallReviews);
  const [loading, setLoading] = useState(cachedReviews.length === 0);
  const [filter, setFilter] = useState(0);

  useEffect(() => {
    Promise.all([
      axios.get('/api/reviews'),
      axios.get('/api/reviews/overall')
    ])
      .then(([prodRes, overallRes]) => {
        cachedReviews = prodRes.data.reviews;
        cachedOverallReviews = overallRes.data.reviews || [];
        setReviews(prodRes.data.reviews);
        setOverallReviews(overallRes.data.reviews || []);
      })
      .catch(() => toast.error('Failed to load reviews'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = filter > 0 ? reviews.filter(r => r.rating === filter) : reviews;

  const avgRating = reviews.length > 0 ? (reviews.reduce((a: number, r: any) => a + r.rating, 0) / reviews.length).toFixed(1) : '0';
  const ratingDist = [5, 4, 3, 2, 1].map(r => ({
    stars: r,
    count: reviews.filter((rv: any) => rv.rating === r).length,
    pct: reviews.length > 0 ? (reviews.filter((rv: any) => rv.rating === r).length / reviews.length * 100).toFixed(0) : '0'
  }));

  if (loading) return null;

  return (
    <div>
      <div className="page-header">
        <div><h2 className="page-title">Customer Reviews</h2><p className="page-subtitle">Monitor customer feedback</p></div>
      </div>

      <div className="tabs" style={{ display: 'flex', gap: '16px', marginBottom: '24px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '12px' }}>
        <button 
          className={`tab-btn ${activeTab === 'product' ? 'active' : ''}`}
          onClick={() => setActiveTab('product')}
          style={{ background: 'none', border: 'none', color: activeTab === 'product' ? 'var(--primary)' : 'var(--text-muted)', fontSize: '1rem', cursor: 'pointer', fontWeight: activeTab === 'product' ? 'bold' : 'normal' }}
        >
          Product Reviews ({reviews.length})
        </button>
        <button 
          className={`tab-btn ${activeTab === 'overall' ? 'active' : ''}`}
          onClick={() => setActiveTab('overall')}
          style={{ background: 'none', border: 'none', color: activeTab === 'overall' ? 'var(--primary)' : 'var(--text-muted)', fontSize: '1rem', cursor: 'pointer', fontWeight: activeTab === 'overall' ? 'bold' : 'normal' }}
        >
          Overall Experience ({overallReviews.length})
        </button>
      </div>

      {activeTab === 'product' && (
        <>


      {/* Rating Overview */}
      <div className="reviews-overview glass-card">
        <div className="review-avg">
          <span className="avg-number">{avgRating}</span>
          <div className="avg-stars">{[1,2,3,4,5].map(s => <Star key={s} size={18} className={`star-icon ${s <= Math.round(Number(avgRating)) ? 'filled' : ''}`} />)}</div>
          <span className="avg-count">{reviews.length} reviews</span>
        </div>
        <div className="rating-bars">
          {ratingDist.map(d => (
            <div key={d.stars} className="rating-bar-row" onClick={() => setFilter(filter === d.stars ? 0 : d.stars)}>
              <span className="bar-label">{d.stars} <Star size={12} className="star-icon filled" /></span>
              <div className="bar-track"><div className="bar-fill" style={{ width: `${d.pct}%` }} /></div>
              <span className="bar-count">{d.count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Filter pills */}
      <div className="filter-pills" style={{ marginBottom: '20px' }}>
        <button className={`pill ${filter === 0 ? 'active' : ''}`} onClick={() => setFilter(0)}>All</button>
        {[5,4,3,2,1].map(r => (
          <button key={r} className={`pill ${filter === r ? 'active' : ''}`} onClick={() => setFilter(r)}>
            {r} <Star size={12} className="star-icon filled" />
          </button>
        ))}
      </div>

      {/* Reviews List */}
      <div className="reviews-list">
        {filtered.length === 0 && <div className="empty-state"><p>No reviews found</p></div>}
        {filtered.map(review => (
          <div key={review.id} className="review-card glass-card">
            <div className="review-header">
              <div className="review-user">
                <div className="review-avatar">{review.customer_name?.[0] || 'C'}</div>
                <div>
                  <span className="review-name">{review.customer_name}</span>
                  <span className="review-date">{formatDateTime(review.created_at)}</span>
                </div>
              </div>
              <div className="review-stars">
                {[1,2,3,4,5].map(s => <Star key={s} size={14} className={`star-icon ${s <= review.rating ? 'filled' : ''}`} />)}
              </div>
            </div>
            <p className="review-product">{review.product_name}</p>
            {review.comment && <p className="review-comment">{review.comment}</p>}
            {!!review.is_flagged && <span className="flagged-badge"><Flag size={12} /> Flagged</span>}
          </div>
        ))}
      </div>
        </>
      )}

      {activeTab === 'overall' && (
        <div className="reviews-list">
          {overallReviews.length === 0 && <div className="empty-state"><p>No overall reviews found</p></div>}
          {overallReviews.map(review => (
            <div key={review.id} className="review-card glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="review-header">
                <div className="review-user">
                  <div className="review-avatar">{review.customer_name?.[0] || 'C'}</div>
                  <div>
                    <span className="review-name">{review.customer_name}</span>
                    <span className="review-date">{formatDateTime(review.created_at)}</span>
                  </div>
                </div>
                <div className="review-stars" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontWeight: 'bold', color: 'var(--primary)' }}>{Number(review.overall_rating).toFixed(1)} / 5</span>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span className="badge" style={{ padding: '4px 8px', borderRadius: '4px', background: 'rgba(255,255,255,0.1)', fontSize: '0.75rem', textTransform: 'capitalize' }}>
                  {review.order_type?.replace('-', ' ') || 'Unknown Type'}
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.85rem', color: 'var(--text-muted)', padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
                {(() => {
                  const parsedMetrics = typeof review.metrics === 'string' ? JSON.parse(review.metrics) : (review.metrics || {});
                  return Object.entries(parsedMetrics).map(([key, val]) => (
                    <div key={key}>{key}: <span style={{color: 'var(--primary)'}}>{val as number} ★</span></div>
                  ));
                })()}
              </div>
              {review.feedback && <p className="review-comment" style={{ marginTop: '8px' }}>"{review.feedback}"</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
