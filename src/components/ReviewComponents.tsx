import React, { useState } from 'react';
import { Star, MessageSquare, CheckCircle2, Edit2 } from 'lucide-react';
import toast from 'react-hot-toast';
import axios from 'axios';
import './ReviewComponents.css';

// --- Star Rating Component ---
interface StarRatingProps {
  rating: number;
  onRatingChange?: (rating: number) => void;
  readOnly?: boolean;
  size?: number;
}

export const StarRating: React.FC<StarRatingProps> = ({ rating, onRatingChange, readOnly = false, size = 24 }) => {
  const [hover, setHover] = useState(0);

  return (
    <div className="star-rating">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          className={`star-btn ${readOnly ? 'read-only' : ''} ${star <= (hover || rating) ? 'active' : ''}`}
          onClick={() => !readOnly && onRatingChange?.(star)}
          onMouseEnter={() => !readOnly && setHover(star)}
          onMouseLeave={() => !readOnly && setHover(0)}
          disabled={readOnly}
        >
          <Star size={size} fill={star <= (hover || rating) ? 'currentColor' : 'none'} />
        </button>
      ))}
    </div>
  );
};

// --- Product Review Form Component ---
interface ProductReviewProps {
  orderId: number;
  productId: number;
  productName: string;
  customerName: string;
  existingReview?: { id: number; rating: number; comment: string | null };
  onReviewSubmitted: () => void;
}

export const ProductReviewForm: React.FC<ProductReviewProps> = ({
  orderId,
  productId,
  productName,
  customerName,
  existingReview,
  onReviewSubmitted
}) => {
  const [rating, setRating] = useState(existingReview?.rating || 0);
  const [comment, setComment] = useState(existingReview?.comment || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(!existingReview);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) {
      toast.error('Please provide a rating');
      return;
    }

    setIsSubmitting(true);
    try {
      if (existingReview) {
        await axios.put(`/api/reviews/${existingReview.id}`, { rating, comment });
        toast.success('Review updated successfully!');
      } else {
        await axios.post('/api/reviews', {
          order_id: orderId,
          product_id: productId,
          rating,
          comment,
          customer_name: customerName
        });
        toast.success('Review submitted successfully!');
      }
      setIsEditing(false);
      onReviewSubmitted();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to submit review');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isEditing) {
    return (
      <div className="review-card completed">
        <div className="review-card-header">
          <div className="review-card-title">
            <CheckCircle2 size={18} className="verified-icon" />
            <h4>{productName}</h4>
          </div>
          <button className="edit-review-btn" onClick={() => setIsEditing(true)}>
            <Edit2 size={16} /> Edit
          </button>
        </div>
        <div className="review-card-body">
          <StarRating rating={rating} readOnly size={18} />
          {comment && <p className="review-comment">"{comment}"</p>}
        </div>
      </div>
    );
  }

  return (
    <form className="review-card editing" onSubmit={handleSubmit}>
      <div className="review-card-header">
        <h4>Review {productName}</h4>
      </div>
      <div className="review-card-body">
        <div className="form-group">
          <label>Your Rating</label>
          <StarRating rating={rating} onRatingChange={setRating} />
        </div>
        <div className="form-group">
          <label>
            <MessageSquare size={16} /> Review (Optional)
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="What did you think about this item?"
            rows={3}
          />
        </div>
        <div className="form-actions">
          {existingReview && (
            <button type="button" className="btn-cancel" onClick={() => setIsEditing(false)}>
              Cancel
            </button>
          )}
          <button type="submit" className="btn-submit" disabled={isSubmitting || rating === 0}>
            {isSubmitting ? 'Submitting...' : 'Submit Review'}
          </button>
        </div>
      </div>
    </form>
  );
};

// --- Overall Order Review Form Component ---
interface OverallReviewProps {
  orderId: number;
  customerName: string;
  orderType: string;
  existingReview?: any;
  onReviewSubmitted: () => void;
}

const REVIEW_METRICS: Record<string, string[]> = {
  'dine-in': ['Staff service', 'Ambiance', 'Cleanliness', 'Waiting time'],
  'take-out': ['Order accuracy', 'Packaging quality', 'Waiting time', 'Food readiness'],
  'delivery': ['Delivery speed', 'Rider behavior', 'Food condition', 'Packaging quality']
};

export const OverallReviewForm: React.FC<OverallReviewProps> = ({
  orderId,
  customerName,
  orderType,
  existingReview,
  onReviewSubmitted
}) => {
  const metricsList = REVIEW_METRICS[orderType] || REVIEW_METRICS['dine-in'];
  
  // Initialize state based on existing metrics (if any) or 0
  const initialState = metricsList.reduce((acc, metric) => {
    let existingVal = 0;
    if (existingReview?.metrics) {
      // Parse metrics if it's a string from DB, or use directly if it's an object
      const parsedMetrics = typeof existingReview.metrics === 'string' 
        ? JSON.parse(existingReview.metrics) 
        : existingReview.metrics;
      existingVal = parsedMetrics[metric] || 0;
    }
    acc[metric] = existingVal;
    return acc;
  }, {} as Record<string, number>);

  const [ratings, setRatings] = useState<Record<string, number>>(initialState);
  const [feedback, setFeedback] = useState(existingReview?.feedback || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRatingChange = (field: string, val: number) => {
    setRatings((prev) => ({ ...prev, [field]: val }));
  };

  const isFormValid = Object.values(ratings).every((r) => r > 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) {
      toast.error('Please rate all categories');
      return;
    }

    setIsSubmitting(true);
    try {
      await axios.post('/api/reviews/overall', {
        order_id: orderId,
        customer_name: customerName,
        order_type: orderType,
        metrics: ratings,
        feedback
      });
      toast.success('Overall experience review submitted!');
      onReviewSubmitted();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to submit review');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (existingReview) {
    const parsedMetrics = typeof existingReview.metrics === 'string' 
      ? JSON.parse(existingReview.metrics) 
      : (existingReview.metrics || {});

    return (
      <div className="overall-review-card completed glass-panel">
        <div className="review-card-header">
          <CheckCircle2 size={24} className="verified-icon" />
          <h3>Thank you for your feedback!</h3>
        </div>
        <p className="avg-overall">Overall Rating: {Number(existingReview.overall_rating).toFixed(1)} / 5.0</p>
        
        <div className="metrics-summary" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', margin: '16px 0', fontSize: '0.9rem' }}>
          {Object.entries(parsedMetrics).map(([key, val]) => (
            <div key={key} style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
              <span>{key}:</span>
              <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>{val as number} ★</span>
            </div>
          ))}
        </div>

        {feedback && <p className="review-comment">"{feedback}"</p>}
      </div>
    );
  }

  return (
    <form className="overall-review-card glass-panel" onSubmit={handleSubmit}>
      <h3>Rate Your Overall Experience</h3>
      <p className="subtitle">How was your {orderType.replace('-', ' ')} experience?</p>

      <div className="rating-categories">
        {metricsList.map((metric) => (
          <div className="rating-row" key={metric}>
            <label>{metric}</label>
            <StarRating rating={ratings[metric]} onRatingChange={(v) => handleRatingChange(metric, v)} />
          </div>
        ))}
      </div>

      <div className="form-group">
        <label>Additional Feedback (Optional)</label>
        <textarea
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          placeholder="Tell us what you loved or how we can improve..."
          rows={4}
        />
      </div>

      <button type="submit" className="btn-submit btn-large" disabled={isSubmitting || !isFormValid}>
        {isSubmitting ? 'Submitting...' : 'Submit Overall Review'}
      </button>
    </form>
  );
};
