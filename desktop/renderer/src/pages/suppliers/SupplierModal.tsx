import React, { useState, useEffect } from 'react';
import {
  X,
  Truck,
  Building2,
  Phone,
  MapPin,
  FileText,
  CreditCard,
  IndianRupee,
  AlertCircle,
  Save,
} from 'lucide-react';
import { Supplier, CreateSupplierDTO, UpdateSupplierDTO, OpeningBalanceType } from '@rs-inventory/types';
import { useNotificationStore } from '../../store/notificationStore';

interface SupplierModalProps {
  isOpen: boolean;
  onClose: () => void;
  supplier?: Supplier | null;
  onSaved: (supplier: Supplier) => void;
}

const INDIAN_STATES = [
  { code: '01', name: 'Jammu and Kashmir' },
  { code: '02', name: 'Himachal Pradesh' },
  { code: '03', name: 'Punjab' },
  { code: '04', name: 'Chandigarh' },
  { code: '05', name: 'Uttarakhand' },
  { code: '06', name: 'Haryana' },
  { code: '07', name: 'Delhi' },
  { code: '08', name: 'Rajasthan' },
  { code: '09', name: 'Uttar Pradesh' },
  { code: '10', name: 'Bihar' },
  { code: '11', name: 'Sikkim' },
  { code: '12', name: 'Arunachal Pradesh' },
  { code: '13', name: 'Nagaland' },
  { code: '14', name: 'Manipur' },
  { code: '15', name: 'Mizoram' },
  { code: '16', name: 'Tripura' },
  { code: '17', name: 'Meghalaya' },
  { code: '18', name: 'Assam' },
  { code: '19', name: 'West Bengal' },
  { code: '20', name: 'Jharkhand' },
  { code: '21', name: 'Odisha' },
  { code: '22', name: 'Chhattisgarh' },
  { code: '23', name: 'Madhya Pradesh' },
  { code: '24', name: 'Gujarat' },
  { code: '27', name: 'Maharashtra' },
  { code: '29', name: 'Karnataka' },
  { code: '30', name: 'Goa' },
  { code: '32', name: 'Kerala' },
  { code: '33', name: 'Tamil Nadu' },
  { code: '36', name: 'Telangana' },
  { code: '37', name: 'Andhra Pradesh' },
];

