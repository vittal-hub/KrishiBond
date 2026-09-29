import React from 'react';
import { INDIA_STATES, DISTRICTS_BY_STATE } from '../data/indiaLocations.js';

/**
 * State + District dependent dropdowns, backed by a local dataset (see
 * src/data/indiaLocations.js) instead of free-text inputs - this is what
 * keeps a location from being stored inconsistently as "Tamil Nadu" /
 * "Tamilnadu" / "TN" across different users' records.
 *
 * Native <select> elements are used deliberately: no extra dependency is
 * needed for "searchable" behavior (typing jumps to matching options in
 * every real browser) or for a mobile-friendly picker (native pickers on
 * iOS/Android are already the best available UX for this).
 *
 * Drop-in replacement for a react-hook-form `register`-based pair of text
 * inputs - same field names, same error-display convention, so callers only
 * need to swap the JSX and keep everything else (validation rules,
 * defaultValues, submit handling) unchanged.
 */
export default function LocationFields({
  register,
  watch,
  setValue,
  errors,
  stateName = 'state',
  districtName = 'district',
  villageName = 'village',
  required = true,
  showVillage = true,
}) {
  const selectedState = watch(stateName);
  const districts = DISTRICTS_BY_STATE[selectedState] || [];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor={stateName}>
            State
          </label>
          <select
            id={stateName}
            className="input-field"
            {...register(stateName, {
              required: required ? 'State is required' : false,
              onChange: () => setValue(districtName, ''),
            })}
          >
            <option value="">Select State</option>
            {INDIA_STATES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          {errors[stateName] && (
            <p className="text-xs text-clay-500 mt-1">{errors[stateName].message}</p>
          )}
        </div>
        <div>
          <label className="label" htmlFor={districtName}>
            District
          </label>
          <select
            id={districtName}
            className="input-field disabled:opacity-60 disabled:cursor-not-allowed"
            disabled={!selectedState}
            {...register(districtName, { required: required ? 'District is required' : false })}
          >
            <option value="">{selectedState ? 'Select District' : 'Select a state first'}</option>
            {districts.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
          {errors[districtName] && (
            <p className="text-xs text-clay-500 mt-1">{errors[districtName].message}</p>
          )}
        </div>
      </div>

      {showVillage && (
        <div>
          <label className="label" htmlFor={villageName}>
            Village / City
          </label>
          {/* Deliberately a free-text input, not a dropdown - there is no
              authoritative village/city dataset to select from (unlike
              State/District above), and requiring one would force users into
              options that don't include their actual village. */}
          <input
            id={villageName}
            type="text"
            className="input-field"
            placeholder="Enter your village or city name"
            maxLength={200}
            {...register(villageName, {
              required: required ? 'Village/City is required' : false,
              maxLength: { value: 200, message: 'Village/City name is too long' },
              validate: (value) => !required || Boolean(value?.trim()) || 'Village/City is required',
            })}
          />
          {errors[villageName] && (
            <p className="text-xs text-clay-500 mt-1">{errors[villageName].message}</p>
          )}
        </div>
      )}
    </div>
  );
}
