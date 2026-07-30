import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, MapPin, Package } from 'lucide-react';
import toast from 'react-hot-toast';
import { marketplaceApi } from '../api/marketplaceApi';
import Loader from '../components/Loader.jsx';
import { formatCurrency } from '../utils/format';
import { getErrorMessage } from '../utils/errorMessage';

function formatLocation(location) {
  if (!location) return null;
  return [location.district, location.state].filter(Boolean).join(', ') || null;
}

export default function Favourites() {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    marketplaceApi
      .favourites()
      .then((data) => setListings(data.listings))
      .catch((error) => toast.error(getErrorMessage(error, 'Could not load your favourites')))
      .finally(() => setLoading(false));
  }, []);

  const handleRemove = async (id, e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await marketplaceApi.toggleFavourite(id);
      setListings((prev) => prev.filter((item) => item.id !== id));
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not update favourites'));
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-semibold">Your favourites</h1>

      {loading ? (
        <Loader label="Loading favourites" />
      ) : listings.length === 0 ? (
        <div className="stub-card p-10 text-center text-ink-faint text-sm">
          You haven't favourited any listings yet. Browse the <Link to="/marketplace" className="text-canopy-700 underline">marketplace</Link>.
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {listings.map((item) => (
            <Link key={item.id} to={`/marketplace/${item.id}`} className="stub-card p-5 hover:-translate-y-0.5 transition relative">
              <button
                onClick={(e) => handleRemove(item.id, e)}
                className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-clay-50"
                aria-label="Remove from favourites"
              >
                <Heart className="w-4 h-4 fill-clay-500 text-clay-500" />
              </button>
              <span className="text-xs font-mono uppercase tracking-wide text-harvest-700 bg-harvest-50 px-2 py-0.5 rounded-full border border-harvest-200">
                {item.cropType}
              </span>
              <h3 className="font-display text-lg font-semibold mt-3 pr-6">
                {item.cropType} — {item.quantity} {item.unit}
              </h3>
              <div className="flex items-center gap-1.5 text-xs text-ink-faint mt-2">
                <MapPin className="w-3.5 h-3.5" /> {formatLocation(item.location) ?? 'Location not set'}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-ink-faint mt-1">
                <Package className="w-3.5 h-3.5" /> {item.quantity} {item.unit} available
              </div>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-sm font-semibold text-canopy-700">
                  {formatCurrency(item.pricePerUnit)} / {item.unit}
                </span>
                <span className="text-xs text-ink-faint">{item.ownerName}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
