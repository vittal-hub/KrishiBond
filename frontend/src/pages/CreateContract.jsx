import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { contractApi } from '../api/contractApi';
import { marketplaceApi } from '../api/marketplaceApi';
import { useAuth } from '../context/AuthContext.jsx';
import { getErrorMessage } from '../utils/errorMessage';

// Values must match the backend's unit enum exactly (Contract/Listing
// models both use `['kg', 'quintal', 'ton']`) - only the label is for display.
const UNITS = [
  { value: 'quintal', label: 'Quintal' },
  { value: 'ton', label: 'Tonne' },
  { value: 'kg', label: 'Kg' },
];

export default function CreateContract() {
  const navigate = useNavigate();
  const location = useLocation();
  const { role } = useAuth();
  const listingId = location.state?.listingId;
  const [listing, setListing] = useState(null);
  const [loadingListing, setLoadingListing] = useState(Boolean(listingId));

  const {
    register,
    handleSubmit,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: { unit: 'quintal', milestones: [{ label: 'Delivery confirmed' }, { label: 'Quality check passed' }] },
  });

  useEffect(() => {
    // A buyer must always start from a specific produce listing - the
    // farmer/produce for the proposal comes entirely from it (see
    // contractController.createContract, which now derives the farmer from
    // listing.owner and rejects a buyer-submitted proposal with no
    // listingId). There is nothing useful this form can do for a buyer who
    // landed here without one, so send them to pick a listing instead.
    if (role === 'buyer' && !listingId) {
      toast.error('Select a produce listing from the marketplace to send a proposal');
      navigate('/marketplace', { replace: true });
    }
  }, [role, listingId, navigate]);

  useEffect(() => {
    if (!listingId) return;
    marketplaceApi.getListing(listingId).then(({ listing: data }) => {
      setListing(data);
      setValue('cropType', data.cropType);
      setValue('quantity', data.quantity);
      setValue('unit', data.unit);
      setValue('pricePerUnit', data.pricePerUnit);
      setValue('farmerId', data.ownerId);
      setValue('listingId', listingId);
    }).catch(() => {
      toast.error('Could not load this listing');
      navigate('/marketplace', { replace: true });
    }).finally(() => setLoadingListing(false));
  }, [listingId, setValue, navigate]);

  const onSubmit = async (values) => {
    const { pricePerUnit, ...rest } = values;
    try {
      const payload = {
        ...rest,
        quantity: Number(values.quantity),
        // Backend/Contract model field is `agreedPricePerUnit`, not
        // `pricePerUnit` - the form field name stays as-is, only the
        // outgoing key is renamed to match what the API actually reads.
        agreedPricePerUnit: Number(pricePerUnit),
      };
      const { contract } = await contractApi.create(payload);
      toast.success('Proposal sent successfully');
      navigate(`/contracts/${contract.id}`);
    } catch (error) {
      const fieldErrors = error.response?.data?.errors;
      if (fieldErrors && typeof fieldErrors === 'object') {
        // Map backend field names onto the form's own field names where they
        // differ (agreedPricePerUnit -> the pricePerUnit input) and surface
        // each one inline, right under the field that failed.
        const FIELD_ALIASES = { agreedPricePerUnit: 'pricePerUnit' };
        Object.entries(fieldErrors).forEach(([field, message]) => {
          setError(FIELD_ALIASES[field] || field, { type: 'server', message });
        });
      }
      toast.error(getErrorMessage(error, 'Could not send the proposal'));
    }
  };

  if (role === 'buyer' && (loadingListing || !listingId)) return null;

  return (
    <div className="max-w-2xl">
      <h1 className="font-display text-2xl font-semibold mb-6">Send a proposal</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="stub-card p-6 space-y-5">
        <input type="hidden" {...register('listingId')} />
        <input type="hidden" {...register('farmerId')} />

        {listing && (
          <div className="rounded-stub border border-ink/10 bg-canopy-50/40 p-4 grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-ink-faint uppercase tracking-wide">Produce</p>
              <p className="font-medium mt-0.5">{listing.cropType}</p>
            </div>
            <div>
              {/* Farmer is read-only - it comes entirely from the selected
                  listing (see the useEffect above), never a field the buyer
                  fills in or edits. */}
              <p className="text-xs text-ink-faint uppercase tracking-wide">Farmer</p>
              <p className="font-medium mt-0.5">{listing.ownerName}</p>
            </div>
            <div>
              <p className="text-xs text-ink-faint uppercase tracking-wide">Available quantity</p>
              <p className="font-medium mt-0.5">{listing.quantity} {listing.unit}</p>
            </div>
            <div>
              <p className="text-xs text-ink-faint uppercase tracking-wide">Listed price</p>
              <p className="font-medium mt-0.5">₹{listing.pricePerUnit} / {listing.unit}</p>
            </div>
          </div>
        )}

        {!listing && (
          <div>
            <label className="label" htmlFor="cropType">Crop type</label>
            <input
              id="cropType"
              className="input-field"
              placeholder="e.g. Basmati Rice"
              {...register('cropType', { required: 'Crop type is required' })}
            />
            {errors.cropType && <p className="text-xs text-clay-500 mt-1">{errors.cropType.message}</p>}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="quantity">{listing ? 'Requested quantity' : 'Quantity'}</label>
            <input
              id="quantity"
              type="number"
              step="0.01"
              className="input-field"
              {...register('quantity', {
                required: 'Quantity is required',
                min: { value: 0.01, message: 'Must be more than 0' },
                max: listing
                  ? { value: listing.quantity, message: `Cannot exceed the available quantity (${listing.quantity} ${listing.unit})` }
                  : undefined,
              })}
            />
            {errors.quantity && <p className="text-xs text-clay-500 mt-1">{errors.quantity.message}</p>}
          </div>
          <div>
            <label className="label" htmlFor="unit">Unit</label>
            <select id="unit" className="input-field" disabled={Boolean(listing)} {...register('unit')}>
              {UNITS.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="label" htmlFor="pricePerUnit">Proposed price per unit (₹)</label>
          <input
            id="pricePerUnit"
            type="number"
            step="0.01"
            className="input-field"
            {...register('pricePerUnit', { required: 'Price is required', min: { value: 1, message: 'Must be more than 0' } })}
          />
          {errors.pricePerUnit && <p className="text-xs text-clay-500 mt-1">{errors.pricePerUnit.message}</p>}
        </div>

        <div>
          <label className="label" htmlFor="village">Village</label>
          <input
            id="village"
            className="input-field"
            placeholder="Enter village name"
            {...register('village', { required: 'Village is required', maxLength: { value: 200, message: 'Village name is too long' } })}
          />
          {errors.village && <p className="text-xs text-clay-500 mt-1">{errors.village.message}</p>}
        </div>

        <div>
          <label className="label" htmlFor="deliveryDate">Expected delivery date</label>
          <input
            id="deliveryDate"
            type="date"
            className="input-field"
            {...register('deliveryDate', { required: 'Delivery date is required' })}
          />
          {errors.deliveryDate && <p className="text-xs text-clay-500 mt-1">{errors.deliveryDate.message}</p>}
        </div>

        <div>
          <label className="label" htmlFor="terms">Terms & notes</label>
          <textarea
            id="terms"
            rows={4}
            className="input-field resize-none"
            placeholder="Quality standards, packaging, transport responsibility, etc."
            {...register('terms')}
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={isSubmitting} className="btn-primary">
            {isSubmitting ? 'Sending…' : 'Send proposal'}
          </button>
          <button type="button" onClick={() => navigate(-1)} className="btn-ghost">Cancel</button>
        </div>
      </form>
    </div>
  );
}
