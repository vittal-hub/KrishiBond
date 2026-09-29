import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { marketplaceApi } from '../api/marketplaceApi';
import { categoryApi } from '../api/categoryApi';
import { getErrorMessage } from '../utils/errorMessage';
import Loader from '../components/Loader.jsx';
import LocationFields from '../components/LocationFields.jsx';

const UNITS = ['kg', 'quintal', 'ton'];

export default function ListingForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(isEdit);
  const [images, setImages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues: { unit: 'quintal' } });

  useEffect(() => {
    categoryApi.list().then((data) => setCategories(data.categories)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!isEdit) return;
    marketplaceApi
      .getListing(id)
      .then(({ listing }) => {
        reset({
          cropType: listing.cropType,
          category: listing.category?.id ?? '',
          quantity: listing.quantity,
          unit: listing.unit,
          pricePerUnit: listing.pricePerUnit,
          expectedYield: listing.expectedYield ?? '',
          harvestDate: listing.harvestDate ? listing.harvestDate.slice(0, 10) : '',
          organic: listing.organic,
          storageFacility: listing.storageFacility,
          deliveryAvailable: listing.deliveryAvailable,
          district: listing.location?.district ?? '',
          state: listing.location?.state ?? '',
          description: listing.description ?? '',
        });
        setImages(listing.images ?? []);
      })
      .catch((error) => toast.error(getErrorMessage(error, 'Could not load this listing')))
      .finally(() => setLoading(false));
  }, [id, isEdit, reset]);

  const onSubmit = async (values) => {
    try {
      const { district, state, category, ...rest } = values;
      const payload = {
        ...rest,
        category: category || undefined,
        quantity: Number(values.quantity),
        pricePerUnit: Number(values.pricePerUnit),
        expectedYield: values.expectedYield ? Number(values.expectedYield) : undefined,
        location: { district, state },
      };
      if (isEdit) {
        await marketplaceApi.updateListing(id, payload);
        toast.success('Listing updated');
        navigate(`/marketplace/${id}`);
      } else {
        const { listing } = await marketplaceApi.createListing(payload);
        toast.success('Listing published');
        navigate(`/marketplace/${listing.id}`);
      }
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not save this listing'));
    }
  };

  const handleImageUpload = async (e) => {
    if (!isEdit) {
      toast.error('Save the listing first, then add photos');
      return;
    }
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setUploading(true);
    try {
      const { images: updated } = await marketplaceApi.uploadImages(id, files);
      setImages(updated);
      toast.success('Images uploaded');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Image upload failed'));
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  if (loading) return <Loader full label="Loading listing" />;

  return (
    <div className="max-w-2xl">
      <h1 className="font-display text-2xl font-semibold mb-6">{isEdit ? 'Edit listing' : 'List your produce'}</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="stub-card p-6 space-y-5">
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

        <div>
          <label className="label" htmlFor="category">Category</label>
          <select id="category" className="input-field" {...register('category')}>
            <option value="">No category</option>
            {categories.map((c) => (
              <option key={c._id} value={c._id}>{c.name}</option>
            ))}
          </select>
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
              {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="pricePerUnit">Price per unit (₹)</label>
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
            <label className="label" htmlFor="expectedYield">Expected yield (optional)</label>
            <input id="expectedYield" type="number" step="0.01" className="input-field" {...register('expectedYield')} />
          </div>
        </div>

        <div>
          <label className="label" htmlFor="harvestDate">Harvest date</label>
          <input id="harvestDate" type="date" className="input-field" {...register('harvestDate')} />
        </div>

        <LocationFields register={register} watch={watch} setValue={setValue} errors={errors} />

        <div className="flex flex-wrap gap-5">
          <label className="flex items-center gap-2 text-sm text-ink-soft">
            <input type="checkbox" {...register('organic')} /> Organic
          </label>
          <label className="flex items-center gap-2 text-sm text-ink-soft">
            <input type="checkbox" {...register('storageFacility')} /> Storage facility
          </label>
          <label className="flex items-center gap-2 text-sm text-ink-soft">
            <input type="checkbox" {...register('deliveryAvailable')} /> Delivery available
          </label>
        </div>

        <div>
          <label className="label" htmlFor="description">Description</label>
          <textarea
            id="description"
            rows={4}
            className="input-field resize-none"
            placeholder="Quality, packaging, any other details buyers should know"
            {...register('description')}
          />
        </div>

        {isEdit && (
          <div>
            <label className="label">Photos</label>
            {images.length > 0 && (
              <div className="grid grid-cols-4 gap-2 mb-3">
                {images.map((src) => (
                  <img key={src} src={src} alt="Crop" className="w-full h-16 object-cover rounded-stub" />
                ))}
              </div>
            )}
            <input type="file" accept="image/*" multiple onChange={handleImageUpload} disabled={uploading} className="text-sm" />
            <p className="text-xs text-ink-faint mt-1">
              Requires Cloudinary to be configured on the server; contact your admin if uploads fail.
            </p>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={isSubmitting} className="btn-primary">
            {isSubmitting ? 'Saving…' : isEdit ? 'Save changes' : 'Publish listing'}
          </button>
          <button type="button" onClick={() => navigate(-1)} className="btn-ghost">Cancel</button>
        </div>
      </form>
    </div>
  );
}
