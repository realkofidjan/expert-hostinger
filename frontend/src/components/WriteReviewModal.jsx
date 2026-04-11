import React, { useState } from 'react';
import { X, Star, Save, Loader2, Link } from 'lucide-react';
import { toast } from 'react-toastify';
import api from '../api';

const WriteReviewModal = ({ productId, productName, onClose, onSuccess }) => {
    const [rating, setRating] = useState(0);
    const [hover, setHover] = useState(0);
    const [comment, setComment] = useState('');
    const [loading, setLoading] = useState(false);

    const submitReview = async (e) => {
        e.preventDefault();
        if (rating === 0) {
            return toast.error("Please select a rating from 1 to 5 stars.");
        }

        setLoading(true);
        try {
            await api.post('/reviews', { product_id: productId, rating, comment });
            toast.success("Review submitted successfully! Thank you for sharing your thoughts.");
            onSuccess();
        } catch (err) {
            toast.error(err.response?.data?.error || "Failed to submit review.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[var(--bg-primary)] w-full max-w-lg rounded-[2rem] overflow-hidden shadow-2xl flex flex-col">
                <div className="flex justify-between items-center p-6 border-b border-[var(--border-color)]">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <Star className="text-yellow-500 fill-current" /> Write a Review
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-red-500/10 hover:text-red-500 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6">
                    <div className="mb-6">
                        <p className="text-xs uppercase tracking-widest font-black text-[var(--text-muted)]">Product</p>
                        <p className="font-bold text-lg text-[var(--text-primary)]">{productName}</p>
                    </div>

                    <form id="review-form" onSubmit={submitReview} className="space-y-6">
                        <div>
                            <label className="block text-sm font-bold text-[var(--text-primary)] mb-3 text-center">Tap to Rate</label>
                            <div className="flex justify-center gap-2 mb-2">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <button
                                        type="button"
                                        key={star}
                                        onClick={() => setRating(star)}
                                        onMouseEnter={() => setHover(star)}
                                        onMouseLeave={() => setHover(rating)}
                                        className="transition-transform hover:scale-110 active:scale-95 p-1"
                                    >
                                        <Star 
                                            size={48} 
                                            className={`${(hover || rating) >= star ? "text-yellow-500 fill-current" : "text-[var(--border-color)]"}`} 
                                        />
                                    </button>
                                ))}
                            </div>
                            <p className="text-center text-xs font-bold text-[var(--text-muted)] h-5" >
                                {rating === 5 ? "Excellent!" : rating === 4 ? "Very Good" : rating === 3 ? "Average" : rating === 2 ? "Poor" : rating === 1 ? "Terrible" : ""}
                            </p>
                        </div>

                        <div>
                            <label className="block text-xs font-bold uppercase tracking-widest text-[var(--text-muted)] mb-2">Your Thoughts (Optional)</label>
                            <textarea
                                value={comment}
                                onChange={e => setComment(e.target.value)}
                                className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl py-3 px-4 text-sm focus:border-green-500 min-h-[120px] resize-y text-[var(--text-primary)]"
                                placeholder="What did you like or dislike about this product?"
                            ></textarea>
                        </div>
                    </form>
                </div>

                <div className="p-6 border-t border-[var(--border-color)] flex justify-end gap-3 bg-[var(--bg-secondary)]/50">
                    <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl font-bold bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors border">Cancel</button>
                    <button form="review-form" type="submit" disabled={loading} className="px-5 py-2.5 rounded-xl font-bold bg-green-500 hover:bg-green-600 text-white transition-colors flex items-center gap-2 shadow-lg shadow-green-500/30">
                        {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Submit Review
                    </button>
                </div>
            </div>
        </div>
    );
};

export default WriteReviewModal;
