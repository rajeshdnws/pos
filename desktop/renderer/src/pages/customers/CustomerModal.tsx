import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Phone,
  Mail,
  MapPin,
  Building,
  CreditCard,
  Sparkles,
  Save,
  AlertCircle,
  ShieldCheck,
} from 'lucide-react';
import { Customer, CustomerCreateDTO, CustomerUpdateDTO } from '@rs-inventory/types';
import { useNotificationStore } from '../../store/notificationStore';

interface CustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingCustomer?: Customer | null;
}

const INDIAN_STATES = [
  'Andaman and Nicobar Islands',
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chandigarh',
  'Chhattisgarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jammu and Kashmir',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Ladakh',
  'Lakshadweep',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Puducherry',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
];

export const CustomerModal: React.FC<CustomerModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  editingCustomer,
}) => {
  const { notify } = useNotificationStore();
  const [loading, setLoading] = useState(false);
  const [generatingCode, setGeneratingCode] = useState(false);

  // Form State
  const [customerCode, setCustomerCode] = useState('');
  const [name, setName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [alternatePhone, setAlternatePhone] = useState('');
  const [email, setEmail] = useState('');
  const [customerType, setCustomerType] = useState<'INDIVIDUAL' | 'RETAIL' | 'WHOLESALE' | 'CORPORATE'>('INDIVIDUAL');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('Delhi');
  const [pinCode, setPinCode] = useState('');
  const [country, setCountry] = useState('India');
  const [gstin, setGstin] = useState('');
  const [registrationType, setRegistrationType] = useState('UNREGISTERED');
  const [openingBalance, setOpeningBalance] = useState<number>(0);
  const [openingBalanceType, setOpeningBalanceType] = useState<'RECEIVABLE' | 'PAYABLE'>('RECEIVABLE');
  const [openingBalanceDate, setOpeningBalanceDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [creditLimit, setCreditLimit] = useState<number>(0);
  const [creditPeriodDays, setCreditPeriodDays] = useState<number>(0);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (editingCustomer) {
        setCustomerCode(editingCustomer.customerCode);
        setName(editingCustomer.name);
        setContactPerson(editingCustomer.contactPerson || '');
        setPhone(editingCustomer.phone || '');
        setAlternatePhone(editingCustomer.alternatePhone || '');
        setEmail(editingCustomer.email || '');
        setCustomerType((editingCustomer.customerType as any) || 'INDIVIDUAL');
        setAddressLine1(editingCustomer.addressLine1 || '');
        setAddressLine2(editingCustomer.addressLine2 || '');
        setCity(editingCustomer.city || '');
        setState(editingCustomer.state || 'Delhi');
        setPinCode(editingCustomer.pinCode || '');
        setCountry(editingCustomer.country || 'India');
        setGstin(editingCustomer.gstin || '');
        setRegistrationType(editingCustomer.registrationType || 'UNREGISTERED');
        setOpeningBalance(editingCustomer.openingBalance || 0);
        setOpeningBalanceType((editingCustomer.openingBalanceType as any) || 'RECEIVABLE');
        setOpeningBalanceDate(
          editingCustomer.openingBalanceDate
            ? new Date(editingCustomer.openingBalanceDate).toISOString().split('T')[0]
            : new Date().toISOString().split('T')[0],
        );
        setCreditLimit(editingCustomer.creditLimit || 0);
        setCreditPeriodDays(editingCustomer.creditPeriodDays || 0);
        setNotes(editingCustomer.notes || '');
      } else {
        resetForm();
        handleGenerateCode();
      }
    }
  }, [isOpen, editingCustomer]);

  const resetForm = () => {
    setCustomerCode('');
    setName('');
    setContactPerson('');
    setPhone('');
    setAlternatePhone('');
    setEmail('');
    setCustomerType('INDIVIDUAL');
    setAddressLine1('');
    setAddressLine2('');
    setCity('');
    setState('Delhi');
    setPinCode('');
    setCountry('India');
    setGstin('');
    setRegistrationType('UNREGISTERED');
    setOpeningBalance(0);
    setOpeningBalanceType('RECEIVABLE');
    setOpeningBalanceDate(new Date().toISOString().split('T')[0]);
    setCreditLimit(0);
    setCreditPeriodDays(0);
    setNotes('');
  };

  const handleGenerateCode = async () => {
    setGeneratingCode(true);
    try {
      const res = await window.rsInventory.generateCustomerCode();
      if (res.success && res.data) {
        setCustomerCode(res.data);
      }
    } catch {
      // ignore
    } finally {
      setGeneratingCode(false);
    }
  };

  const isGstinValid = (val: string) => {
    if (!val) return true;
    return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(val.toUpperCase());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      notify('error', 'Customer name is required');
      return;
    }

    if (gstin.trim() && !isGstinValid(gstin.trim())) {
      notify('error', 'Invalid GSTIN format (e.g. 07AAAAA0000A1Z5)');
      return;
    }

    setLoading(true);
    try {
      if (editingCustomer) {
        const updateDto: CustomerUpdateDTO = {
          name: name.trim(),
          contactPerson: contactPerson.trim() || undefined,
          phone: phone.trim() || undefined,
          alternatePhone: alternatePhone.trim() || undefined,
          email: email.trim() || undefined,
          customerType,
          addressLine1: addressLine1.trim() || undefined,
          addressLine2: addressLine2.trim() || undefined,
          city: city.trim() || undefined,
          state: state.trim() || undefined,
          pinCode: pinCode.trim() || undefined,
          country: country.trim() || undefined,
          gstin: gstin.trim().toUpperCase() || undefined,
          registrationType,
          creditLimit: Number(creditLimit) || 0,
          creditPeriodDays: Number(creditPeriodDays) || 0,
          notes: notes.trim() || undefined,
        };

        const res = await window.rsInventory.updateCustomer(editingCustomer.id, updateDto);
        if (res.success) {
          notify('success', 'Customer updated successfully');
          onSuccess();
          onClose();
        } else {
          notify('error', res.error?.message || 'Failed to update customer');
        }
      } else {
        const createDto: CustomerCreateDTO = {
          customerCode: customerCode.trim() || undefined,
          name: name.trim(),
          contactPerson: contactPerson.trim() || undefined,
          phone: phone.trim() || undefined,
          alternatePhone: alternatePhone.trim() || undefined,
          email: email.trim() || undefined,
          customerType,
          addressLine1: addressLine1.trim() || undefined,
          addressLine2: addressLine2.trim() || undefined,
          city: city.trim() || undefined,
          state: state.trim() || undefined,
          pinCode: pinCode.trim() || undefined,
          country: country.trim() || 'India',
          gstin: gstin.trim().toUpperCase() || undefined,
          registrationType,
          openingBalance: Number(openingBalance) || 0,
          openingBalanceType,
          openingBalanceDate: openingBalanceDate ? new Date(openingBalanceDate).toISOString() : undefined,
          creditLimit: Number(creditLimit) || 0,
          creditPeriodDays: Number(creditPeriodDays) || 0,
          notes: notes.trim() || undefined,
        };

        const res = await window.rsInventory.createCustomer(createDto);
        if (res.success) {
          notify('success', 'Customer created successfully');
          onSuccess();
          onClose();
        } else {
          notify('error', res.error?.message || 'Failed to create customer');
        }
      }
    } catch (err: any) {
      notify('error', err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-surface-900 border border-surface-700/80 rounded-2xl shadow-2xl my-8 overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-surface-800 flex items-center justify-between bg-surface-950/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-brand-500/10 border border-brand-500/20 text-brand-400">
              <User className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">
                {editingCustomer ? 'Edit Customer Profile' : 'Add New Customer'}
              </h2>
              <p className="text-xs text-slate-400">
                {editingCustomer
                  ? `Editing account: ${editingCustomer.customerCode}`
                  : 'Register a new customer profile, khata balance & credit limit'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-surface-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Section 1: Basic Identity */}
          <div className="space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-brand-400 flex items-center gap-1.5">
              <User className="h-3.5 w-3.5" />
              <span>Identity & Account Info</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Customer Code
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customerCode}
                    onChange={(e) => setCustomerCode(e.target.value.toUpperCase())}
                    placeholder="CUST-0001"
                    disabled={!!editingCustomer}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-surface-950 border border-surface-700 text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 disabled:opacity-60 uppercase"
                  />
                  {!editingCustomer && (
                    <button
                      type="button"
                      onClick={handleGenerateCode}
                      disabled={generatingCode}
                      title="Generate Next Code"
                      className="px-2.5 py-2 rounded-xl bg-surface-800 hover:bg-surface-700 text-slate-300 border border-surface-700 transition-colors"
                    >
                      <Sparkles className={`h-4 w-4 ${generatingCode ? 'animate-spin text-brand-400' : ''}`} />
                    </button>
                  )}
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Customer Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Ramesh Kumar / Sharma Traders"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-surface-950 border border-surface-700 text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Customer Type
                </label>
                <select
                  value={customerType}
                  onChange={(e) => setCustomerType(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-surface-950 border border-surface-700 text-white focus:outline-none focus:border-brand-500"
                >
                  <option value="INDIVIDUAL">Individual / Walk-in</option>
                  <option value="RETAIL">Retail Regular</option>
                  <option value="WHOLESALE">Wholesale Client</option>
                  <option value="CORPORATE">Corporate / B2B</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Contact Person
                </label>
                <input
                  type="text"
                  value={contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)}
                  placeholder="Contact person name"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-surface-950 border border-surface-700 text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="9876543210"
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-surface-950 border border-surface-700 text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Alternate Phone
                </label>
                <input
                  type="tel"
                  value={alternatePhone}
                  onChange={(e) => setAlternatePhone(e.target.value)}
                  placeholder="Optional alternate phone"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-surface-950 border border-surface-700 text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="customer@example.com"
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-surface-950 border border-surface-700 text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: GST & Tax Info */}
          <div className="space-y-4 pt-4 border-t border-surface-800/80">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-brand-400 flex items-center gap-1.5">
              <Building className="h-3.5 w-3.5" />
              <span>GST & Taxation</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  GST Registration Type
                </label>
                <select
                  value={registrationType}
                  onChange={(e) => setRegistrationType(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-surface-950 border border-surface-700 text-white focus:outline-none focus:border-brand-500"
                >
                  <option value="UNREGISTERED">Unregistered / Consumer</option>
                  <option value="REGULAR">Regular GST Registered</option>
                  <option value="COMPOSITION">Composition Scheme</option>
                  <option value="CONSUMER">Consumer</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  GSTIN (15 Digits)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    maxLength={15}
                    value={gstin}
                    onChange={(e) => setGstin(e.target.value.toUpperCase())}
                    placeholder="e.g. 07AAAAA0000A1Z5"
                    className={`w-full px-3 py-2 text-xs rounded-xl bg-surface-950 border text-white uppercase placeholder-slate-500 focus:outline-none ${
                      gstin && !isGstinValid(gstin)
                        ? 'border-rose-500 focus:border-rose-500'
                        : gstin && isGstinValid(gstin)
                        ? 'border-emerald-500 focus:border-emerald-500'
                        : 'border-surface-700 focus:border-brand-500'
                    }`}
                  />
                  {gstin && isGstinValid(gstin) && (
                    <span className="absolute right-3 top-2.5 text-[10px] font-semibold text-emerald-400 flex items-center gap-1">
                      <ShieldCheck className="h-3.5 w-3.5" /> Valid Format
                    </span>
                  )}
                  {gstin && !isGstinValid(gstin) && (
                    <span className="absolute right-3 top-2.5 text-[10px] font-semibold text-rose-400 flex items-center gap-1">
                      <AlertCircle className="h-3.5 w-3.5" /> Invalid Format
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Address Details */}
          <div className="space-y-4 pt-4 border-t border-surface-800/80">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-brand-400 flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" />
              <span>Billing Address</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Address Line 1
                </label>
                <input
                  type="text"
                  value={addressLine1}
                  onChange={(e) => setAddressLine1(e.target.value)}
                  placeholder="Street / Shop / Building number"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-surface-950 border border-surface-700 text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Address Line 2
                </label>
                <input
                  type="text"
                  value={addressLine2}
                  onChange={(e) => setAddressLine2(e.target.value)}
                  placeholder="Area / Landmark"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-surface-950 border border-surface-700 text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  City
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="City"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-surface-950 border border-surface-700 text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  State
                </label>
                <select
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-surface-950 border border-surface-700 text-white focus:outline-none focus:border-brand-500"
                >
                  {INDIAN_STATES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  PIN Code
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={pinCode}
                  onChange={(e) => setPinCode(e.target.value)}
                  placeholder="110001"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-surface-950 border border-surface-700 text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Credit & Opening Balance */}
          <div className="space-y-4 pt-4 border-t border-surface-800/80">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-brand-400 flex items-center gap-1.5">
              <CreditCard className="h-3.5 w-3.5" />
              <span>Credit Policy & Opening Balance</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Credit Limit (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={creditLimit}
                  onChange={(e) => setCreditLimit(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-surface-950 border border-surface-700 text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
                />
                <span className="text-[10px] text-slate-500">0 = Unlimited credit</span>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Credit Period (Days)
                </label>
                <input
                  type="number"
                  min="0"
                  value={creditPeriodDays}
                  onChange={(e) => setCreditPeriodDays(parseInt(e.target.value) || 0)}
                  placeholder="0"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-surface-950 border border-surface-700 text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
                />
                <span className="text-[10px] text-slate-500">Grace payment period</span>
              </div>

              {!editingCustomer && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Opening Balance (₹)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={openingBalance}
                      onChange={(e) => setOpeningBalance(parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      className="w-full px-3 py-2 text-xs rounded-xl bg-surface-950 border border-surface-700 text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Balance Type
                    </label>
                    <select
                      value={openingBalanceType}
                      onChange={(e) => setOpeningBalanceType(e.target.value as any)}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-surface-950 border border-surface-700 text-white focus:outline-none focus:border-brand-500"
                    >
                      <option value="RECEIVABLE">Receivable (Customer owes you)</option>
                      <option value="PAYABLE">Payable (You owe customer / Advance)</option>
                    </select>
                  </div>
                </>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Internal Remarks / Notes
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional customer notes, preferences or billing guidelines..."
                className="w-full px-3 py-2 text-xs rounded-xl bg-surface-950 border border-surface-700 text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          {/* Modal Footer */}
          <div className="pt-4 border-t border-surface-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-surface-800 hover:bg-surface-700 text-slate-300 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-xs font-semibold rounded-xl bg-brand-600 hover:bg-brand-500 text-white flex items-center gap-2 shadow-lg shadow-brand-600/20 disabled:opacity-50 transition-all"
            >
              <Save className="h-4 w-4" />
              <span>{loading ? 'Saving...' : editingCustomer ? 'Update Customer' : 'Create Customer'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
