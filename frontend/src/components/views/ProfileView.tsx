import React, { useState, useEffect } from 'react';
import { 
  MapPin, 
  GraduationCap, 
  DollarSign, 
  Save, 
  CheckCircle2
} from 'lucide-react';
import type { CitizenProfile } from '../../types';

interface ProfileViewProps {
  profile: CitizenProfile;
  onSave: (updatedProfile: CitizenProfile) => void;
  appliedCount?: number;
  matchedCount?: number;
}

export const ProfileView: React.FC<ProfileViewProps> = React.memo(({ profile, onSave }) => {
  const [formData, setFormData] = useState<CitizenProfile>(profile);
  const [activeTab, setActiveTab] = useState<'personal' | 'academic' | 'financial'>('personal');
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    setFormData(profile);
  }, [profile]);

  const handleChange = (field: keyof CitizenProfile, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    setIsSaved(false);
  };

  const handleAttrChange = (attrField: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      attributes: {
        ...prev.attributes,
        [attrField]: value,
      },
    }));
    setIsSaved(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div className="flex flex-1 flex-col gap-6 max-w-5xl mx-auto font-sans w-full">
      {/* Page Header (Efferd Style) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <h1 className="font-heading font-semibold text-xl leading-tight text-[#09090b]">
              Citizen Profile & Statutory Attributes
            </h1>
            <span className="px-1.5 py-0.5 rounded-md text-xs font-mono font-medium bg-[#f4f4f5] text-[#71717a] border border-[#e4e4e7]">
              KYC Verified
            </span>
          </div>
          <p className="text-sm text-[#71717a]">
            Manage demographic criteria, academic scores, and family income for eligibility evaluation.
          </p>
        </div>

        {isSaved && (
          <span className="px-3 py-1 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium flex items-center gap-1.5 self-start sm:self-auto">
            <CheckCircle2 className="size-3.5 text-emerald-600" />
            <span>Profile Saved & Re-evaluated</span>
          </span>
        )}
      </div>

      {/* Main Profile Form Card (Efferd Bordered Form Container) */}
      <div className="rounded-lg bg-white border border-[#e4e4e7] overflow-hidden">
        {/* Segmented Tab Bar */}
        <div className="flex border-b border-[#e4e4e7] bg-[#f4f4f5]/60 p-1.5 gap-1.5 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('personal')}
            className={`flex-1 h-8 px-3 rounded-md text-xs font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer min-w-fit ${
              activeTab === 'personal'
                ? 'bg-white text-[#09090b] shadow-xs'
                : 'text-[#71717a] hover:text-[#09090b]'
            }`}
          >
            <MapPin className="size-3.5" />
            <span>Personal & Domicile</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('academic')}
            className={`flex-1 h-8 px-3 rounded-md text-xs font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer min-w-fit ${
              activeTab === 'academic'
                ? 'bg-white text-[#09090b] shadow-xs'
                : 'text-[#71717a] hover:text-[#09090b]'
            }`}
          >
            <GraduationCap className="size-3.5" />
            <span>Academic Merit</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('financial')}
            className={`flex-1 h-8 px-3 rounded-md text-xs font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer min-w-fit ${
              activeTab === 'financial'
                ? 'bg-white text-[#09090b] shadow-xs'
                : 'text-[#71717a] hover:text-[#09090b]'
            }`}
          >
            <DollarSign className="size-3.5" />
            <span>Income & Category</span>
          </button>
        </div>

        {/* Tab Forms */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Tab 1: Personal & Domicile */}
          {activeTab === 'personal' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#09090b] mb-1.5">
                    Legal Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.full_name}
                    onChange={(e) => handleChange('full_name', e.target.value)}
                    placeholder="Enter full legal name"
                    className="w-full h-9 bg-white border border-[#e4e4e7] rounded-md px-3 text-xs text-[#09090b] placeholder-[#71717a] focus:outline-none focus:border-[#18181b]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#09090b] mb-1.5">
                    National ID / Aadhaar *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.national_id}
                    onChange={(e) => handleChange('national_id', e.target.value)}
                    placeholder="e.g. AADHAAR-1234-5678-9012"
                    className="w-full h-9 bg-white border border-[#e4e4e7] rounded-md px-3 text-xs text-[#09090b] font-mono placeholder-[#71717a] focus:outline-none focus:border-[#18181b]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#09090b] mb-1.5">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    placeholder="e.g. citizen@example.com"
                    className="w-full h-9 bg-white border border-[#e4e4e7] rounded-md px-3 text-xs text-[#09090b] placeholder-[#71717a] focus:outline-none focus:border-[#18181b]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#09090b] mb-1.5">
                    Mobile Contact Number
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    placeholder="e.g. 9876543210"
                    className="w-full h-9 bg-white border border-[#e4e4e7] rounded-md px-3 text-xs text-[#09090b] placeholder-[#71717a] focus:outline-none focus:border-[#18181b]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#09090b] mb-1.5">
                    Domicile State *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.address_state}
                    onChange={(e) => handleChange('address_state', e.target.value)}
                    placeholder="e.g. Karnataka"
                    className="w-full h-9 bg-white border border-[#e4e4e7] rounded-md px-3 text-xs text-[#09090b] placeholder-[#71717a] focus:outline-none focus:border-[#18181b]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#09090b] mb-1.5">
                    City / District
                  </label>
                  <input
                    type="text"
                    value={formData.address_city}
                    onChange={(e) => handleChange('address_city', e.target.value)}
                    placeholder="e.g. Bengaluru"
                    className="w-full h-9 bg-white border border-[#e4e4e7] rounded-md px-3 text-xs text-[#09090b] placeholder-[#71717a] focus:outline-none focus:border-[#18181b]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Academic Merit */}
          {activeTab === 'academic' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#09090b] mb-1.5">
                    Educational Institution / College
                  </label>
                  <input
                    type="text"
                    value={formData.attributes?.institution || ''}
                    onChange={(e) => handleAttrChange('institution', e.target.value)}
                    placeholder="e.g. National Institute of Technology"
                    className="w-full h-9 bg-white border border-[#e4e4e7] rounded-md px-3 text-xs text-[#09090b] placeholder-[#71717a] focus:outline-none focus:border-[#18181b]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#09090b] mb-1.5">
                    Major / Department
                  </label>
                  <input
                    type="text"
                    value={formData.attributes?.major || ''}
                    onChange={(e) => handleAttrChange('major', e.target.value)}
                    placeholder="e.g. Computer Science Engineering"
                    className="w-full h-9 bg-white border border-[#e4e4e7] rounded-md px-3 text-xs text-[#09090b] placeholder-[#71717a] focus:outline-none focus:border-[#18181b]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#09090b] mb-1.5">
                    Cumulative GPA (4.0 or 10.0 scale)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="10"
                    value={formData.attributes?.gpa ?? ''}
                    onChange={(e) => handleAttrChange('gpa', e.target.value ? parseFloat(e.target.value) : undefined)}
                    placeholder="e.g. 8.65"
                    className="w-full h-9 bg-white border border-[#e4e4e7] rounded-md px-3 text-xs text-[#09090b] font-mono placeholder-[#71717a] focus:outline-none focus:border-[#18181b]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#09090b] mb-1.5">
                    Marks Percentage (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={formData.attributes?.percentage ?? ''}
                    onChange={(e) => handleAttrChange('percentage', e.target.value ? parseFloat(e.target.value) : undefined)}
                    placeholder="e.g. 85.5"
                    className="w-full h-9 bg-white border border-[#e4e4e7] rounded-md px-3 text-xs text-[#09090b] font-mono placeholder-[#71717a] focus:outline-none focus:border-[#18181b]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#09090b] mb-1.5">
                    Student ID / Enrollment Number
                  </label>
                  <input
                    type="text"
                    value={formData.attributes?.roll_number || ''}
                    onChange={(e) => handleAttrChange('roll_number', e.target.value)}
                    placeholder="e.g. 2024CS-8819"
                    className="w-full h-9 bg-white border border-[#e4e4e7] rounded-md px-3 text-xs text-[#09090b] font-mono placeholder-[#71717a] focus:outline-none focus:border-[#18181b]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: Financial & Category */}
          {activeTab === 'financial' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#09090b] mb-1.5">
                    Annual Household Income (₹) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-[#71717a] font-mono text-xs">₹</span>
                    <input
                      type="number"
                      required
                      min="0"
                      step="1000"
                      value={formData.income_annual}
                      onChange={(e) => handleChange('income_annual', parseFloat(e.target.value) || 0)}
                      className="w-full h-9 bg-white border border-[#e4e4e7] rounded-md pl-7 pr-3 text-xs text-[#09090b] font-mono focus:outline-none focus:border-[#18181b]"
                    />
                  </div>
                  <p className="text-[11px] text-[#71717a] mt-1">
                    Income ceiling cutoff parameter for statutory welfare schemes.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#09090b] mb-1.5">
                    Social Reservation Category
                  </label>
                  <select
                    value={formData.category || 'GENERAL'}
                    onChange={(e) => handleChange('category', e.target.value)}
                    aria-label="Social Reservation Category"
                    className="w-full h-9 bg-white border border-[#e4e4e7] rounded-md px-3 text-xs text-[#09090b] focus:outline-none focus:border-[#18181b] cursor-pointer"
                  >
                    <option value="GENERAL">General / Open Category</option>
                    <option value="OBC">Other Backward Classes (OBC - Non-Creamy)</option>
                    <option value="SC">Scheduled Caste (SC)</option>
                    <option value="ST">Scheduled Tribe (ST)</option>
                    <option value="EWS">Economically Weaker Section (EWS)</option>
                    <option value="MINORITY">Statutory Minority</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#09090b] mb-1.5">
                    Household Size (Number of Family Members)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="15"
                    value={formData.household_size}
                    onChange={(e) => handleChange('household_size', parseInt(e.target.value) || 1)}
                    className="w-full h-9 bg-white border border-[#e4e4e7] rounded-md px-3 text-xs text-[#09090b] font-mono focus:outline-none focus:border-[#18181b]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#09090b] mb-1.5">
                    Revenue Income Certificate Number
                  </label>
                  <input
                    type="text"
                    value={formData.attributes?.certificate_number || ''}
                    onChange={(e) => handleAttrChange('certificate_number', e.target.value)}
                    placeholder="e.g. RD-2026-KA-99128"
                    className="w-full h-9 bg-white border border-[#e4e4e7] rounded-md px-3 text-xs text-[#09090b] font-mono focus:outline-none focus:border-[#18181b]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Form Actions Footer */}
          <div className="pt-4 border-t border-[#e4e4e7] flex items-center justify-between">
            <span className="text-[11px] text-[#71717a]">
              Saving automatically triggers re-evaluation against all statutory scheme schemas.
            </span>

            <button
              type="submit"
              className="h-8 px-4 rounded-md bg-[#18181b] hover:bg-[#27272a] text-white text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Save className="size-3.5" />
              <span>Save & Re-evaluate</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
});

ProfileView.displayName = 'ProfileView';