export const SupplierModal: React.FC<SupplierModalProps> = ({
  isOpen,
  onClose,
  supplier,
  onSaved,
}) => {
  const { notify } = useNotificationStore();
  const isEditing = Boolean(supplier);

  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [altPhone, setAltPhone] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [stateCode, setStateCode] = useState('');
  const [pincode, setPincode] = useState('');
  const [gstin, setGstin] = useState('');
  const [pan, setPan] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankBranch, setBankBranch] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [creditPeriodDays, setCreditPeriodDays] = useState<number | ''>('');
  const [creditLimit, setCreditLimit] = useState<number | ''>('');
  const [openingBalance, setOpeningBalance] = useState<number>(0);
  const [openingBalanceType, setOpeningBalanceType] = useState<OpeningBalanceType>('PAYABLE');
  const [notes, setNotes] = useState('');
  const [isActive, setIsActive] = useState(true);

  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      if (supplier) {
        setCode(supplier.supplierCode || supplier.code || '');
        setName(supplier.name || '');
        setCompanyName(supplier.companyName || '');
        setContactPerson(supplier.contactPerson || '');
        setEmail(supplier.email || '');
        setPhone(supplier.phone || '');
        setAltPhone(supplier.alternatePhone || supplier.altPhone || '');
        setAddressLine1(supplier.addressLine1 || '');
        setAddressLine2(supplier.addressLine2 || '');
        setCity(supplier.city || '');
        setState(supplier.state || '');
        setStateCode(supplier.stateCode || '');
        setPincode(supplier.pinCode || supplier.pincode || '');
        setGstin(supplier.gstin || '');
        setPan(supplier.pan || '');
        setBankName(supplier.bankName || '');
        setBankBranch(supplier.bankBranch || '');
        setAccountNumber(supplier.accountNumber || '');
        setIfscCode(supplier.ifscCode || '');
        setCreditPeriodDays(supplier.creditPeriodDays ?? '');
        setCreditLimit(supplier.creditLimit ?? '');
        setOpeningBalance(supplier.openingBalance || 0);
        setOpeningBalanceType((supplier.openingBalanceType as OpeningBalanceType) || 'PAYABLE');
        setNotes(supplier.notes || '');
        setIsActive(supplier.isActive ?? true);
      } else {
        // Reset for new supplier
        setCode('');
        setName('');
        setCompanyName('');
        setContactPerson('');
        setEmail('');
        setPhone('');
        setAltPhone('');
        setAddressLine1('');
        setAddressLine2('');
        setCity('');
        setState('');
        setStateCode('');
        setPincode('');
        setGstin('');
        setPan('');
        setBankName('');
        setBankBranch('');
        setAccountNumber('');
        setIfscCode('');
        setCreditPeriodDays('');
        setCreditLimit('');
        setOpeningBalance(0);
        setOpeningBalanceType('PAYABLE');
        setNotes('');
        setIsActive(true);
      }
      setErrors({});
    }
  }, [isOpen, supplier]);

  // When state changes, auto populate state code
  const handleStateChange = (stateName: string) => {
    setState(stateName);
    const matched = INDIAN_STATES.find((s) => s.name.toLowerCase() === stateName.toLowerCase());
    if (matched) {
      setStateCode(matched.code);
    }
  };

  // When GSTIN changes, extract state code & PAN
  const handleGstinChange = (val: string) => {
    const clean = val.toUpperCase().trim();
    setGstin(clean);
    if (clean.length >= 2) {
      const codePart = clean.substring(0, 2);
      const matched = INDIAN_STATES.find((s) => s.code === codePart);
      if (matched && !state) {
        setState(matched.name);
        setStateCode(matched.code);
      }
    }
    if (clean.length >= 12) {
      const panPart = clean.substring(2, 12);
      if (/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(panPart)) {
        setPan(panPart);
      }
    }
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!name.trim()) {
      errs.name = 'Supplier Name is required';
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errs.email = 'Invalid email address format';
    }
    if (phone && phone.trim().length < 7) {
      errs.phone = 'Phone number must be at least 7 digits';
    }
    if (gstin && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(gstin)) {
      errs.gstin = 'Invalid GSTIN format (e.g. 27ABCDE1234F1Z5)';
    }
    if (pan && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan)) {
      errs.pan = 'Invalid PAN format (e.g. ABCDE1234F)';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    try {
      if (isEditing && supplier) {
        const dto: UpdateSupplierDTO = {
          name: name.trim(),
          contactPerson: contactPerson.trim() || undefined,
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
          alternatePhone: altPhone.trim() || undefined,
          addressLine1: addressLine1.trim() || undefined,
          addressLine2: addressLine2.trim() || undefined,
          city: city.trim() || undefined,
          state: state.trim() || undefined,
          pinCode: pincode.trim() || undefined,
          gstin: gstin.trim() || undefined,
          pan: pan.trim() || undefined,
          creditPeriodDays: creditPeriodDays !== '' ? Number(creditPeriodDays) : undefined,
          creditLimit: creditLimit !== '' ? Number(creditLimit) : undefined,
          notes: notes.trim() || undefined,
          isActive,
        };

        const res = await window.rsInventory.updateSupplier(supplier.id, dto);
        if (res.success && res.data) {
          notify('success', 'Supplier updated successfully');
          onSaved(res.data);
          onClose();
        } else {
          notify('error', res.error?.message || 'Failed to update supplier');
        }
      } else {
        const dto: CreateSupplierDTO = {
          supplierCode: code.trim() || undefined,
          name: name.trim(),
          contactPerson: contactPerson.trim() || undefined,
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
          alternatePhone: altPhone.trim() || undefined,
          addressLine1: addressLine1.trim() || undefined,
          addressLine2: addressLine2.trim() || undefined,
          city: city.trim() || undefined,
          state: state.trim() || undefined,
          pinCode: pincode.trim() || undefined,
          gstin: gstin.trim() || undefined,
          pan: pan.trim() || undefined,
          creditPeriodDays: creditPeriodDays !== '' ? Number(creditPeriodDays) : undefined,
          creditLimit: creditLimit !== '' ? Number(creditLimit) : undefined,
          openingBalance: Number(openingBalance) || 0,
          openingBalanceType,
          notes: notes.trim() || undefined,
          isActive,
        };

        const res = await window.rsInventory.createSupplier(dto);
        if (res.success && res.data) {
          notify('success', 'Supplier created successfully');
          onSaved(res.data);
          onClose();
        } else {
          notify('error', res.error?.message || 'Failed to create supplier');
        }
      }
    } catch (err: any) {
      notify('error', err.message || 'An unexpected error occurred');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-surface-900 border border-surface-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        {/* Header */}
        <div className="px-6 py-4 border-b border-surface-700/80 flex items-center justify-between bg-surface-950/50">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                {isEditing ? 'Edit Supplier' : 'Add New Supplier'}
              </h2>
              <p className="text-xs text-slate-400">
                {isEditing
                  ? `Update profile and banking details for ${supplier?.name}`
                  : 'Register vendor profile, tax info, and initial opening balance'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-surface-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* General Information Section */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              <span>General Information</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Supplier Code <span className="text-slate-500 text-[10px]">(Auto if empty)</span>
                </label>
                <input
                  type="text"
                  disabled={isEditing}
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="e.g. SUP-001"
                  className="w-full px-3 py-2 bg-surface-950 border border-surface-700 rounded-xl text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none disabled:opacity-50"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Supplier Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter business / vendor trade name"
                  className={`w-full px-3 py-2 bg-surface-950 border rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none ${
                    errors.name ? 'border-rose-500 focus:border-rose-500' : 'border-surface-700 focus:border-indigo-500'
                  }`}
                />
                {errors.name && <p className="text-[11px] text-rose-400 mt-1">{errors.name}</p>}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Company / Legal Name</label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Official entity name"
                  className="w-full px-3 py-2 bg-surface-950 border border-surface-700 rounded-xl text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Contact Person</label>
                <input
                  type="text"
                  value={contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)}
                  placeholder="Representative name"
                  className="w-full px-3 py-2 bg-surface-950 border border-surface-700 rounded-xl text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Active Status</label>
                <label className="relative flex items-center cursor-pointer mt-2">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-surface-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                  <span className="ml-3 text-xs font-medium text-slate-300">
                    {isActive ? 'Active Vendor' : 'Inactive (Archived)'}
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Contact Details */}
          <div className="space-y-4 pt-2 border-t border-surface-800/80">
            <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-2">
              <Phone className="h-4 w-4" />
              <span>Contact & Communication</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Primary Phone</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. 9876543210"
                  className={`w-full px-3 py-2 bg-surface-950 border rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none ${
                    errors.phone ? 'border-rose-500 focus:border-rose-500' : 'border-surface-700 focus:border-indigo-500'
                  }`}
                />
                {errors.phone && <p className="text-[11px] text-rose-400 mt-1">{errors.phone}</p>}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Alternate Phone</label>
                <input
                  type="text"
                  value={altPhone}
                  onChange={(e) => setAltPhone(e.target.value)}
                  placeholder="e.g. 022-28475932"
                  className="w-full px-3 py-2 bg-surface-950 border border-surface-700 rounded-xl text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="vendor@company.com"
                  className={`w-full px-3 py-2 bg-surface-950 border rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none ${
                    errors.email ? 'border-rose-500 focus:border-rose-500' : 'border-surface-700 focus:border-indigo-500'
                  }`}
                />
                {errors.email && <p className="text-[11px] text-rose-400 mt-1">{errors.email}</p>}
              </div>
            </div>
          </div>

          {/* Location & Address */}
          <div className="space-y-4 pt-2 border-t border-surface-800/80">
            <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              <span>Address & Tax Jurisdiction</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-slate-300 mb-1">Address Line 1</label>
                <input
                  type="text"
                  value={addressLine1}
                  onChange={(e) => setAddressLine1(e.target.value)}
                  placeholder="Building, Plot No, Street"
                  className="w-full px-3 py-2 bg-surface-950 border border-surface-700 rounded-xl text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-slate-300 mb-1">Address Line 2</label>
                <input
                  type="text"
                  value={addressLine2}
                  onChange={(e) => setAddressLine2(e.target.value)}
                  placeholder="Area, Landmark"
                  className="w-full px-3 py-2 bg-surface-950 border border-surface-700 rounded-xl text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">City</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="City / District"
                  className="w-full px-3 py-2 bg-surface-950 border border-surface-700 rounded-xl text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">State</label>
                <select
                  value={state}
                  onChange={(e) => handleStateChange(e.target.value)}
                  className="w-full px-3 py-2 bg-surface-950 border border-surface-700 rounded-xl text-xs text-white focus:border-indigo-500 focus:outline-none"
                >
                  <option value="">-- Select State --</option>
                  {INDIAN_STATES.map((s) => (
                    <option key={s.code} value={s.name}>
                      {s.code} - {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">State Code</label>
                <input
                  type="text"
                  value={stateCode}
                  onChange={(e) => setStateCode(e.target.value)}
                  placeholder="e.g. 27"
                  className="w-full px-3 py-2 bg-surface-950 border border-surface-700 rounded-xl text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">PIN / Postal Code</label>
                <input
                  type="text"
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value)}
                  placeholder="e.g. 400001"
                  className="w-full px-3 py-2 bg-surface-950 border border-surface-700 rounded-xl text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Tax & Identification */}
          <div className="space-y-4 pt-2 border-t border-surface-800/80">
            <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span>Tax & Business Compliance</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  GSTIN <span className="text-slate-500 text-[10px]">(15-digit)</span>
                </label>
                <input
                  type="text"
                  maxLength={15}
                  value={gstin}
                  onChange={(e) => handleGstinChange(e.target.value)}
                  placeholder="e.g. 27AAAAA0000A1Z5"
                  className={`w-full px-3 py-2 bg-surface-950 border rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none uppercase ${
                    errors.gstin ? 'border-rose-500 focus:border-rose-500' : 'border-surface-700 focus:border-indigo-500'
                  }`}
                />
                {errors.gstin && <p className="text-[11px] text-rose-400 mt-1">{errors.gstin}</p>}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  PAN <span className="text-slate-500 text-[10px]">(10-digit)</span>
                </label>
                <input
                  type="text"
                  maxLength={10}
                  value={pan}
                  onChange={(e) => setPan(e.target.value.toUpperCase().trim())}
                  placeholder="e.g. AAAAA0000A"
                  className={`w-full px-3 py-2 bg-surface-950 border rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none uppercase ${
                    errors.pan ? 'border-rose-500 focus:border-rose-500' : 'border-surface-700 focus:border-indigo-500'
                  }`}
                />
                {errors.pan && <p className="text-[11px] text-rose-400 mt-1">{errors.pan}</p>}
              </div>
            </div>
          </div>

          {/* Banking Details */}
          <div className="space-y-4 pt-2 border-t border-surface-800/80">
            <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              <span>Bank Account Details</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Bank Name</label>
                <input
                  type="text"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="e.g. HDFC Bank"
                  className="w-full px-3 py-2 bg-surface-950 border border-surface-700 rounded-xl text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Branch Name</label>
                <input
                  type="text"
                  value={bankBranch}
                  onChange={(e) => setBankBranch(e.target.value)}
                  placeholder="Branch location"
                  className="w-full px-3 py-2 bg-surface-950 border border-surface-700 rounded-xl text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Account Number</label>
                <input
                  type="text"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  placeholder="Account number"
                  className="w-full px-3 py-2 bg-surface-950 border border-surface-700 rounded-xl text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">IFSC Code</label>
                <input
                  type="text"
                  value={ifscCode}
                  onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
                  placeholder="e.g. HDFC0001234"
                  className="w-full px-3 py-2 bg-surface-950 border border-surface-700 rounded-xl text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none uppercase"
                />
              </div>
            </div>
          </div>

          {/* Credit Terms & Opening Balance */}
          <div className="space-y-4 pt-2 border-t border-surface-800/80">
            <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-2">
              <IndianRupee className="h-4 w-4" />
              <span>Credit Terms & Opening Balance</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Credit Period (Days)</label>
                <input
                  type="number"
                  min="0"
                  value={creditPeriodDays}
                  onChange={(e) => setCreditPeriodDays(e.target.value ? Number(e.target.value) : '')}
                  placeholder="e.g. 30"
                  className="w-full px-3 py-2 bg-surface-950 border border-surface-700 rounded-xl text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Credit Limit (₹)</label>
                <input
                  type="number"
                  min="0"
                  value={creditLimit}
                  onChange={(e) => setCreditLimit(e.target.value ? Number(e.target.value) : '')}
                  placeholder="e.g. 500000"
                  className="w-full px-3 py-2 bg-surface-950 border border-surface-700 rounded-xl text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Opening Balance (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  disabled={isEditing}
                  value={openingBalance}
                  onChange={(e) => setOpeningBalance(Number(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-surface-950 border border-surface-700 rounded-xl text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Balance Type</label>
                <select
                  disabled={isEditing}
                  value={openingBalanceType}
                  onChange={(e) => setOpeningBalanceType(e.target.value as OpeningBalanceType)}
                  className="w-full px-3 py-2 bg-surface-950 border border-surface-700 rounded-xl text-xs text-white focus:border-indigo-500 focus:outline-none disabled:opacity-50"
                >
                  <option value="PAYABLE">Payable (We owe supplier)</option>
                  <option value="ADVANCE">Advance (Supplier owes us)</option>
                </select>
              </div>
            </div>
            {isEditing && (
              <p className="text-[11px] text-slate-400 flex items-center gap-1.5 bg-surface-800/40 p-2.5 rounded-lg">
                <AlertCircle className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                <span>Opening balance cannot be modified directly after supplier registration. Use ledger adjustments or payment vouchers.</span>
              </p>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2 pt-2 border-t border-surface-800/80">
            <label className="block text-xs font-medium text-slate-300">Internal Notes / Payment Instructions</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any specific notes, vendor terms, or bank instructions..."
              className="w-full px-3 py-2 bg-surface-950 border border-surface-700 rounded-xl text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
            />
          </div>
        </form>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-surface-700/80 flex items-center justify-end gap-3 bg-surface-950/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white hover:bg-surface-800 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-xl shadow-lg shadow-indigo-600/20 transition-all"
          >
            <Save className="h-4 w-4" />
            <span>{saving ? 'Saving...' : isEditing ? 'Update Supplier' : 'Create Supplier'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
