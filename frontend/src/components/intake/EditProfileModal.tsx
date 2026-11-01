import React, { useState } from 'react';
import { 
  X, 
  UserCheck, 
  Save, 
  GraduationCap, 
  MapPin, 
  DollarSign
} from 'lucide-react';
import type { CitizenProfile } from '../../types';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: CitizenProfile;
  onSave: (updatedProfile: CitizenProfile) => void;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  isOpen,
  onClose,
  profile,
  onSave,
}) => {
  const [formData, setFormData] = useState<CitizenProfile>(profile);
  const [activeTab, setActiveTab] = useState<'personal' | 'academic' | 'financial'>('personal');
  const [prevOpen, setPrevOpen] = useState(isOpen);

  if (isOpen && !prevOpen) {
    setPrevOpen(true);
    setFormData(profile);
  } else if (!isOpen && prevOpen) {
    setPrevOpen(false);
  }

  if (!isOpen) return null;

  const handleChange = (field: keyof CitizenProfile, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleAttrChange = (attrField: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      attributes: {
        ...prev.attributes,
        [attrField]: value,
      },
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs font-sans">
      <div 
        className="relative w-full max-w-2xl bg-white border border-[#E5EAEF] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-[#2A3547]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#E5EAEF] flex items-center justify-between bg-[#F8FAFC]">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#5D87FF]/15 text-[#5D87FF] border border-[#5D87FF]/30 flex items-center justify-center">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-[#2A3547]">Edit Citizen Profile</h3>
              <p className="text-xs text-[#5A6A85]">Update demographic, academic, and financial criteria</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-[#7C8FAC] hover:text-[#2A3547] hover:bg-[#E5EAEF]/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="grid grid-cols-3 gap-1 p-2 bg-[#F8FAFC] border-b border-[#E5EAEF] text-xs font-medium">
          <button
            type="button"
            onClick={() => setActiveTab('personal')}
            className={`py-2 px-3 rounded-xl text-center transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'personal'
                ? 'bg-[#5D87FF] text-white font-semibold shadow-md shadow-[#5D87FF]/20'
                : 'text-[#5A6A85] hover:text-[#2A3547] hover:bg-white'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>Personal & Domicile</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('academic')}
            className={`py-2 px-3 rounded-xl text-center transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'academic'
                ? 'bg-[#5D87FF] text-white font-semibold shadow-md shadow-[#5D87FF]/20'
                : 'text-[#5A6A85] hover:text-[#2A3547] hover:bg-white'
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5" />
            <span>Academic Merit</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('financial')}
            className={`py-2 px-3 rounded-xl text-center transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'financial'
                ? 'bg-[#5D87FF] text-white font-semibold shadow-md shadow-[#5D87FF]/20'
                : 'text-[#5A6A85] hover:text-[#2A3547] hover:bg-white'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span>Financial & Category</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Tab 1: Personal & Domicile */}
          {activeTab === 'personal' && (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[#5A6A85] font-semibold mb-1">Full Legal Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.full_name}
                    onChange={(e) => handleChange('full_name', e.target.value)}
                    placeholder="e.g. Rohan Kumar"
                    className="w-full bg-[#F8FAFC] border border-[#E5EAEF] rounded-xl px-3 py-2 text-[#2A3547] placeholder-[#7C8FAC] focus:outline-none focus:ring-2 focus:ring-[#5D87FF]/30 focus:border-[#5D87FF]"
                  />
                </div>
                <div>
                  <label className="block text-[#5A6A85] font-semibold mb-1">Aadhaar / National ID *</label>
                  <input
                    type="text"
                    required
                    value={formData.national_id}
                    onChange={(e) => handleChange('national_id', e.target.value)}
                    placeholder="e.g. AADHAAR-1234-5678-9012"
                    className="w-full bg-[#F8FAFC] border border-[#E5EAEF] rounded-xl px-3 py-2 text-[#2A3547] font-mono placeholder-[#7C8FAC] focus:outline-none focus:ring-2 focus:ring-[#5D87FF]/30 focus:border-[#5D87FF]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[#5A6A85] font-semibold mb-1">Contact Email *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    placeholder="e.g. rohan@gmail.com"
                    className="w-full bg-[#F8FAFC] border border-[#E5EAEF] rounded-xl px-3 py-2 text-[#2A3547] placeholder-[#7C8FAC] focus:outline-none focus:ring-2 focus:ring-[#5D87FF]/30 focus:border-[#5D87FF]"
                  />
                </div>
                <div>
                  <label className="block text-[#5A6A85] font-semibold mb-1">Contact Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    placeholder="e.g. 9876543210"
                    className="w-full bg-[#F8FAFC] border border-[#E5EAEF] rounded-xl px-3 py-2 text-[#2A3547] placeholder-[#7C8FAC] focus:outline-none focus:ring-2 focus:ring-[#5D87FF]/30 focus:border-[#5D87FF]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-2 border-t border-[#E5EAEF]">
                <div>
                  <label className="block text-[#5A6A85] font-semibold mb-1">Domicile State *</label>
                  <input
                    type="text"
                    required
                    value={formData.address_state}
                    onChange={(e) => handleChange('address_state', e.target.value)}
                    placeholder="e.g. Karnataka, Assam, Delhi"
                    className="w-full bg-[#F8FAFC] border border-[#E5EAEF] rounded-xl px-3 py-2 text-[#2A3547] placeholder-[#7C8FAC] focus:outline-none focus:ring-2 focus:ring-[#5D87FF]/30 focus:border-[#5D87FF]"
                  />
                </div>
                <div>
                  <label className="block text-[#5A6A85] font-semibold mb-1">City / District</label>
                  <input
                    type="text"
                    value={formData.address_city}
                    onChange={(e) => handleChange('address_city', e.target.value)}
                    placeholder="e.g. Bengaluru, Guwahati"
                    className="w-full bg-[#F8FAFC] border border-[#E5EAEF] rounded-xl px-3 py-2 text-[#2A3547] placeholder-[#7C8FAC] focus:outline-none focus:ring-2 focus:ring-[#5D87FF]/30 focus:border-[#5D87FF]"
                  />
                </div>
                <div>
                  <label className="block text-[#5A6A85] font-semibold mb-1">Postal Code</label>
                  <input
                    type="text"
                    value={formData.address_zip}
                    onChange={(e) => handleChange('address_zip', e.target.value)}
                    placeholder="e.g. 560001"
                    className="w-full bg-[#F8FAFC] border border-[#E5EAEF] rounded-xl px-3 py-2 text-[#2A3547] font-mono placeholder-[#7C8FAC] focus:outline-none focus:ring-2 focus:ring-[#5D87FF]/30 focus:border-[#5D87FF]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Academic Merit */}
          {activeTab === 'academic' && (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[#5A6A85] font-semibold mb-1">Institution / College Name</label>
                  <input
                    type="text"
                    value={formData.attributes.institution || ''}
                    onChange={(e) => handleAttrChange('institution', e.target.value)}
                    placeholder="e.g. State University / IIT"
                    className="w-full bg-[#F8FAFC] border border-[#E5EAEF] rounded-xl px-3 py-2 text-[#2A3547] placeholder-[#7C8FAC] focus:outline-none focus:ring-2 focus:ring-[#5D87FF]/30 focus:border-[#5D87FF]"
                  />
                </div>
                <div>
                  <label className="block text-[#5A6A85] font-semibold mb-1">Degree Major / Department</label>
                  <input
                    type="text"
                    value={formData.attributes.major || ''}
                    onChange={(e) => handleAttrChange('major', e.target.value)}
                    placeholder="e.g. Computer Science, Mechanical Eng."
                    className="w-full bg-[#F8FAFC] border border-[#E5EAEF] rounded-xl px-3 py-2 text-[#2A3547] placeholder-[#7C8FAC] focus:outline-none focus:ring-2 focus:ring-[#5D87FF]/30 focus:border-[#5D87FF]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="block text-[#5A6A85] font-semibold mb-1">CGPA (4.0 or 10.0 scale)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="10"
                    value={formData.attributes.gpa ?? ''}
                    onChange={(e) => handleAttrChange('gpa', e.target.value ? parseFloat(e.target.value) : undefined)}
                    placeholder="e.g. 3.85 or 8.5"
                    className="w-full bg-[#F8FAFC] border border-[#E5EAEF] rounded-xl px-3 py-2 text-[#2A3547] font-mono placeholder-[#7C8FAC] focus:outline-none focus:ring-2 focus:ring-[#5D87FF]/30 focus:border-[#5D87FF]"
                  />
                </div>
                <div>
                  <label className="block text-[#5A6A85] font-semibold mb-1">Percentage / Marks (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={formData.attributes.percentage ?? ''}
                    onChange={(e) => handleAttrChange('percentage', e.target.value ? parseFloat(e.target.value) : undefined)}
                    placeholder="e.g. 82.5"
                    className="w-full bg-[#F8FAFC] border border-[#E5EAEF] rounded-xl px-3 py-2 text-[#2A3547] font-mono placeholder-[#7C8FAC] focus:outline-none focus:ring-2 focus:ring-[#5D87FF]/30 focus:border-[#5D87FF]"
                  />
                </div>
                <div>
                  <label className="block text-[#5A6A85] font-semibold mb-1">Roll / Student ID</label>
                  <input
                    type="text"
                    value={formData.attributes.roll_number || ''}
                    onChange={(e) => handleAttrChange('roll_number', e.target.value)}
                    placeholder="e.g. 2024CS-1092"
                    className="w-full bg-[#F8FAFC] border border-[#E5EAEF] rounded-xl px-3 py-2 text-[#2A3547] font-mono placeholder-[#7C8FAC] focus:outline-none focus:ring-2 focus:ring-[#5D87FF]/30 focus:border-[#5D87FF]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: Financial & Category */}
          {activeTab === 'financial' && (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[#5A6A85] font-semibold mb-1">Annual Household Income (₹) *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-[#7C8FAC] font-semibold">₹</span>
                    <input
                      type="number"
                      required
                      min="0"
                      step="1000"
                      value={formData.income_annual}
                      onChange={(e) => handleChange('income_annual', parseFloat(e.target.value) || 0)}
                      placeholder="e.g. 180000"
                      className="w-full bg-[#F8FAFC] border border-[#E5EAEF] rounded-xl pl-7 pr-3 py-2 text-[#2A3547] font-mono placeholder-[#7C8FAC] focus:outline-none focus:ring-2 focus:ring-[#5D87FF]/30 focus:border-[#5D87FF]"
                    />
                  </div>
                  <p className="text-[11px] text-[#5A6A85] mt-1">Controls income ceiling criteria during scheme matching</p>
                </div>

                <div>
                  <label className="block text-[#5A6A85] font-semibold mb-1">Reservation Category</label>
                  <select
                    value={formData.category || 'GENERAL'}
                    onChange={(e) => handleChange('category', e.target.value)}
                    className="w-full bg-[#F8FAFC] border border-[#E5EAEF] rounded-xl px-3 py-2 text-[#2A3547] focus:outline-none focus:ring-2 focus:ring-[#5D87FF]/30 focus:border-[#5D87FF]"
                  >
                    <option value="GENERAL">GENERAL</option>
                    <option value="OBC">OBC (Other Backward Classes)</option>
                    <option value="SC">SC (Scheduled Caste)</option>
                    <option value="ST">ST (Scheduled Tribe)</option>
                    <option value="EWS">EWS (Economically Weaker Section)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[#5A6A85] font-semibold mb-1">Income Certificate Number</label>
                  <input
                    type="text"
                    value={formData.attributes.certificate_number || ''}
                    onChange={(e) => handleAttrChange('certificate_number', e.target.value)}
                    placeholder="e.g. REV/INC/2026/8819"
                    className="w-full bg-[#F8FAFC] border border-[#E5EAEF] rounded-xl px-3 py-2 text-[#2A3547] font-mono placeholder-[#7C8FAC] focus:outline-none focus:ring-2 focus:ring-[#5D87FF]/30 focus:border-[#5D87FF]"
                  />
                </div>
                <div>
                  <label className="block text-[#5A6A85] font-semibold mb-1">Household Size</label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={formData.household_size || 4}
                    onChange={(e) => handleChange('household_size', parseInt(e.target.value) || 1)}
                    className="w-full bg-[#F8FAFC] border border-[#E5EAEF] rounded-xl px-3 py-2 text-[#2A3547] font-mono placeholder-[#7C8FAC] focus:outline-none focus:ring-2 focus:ring-[#5D87FF]/30 focus:border-[#5D87FF]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Footer Action */}
          <div className="pt-4 border-t border-[#E5EAEF] flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-[#E5EAEF] bg-white hover:bg-[#F4F7FB] text-[#5A6A85] hover:text-[#2A3547] font-medium text-xs transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-[#5D87FF] hover:bg-[#4a75ee] active:bg-[#3d65de] text-white font-semibold text-xs flex items-center gap-1.5 shadow-md shadow-[#5D87FF]/20 transition-all cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save & Re-evaluate Schemes</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
