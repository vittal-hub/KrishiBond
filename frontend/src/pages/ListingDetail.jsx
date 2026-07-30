import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { MapPin, Package, TrendingUp, MessageSquare, Heart, Leaf, Warehouse, Truck } from 'lucide-react';
import toast from 'react-hot-toast';
import { marketplaceApi } from '../api/marketplaceApi';
import { messageApi } from '../api/communicationApi';
import { useAuth } from '../context/AuthContext.jsx';
import Loader from '../components/Loader.jsx';
import { formatCurrency, formatDate } from '../utils/format';
import { getErrorMessage } from '../utils/errorMessage';

function formatLocation(location) {
  if (!location) return null;
  return [location.district, location.state].filter(Boolean).join(', ') || null;
}

export default function ListingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { role, user } = useAuth();
  const [listing, setListing] = useState(null);
  const [benchmark, setBenchmark] = useState(null);
  const [loading, setLoading] = useState(true);
  const [contacting, setContacting] = useState(false);
  const [togglingFavourite, setTogglingFavourite] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { listing: data } = await marketplaceApi.getListing(id);
        if (!active) return;
        setListing(data);
        marketplaceApi
          .priceBenchmarks(data.cropType)
          .then(({ benchmark: b }) => active && setBenchmark(b))
          .catch(() => {});
      } catch (error) {
        toast.error(getErrorMessage(error, 'Could not load this listing'));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [id]);

  const handleContact = async () => {
    setContacting(true);
    try {
      const { thread } = await messageApi.startThread({ listingId: id, recipientId: listing.ownerId });
      navigate(`/messages/${thread.id}`);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not start the conversation'));
    } finally {
      setContacting(false);
    }
  };

  const handleProposeContract = () => {
    navigate('/contracts/new', { state: { listingId: id } });
  };

  const handleToggleFavourite = async () => {
    setTogglingFavourite(true);
    try {
      const { isFavourited, favouritesCount } = await marketplaceApi.toggleFavourite(id);
      setListing((prev) => ({ ...prev, isFavourited, favouritesCount }));
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not update favourites'));
    } finally {
      setTogglingFavourite(false);
    }
  };

  if (loading) return <Loader full label="Loading listing" />;
  if (!listing) return <p className="text-sm text-ink-faint">Listing not found.</p>;

  const isOwner = user?.id === listing.ownerId;

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <div className="stub-card p-6">
          {listing.images?.length > 0 && (
            <div className="grid grid-cols-3 gap-2 mb-4">
              {listing.images.map((src) => (
                <img key={src} src={src} alt={listing.cropType} className="w-full h-24 object-cover rounded-stub" />
              ))}
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono uppercase tracking-wide text-harvest-700 bg-harvest-50 px-2 py-0.5 rounded-full border border-harvest-200">
                {listing.cropType}
              </span>
              {listing.organic && (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-canopy-700">
                  <Leaf className="w-3.5 h-3.5" /> Organic
                </span>
              )}
            </div>
            {!isOwner && (
              <button onClick={handleToggleFavourite} disabled={togglingFavourite} className="p-1.5 rounded-full hover:bg-clay-50">
                <Heart className={`w-5 h-5 ${listing.isFavourited ? 'fill-clay-500 text-clay-500' : 'text-ink-faint'}`} />
              </button>
            )}
          </div>

          <h1 className="font-display text-2xl font-semibold mt-3">
            {listing.cropType} — {listing.quantity} {listing.unit}
          </h1>
          <div className="flex flex-wrap gap-4 mt-3 text-sm text-ink-soft">
            <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4" /> {formatLocation(listing.location) ?? 'Location not set'}</span>
            <span className="flex items-center gap-1.5"><Package className="w-4 h-4" /> {listing.quantity} {listing.unit}</span>
            {listing.harvestDate && (
              <span className="flex items-center gap-1.5">Harvest: {formatDate(listing.harvestDate)}</span>
            )}
          </div>
          <div className="flex flex-wrap gap-4 mt-3 text-xs text-ink-faint">
            {listing.storageFacility && <span className="flex items-center gap-1"><Warehouse className="w-3.5 h-3.5" /> Storage available</span>}
            {listing.deliveryAvailable && <span className="flex items-center gap-1"><Truck className="w-3.5 h-3.5" /> Delivery available</span>}
          </div>
          {listing.description && (
            <p className="text-sm text-ink-soft mt-4 leading-relaxed">{listing.description}</p>
          )}
        </div>

        {benchmark && benchmark.sampleSize > 0 && (
          <div className="stub-card p-6">
            <h2 className="font-display text-lg font-semibold flex items-center gap-2">
              <TrendingUp className="w-4.5 h-4.5 text-canopy-600" /> Market benchmark for {listing.cropType}
            </h2>
            <div className="grid grid-cols-3 gap-4 mt-4">
              <div>
                <p className="text-xs text-ink-faint">Low</p>
                <p className="text-lg font-semibold">{formatCurrency(benchmark.minPrice)}</p>
              </div>
              <div>
                <p className="text-xs text-ink-faint">Average</p>
                <p className="text-lg font-semibold text-canopy-700">{formatCurrency(benchmark.avgPrice)}</p>
              </div>
              <div>
                <p className="text-xs text-ink-faint">High</p>
                <p className="text-lg font-semibold">{formatCurrency(benchmark.maxPrice)}</p>
              </div>
            </div>
            <p className="text-xs text-ink-faint mt-2">Based on {benchmark.sampleSize} completed contract(s)</p>
          </div>
        )}
      </div>

      <div className="stub-card p-6 h-fit">
        <p className="text-xs text-ink-faint uppercase tracking-wide">Listed price</p>
        <p className="font-display text-3xl font-semibold text-canopy-700 mt-1">
          {formatCurrency(listing.pricePerUnit)}
          <span className="text-sm text-ink-faint font-body"> / {listing.unit}</span>
        </p>
        <p className="text-sm text-ink-faint mt-2">
          Listed by <Link to={`/users/${listing.ownerId}`} className="text-canopy-700 hover:underline">{listing.ownerName}</Link>
        </p>

        {!isOwner && (
          <div className="mt-6 space-y-2.5">
            {role === 'buyer' && (
              <button onClick={handleProposeContract} className="btn-primary w-full">
                Propose a contract
              </button>
            )}
            <button onClick={handleContact} disabled={contacting} className="btn-secondary w-full">
              <MessageSquare className="w-4 h-4" /> {contacting ? 'Starting chat…' : 'Message'}
            </button>
          </div>
        )}
        {isOwner && (
          <button onClick={() => navigate(`/marketplace/${id}/edit`)} className="btn-secondary w-full mt-6">
            Edit listing
          </button>
        )}
      </div>
    </div>
  );
}
