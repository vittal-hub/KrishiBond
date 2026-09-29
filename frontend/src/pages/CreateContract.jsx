import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { contractApi } from '../api/contractApi';
import { marketplaceApi } from '../api/marketplaceApi';
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
  const listingId = location.state?.listingId;

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
    if (!listingId) return;
    marketplaceApi.getListing(listingId).then(({ listing }) => {
      setValue('cropType', listing.cropType);
      setValue('quantity', listing.quantity);
      setValue('unit', listing.unit);
      setValue('pricePerUnit', listing.pricePerUnit);
      setValue('farmerId', listing.ownerId);
      setValue('listingId', listingId);
    }).catch(() => {});
  }, [listingId, setValue]);

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
      toast.success('Contract proposal sent');
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
      toast.error(getErrorMessage(error, 'Could not create the contract'));
    }
  };

  return (
    <div className="max-w-2xl">
      <h1 className="font-display text-2xl font-semibold mb-6">Propose a new contract</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="stub-card p-6 space-y-5">
        <input type="hidden" {...register('listingId')} />
        <input type="hidden" {...register('farmerId')} />

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

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="quantity">Quantity</label>
            <input
              id="quantity"
              type="number"
              step="0.01"
              className="input-field"
              {...register('quantity', { required: 'Quantity is required', min: { value: 1, message: 'Must be more than 0' } })}
            />
            {errors.quantity && <p className="text-xs text-clay-500 mt-1">{errors.quantity.message}</p>}
          </div>
          <div>
            <label className="label" htmlFor="unit">Unit</label>
            <select id="unit" className="input-field" {...register('unit')}>
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
