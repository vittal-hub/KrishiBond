import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { PenLine } from 'lucide-react';
import api from '../api/axios';
import { userApi } from '../api/userApi';
import { useAuth } from '../context/AuthContext.jsx';
import { getErrorMessage } from '../utils/errorMessage';
import LocationFields from '../components/LocationFields.jsx';

// Same 10-digit Indian mobile format the backend enforces (see
// backend/src/validators/commonSchemas.js).
const PHONE_PATTERN = /^[6-9]\d{9}$/;
const NAME_PATTERN = /[A-Za-z]/;

function ProfileForm({ user, updateUser }) {
  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting, isDirty } } = useForm({
    defaultValues: {
      name: user?.name ?? '',
      phone: user?.phone ?? '',
      district: user?.location?.district ?? '',
      state: user?.location?.state ?? '',
      village: user?.location?.village ?? '',
      bio: user?.bio ?? '',
    },
  });

  const onSubmit = async ({ district, state, village, ...rest }) => {
    try {
      const { data } = await api.put('/users/me', { ...rest, location: { district, state, village } });
      updateUser(data.user);
      toast.success('Profile updated');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not update your profile'));
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
      <div>
        <label className="label" htmlFor="name">Full name</label>
        <input
          id="name"
          className="input-field"
          {...register('name', {
            required: 'Name is required',
            minLength: { value: 2, message: 'Name must be at least 2 characters' },
            maxLength: { value: 100, message: 'Name is too long' },
            pattern: { value: NAME_PATTERN, message: 'Name must contain at least one letter' },
          })}
        />
        {errors.name && <p className="text-xs text-clay-500 mt-1">{errors.name.message}</p>}
      </div>
      <div>
        <label className="label" htmlFor="phone">Phone</label>
        <input
          id="phone"
          type="tel"
          inputMode="numeric"
          maxLength={10}
          className="input-field"
          {...register('phone', {
            required: 'Phone is required',
            pattern: { value: PHONE_PATTERN, message: 'Enter a valid 10-digit Indian mobile number' },
          })}
        />
        {errors.phone && <p className="text-xs text-clay-500 mt-1">{errors.phone.message}</p>}
      </div>
      <LocationFields register={register} watch={watch} setValue={setValue} errors={errors} />
      <div>
        <label className="label" htmlFor="bio">About</label>
        <textarea id="bio" rows={3} className="input-field resize-none" placeholder="A short introduction for the people you contract with" {...register('bio')} />
      </div>
      <button type="submit" disabled={isSubmitting || !isDirty} className="btn-primary">
        {isSubmitting ? 'Saving…' : 'Save changes'}
      </button>
    </form>
  );
}

function SignaturePanel({ user, updateUser }) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = React.useRef(null);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploading(true);
    try {
      const { signatureUrl } = await userApi.uploadSignature(file);
      updateUser({ signatureUrl });
      toast.success('Signature saved');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not upload your signature'));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="stub-card p-6 mt-6">
      <h2 className="font-display text-lg font-semibold flex items-center gap-2">
        <PenLine className="w-4.5 h-4.5 text-canopy-600" /> My signature
      </h2>
      <p className="text-sm text-ink-faint mt-1">
        Upload once and it's automatically used whenever you digitally sign a contract - no need to re-upload each time.
      </p>

      <div className="mt-4 flex items-center gap-4">
        <div className="w-40 h-20 rounded-stub border border-dashed border-ink/20 bg-paper flex items-center justify-center overflow-hidden">
          {user?.signatureUrl ? (
            <img src={user.signatureUrl} alt="Your signature" className="max-w-full max-h-full object-contain" />
          ) : (
            <span className="text-xs text-ink-faint">No signature yet</span>
          )}
        </div>
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={handleFileChange}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="btn-secondary text-xs px-3 py-1.5"
          >
            {uploading ? 'Uploading…' : user?.signatureUrl ? 'Replace signature' : 'Upload signature'}
          </button>
          <p className="text-[11px] text-ink-faint mt-1.5">PNG, JPG, or WEBP · up to 5MB</p>
        </div>
      </div>
    </div>
  );
}

export default function Profile() {
  const { user, updateUser } = useAuth();

  return (
    <div className="max-w-xl">
      <h1 className="font-display text-2xl font-semibold mb-6">Your profile</h1>

      <div className="stub-card p-6">
        <div className="flex items-center gap-4 pb-6 border-b border-ink/10">
          <div className="w-14 h-14 rounded-full bg-harvest-200 flex items-center justify-center text-ink font-semibold text-xl">
            {user?.name?.[0]?.toUpperCase()}
          </div>
          <div>
            <p className="font-medium">{user?.name}</p>
            <p className="text-xs text-ink-faint capitalize">{user?.role} · {user?.email}</p>
          </div>
        </div>

        <ProfileForm user={user} updateUser={updateUser} />
      </div>

      <SignaturePanel user={user} updateUser={updateUser} />
    </div>
  );
}
