import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Search, MapPin, Package, SlidersHorizontal } from 'lucide-react';
import toast from 'react-hot-toast';
import { marketplaceApi } from '../api/marketplaceApi';
import { useAuth } from '../context/AuthContext.jsx';
import Loader from '../components/Loader.jsx';
import { formatCurrency } from '../utils/format';
import { getErrorMessage } from '../utils/errorMessage';

const CROPS = ['All crops', 'Wheat', 'Rice', 'Cotton', 'Sugarcane', 'Maize', 'Pulses', 'Vegetables', 'Fruits'];

export default function Marketplace() {
  const { role } = useAuth();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [crop, setCrop] = useState('All crops');
  const [location, setLocation] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const fetchListings = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        q: query || undefined,
        crop: crop !== 'All crops' ? crop : undefined,
        location: location || undefined,
      };
      const data = await marketplaceApi.search(params);
      setListings(data.items ?? data);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not load listings'));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [crop]);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchListings();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold">Marketplace</h1>
          <p className="text-sm text-ink-faint mt-1">
            {role === 'buyer' ? 'Find farmers who match what you need' : 'Buyers currently sourcing crops like yours'}
          </p>
        </div>
        {role === 'farmer' && (
          <Link to="/marketplace/new-listing" className="btn-primary">
            List your produce
          </Link>
        )}
      </div>

      <form onSubmit={handleSearch} className="stub-card p-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-ink-faint absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by crop, buyer, or region"
            className="input-field pl-9"
          />
        </div>
        <div className="relative min-w-[160px]">
          <MapPin className="w-4 h-4 text-ink-faint absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Location"
            className="input-field pl-9"
          />
        </div>
        <button
          type="button"
          onClick={() => setShowFilters((v) => !v)}
          className="btn-secondary"
        >
          <SlidersHorizontal className="w-4 h-4" /> Filters
        </button>
        <button type="submit" className="btn-primary">Search</button>
      </form>

      {showFilters && (
        <div className="flex flex-wrap gap-2">
          {CROPS.map((c) => (
            <button
              key={c}
              onClick={() => setCrop(c)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${
                crop === c
                  ? 'bg-canopy-600 text-paper border-canopy-600'
                  : 'border-ink/15 text-ink-soft hover:border-canopy-400'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <Loader label="Finding matches" />
      ) : listings.length === 0 ? (
        <div className="stub-card p-10 text-center text-ink-faint text-sm">
          No listings match your search yet. Try widening your filters.
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {listings.map((item) => (
            <Link key={item._id} to={`/marketplace/${item._id}`} className="stub-card p-5 hover:-translate-y-0.5 transition">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase tracking-wide text-harvest-700 bg-harvest-50 px-2 py-0.5 rounded-full border border-harvest-200">
                  {item.cropType}
                </span>
                <span className="text-xs text-ink-faint">{item.location}</span>
              </div>
              <h3 className="font-display text-lg font-semibold mt-3">{item.title ?? `${item.cropType} — ${item.quantity} ${item.unit}`}</h3>
              <div className="flex items-center gap-1.5 text-xs text-ink-faint mt-2">
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
