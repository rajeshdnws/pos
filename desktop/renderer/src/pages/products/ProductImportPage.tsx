import React, { useState } from 'react';
import {
  Download,
  FileSpreadsheet,
  Package,
  Layers,
  Ruler,
  Tag,
  Boxes,
  CheckCircle2,
  HelpCircle,
  FileText,
  Upload,
} from 'lucide-react';

interface SampleTemplate {
  id: string;
  name: string;
  section: string;
  icon: React.ReactNode;
  fileName: string;
  description: string;
  headers: string[];
  sampleRows: (string | number)[][];
}

const TEMPLATES: SampleTemplate[] = [
  {
    id: 'products',
    name: 'Products & Catalog Master',
    section: 'Products',
    icon: <Package className="h-5 w-5 text-indigo-400" />,
    fileName: 'products_sample_template.csv',
    description: 'Complete catalog with pricing, barcodes, HSN, categories, brands, units, and tax rates.',
    headers: [
      'Item Name',
      'Short Name',
      'Category',
      'Brand',
      'Unit',
      'SKU',
      'Barcode',
      'HSN Code',
      'Product Type',
      'Purchase Price',
      'Selling Price',
      'MRP',
      'Tax Rate (%)',
      'Minimum Stock',
      'Maximum Stock',
      'Opening Stock',
      'Opening Stock Rate',
      'Track Stock',
      'Description',
    ],
    sampleRows: [
      [
        'Amul Butter 500g',
        'Amul Butter',
        'Dairy & Bakery',
        'Amul',
        'PCS',
        'PROD-000001',
        '8901262010052',
        '04051000',
        'PHYSICAL',
        240.0,
        275.0,
        275.0,
        12,
        10,
        100,
        25,
        240.0,
        'TRUE',
        'Pasteurized table butter',
      ],
      [
        'Tata Salt 1kg',
        'Tata Salt',
        'Grocery & Staples',
        'Tata',
        'PKT',
        'PROD-000002',
        '8904004400115',
        '25010010',
        'PHYSICAL',
        22.0,
        28.0,
        28.0,
        0,
        20,
        200,
        50,
        22.0,
        'TRUE',
        'Vacuum evaporated iodized salt',
      ],
      [
        'Basmati Rice Premium',
        'Basmati Rice',
        'Grains & Rice',
        'India Gate',
        'KG',
        'PROD-000003',
        '8901392001112',
        '10063020',
        'PHYSICAL',
        95.0,
        130.0,
        140.0,
        5,
        50,
        500,
        100.5,
        95.0,
        'TRUE',
        'Aged long grain aromatic basmati',
      ],
    ],
  },
  {
    id: 'categories',
    name: 'Categories Master',
    section: 'Categories',
    icon: <Layers className="h-5 w-5 text-emerald-400" />,
    fileName: 'categories_sample_template.csv',
    description: 'Category hierarchy for organizing catalog items and department sales reporting.',
    headers: ['Category Name', 'Description', 'Active (TRUE/FALSE)'],
    sampleRows: [
      ['Dairy & Bakery', 'Milk, butter, bread, cheeses, and baked goods', 'TRUE'],
      ['Grocery & Staples', 'Cooking oils, spices, flours, grains, and sugar', 'TRUE'],
      ['Beverages & Cold Drinks', 'Mineral water, sodas, juices, and health drinks', 'TRUE'],
      ['Personal Care & Hygiene', 'Soaps, shampoos, detergents, oral care', 'TRUE'],
      ['Snacks & Confectionery', 'Biscuits, chocolates, chips, and namkeen', 'TRUE'],
    ],
  },
  {
    id: 'units',
    name: 'Units of Measure',
    section: 'Units',
    icon: <Ruler className="h-5 w-5 text-amber-400" />,
    fileName: 'units_sample_template.csv',
    description: 'Standard measurement units and decimal quantity allowances.',
    headers: ['Unit Name', 'Symbol / Short Code', 'Allow Decimals (TRUE/FALSE)', 'Active (TRUE/FALSE)'],
    sampleRows: [
      ['Pieces', 'PCS', 'FALSE', 'TRUE'],
      ['Kilogram', 'KG', 'TRUE', 'TRUE'],
      ['Gram', 'G', 'TRUE', 'TRUE'],
      ['Litre', 'LTR', 'TRUE', 'TRUE'],
      ['Millilitre', 'ML', 'TRUE', 'TRUE'],
      ['Meter', 'MTR', 'TRUE', 'TRUE'],
      ['Packet', 'PKT', 'FALSE', 'TRUE'],
      ['Box', 'BOX', 'FALSE', 'TRUE'],
      ['Dozen', 'DOZ', 'FALSE', 'TRUE'],
    ],
  },
  {
    id: 'brands',
    name: 'Manufacturer Brands',
    section: 'Brands',
    icon: <Tag className="h-5 w-5 text-violet-400" />,
    fileName: 'brands_sample_template.csv',
    description: 'Brand and company classifications for products.',
    headers: ['Brand Name', 'Description', 'Active (TRUE/FALSE)'],
    sampleRows: [
      ['Amul', 'Gujarat Cooperative Milk Marketing Federation', 'TRUE'],
      ['Tata', 'Tata Consumer Products Limited', 'TRUE'],
      ['Nestle', 'Nestle India Food & Beverage Manufacturer', 'TRUE'],
      ['Britannia', 'Britannia Industries Bakery & Dairy', 'TRUE'],
      ['HUL', 'Hindustan Unilever Limited Consumer Goods', 'TRUE'],
      ['Cadbury', 'Mondelez International Chocolates', 'TRUE'],
    ],
  },
  {
    id: 'opening_stock',
    name: 'Opening Stock Balances',
    section: 'Opening Stock',
    icon: <Boxes className="h-5 w-5 text-cyan-400" />,
    fileName: 'opening_stock_sample_template.csv',
    description: 'Quick opening inventory balances setup for existing products.',
    headers: ['SKU / Barcode', 'Item Name', 'Quantity', 'Cost Rate per Unit (₹)', 'Storage Location'],
    sampleRows: [
      ['PROD-000001', 'Amul Butter 500g', 25, 240.0, 'Main Refrigerator #1'],
      ['PROD-000002', 'Tata Salt 1kg', 50, 22.0, 'Aisle 3 Rack B'],
      ['PROD-000003', 'Basmati Rice Premium', 100.5, 95.0, 'Godown Storage Shelf A'],
    ],
  },
];

