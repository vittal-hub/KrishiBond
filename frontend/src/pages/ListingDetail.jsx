import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapPin, Package, TrendingUp, MessageSquare } from 'lucide-react';
import toast from 'react-hot-toast';
import { marketplaceApi } from '../api/marketplaceApi';
import { messageApi } from '../api/communicationApi';
import { useAuth } from '../context/AuthContext.jsx';
import Loader from '../components/Loader.jsx';
import { formatCurrency } from '../utils/format';
import { getErrorMessage } from '../utils/errorMessage';

export default function ListingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { role } = useAuth();
  const [listing, setListing] = useState(null);
  const [benchmarks, setBenchmarks] = useState(null);
  const [loading, setLoading] = useState(true);
  const [contacting, setContacting] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await marketplaceApi.getListing(id);
        if (!active) return;
        setListing(data);
        marketplaceApi
          .priceBenchmarks(data.cropType)
          .then((b) => active && setBenchmarks(b))
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
      const thread = await messageApi.startThread({ listingId: id, recipientId: listing.ownerId });
      navigate(`/messages/${thread._id}`);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not start the conversation'));
    } finally {
      setContacting(false);
    }
  };

  const handleProposeContract = () => {
    navigate('/contracts/new', { state: { listingId: id } });
  };

  if (loading) return <Loader full label="Loading listing" />;
  if (!listing) return <p className="text-sm text-ink-faint">Listing not found.</p>;

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <div className="stub-card p-6">
          <span className="text-xs font-mono uppercase tracking-wide text-harvest-700 bg-harvest-50 px-2 py-0.5 rounded-full border border-harvest-200">
            {listing.cropType}
          </span>
          <h1 className="font-display text-2xl font-semibold mt-3">
            {listing.title ?? `${listing.cropType} — ${listing.quantity} ${listing.unit}`}
          </h1>
          <div className="flex flex-wrap gap-4 mt-3 text-sm text-ink-soft">
            <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4" /> {listing.location}</span>
            <span className="flex items-center gap-1.5"><Package className="w-4 h-4" /> {listing.quantity} {listing.unit}</span>
          </div>
          {listing.description && (
            <p className="text-sm text-ink-soft mt-4 leading-relaxed">{listing.description}</p>
          )}
        </div>

        {benchmarks && (
          <div className="stub-card p-6">
            <h2 className="font-display text-lg font-semibold flex items-center gap-2">
              <TrendingUp className="w-4.5 h-4.5 text-canopy-600" /> Market benchmark for {listing.cropType}
            </h2>
            <div className="grid grid-cols-3 gap-4 mt-4">
              <div>
                <p className="text-xs text-ink-faint">Low</p>
                <p className="text-lg font-semibold">{formatCurrency(benchmarks.low)}</p>
              </div>
              <div>
                <p className="text-xs text-ink-faint">Average</p>
                <p className="text-lg font-semibold text-canopy-700">{formatCurrency(benchmarks.average)}</p>
              </div>
              <div>
                <p className="text-xs text-ink-faint">High</p>
                <p className="text-lg font-semibold">{formatCurrency(benchmarks.high)}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="stub-card p-6 h-fit">
        <p className="text-xs text-ink-faint uppercase tracking-wide">Listed price</p>
        <p className="font-display text-3xl font-semibold text-canopy-700 mt-1">
          {formatCurrency(listing.pricePerUnit)}
          <span className="text-sm text-ink-faint font-body"> / {listing.unit}</span>
        </p>
        <p className="text-sm text-ink-faint mt-2">Listed by {listing.ownerName}</p>

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
      </div>
    </div>
  );
}
