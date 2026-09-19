import React, { useState } from 'react';
import { ProductsListPage } from './ProductsListPage';
import { CategoriesPage } from './CategoriesPage';
import { UnitsPage } from './UnitsPage';
import { BrandsPage } from './BrandsPage';
import { ProductImportPage } from './ProductImportPage';

type ProductTab = 'products' | 'categories' | 'units' | 'brands' | 'import';

export const ProductsIndexPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ProductTab>('products');

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Product Master</h1>
          <p className="text-sm text-slate-400 mt-1">
            Manage your catalog items, categories, measurement units, brands, and pricing rules.
          </p>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex border-b border-slate-800 space-x-2 overflow-x-auto pb-px">
        <button
          onClick={() => setActiveTab('products')}
          className={`px-4 py-2.5 text-sm font-semibold rounded-t-lg transition-colors border-b-2 whitespace-nowrap ${
            activeTab === 'products'
              ? 'border-indigo-500 text-indigo-400 bg-indigo-500/10'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          📦 Product Catalog
        </button>

        <button
          onClick={() => setActiveTab('categories')}
          className={`px-4 py-2.5 text-sm font-semibold rounded-t-lg transition-colors border-b-2 whitespace-nowrap ${
            activeTab === 'categories'
              ? 'border-indigo-500 text-indigo-400 bg-indigo-500/10'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          📂 Categories
        </button>

        <button
          onClick={() => setActiveTab('units')}
          className={`px-4 py-2.5 text-sm font-semibold rounded-t-lg transition-colors border-b-2 whitespace-nowrap ${
            activeTab === 'units'
              ? 'border-indigo-500 text-indigo-400 bg-indigo-500/10'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          ⚖️ Units of Measure
        </button>

        <button
          onClick={() => setActiveTab('brands')}
          className={`px-4 py-2.5 text-sm font-semibold rounded-t-lg transition-colors border-b-2 whitespace-nowrap ${
            activeTab === 'brands'
              ? 'border-indigo-500 text-indigo-400 bg-indigo-500/10'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          🏷️ Brands
        </button>

        <button
          onClick={() => setActiveTab('import')}
          className={`px-4 py-2.5 text-sm font-semibold rounded-t-lg transition-colors border-b-2 whitespace-nowrap ${
            activeTab === 'import'
              ? 'border-indigo-500 text-indigo-400 bg-indigo-500/10'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          📥 Bulk Import
        </button>
      </div>

      {/* Tab Panels */}
      <div>
        {activeTab === 'products' && <ProductsListPage />}
        {activeTab === 'categories' && <CategoriesPage />}
        {activeTab === 'units' && <UnitsPage />}
        {activeTab === 'brands' && <BrandsPage />}
        {activeTab === 'import' && <ProductImportPage />}
      </div>
    </div>
  );
};
