import React, { useEffect, useState } from 'react';
import { Building2, Upload, Save, Image as ImageIcon, Trash2 } from 'lucide-react';
import { useCompanyStore } from '../../store/companyStore';
import { useNotificationStore } from '../../store/notificationStore';

const INDIAN_STATES = [
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
  'Andaman and Nicobar Islands',
  'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi',
  'Jammu and Kashmir',
  'Ladakh',
  'Lakshadweep',
  'Puducherry',
];

const BUSINESS_TYPES = [
  'Retail Shop',
  'Wholesale',
  'Distributor',
  'Supermarket',
  'Pharmacy',
  'Garments',
  'Electronics',
  'Hardware',
  'Grocery',
  'General Store',
  'Other',
];

export const BusinessProfilePage: React.FC = () => {
  const { company, fetchCompany, updateCompany } = useCompanyStore();
  const { notify } = useNotificationStore();

  const [formData, setFormData] = useState({
    businessName: '',
    businessType: 'Retail Shop',
    ownerName: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    state: 'Tamil Nadu',
    pincode: '',
    gstRegistered: false,
    gstin: '',
    pan: '',
    invoicePrefix: 'INV',
    logoPath: '',
  });

  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchCompany();
  }, [fetchCompany]);

  useEffect(() => {
    if (company) {
      setFormData({
        businessName: company.businessName || company.name || '',
        businessType: company.businessType || 'Retail Shop',
        ownerName: company.ownerName || '',
        phone: company.phone || company.mobile || '',
        email: company.email || '',
        address: company.address || '',
        city: company.city || '',
        state: company.state || 'Tamil Nadu',
        pincode: company.pincode || '',
        gstRegistered: Boolean(company.gstRegistered),
        gstin: company.gstin || '',
        pan: company.pan || '',
        invoicePrefix: company.invoicePrefix || 'INV',
        logoPath: company.logoPath || '',
      });
    }
  }, [company]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSelectLogo = async () => {
    if (typeof window !== 'undefined' && window.rsInventory) {
      const res = await window.rsInventory.selectCompanyLogo();
      if (res.success && res.data) {
        setFormData((prev) => ({ ...prev, logoPath: res.data || '' }));
        notify('success', 'Logo selected and saved to application storage.');
      } else if (res.error) {
        notify('error', res.error.message);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.businessName.trim()) {
      notify('error', 'Business Name is required.');
      return;
    }

    setIsSaving(true);
    const res = await updateCompany({
      ...formData,
      name: formData.businessName,
      mobile: formData.phone,
    });
    setIsSaving(false);

    if (res.success) {
      notify('success', 'Business Profile updated successfully.');
    } else {
      notify('error', res.error || 'Failed to update business profile.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-200">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Business Profile</h1>
        <p className="text-xs text-slate-400 mt-1">
          Configure company identity, GSTIN, invoice prefix, and business address.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Business Info */}
        <div className="rounded-2xl bg-surface-900/70 border border-surface-800 p-6 space-y-4">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <Building2 className="h-4 w-4 text-brand-400" />
            General Information
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Business Name *
              </label>
              <input
                type="text"
                name="businessName"
                value={formData.businessName}
                onChange={handleChange}
                className="w-full px-3.5 py-2 rounded-xl bg-surface-950 border border-surface-700 text-slate-100 text-xs focus:outline-none focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Business Type</label>
              <select
                name="businessType"
                value={formData.businessType}
                onChange={handleChange}
                className="w-full px-3.5 py-2 rounded-xl bg-surface-950 border border-surface-700 text-slate-100 text-xs focus:outline-none focus:border-brand-500"
              >
                {BUSINESS_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Owner Name</label>
              <input
                type="text"
                name="ownerName"
                value={formData.ownerName}
                onChange={handleChange}
                className="w-full px-3.5 py-2 rounded-xl bg-surface-950 border border-surface-700 text-slate-100 text-xs focus:outline-none focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Phone / Mobile
              </label>
              <input
                type="text"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                maxLength={10}
                className="w-full px-3.5 py-2 rounded-xl bg-surface-950 border border-surface-700 text-slate-100 text-xs focus:outline-none focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-3.5 py-2 rounded-xl bg-surface-950 border border-surface-700 text-slate-100 text-xs focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Store Address</label>
            <input
              type="text"
              name="address"
              value={formData.address}
              onChange={handleChange}
              className="w-full px-3.5 py-2 rounded-xl bg-surface-950 border border-surface-700 text-slate-100 text-xs focus:outline-none focus:border-brand-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">City</label>
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleChange}
                className="w-full px-3.5 py-2 rounded-xl bg-surface-950 border border-surface-700 text-slate-100 text-xs focus:outline-none focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">State</label>
              <select
                name="state"
                value={formData.state}
                onChange={handleChange}
                className="w-full px-3.5 py-2 rounded-xl bg-surface-950 border border-surface-700 text-slate-100 text-xs focus:outline-none focus:border-brand-500"
              >
                {INDIAN_STATES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">PIN Code</label>
              <input
                type="text"
                name="pincode"
                value={formData.pincode}
                onChange={handleChange}
                maxLength={6}
                className="w-full px-3.5 py-2 rounded-xl bg-surface-950 border border-surface-700 text-slate-100 text-xs focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>
        </div>

        {/* Tax & Invoicing */}
        <div className="rounded-2xl bg-surface-900/70 border border-surface-800 p-6 space-y-4">
          <h2 className="text-sm font-semibold text-white">Tax, GST & Invoicing</h2>

          <div className="flex items-center gap-3 p-3 rounded-xl bg-surface-950 border border-surface-800">
            <input
              type="checkbox"
              id="gstRegistered"
              name="gstRegistered"
              checked={formData.gstRegistered}
              onChange={handleChange}
              className="h-4 w-4 rounded bg-surface-800 border-surface-700 text-brand-600 focus:ring-brand-500"
            />
            <label
              htmlFor="gstRegistered"
              className="text-xs font-medium text-slate-200 cursor-pointer"
            >
              GST Registered Business
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">GSTIN</label>
              <input
                type="text"
                name="gstin"
                value={formData.gstin}
                onChange={handleChange}
                maxLength={15}
                placeholder="15-digit GSTIN"
                className="w-full font-mono uppercase px-3.5 py-2 rounded-xl bg-surface-950 border border-surface-700 text-slate-100 text-xs focus:outline-none focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Business PAN</label>
              <input
                type="text"
                name="pan"
                value={formData.pan}
                onChange={handleChange}
                maxLength={10}
                placeholder="10-digit PAN"
                className="w-full font-mono uppercase px-3.5 py-2 rounded-xl bg-surface-950 border border-surface-700 text-slate-100 text-xs focus:outline-none focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Invoice Prefix
              </label>
              <input
                type="text"
                name="invoicePrefix"
                value={formData.invoicePrefix}
                onChange={handleChange}
                placeholder="INV"
                className="w-full font-mono uppercase px-3.5 py-2 rounded-xl bg-surface-950 border border-surface-700 text-slate-100 text-xs focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>
        </div>

        {/* Company Logo Section */}
        <div className="rounded-2xl bg-surface-900/70 border border-surface-800 p-6 space-y-4">
          <h2 className="text-sm font-semibold text-white">Company Logo</h2>
          <div className="flex items-center gap-6">
            <div className="h-16 w-16 rounded-2xl bg-surface-950 border border-surface-800 flex items-center justify-center text-slate-500 overflow-hidden">
              {formData.logoPath ? (
                <img
                  src={formData.logoPath}
                  alt="Company Logo"
                  className="h-full w-full object-contain p-1"
                />
              ) : (
                <ImageIcon className="h-7 w-7" />
              )}
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSelectLogo}
                  className="inline-flex items-center gap-2 rounded-xl bg-surface-800 px-4 py-2 text-xs font-medium text-slate-200 border border-surface-700 hover:bg-surface-700 transition-all active:scale-95"
                >
                  <Upload className="h-3.5 w-3.5" />
                  <span>{formData.logoPath ? 'Change Logo' : 'Select Logo from PC'}</span>
                </button>
                {formData.logoPath && (
                  <button
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, logoPath: '' }))}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-rose-500/10 px-3 py-2 text-xs font-medium text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 transition-all"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Remove</span>
                  </button>
                )}
              </div>
              <p className="text-[11px] text-slate-400">PNG, JPG, JPEG, or WEBP (Max 2 MB)</p>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-6 py-2.5 text-xs font-semibold text-white shadow-lg shadow-brand-600/20 hover:bg-brand-500 active:scale-95 transition-all disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            <span>{isSaving ? 'Saving Changes...' : 'Save Business Profile'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
