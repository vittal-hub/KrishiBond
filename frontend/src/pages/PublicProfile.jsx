import React, { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Star, MapPin, BadgeCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { userApi } from '../api/userApi';
import { reviewApi } from '../api/reviewApi';
import Loader from '../components/Loader.jsx';
import { formatDate, formatRelative } from '../utils/format';
import { getErrorMessage } from '../utils/errorMessage';

function formatLocation(location) {
  if (!location) return null;
  return [location.district, location.state].filter(Boolean).join(', ') || null;
}

function StarRow({ rating }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} className={`w-4 h-4 ${n <= Math.round(rating) ? 'fill-harvest-500 text-harvest-500' : 'text-ink/20'}`} />
      ))}
    </div>
  );
}

export default function PublicProfile() {
  const { id } = useParams();
  const [profile, setProfile] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [meta, setMeta] = useState({ page: 1, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const loadReviews = useCallback(async (pageNum) => {
    try {
      const data = await reviewApi.listForUser(id, { page: pageNum });
      setReviews(data.reviews);
      setMeta(data.meta);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not load reviews'));
    }
  }, [id]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([userApi.getById(id), reviewApi.listForUser(id, { page: 1 })])
      .then(([userData, reviewData]) => {
        if (!active) return;
        setProfile(userData.user);
        setReviews(reviewData.reviews);
        setMeta(reviewData.meta);
      })
      .catch((error) => toast.error(getErrorMessage(error, 'Could not load this profile')))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [id]);

  useEffect(() => {
    if (page > 1) loadReviews(page);
  }, [page, loadReviews]);

  if (loading) return <Loader full label="Loading profile" />;
  if (!profile) return <p className="text-sm text-ink-faint">Profile not found.</p>;

  return (
    <div className="max-w-2xl space-y-6">
      <div className="stub-card p-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-harvest-200 flex items-center justify-center text-ink font-semibold text-2xl">
            {profile.name?.[0]?.toUpperCase()}
          </div>
          <div>
            <h1 className="font-display text-xl font-semibold flex items-center gap-1.5">
              {profile.name}
              {profile.emailVerified && <BadgeCheck className="w-4 h-4 text-canopy-600" />}
            </h1>
            <p className="text-xs text-ink-faint capitalize mt-0.5">{profile.role} · Member since {formatDate(profile.createdAt)}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 mt-5 pt-5 border-t border-ink/10">
          <div className="flex items-center gap-2">
            <StarRow rating={profile.ratingAvg} />
            <span className="text-sm font-semibold">{profile.ratingAvg?.toFixed(1) ?? '0.0'}</span>
            <span className="text-xs text-ink-faint">({profile.ratingCount} review{profile.ratingCount === 1 ? '' : 's'})</span>
          </div>
          {formatLocation(profile.location) && (
            <span className="flex items-center gap-1.5 text-xs text-ink-faint">
              <MapPin className="w-3.5 h-3.5" /> {formatLocation(profile.location)}
            </span>
          )}
        </div>

        {profile.bio && <p className="text-sm text-ink-soft mt-4 leading-relaxed">{profile.bio}</p>}
      </div>

      <div className="stub-card p-6">
        <h2 className="font-display text-lg font-semibold mb-4">Reviews</h2>
        {reviews.length === 0 ? (
          <p className="text-sm text-ink-faint py-6 text-center">No reviews yet.</p>
        ) : (
          <div className="space-y-4">
            {reviews.map((r) => (
              <div key={r.id} className="border-b border-ink/5 pb-4 last:border-0">
                <div className="flex items-center justify-between">
                  <StarRow rating={r.rating} />
                  <span className="text-xs text-ink-faint">{formatRelative(r.createdAt)}</span>
                </div>
                {r.comment && <p className="text-sm text-ink-soft mt-2">{r.comment}</p>}
                <p className="text-xs text-ink-faint mt-1">— {r.reviewerName}</p>
                {r.response && (
                  <div className="mt-2 ml-4 p-2.5 rounded-stub bg-canopy-50 border border-canopy-200">
                    <p className="text-xs text-ink-soft">{r.response}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {meta.pages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-4">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="btn-ghost text-xs px-3 py-1.5 disabled:opacity-40"
            >
              Previous
            </button>
            <span className="text-xs text-ink-faint">Page {meta.page} of {meta.pages}</span>
            <button
              disabled={page >= meta.pages}
              onClick={() => setPage((p) => Math.min(meta.pages, p + 1))}
              className="btn-ghost text-xs px-3 py-1.5 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
