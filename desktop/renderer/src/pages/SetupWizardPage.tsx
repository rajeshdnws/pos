import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  AlertCircle,
  Store,
  ChevronRight,
  ChevronLeft,
  Eye,
  EyeOff,
  Sparkles,
} from 'lucide-react';
import { CompanySetupDTO } from '@rs-inventory/types';
import { useAuthStore } from '../store/authStore';
import { useNotificationStore } from '../store/notificationStore';

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

export const SetupWizardPage: React.FC = () => {
  const navigate = useNavigate();
  const { checkAuth } = useAuthStore();
  const { notify } = useNotificationStore();

  const [currentStep, setCurrentStep] = useState<number>(0); // 0 = Welcome, 1 = Business, 2 = Tax, 3 = Invoice, 4 = Admin, 5 = Review
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Form State
  const [formData, setFormData] = useState<CompanySetupDTO>({
    businessName: '',
    businessType: 'Retail Shop',
    ownerName: '',
    mobile: '',
    email: '',
    address: '',
    city: '',
    state: 'Tamil Nadu',
    pincode: '',
    country: 'India',
    gstRegistered: false,
    gstin: '',
    pan: '',
    taxType: 'UNREGISTERED',
    invoicePrefix: 'INV',
    startingInvoiceNumber: 1,
    financialYearStart: `${new Date().getFullYear()}-04-01`,
    financialYearEnd: `${new Date().getFullYear() + 1}-03-31`,
    adminFullName: '',
    adminUsername: 'admin',
    adminMobile: '',
    adminEmail: '',
    adminPassword: '',
  });

  const [confirmPassword, setConfirmPassword] = useState('');

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({
        ...prev,
        [name]: checked,
        taxType: checked ? 'GST_REGISTERED' : 'UNREGISTERED',
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const validateStep = (step: number): boolean => {
    setErrorMessage(null);

    if (step === 1) {
      if (!formData.businessName.trim()) {
        setErrorMessage('Please enter your Business Name.');
        return false;
      }
      if (formData.pincode && !/^[1-9][0-9]{5}$/.test(formData.pincode.trim())) {
        setErrorMessage('PIN Code must be a valid 6-digit Indian postal code.');
        return false;
      }
      if (formData.mobile && !/^[0-9]{10}$/.test(formData.mobile.replace(/\D/g, ''))) {
        setErrorMessage('Mobile Number must be 10 digits.');
        return false;
      }
    }

    if (step === 2) {
      if (formData.gstRegistered) {
        if (!formData.gstin?.trim()) {
          setErrorMessage('GSTIN is required when business is GST Registered.');
          return false;
        }
        const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
        if (!gstinRegex.test(formData.gstin.trim().toUpperCase())) {
          setErrorMessage('Invalid GSTIN format. Expected 15 characters (e.g. 33AAAAA0000A1Z5).');
          return false;
        }
      }
      if (formData.pan && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(formData.pan.trim().toUpperCase())) {
        setErrorMessage('Invalid PAN format. Expected 10 characters (e.g. ABCDE1234F).');
        return false;
      }
    }

    if (step === 3) {
      if (!formData.invoicePrefix?.trim()) {
        setErrorMessage('Invoice Prefix is required (e.g. INV).');
        return false;
      }
      if (!formData.startingInvoiceNumber || formData.startingInvoiceNumber < 1) {
        setErrorMessage('Starting Invoice Number must be 1 or higher.');
        return false;
      }
    }

    if (step === 4) {
      if (!formData.adminFullName.trim()) {
        setErrorMessage('Administrator Full Name is required.');
        return false;
      }
      if (!formData.adminUsername.trim() || formData.adminUsername.trim().length < 3) {
        setErrorMessage('Administrator Username must be at least 3 characters.');
        return false;
      }
      if (formData.adminPassword.length < 8) {
        setErrorMessage('Password must be at least 8 characters long.');
        return false;
      }
      if (
        !/[A-Z]/.test(formData.adminPassword) ||
        !/[a-z]/.test(formData.adminPassword) ||
        !/[0-9]/.test(formData.adminPassword)
      ) {
        setErrorMessage(
          'Password must contain at least one uppercase letter, one lowercase letter, and one number.',
        );
        return false;
      }
      if (formData.adminPassword !== confirmPassword) {
        setErrorMessage('Password and Confirm Password do not match.');
        return false;
      }
    }

    return true;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    setErrorMessage(null);
    setCurrentStep((prev) => prev - 1);
  };

  const handleFinalSubmit = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      if (typeof window !== 'undefined' && window.rsInventory) {
        const res = await window.rsInventory.setupCompany({
          ...formData,
          gstin: formData.gstin ? formData.gstin.trim().toUpperCase() : undefined,
          pan: formData.pan ? formData.pan.trim().toUpperCase() : undefined,
        });

        if (res.success) {
          notify('success', 'Business setup completed successfully! Welcome to RS Inventory.');
          await checkAuth();
          navigate('/dashboard');
          return;
        } else {
          setErrorMessage(res.error?.message || 'Failed to complete setup. Please check details.');
        }
      } else {
        notify('success', 'Demo Setup completed.');
        navigate('/dashboard');
      }
    } catch (err) {
      setErrorMessage((err as Error).message || 'An unexpected error occurred during setup.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-screen bg-surface-950 text-slate-100 flex items-center justify-center p-6 select-none font-sans overflow-y-auto">
      <div className="w-full max-w-2xl bg-surface-900/90 border border-surface-800 rounded-3xl shadow-2xl p-8 backdrop-blur-xl relative">
        {/* Step 0: Welcome Screen */}
        {currentStep === 0 && (
          <div className="text-center py-8 space-y-6 animate-in fade-in">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-brand-500/10 border border-brand-500/20 text-brand-400 shadow-xl shadow-brand-500/10">
              <Store className="h-10 w-10" />
            </div>

            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tight text-white">
                Welcome to RS Inventory
              </h1>
              <p className="text-slate-400 text-sm max-w-md mx-auto leading-relaxed">
                Production-grade offline inventory, barcode billing, and retail management software
                designed for Indian businesses.
              </p>
            </div>

            <div className="pt-4">
              <button
                onClick={() => setCurrentStep(1)}
                className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-brand-600/30 hover:bg-brand-500 active:scale-95 transition-all"
              >
                <span>Let's Set Up Your Business</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Steps 1 to 5: Multi-step Wizard */}
        {currentStep > 0 && (
          <div className="space-y-6 animate-in fade-in">
            {/* Header with Progress Steps */}
            <div className="flex items-center justify-between pb-4 border-b border-surface-800">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-brand-500/10 flex items-center justify-center text-brand-400 font-bold text-xs">
                  {currentStep} / 5
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">
                    {currentStep === 1 && 'Business Information'}
                    {currentStep === 2 && 'Tax & GST Information'}
                    {currentStep === 3 && 'Invoice & Financial Year'}
                    {currentStep === 4 && 'Create Administrator Account'}
                    {currentStep === 5 && 'Review & Complete Setup'}
                  </h2>
                  <p className="text-xs text-slate-400">Step {currentStep} of 5</p>
                </div>
              </div>

              {/* Step indicator pills */}
              <div className="flex items-center gap-1.5">
                {[1, 2, 3, 4, 5].map((s) => (
                  <div
                    key={s}
                    className={`h-1.5 rounded-full transition-all ${
                      s === currentStep
                        ? 'w-6 bg-brand-500'
                        : s < currentStep
                          ? 'w-3 bg-emerald-500'
                          : 'w-3 bg-surface-700'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Error Notification */}
            {errorMessage && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2 animate-in fade-in">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Step 1: Business Profile */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Business / Store Name <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    name="businessName"
                    value={formData.businessName}
                    onChange={handleChange}
                    placeholder="e.g. Ramesh Supermarket & General Store"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-surface-950 border border-surface-700 text-slate-100 text-sm focus:outline-none focus:border-brand-500"
                    autoFocus
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Business Type
                    </label>
                    <select
                      name="businessType"
                      value={formData.businessType}
                      onChange={handleChange}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-surface-950 border border-surface-700 text-slate-100 text-sm focus:outline-none focus:border-brand-500"
                    >
                      {BUSINESS_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Owner Name
                    </label>
                    <input
                      type="text"
                      name="ownerName"
                      value={formData.ownerName || ''}
                      onChange={handleChange}
                      placeholder="e.g. Rajesh Kumar"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-surface-950 border border-surface-700 text-slate-100 text-sm focus:outline-none focus:border-brand-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Mobile Number
                    </label>
                    <input
                      type="text"
                      name="mobile"
                      value={formData.mobile || ''}
                      onChange={handleChange}
                      placeholder="10-digit mobile"
                      maxLength={10}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-surface-950 border border-surface-700 text-slate-100 text-sm focus:outline-none focus:border-brand-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email || ''}
                      onChange={handleChange}
                      placeholder="contact@store.in"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-surface-950 border border-surface-700 text-slate-100 text-sm focus:outline-none focus:border-brand-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Store Address
                  </label>
                  <input
                    type="text"
                    name="address"
                    value={formData.address || ''}
                    onChange={handleChange}
                    placeholder="Shop No, Street, Landmark"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-surface-950 border border-surface-700 text-slate-100 text-sm focus:outline-none focus:border-brand-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">City</label>
                    <input
                      type="text"
                      name="city"
                      value={formData.city || ''}
                      onChange={handleChange}
                      placeholder="e.g. Chennai"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-surface-950 border border-surface-700 text-slate-100 text-sm focus:outline-none focus:border-brand-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">State</label>
                    <select
                      name="state"
                      value={formData.state || 'Tamil Nadu'}
                      onChange={handleChange}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-surface-950 border border-surface-700 text-slate-100 text-sm focus:outline-none focus:border-brand-500"
                    >
                      {INDIAN_STATES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      PIN Code
                    </label>
                    <input
                      type="text"
                      name="pincode"
                      value={formData.pincode || ''}
                      onChange={handleChange}
                      placeholder="6 digits"
                      maxLength={6}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-surface-950 border border-surface-700 text-slate-100 text-sm focus:outline-none focus:border-brand-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Tax / GST */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-surface-950 border border-surface-800 space-y-3">
                  <div className="flex items-center gap-3">
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
                      className="text-sm font-semibold text-white cursor-pointer"
                    >
                      Is your business GST Registered?
                    </label>
                  </div>
                  <p className="text-xs text-slate-400 pl-7">
                    Check this option if you have an active 15-digit GSTIN number issued by the
                    Government of India.
                  </p>
                </div>

                {formData.gstRegistered ? (
                  <div className="space-y-4 animate-in fade-in">
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        GSTIN <span className="text-rose-400">*</span>
                      </label>
                      <input
                        type="text"
                        name="gstin"
                        value={formData.gstin || ''}
                        onChange={handleChange}
                        placeholder="e.g. 33AAAAA0000A1Z5"
                        maxLength={15}
                        className="w-full font-mono uppercase px-3.5 py-2.5 rounded-xl bg-surface-950 border border-surface-700 text-slate-100 text-sm focus:outline-none focus:border-brand-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        Tax Scheme Type
                      </label>
                      <select
                        name="taxType"
                        value={formData.taxType}
                        onChange={handleChange}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-surface-950 border border-surface-700 text-slate-100 text-sm focus:outline-none focus:border-brand-500"
                      >
                        <option value="GST_REGISTERED">Regular GST Registered</option>
                        <option value="COMPOSITION">Composition Scheme</option>
                      </select>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-surface-950 border border-surface-800 text-xs text-slate-400">
                    Your business will be marked as{' '}
                    <span className="text-brand-300 font-semibold">Unregistered</span>. You can
                    enable GSTIN and configure tax slabs later in Business Settings.
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Business PAN (Optional)
                  </label>
                  <input
                    type="text"
                    name="pan"
                    value={formData.pan || ''}
                    onChange={handleChange}
                    placeholder="e.g. ABCDE1234F"
                    maxLength={10}
                    className="w-full font-mono uppercase px-3.5 py-2.5 rounded-xl bg-surface-950 border border-surface-700 text-slate-100 text-sm focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>
            )}

            {/* Step 3: Invoice & Financial Year */}
            {currentStep === 3 && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Invoice Prefix <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      name="invoicePrefix"
                      value={formData.invoicePrefix}
                      onChange={handleChange}
                      placeholder="e.g. INV"
                      className="w-full uppercase font-mono px-3.5 py-2.5 rounded-xl bg-surface-950 border border-surface-700 text-slate-100 text-sm focus:outline-none focus:border-brand-500"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">Example output: INV-000001</p>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Starting Number
                    </label>
                    <input
                      type="number"
                      name="startingInvoiceNumber"
                      value={formData.startingInvoiceNumber}
                      onChange={handleChange}
                      min={1}
                      className="w-full font-mono px-3.5 py-2.5 rounded-xl bg-surface-950 border border-surface-700 text-slate-100 text-sm focus:outline-none focus:border-brand-500"
                    />
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-surface-950 border border-surface-800 space-y-3">
                  <div className="text-xs font-semibold text-slate-300">
                    Indian Financial Year (FY)
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Start Date</label>
                      <input
                        type="date"
                        name="financialYearStart"
                        value={formData.financialYearStart}
                        onChange={handleChange}
                        className="w-full px-3 py-2 rounded-lg bg-surface-900 border border-surface-700 text-xs text-slate-200"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">End Date</label>
                      <input
                        type="date"
                        name="financialYearEnd"
                        value={formData.financialYearEnd}
                        onChange={handleChange}
                        className="w-full px-3 py-2 rounded-lg bg-surface-900 border border-surface-700 text-xs text-slate-200"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Administrator Account */}
            {currentStep === 4 && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Administrator Full Name <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      name="adminFullName"
                      value={formData.adminFullName}
                      onChange={handleChange}
                      placeholder="e.g. Ramesh Babu"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-surface-950 border border-surface-700 text-slate-100 text-sm focus:outline-none focus:border-brand-500"
                      autoFocus
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Admin Username <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      name="adminUsername"
                      value={formData.adminUsername}
                      onChange={handleChange}
                      placeholder="admin"
                      className="w-full font-mono px-3.5 py-2.5 rounded-xl bg-surface-950 border border-surface-700 text-slate-100 text-sm focus:outline-none focus:border-brand-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Admin Mobile
                    </label>
                    <input
                      type="text"
                      name="adminMobile"
                      value={formData.adminMobile || ''}
                      onChange={handleChange}
                      placeholder="10-digit mobile"
                      maxLength={10}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-surface-950 border border-surface-700 text-slate-100 text-sm focus:outline-none focus:border-brand-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Admin Email
                    </label>
                    <input
                      type="email"
                      name="adminEmail"
                      value={formData.adminEmail || ''}
                      onChange={handleChange}
                      placeholder="admin@store.in"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-surface-950 border border-surface-700 text-slate-100 text-sm focus:outline-none focus:border-brand-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Password <span className="text-rose-400">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        name="adminPassword"
                        value={formData.adminPassword}
                        onChange={handleChange}
                        placeholder="••••••••"
                        className="w-full px-3.5 py-2.5 pr-10 rounded-xl bg-surface-950 border border-surface-700 text-slate-100 text-sm focus:outline-none focus:border-brand-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Confirm Password <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-surface-950 border border-surface-700 text-slate-100 text-sm focus:outline-none focus:border-brand-500"
                    />
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-surface-950 border border-surface-800 text-[11px] text-slate-400 space-y-1">
                  <div className="font-semibold text-slate-300">Password Requirements:</div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1">
                    <span className={formData.adminPassword.length >= 8 ? 'text-emerald-400' : ''}>
                      &bull; Min 8 characters
                    </span>
                    <span
                      className={/[A-Z]/.test(formData.adminPassword) ? 'text-emerald-400' : ''}
                    >
                      &bull; 1 uppercase letter
                    </span>
                    <span
                      className={/[a-z]/.test(formData.adminPassword) ? 'text-emerald-400' : ''}
                    >
                      &bull; 1 lowercase letter
                    </span>
                    <span
                      className={/[0-9]/.test(formData.adminPassword) ? 'text-emerald-400' : ''}
                    >
                      &bull; 1 number
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Step 5: Review & Complete Setup */}
            {currentStep === 5 && (
              <div className="space-y-4">
                <div className="rounded-2xl bg-surface-950 border border-surface-800 p-5 space-y-3 text-xs">
                  <div className="flex justify-between py-1.5 border-b border-surface-800">
                    <span className="text-slate-400">Business Name</span>
                    <span className="font-semibold text-white">{formData.businessName}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-surface-800">
                    <span className="text-slate-400">Business Type</span>
                    <span className="text-slate-200">{formData.businessType}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-surface-800">
                    <span className="text-slate-400">Tax Scheme</span>
                    <span className="text-brand-300 font-mono">
                      {formData.gstRegistered
                        ? `GST Registered (${formData.gstin})`
                        : 'Unregistered'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-surface-800">
                    <span className="text-slate-400">Invoice Format</span>
                    <span className="font-mono text-slate-200">
                      {formData.invoicePrefix}-000001
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-surface-800">
                    <span className="text-slate-400">Location</span>
                    <span className="text-slate-200">
                      {formData.city || '-'}, {formData.state}
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-slate-400">Administrator User</span>
                    <span className="font-semibold text-emerald-400">
                      {formData.adminUsername} ({formData.adminFullName})
                    </span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-brand-500/10 border border-brand-500/20 text-xs text-brand-300 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 shrink-0" />
                  <span>
                    Setup will create the company record, default roles, permissions, and
                    administrator user in a safe atomic transaction.
                  </span>
                </div>
              </div>
            )}

            {/* Navigation buttons */}
            <div className="flex items-center justify-between pt-4 border-t border-surface-800">
              <button
                type="button"
                onClick={handleBack}
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 rounded-xl bg-surface-800 px-5 py-2.5 text-xs font-medium text-slate-300 hover:bg-surface-700 active:scale-95 transition-all disabled:opacity-50"
              >
                <ChevronLeft className="h-4 w-4" />
                <span>Back</span>
              </button>

              {currentStep < 5 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-6 py-2.5 text-xs font-semibold text-white shadow-lg shadow-brand-600/20 hover:bg-brand-500 active:scale-95 transition-all"
                >
                  <span>Next Step</span>
                  <ChevronRight className="h-4 w-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleFinalSubmit}
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-8 py-2.5 text-xs font-semibold text-white shadow-lg shadow-emerald-600/30 hover:bg-emerald-500 active:scale-95 transition-all disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <span>Initializing Setup...</span>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Complete Setup & Launch</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
