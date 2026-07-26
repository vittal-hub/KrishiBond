import React from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext.jsx';
import { getErrorMessage } from '../utils/errorMessage';

export default function Profile() {
  const { user, updateUser } = useAuth();
  const { register, handleSubmit, formState: { errors, isSubmitting, isDirty } } = useForm({
    defaultValues: {
      name: user?.name ?? '',
      phone: user?.phone ?? '',
      location: user?.location ?? '',
      bio: user?.bio ?? '',
    },
  });

  const onSubmit = async (values) => {
    try {
      const { data } = await api.put('/users/me', values);
      updateUser(data);
      toast.success('Profile updated');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not update your profile'));
    }
  };

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

        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
          <div>
            <label className="label" htmlFor="name">Full name</label>
            <input id="name" className="input-field" {...register('name', { required: 'Name is required' })} />
            {errors.name && <p className="text-xs text-clay-500 mt-1">{errors.name.message}</p>}
          </div>
          <div>
            <label className="label" htmlFor="phone">Phone</label>
            <input id="phone" className="input-field" {...register('phone', { required: 'Phone is required' })} />
            {errors.phone && <p className="text-xs text-clay-500 mt-1">{errors.phone.message}</p>}
          </div>
          <div>
            <label className="label" htmlFor="location">Location</label>
            <input id="location" className="input-field" {...register('location', { required: 'Location is required' })} />
            {errors.location && <p className="text-xs text-clay-500 mt-1">{errors.location.message}</p>}
          </div>
          <div>
            <label className="label" htmlFor="bio">About</label>
            <textarea id="bio" rows={3} className="input-field resize-none" placeholder="A short introduction for the people you contract with" {...register('bio')} />
          </div>
          <button type="submit" disabled={isSubmitting || !isDirty} className="btn-primary">
            {isSubmitting ? 'Saving…' : 'Save changes'}
          </button>
        </form>
      </div>
    </div>
  );
}