export const ProductImportPage: React.FC = () => {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('products');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<'templates' | 'import'>('templates');

  const currentTemplate = TEMPLATES.find((t) => t.id === selectedTemplateId) || TEMPLATES[0];

  // Helper to generate and trigger client-side CSV download
  const downloadCsv = (template: SampleTemplate) => {
    const csvRows = [
      template.headers.map((h) => `"${h.replace(/"/g, '""')}"`).join(','),
      ...template.sampleRows.map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
      ),
    ];

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + encodeURIComponent(csvRows.join('\r\n'));
    const link = document.createElement('a');
    link.setAttribute('href', csvContent);
    link.setAttribute('download', template.fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
      setMessage(null);
    }
  };

  const handleUpload = () => {
    if (!selectedFile) return;
    setMessage(`File "${selectedFile.name}" validated successfully for ${currentTemplate.name}. Ready for Step 4 import execution.`);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-surface-900/70 p-6 rounded-2xl border border-surface-800 shadow-xl space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
              <FileSpreadsheet className="h-6 w-6 text-brand-400" />
              <span>Bulk Master Import & CSV Templates</span>
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Download pre-formatted sample CSV templates for each section or upload bulk files to quickly seed your inventory catalog.
            </p>
          </div>

          {/* Quick toggle between Templates and Upload */}
          <div className="flex bg-surface-950 p-1 rounded-xl border border-surface-800 text-xs font-semibold">
            <button
              onClick={() => setActiveSection('templates')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-colors ${
                activeSection === 'templates'
                  ? 'bg-brand-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Download className="h-3.5 w-3.5" />
              <span>Sample Templates</span>
            </button>
            <button
              onClick={() => setActiveSection('import')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-colors ${
                activeSection === 'import'
                  ? 'bg-brand-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Upload className="h-3.5 w-3.5" />
              <span>Upload & Import</span>
            </button>
          </div>
        </div>
      </div>

      {/* Section Selection Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {TEMPLATES.map((tmpl) => {
          const isSelected = tmpl.id === selectedTemplateId;
          return (
            <button
              key={tmpl.id}
              onClick={() => setSelectedTemplateId(tmpl.id)}
              className={`p-4 rounded-xl border text-left transition-all relative overflow-hidden flex flex-col justify-between group ${
                isSelected
                  ? 'bg-brand-500/10 border-brand-500/50 shadow-lg shadow-brand-500/10'
                  : 'bg-surface-900/50 border-surface-800 hover:border-surface-700 hover:bg-surface-900/80'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 rounded-lg bg-surface-950 border border-surface-800 group-hover:scale-105 transition-transform">
                    {tmpl.icon}
                  </div>
                  {isSelected && (
                    <span className="h-2 w-2 rounded-full bg-brand-400 ring-4 ring-brand-400/20" />
                  )}
                </div>
                <div className="text-xs font-bold text-white tracking-wide">{tmpl.name}</div>
                <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">{tmpl.description}</p>
              </div>

              <div className="mt-3 pt-2 border-t border-surface-800/80 flex items-center justify-between text-[10px]">
                <span className="text-slate-500">{tmpl.headers.length} Columns</span>
                <span className="text-brand-400 font-semibold group-hover:underline flex items-center gap-0.5">
                  <span>View</span>
                  <span>→</span>
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Main Content Area */}
      {activeSection === 'templates' ? (
        <div className="bg-surface-900/60 p-6 rounded-2xl border border-surface-800 shadow-xl space-y-6">
          {/* Selected Template Details & Download Action */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-5 border-b border-surface-800">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-surface-950 rounded-xl border border-surface-800">
                {currentTemplate.icon}
              </div>
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>{currentTemplate.name} Sample CSV</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-400 border border-brand-500/20 font-mono">
                    {currentTemplate.fileName}
                  </span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">{currentTemplate.description}</p>
              </div>
            </div>

            <button
              onClick={() => downloadCsv(currentTemplate)}
              className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-brand-600/25 transition-all hover:scale-[1.02] active:scale-[0.98] shrink-0"
            >
              <Download className="h-4 w-4" />
              <span>Download {currentTemplate.section} CSV</span>
            </button>
          </div>

          {/* Guidelines Box */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div className="p-3.5 bg-surface-950/60 rounded-xl border border-surface-800 flex items-start gap-2.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-slate-200">UTF-8 Encoded</span>
                <p className="text-slate-400 text-[11px] mt-0.5">Compatible with Excel, Google Sheets, LibreOffice, and CSV editors.</p>
              </div>
            </div>
            <div className="p-3.5 bg-surface-950/60 rounded-xl border border-surface-800 flex items-start gap-2.5">
              <FileText className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-slate-200">Header Retention</span>
                <p className="text-slate-400 text-[11px] mt-0.5">Do not rename or remove the top header row for automated mapping.</p>
              </div>
            </div>
            <div className="p-3.5 bg-surface-950/60 rounded-xl border border-surface-800 flex items-start gap-2.5">
              <HelpCircle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-slate-200">Optional Fields</span>
                <p className="text-slate-400 text-[11px] mt-0.5">Leave optional columns blank to auto-generate default values.</p>
              </div>
            </div>
          </div>

          {/* Preview Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-semibold text-slate-300">Data Schema & Preview ({currentTemplate.headers.length} Columns):</span>
              <span className="text-[11px] text-slate-500">Showing sample format</span>
            </div>

            <div className="border border-surface-800 rounded-xl overflow-x-auto bg-surface-950/80">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="bg-surface-950 text-slate-400 uppercase font-semibold text-[11px] border-b border-surface-800">
                  <tr>
                    <th className="px-3.5 py-2.5 text-slate-500 w-10">#</th>
                    {currentTemplate.headers.map((h, i) => (
                      <th key={i} className="px-3.5 py-2.5 text-slate-300">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-800/60 text-slate-300">
                  {currentTemplate.sampleRows.map((row, rIdx) => (
                    <tr key={rIdx} className="hover:bg-surface-900/40">
                      <td className="px-3.5 py-2.5 text-slate-500 font-mono text-[11px]">{rIdx + 1}</td>
                      {row.map((cell, cIdx) => (
                        <td key={cIdx} className="px-3.5 py-2.5 font-mono text-[11px] text-slate-200">
                          {String(cell)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Quick Action to Download All Templates */}
          <div className="pt-4 border-t border-surface-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <span className="text-slate-400">Need all templates at once for initial system setup?</span>
            <div className="flex items-center gap-2">
              {TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => downloadCsv(t)}
                  className="px-3 py-1.5 bg-surface-800 hover:bg-surface-700 text-slate-300 rounded-lg border border-surface-700 text-[11px] font-medium transition-colors"
                >
                  ↓ {t.section}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* Upload Area */
        <div className="bg-surface-900/60 p-6 rounded-2xl border border-surface-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-surface-800">
            <div>
              <h3 className="text-sm font-bold text-white">Upload File for {currentTemplate.name}</h3>
              <p className="text-xs text-slate-400">Select a formatted CSV or Excel file matching the template schema.</p>
            </div>
            <button
              onClick={() => downloadCsv(currentTemplate)}
              className="text-xs text-brand-400 hover:underline flex items-center gap-1 font-medium"
            >
              <Download className="h-3 w-3" />
              <span>Download sample template first</span>
            </button>
          </div>

          <div className="border-2 border-dashed border-surface-700 hover:border-brand-500/60 transition-colors p-10 rounded-2xl text-center space-y-4 bg-surface-950/40">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400 text-2xl">
              📂
            </div>
            <div>
              <label className="cursor-pointer">
                <span className="inline-block px-5 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-semibold transition-colors shadow-lg shadow-brand-600/25">
                  Choose CSV / Excel File
                </span>
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
              <p className="text-xs text-slate-500 mt-2">
                {selectedFile
                  ? `Selected: ${selectedFile.name} (${(selectedFile.size / 1024).toFixed(1)} KB)`
                  : 'Supports .CSV and .XLSX files up to 10MB'}
              </p>
            </div>

            {selectedFile && (
              <div className="pt-2">
                <button
                  onClick={handleUpload}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-600/25 transition-all"
                >
                  Validate & Stage for Import
                </button>
              </div>
            )}

            {message && (
              <div className="mt-4 p-3.5 bg-brand-500/10 border border-brand-500/30 text-brand-300 rounded-xl text-xs max-w-lg mx-auto flex items-center gap-2 text-left">
                <CheckCircle2 className="h-4 w-4 text-brand-400 shrink-0" />
                <span>{message}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
