import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { BadgeCheck, ShieldAlert, MailWarning, PhoneCall, Bell, PenLine } from 'lucide-react';
import api from '../api/axios';
import { authApi } from '../api/authApi';
import { kycApi } from '../api/kycApi';
import { userApi } from '../api/userApi';
import { notificationApi } from '../api/communicationApi';
import { useAuth } from '../context/AuthContext.jsx';
import { getErrorMessage } from '../utils/errorMessage';
import LocationFields from '../components/LocationFields.jsx';

// Same 10-digit Indian mobile format the backend enforces (see
// backend/src/validators/commonSchemas.js).
const PHONE_PATTERN = /^[6-9]\d{9}$/;
const NAME_PATTERN = /[A-Za-z]/;

const NOTIFICATION_CATEGORIES = [
  { key: 'contract', label: 'Contract updates', hint: 'Proposals, signatures, status changes' },
  { key: 'payment', label: 'Payment & escrow', hint: 'Funding, releases, refunds' },
  { key: 'offer', label: 'Offers & negotiation', hint: 'New offers and responses' },
  { key: 'kyc', label: 'KYC status', hint: 'Approval or rejection of your verification' },
  { key: 'dispute', label: 'Disputes', hint: 'Raised, commented, or resolved' },
  { key: 'message', label: 'Chat messages', hint: 'Off by default to avoid inbox noise' },
];

function VerificationBadge({ verified, label }) {
  return verified ? (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-canopy-700">
      <BadgeCheck className="w-3.5 h-3.5" /> {label} verified
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-harvest-700">
      <ShieldAlert className="w-3.5 h-3.5" /> {label} not verified
    </span>
  );
}

