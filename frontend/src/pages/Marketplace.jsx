import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Search, MapPin, Package, SlidersHorizontal, Heart, Leaf } from 'lucide-react';
import toast from 'react-hot-toast';
import { marketplaceApi } from '../api/marketplaceApi';
import { categoryApi } from '../api/categoryApi';
import { useAuth } from '../context/AuthContext.jsx';
import Loader from '../components/Loader.jsx';
import { formatCurrency } from '../utils/format';
import { getErrorMessage } from '../utils/errorMessage';

const CROPS = ['All crops', 'Wheat', 'Rice', 'Cotton', 'Sugarcane', 'Maize', 'Pulses', 'Vegetables', 'Fruits'];
const SORT_OPTIONS = [
  { value: '-createdAt', label: 'Newest first' },
  { value: 'price', label: 'Price: low to high' },
  { value: '-price', label: 'Price: high to low' },
  { value: 'harvestDate', label: 'Harvest date' },
];

function formatLocation(location) {
  if (!location) return null;
  return [location.district, location.state].filter(Boolean).join(', ') || null;
}

export default function Marketplace() {
  const { role } = useAuth();
  const [listings, setListings] = useState([]);
  const [meta, setMeta] = useState({ page: 1, pages: 1, total: 0 });
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [crop, setCrop] = useState('All crops');
  const [location, setLocation] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [organicOnly, setOrganicOnly] = useState(false);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [sort, setSort] = useState('-createdAt');
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);

  useEffect(() => {
    categoryApi.list().then((data) => setCategories(data.categories)).catch(() => {});
  }, []);

  const fetchListings = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        q: query || undefined,
        cropType: crop !== 'All crops' ? crop : undefined,
        district: location || undefined,
        category: categoryId || undefined,
        organic: organicOnly ? 'true' : undefined,
        minPrice: minPrice || undefined,
        maxPrice: maxPrice || undefined,
        sort,
        page,
      };
      const data = await marketplaceApi.search(params);
      setListings(data.listings);
      setMeta(data.meta);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not load listings'));
    } finally {
      setLoading(false);
    }
  }, [crop, location, categoryId, organicOnly, minPrice, maxPrice, sort, page, query]);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchListings();
  };

  const handleToggleFavourite = async (id, e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const { isFavourited, favouritesCount } = await marketplaceApi.toggleFavourite(id);
      setListings((prev) =>
        prev.map((item) => (item.id === id ? { ...item, isFavourited, favouritesCount } : item))
      );
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not update favourites'));
    }
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
          <Link to="/marketplace/new" className="btn-primary">
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
            placeholder="Search by crop or description"
            className="input-field pl-9"
          />
        </div>
        <div className="relative min-w-[160px]">
          <MapPin className="w-4 h-4 text-ink-faint absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="District"
            className="input-field pl-9"
          />
        </div>
        <select value={sort} onChange={(e) => setSort(e.target.value)} className="input-field w-auto min-w-[150px]">
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <button type="button" onClick={() => setShowFilters((v) => !v)} className="btn-secondary">
          <SlidersHorizontal className="w-4 h-4" /> Filters
        </button>
        <button type="submit" className="btn-primary">Search</button>
      </form>

      {showFilters && (
        <div className="stub-card p-4 space-y-4">
          <div className="flex flex-wrap gap-2">
            {CROPS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => { setCrop(c); setPage(1); }}
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
          <div className="flex flex-wrap items-center gap-4">
            {categories.length > 0 && (
              <select
                value={categoryId}
                onChange={(e) => { setCategoryId(e.target.value); setPage(1); }}
                className="input-field w-auto min-w-[160px]"
              >
                <option value="">All categories</option>
                {categories.map((c) => (
                  <option key={c._id} value={c._id}>{c.name}</option>
                ))}
              </select>
            )}
            <label className="flex items-center gap-2 text-sm text-ink-soft">
              <input type="checkbox" checked={organicOnly} onChange={(e) => { setOrganicOnly(e.target.checked); setPage(1); }} />
              Organic only
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                placeholder="Min price"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                className="input-field w-28"
              />
              <span className="text-ink-faint text-sm">to</span>
              <input
                type="number"
                placeholder="Max price"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                className="input-field w-28"
              />
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <Loader label="Finding matches" />
      ) : listings.length === 0 ? (
        <div className="stub-card p-10 text-center text-ink-faint text-sm">
          No listings match your search yet. Try widening your filters.
        </div>
      ) : (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {listings.map((item) => (
              <Link key={item.id} to={`/marketplace/${item.id}`} className="stub-card p-5 hover:-translate-y-0.5 transition relative">
                <button
                  onClick={(e) => handleToggleFavourite(item.id, e)}
                  className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-clay-50"
                  aria-label="Toggle favourite"
                >
                  <Heart className={`w-4 h-4 ${item.isFavourited ? 'fill-clay-500 text-clay-500' : 'text-ink-faint'}`} />
                </button>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono uppercase tracking-wide text-harvest-700 bg-harvest-50 px-2 py-0.5 rounded-full border border-harvest-200">
                    {item.cropType}
                  </span>
                  {item.organic && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-canopy-700">
                      <Leaf className="w-3.5 h-3.5" /> Organic
                    </span>
                  )}
                </div>
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

          {meta.pages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2">
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
        </>
      )}
    </div>
  );
}