function ProfileForm({ user, updateUser }) {
  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting, isDirty } } = useForm({
    defaultValues: {
      name: user?.name ?? '',
      phone: user?.phone ?? '',
      district: user?.location?.district ?? '',
      state: user?.location?.state ?? '',
      bio: user?.bio ?? '',
    },
  });

  const onSubmit = async ({ district, state, ...rest }) => {
    try {
      const { data } = await api.put('/users/me', { ...rest, location: { district, state } });
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

function VerificationPanel({ user }) {
  const { resendEmailOtp, verifyEmailOtp } = useAuth();
  const [sendingEmailOtp, setSendingEmailOtp] = useState(false);
  const [emailOtpSent, setEmailOtpSent] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm();
  const emailOtpForm = useForm();

  const sendEmailOtp = async () => {
    setSendingEmailOtp(true);
    try {
      const data = await resendEmailOtp(user.email);
      setEmailOtpSent(true);
      if (data.devOtp) toast.success(`Dev mode - OTP: ${data.devOtp}`, { duration: 8000 });
      else toast.success('Verification code sent to your email');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not send verification code'));
    } finally {
      setSendingEmailOtp(false);
    }
  };

  const onVerifyEmailOtp = async ({ otp }) => {
    try {
      await verifyEmailOtp({ email: user.email, otp });
      emailOtpForm.reset();
      setEmailOtpSent(false);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Incorrect or expired code'));
    }
  };

  const sendOtp = async () => {
    setSendingOtp(true);
    try {
      const data = await authApi.sendOtp();
      setOtpSent(true);
      if (data.devOtp) toast.success(`Dev mode - OTP: ${data.devOtp}`, { duration: 8000 });
      else toast.success('OTP sent to your email');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not send OTP'));
    } finally {
      setSendingOtp(false);
    }
  };

  const onVerifyOtp = async ({ otp }) => {
    try {
      await authApi.verifyOtp(otp);
      toast.success('Phone number verified');
      reset();
      setOtpSent(false);
      window.location.reload();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Incorrect or expired OTP'));
    }
  };

  return (
    <div className="stub-card p-6 mt-6">
      <h2 className="font-display text-lg font-semibold">Verification</h2>
      <div className="mt-4 space-y-4">
        <div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MailWarning className="w-4 h-4 text-ink-faint" />
              <VerificationBadge verified={user?.emailVerified} label="Email" />
            </div>
            {!user?.emailVerified && (
              <button onClick={sendEmailOtp} disabled={sendingEmailOtp} className="btn-secondary text-xs px-3 py-1.5">
                {sendingEmailOtp ? 'Sending…' : emailOtpSent ? 'Resend code' : 'Send code'}
              </button>
            )}
          </div>
          {!user?.emailVerified && emailOtpSent && (
            <form onSubmit={emailOtpForm.handleSubmit(onVerifyEmailOtp)} className="flex items-center gap-2 mt-3">
              <input
                className="input-field"
                placeholder="6-digit code"
                maxLength={6}
                {...emailOtpForm.register('otp', { required: true, pattern: /^\d{6}$/ })}
              />
              <button type="submit" disabled={emailOtpForm.formState.isSubmitting} className="btn-primary text-xs px-3 py-2 whitespace-nowrap">
                Verify
              </button>
            </form>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <PhoneCall className="w-4 h-4 text-ink-faint" />
              <VerificationBadge verified={user?.phoneVerified} label="Phone" />
            </div>
            {!user?.phoneVerified && (
              <button onClick={sendOtp} disabled={sendingOtp} className="btn-secondary text-xs px-3 py-1.5">
                {sendingOtp ? 'Sending…' : otpSent ? 'Resend OTP' : 'Send OTP'}
              </button>
            )}
          </div>
          {!user?.phoneVerified && otpSent && (
            <form onSubmit={handleSubmit(onVerifyOtp)} className="flex items-center gap-2 mt-3">
              <input
                className="input-field"
                placeholder="6-digit code"
                maxLength={6}
                {...register('otp', { required: true, pattern: /^\d{6}$/ })}
              />
              <button type="submit" disabled={isSubmitting} className="btn-primary text-xs px-3 py-2 whitespace-nowrap">
                Verify
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

function KycPanel() {
  const [kyc, setKyc] = useState(null);
  const [loading, setLoading] = useState(true);
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm();

  useEffect(() => {
    kycApi
      .getMine()
      .then((data) => {
        setKyc(data.kyc);
        if (data.kyc) {
          reset({
            aadhaarNumber: data.kyc.aadhaarNumber ?? '',
            panNumber: data.kyc.panNumber ?? '',
            accountHolderName: data.kyc.bankDetails?.accountHolderName ?? '',
            accountNumber: data.kyc.bankDetails?.accountNumber ?? '',
            ifsc: data.kyc.bankDetails?.ifsc ?? '',
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [reset]);

  const onSubmit = async ({ aadhaarNumber, panNumber, accountHolderName, accountNumber, ifsc }) => {
    try {
      const payload = {
        aadhaarNumber: aadhaarNumber || undefined,
        panNumber: panNumber || undefined,
        bankDetails: { accountHolderName, accountNumber, ifsc },
      };
      const { kyc: updated } = await kycApi.submit(payload);
      setKyc(updated);
      toast.success('KYC details submitted for review');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not submit KYC details'));
    }
  };

  if (loading) return null;

  const statusStamp = {
    pending: 'stamp-pending',
    approved: 'stamp-fulfilled',
    rejected: 'stamp-disputed',
  };

  return (
    <div className="stub-card p-6 mt-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold">KYC details</h2>
        {kyc && <span className={`stamp ${statusStamp[kyc.status]}`}>{kyc.status}</span>}
      </div>
      {kyc?.status === 'rejected' && kyc.rejectionReason && (
        <p className="text-xs text-clay-600 mt-2">Reason: {kyc.rejectionReason}</p>
      )}
      <p className="text-xs text-ink-faint mt-1">
        Document upload (Aadhaar/PAN scans) will be enabled once the KYC media module ships — for now these
        details are recorded and queued for admin review.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="aadhaarNumber">Aadhaar number</label>
            <input
              id="aadhaarNumber"
              className="input-field"
              placeholder="12-digit number"
              {...register('aadhaarNumber', { pattern: { value: /^\d{12}$/, message: 'Must be 12 digits' } })}
            />
            {errors.aadhaarNumber && <p className="text-xs text-clay-500 mt-1">{errors.aadhaarNumber.message}</p>}
          </div>
          <div>
            <label className="label" htmlFor="panNumber">PAN number</label>
            <input
              id="panNumber"
              className="input-field uppercase"
              placeholder="ABCDE1234F"
              {...register('panNumber', { pattern: { value: /^[A-Za-z]{5}\d{4}[A-Za-z]$/, message: 'Enter a valid PAN' } })}
            />
            {errors.panNumber && <p className="text-xs text-clay-500 mt-1">{errors.panNumber.message}</p>}
          </div>
        </div>

        <div>
          <label className="label" htmlFor="accountHolderName">Bank account holder name</label>
          <input id="accountHolderName" className="input-field" {...register('accountHolderName')} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="accountNumber">Account number</label>
            <input id="accountNumber" className="input-field" {...register('accountNumber')} />
          </div>
          <div>
            <label className="label" htmlFor="ifsc">IFSC code</label>
            <input
              id="ifsc"
              className="input-field uppercase"
              placeholder="SBIN0001234"
              {...register('ifsc', { pattern: { value: /^[A-Za-z]{4}0[A-Z0-9]{6}$/, message: 'Enter a valid IFSC' } })}
            />
            {errors.ifsc && <p className="text-xs text-clay-500 mt-1">{errors.ifsc.message}</p>}
          </div>
        </div>

        <button type="submit" disabled={isSubmitting} className="btn-primary">
          {isSubmitting ? 'Submitting…' : kyc ? 'Update KYC details' : 'Submit for review'}
        </button>
      </form>
    </div>
  );
}

function NotificationPreferencesPanel() {
  const [preferences, setPreferences] = useState(null);
  const [saving, setSaving] = useState(null);

  useEffect(() => {
    notificationApi
      .getPreferences()
      .then((data) => setPreferences(data.preferences?.email ?? {}))
      .catch(() => {});
  }, []);

  const toggle = async (category) => {
    const next = !preferences[category];
    setPreferences((prev) => ({ ...prev, [category]: next }));
    setSaving(category);
    try {
      await notificationApi.updatePreferences({ email: { [category]: next } });
    } catch (error) {
      setPreferences((prev) => ({ ...prev, [category]: !next }));
      toast.error(getErrorMessage(error, 'Could not update preference'));
    } finally {
      setSaving(null);
    }
  };

  if (!preferences) return null;

  return (
    <div className="stub-card p-6 mt-6">
      <h2 className="font-display text-lg font-semibold flex items-center gap-2">
        <Bell className="w-4.5 h-4.5 text-canopy-600" /> Email notifications
      </h2>
      <p className="text-xs text-ink-faint mt-1">
        In-app notifications always stay on. Choose which of these also send you an email.
      </p>
      <div className="mt-4 space-y-3">
        {NOTIFICATION_CATEGORIES.map((c) => (
          <div key={c.key} className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">{c.label}</p>
              <p className="text-xs text-ink-faint">{c.hint}</p>
            </div>
            <button
              role="switch"
              aria-checked={Boolean(preferences[c.key])}
              onClick={() => toggle(c.key)}
              disabled={saving === c.key}
              className={`relative w-10 h-5.5 rounded-full transition-colors shrink-0 ${
                preferences[c.key] ? 'bg-canopy-600' : 'bg-ink/15'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-4.5 h-4.5 rounded-full bg-paper transition-transform ${
                  preferences[c.key] ? 'translate-x-4' : ''
                }`}
              />
            </button>
          </div>
        ))}
      </div>
    </div>
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

      <VerificationPanel user={user} />
      <SignaturePanel user={user} updateUser={updateUser} />
      <KycPanel />
      <NotificationPreferencesPanel />
    </div>
  );
}
