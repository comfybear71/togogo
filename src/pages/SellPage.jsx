import { useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Camera,
  Upload,
  X,
  Sparkles,
  DollarSign,
  Truck,
  Eye,
  Check,
  ChevronRight,
  ChevronLeft,
  Link as LinkIcon,
  MapPin,
  Calculator,
  Image as ImageIcon,
} from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { useCreateProduct } from '../hooks/useProducts';
import { useAuthStore } from '../stores/authStore';
import { CATEGORIES, CONDITIONS, SHIPPING_TYPES, PLATFORM_FEE_PERCENT } from '../lib/constants';
import { supabase } from '../lib/supabase';

const STEPS = [
  { num: 1, label: 'Photos', icon: Camera },
  { num: 2, label: 'Details', icon: Sparkles },
  { num: 3, label: 'Pricing', icon: DollarSign },
  { num: 4, label: 'Shipping', icon: Truck },
  { num: 5, label: 'Review', icon: Eye },
];

const MAX_IMAGES = 10;

export default function SellPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const createProduct = useCreateProduct();
  const fileInputRef = useRef(null);

  const [step, setStep] = useState(1);
  const [isUploading, setIsUploading] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isDropship, setIsDropship] = useState(false);

  // Form state
  const [images, setImages] = useState([]);
  const [imageFiles, setImageFiles] = useState([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [condition, setCondition] = useState('');
  const [price, setPrice] = useState('');
  const [originalPrice, setOriginalPrice] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [shippingType, setShippingType] = useState('');
  const [location, setLocation] = useState('');
  const [supplierUrl, setSupplierUrl] = useState('');

  const handleFileDrop = useCallback((e) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer?.files || e.target?.files || []);
    const imageFilesFiltered = files
      .filter((f) => f.type.startsWith('image/'))
      .slice(0, MAX_IMAGES - images.length);

    const newPreviews = imageFilesFiltered.map((f) => URL.createObjectURL(f));
    setImages((prev) => [...prev, ...newPreviews].slice(0, MAX_IMAGES));
    setImageFiles((prev) => [...prev, ...imageFilesFiltered].slice(0, MAX_IMAGES));
  }, [images.length]);

  const removeImage = (index) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
    setImageFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadImages = async () => {
    const urls = [];
    for (const file of imageFiles) {
      const ext = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { data, error } = await supabase.storage
        .from('product-images')
        .upload(fileName, file);
      if (!error && data) {
        const { data: urlData } = supabase.storage
          .from('product-images')
          .getPublicUrl(data.path);
        urls.push(urlData.publicUrl);
      }
    }
    return urls;
  };

  const handlePublish = async () => {
    setIsPublishing(true);
    try {
      let imageUrls = images;
      if (imageFiles.length > 0) {
        setIsUploading(true);
        imageUrls = await uploadImages();
        setIsUploading(false);
      }

      await createProduct.mutateAsync({
        title,
        description,
        category,
        condition,
        price: parseFloat(price),
        original_price: originalPrice ? parseFloat(originalPrice) : null,
        quantity: parseInt(quantity, 10),
        shipping_type: shippingType,
        location,
        images: imageUrls,
        is_dropship: isDropship,
        supplier_url: supplierUrl || null,
        seller_id: user.id,
      });

      navigate('/profile');
    } catch (err) {
      console.error('Failed to publish:', err);
    } finally {
      setIsPublishing(false);
    }
  };

  const handleAiFill = () => {
    alert('AI auto-fill coming soon!');
  };

  const canProceed = () => {
    switch (step) {
      case 1: return images.length > 0;
      case 2: return title && category && condition;
      case 3: return price && quantity;
      case 4: return shippingType && location;
      case 5: return true;
      default: return false;
    }
  };

  const profitCalc = () => {
    const p = parseFloat(price) || 0;
    const fee = p * (PLATFORM_FEE_PERCENT / 100);
    return { revenue: p, fee, profit: p - fee };
  };

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="text-center">
          <h2 className="font-['Baloo_2'] text-2xl font-bold text-gray-900 dark:text-white">
            Sign in to start selling
          </h2>
          <p className="mt-2 font-['Nunito'] text-gray-500">
            You need an account to list products.
          </p>
          <Button
            onClick={() => navigate('/auth')}
            className="mt-4 bg-[#FF6B35] px-6 py-2 text-white hover:bg-[#e55a2b]"
          >
            Sign In
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="mx-auto max-w-3xl px-4 py-8">
        {/* Step Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              const isActive = step === s.num;
              const isCompleted = step > s.num;
              return (
                <div key={s.num} className="flex flex-1 items-center">
                  <div className="flex flex-col items-center">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all ${
                        isActive
                          ? 'border-[#FF6B35] bg-[#FF6B35] text-white'
                          : isCompleted
                          ? 'border-[#06D6A0] bg-[#06D6A0] text-white'
                          : 'border-gray-300 bg-white text-gray-400 dark:border-gray-700 dark:bg-gray-900'
                      }`}
                    >
                      {isCompleted ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                    </div>
                    <span
                      className={`mt-1 text-xs font-['Nunito'] font-semibold ${
                        isActive ? 'text-[#FF6B35]' : isCompleted ? 'text-[#06D6A0]' : 'text-gray-400'
                      }`}
                    >
                      {s.label}
                    </span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div
                      className={`mx-2 h-0.5 flex-1 transition-colors ${
                        step > s.num ? 'bg-[#06D6A0]' : 'bg-gray-200 dark:bg-gray-700'
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Dropship Toggle */}
        <div className="mb-6 flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <div>
            <p className="font-['Nunito'] font-bold text-gray-900 dark:text-white">
              Import from Supplier
            </p>
            <p className="text-sm text-gray-500">Enable dropship mode</p>
          </div>
          <button
            onClick={() => setIsDropship(!isDropship)}
            className={`relative h-6 w-11 rounded-full transition-colors ${
              isDropship ? 'bg-[#FF6B35]' : 'bg-gray-300 dark:bg-gray-600'
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                isDropship ? 'translate-x-5' : ''
              }`}
            />
          </button>
        </div>

        {isDropship && step === 1 && (
          <div className="mb-6 rounded-xl border border-dashed border-[#FF6B35]/40 bg-[#FF6B35]/5 p-4">
            <label className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300">
              Supplier URL
            </label>
            <div className="flex items-center gap-2">
              <LinkIcon className="h-5 w-5 text-gray-400" />
              <input
                type="url"
                value={supplierUrl}
                onChange={(e) => setSupplierUrl(e.target.value)}
                placeholder="https://supplier.com/product/..."
                className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-[#FF6B35] focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </div>
          </div>
        )}

        {/* Step Content */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          {/* Step 1: Photos */}
          {step === 1 && (
            <div>
              <h2 className="mb-1 font-['Baloo_2'] text-xl font-bold text-gray-900 dark:text-white">
                Add Photos
              </h2>
              <p className="mb-6 text-sm text-gray-500">
                Upload up to {MAX_IMAGES} photos. The first photo will be the cover.
              </p>

              {/* Drop zone */}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleFileDrop}
                className="flex min-h-[200px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-8 transition-colors hover:border-[#FF6B35] hover:bg-[#FF6B35]/5 dark:border-gray-700 dark:bg-gray-800/50"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="mb-3 h-10 w-10 text-gray-400" />
                <p className="font-['Nunito'] font-semibold text-gray-600 dark:text-gray-300">
                  Drag & drop photos here
                </p>
                <p className="mt-1 text-sm text-gray-400">or click to browse</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileDrop}
                  className="hidden"
                />
              </div>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="mt-4 flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                <Camera className="h-4 w-4" />
                Take Photo
              </button>

              {/* Preview thumbnails */}
              {images.length > 0 && (
                <div className="mt-6 grid grid-cols-5 gap-3">
                  {images.map((src, i) => (
                    <div key={i} className="group relative aspect-square">
                      <img
                        src={src}
                        alt={`Upload ${i + 1}`}
                        className="h-full w-full rounded-xl border border-gray-200 object-cover"
                      />
                      {i === 0 && (
                        <span className="absolute bottom-1 left-1 rounded bg-[#FF6B35] px-1.5 py-0.5 text-[10px] font-bold text-white">
                          Cover
                        </span>
                      )}
                      <button
                        onClick={() => removeImage(i)}
                        className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white opacity-0 transition-opacity group-hover:opacity-100"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <p className="mt-3 text-right text-xs text-gray-400">
                {images.length}/{MAX_IMAGES} photos
              </p>
            </div>
          )}

          {/* Step 2: Details */}
          {step === 2 && (
            <div>
              <h2 className="mb-1 font-['Baloo_2'] text-xl font-bold text-gray-900 dark:text-white">
                Product Details
              </h2>
              <p className="mb-6 text-sm text-gray-500">
                Describe your item to attract buyers.
              </p>

              <button
                onClick={handleAiFill}
                className="mb-6 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#06D6A0] bg-[#06D6A0]/5 py-3 font-['Nunito'] font-semibold text-[#06D6A0] transition-colors hover:bg-[#06D6A0]/10"
              >
                <Sparkles className="h-5 w-5" />
                Auto-fill with AI
              </button>

              <div className="space-y-5">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Title *
                  </label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., Nike Air Max 90 - Size 10"
                    maxLength={120}
                  />
                  <p className="mt-1 text-right text-xs text-gray-400">{title.length}/120</p>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Description
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe your item: brand, size, condition details, etc."
                    rows={4}
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 font-['Nunito'] text-sm text-gray-700 transition-colors focus:border-[#FF6B35] focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Category *
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 focus:border-[#FF6B35] focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                    >
                      <option value="">Select category</option>
                      {CATEGORIES?.map((cat) => (
                        <option key={cat.value || cat} value={cat.value || cat}>
                          {cat.label || cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Condition *
                    </label>
                    <select
                      value={condition}
                      onChange={(e) => setCondition(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 focus:border-[#FF6B35] focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                    >
                      <option value="">Select condition</option>
                      {CONDITIONS?.map((cond) => (
                        <option key={cond.value || cond} value={cond.value || cond}>
                          {cond.label || cond}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Pricing */}
          {step === 3 && (
            <div>
              <h2 className="mb-1 font-['Baloo_2'] text-xl font-bold text-gray-900 dark:text-white">
                Set Your Price
              </h2>
              <p className="mb-6 text-sm text-gray-500">
                Price competitively to sell faster.
              </p>

              <div className="space-y-5">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Price *
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                    <input
                      type="number"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                      className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-4 text-lg font-bold text-gray-900 focus:border-[#FF6B35] focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Original Price{' '}
                    <span className="font-normal text-gray-400">(optional, shows discount)</span>
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                    <input
                      type="number"
                      value={originalPrice}
                      onChange={(e) => setOriginalPrice(e.target.value)}
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                      className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-4 text-gray-700 focus:border-[#FF6B35] focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Quantity *
                  </label>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    min="1"
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-700 focus:border-[#FF6B35] focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                  />
                </div>

                {/* Profit preview */}
                {price && (
                  <div className="rounded-xl bg-[#06D6A0]/10 p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Calculator className="h-5 w-5 text-[#06D6A0]" />
                      <span className="font-['Nunito'] font-bold text-gray-900 dark:text-white">
                        Earnings Estimate
                      </span>
                    </div>
                    <div className="space-y-1 text-sm font-['Nunito']">
                      <div className="flex justify-between text-gray-600 dark:text-gray-300">
                        <span>Selling price</span>
                        <span>${profitCalc().revenue.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-gray-600 dark:text-gray-300">
                        <span>Platform fee ({PLATFORM_FEE_PERCENT}%)</span>
                        <span>-${profitCalc().fee.toFixed(2)}</span>
                      </div>
                      <div className="mt-2 border-t border-[#06D6A0]/20 pt-2">
                        <div className="flex justify-between font-bold text-[#06D6A0]">
                          <span>Your profit</span>
                          <span>${profitCalc().profit.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 4: Shipping */}
          {step === 4 && (
            <div>
              <h2 className="mb-1 font-['Baloo_2'] text-xl font-bold text-gray-900 dark:text-white">
                Shipping & Location
              </h2>
              <p className="mb-6 text-sm text-gray-500">
                How will buyers receive this item?
              </p>

              <div className="space-y-5">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Shipping Type *
                  </label>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {SHIPPING_TYPES?.map((st) => {
                      const val = st.value || st;
                      const label = st.label || st;
                      return (
                        <button
                          key={val}
                          onClick={() => setShippingType(val)}
                          className={`flex items-center gap-3 rounded-xl border-2 p-4 text-left transition-all ${
                            shippingType === val
                              ? 'border-[#FF6B35] bg-[#FF6B35]/5'
                              : 'border-gray-200 bg-white hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800'
                          }`}
                        >
                          <div
                            className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${
                              shippingType === val ? 'border-[#FF6B35]' : 'border-gray-300'
                            }`}
                          >
                            {shippingType === val && (
                              <div className="h-2.5 w-2.5 rounded-full bg-[#FF6B35]" />
                            )}
                          </div>
                          <div>
                            <p className="font-['Nunito'] font-semibold text-gray-900 dark:text-white capitalize">
                              {label}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Location *
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="City, State or Suburb"
                      className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-4 text-gray-700 focus:border-[#FF6B35] focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Review */}
          {step === 5 && (
            <div>
              <h2 className="mb-1 font-['Baloo_2'] text-xl font-bold text-gray-900 dark:text-white">
                Review Your Listing
              </h2>
              <p className="mb-6 text-sm text-gray-500">
                Make sure everything looks good before publishing.
              </p>

              <div className="space-y-4">
                {/* Photos */}
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {images.map((src, i) => (
                    <img
                      key={i}
                      src={src}
                      alt={`Preview ${i + 1}`}
                      className="h-20 w-20 flex-shrink-0 rounded-lg border border-gray-200 object-cover"
                    />
                  ))}
                </div>

                {/* Details grid */}
                <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 dark:divide-gray-800 dark:border-gray-700">
                  {[
                    ['Title', title],
                    ['Category', category],
                    ['Condition', condition],
                    ['Price', price ? `$${parseFloat(price).toFixed(2)}` : ''],
                    ['Original Price', originalPrice ? `$${parseFloat(originalPrice).toFixed(2)}` : 'N/A'],
                    ['Quantity', quantity],
                    ['Shipping', shippingType],
                    ['Location', location],
                    ['Dropship', isDropship ? 'Yes' : 'No'],
                  ].map(([label, value]) => (
                    <div key={label} className="flex items-center justify-between px-4 py-3">
                      <span className="text-sm text-gray-500">{label}</span>
                      <span className="font-['Nunito'] text-sm font-semibold text-gray-900 dark:text-white capitalize">
                        {value || '--'}
                      </span>
                    </div>
                  ))}
                </div>

                {description && (
                  <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
                    <p className="mb-1 text-xs font-semibold text-gray-400 uppercase">Description</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">
                      {description}
                    </p>
                  </div>
                )}

                {/* Profit calculator (dropship) */}
                {isDropship && price && (
                  <div className="rounded-xl bg-[#FFD23F]/10 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Calculator className="h-5 w-5 text-[#FFD23F]" />
                      <span className="font-['Nunito'] font-bold text-gray-900 dark:text-white">
                        Dropship Profit Calculator
                      </span>
                    </div>
                    <div className="space-y-1 text-sm font-['Nunito']">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-300">Selling price</span>
                        <span>${profitCalc().revenue.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-300">
                          Platform fee ({PLATFORM_FEE_PERCENT}%)
                        </span>
                        <span>-${profitCalc().fee.toFixed(2)}</span>
                      </div>
                      <div className="mt-2 flex justify-between border-t border-[#FFD23F]/30 pt-2 font-bold text-[#FF6B35]">
                        <span>Estimated profit</span>
                        <span>${profitCalc().profit.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="mt-6 flex items-center justify-between">
          <Button
            onClick={() => setStep(Math.max(1, step - 1))}
            disabled={step === 1}
            className="flex items-center gap-2 border border-gray-200 bg-white px-6 py-3 font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </Button>

          {step < 5 ? (
            <Button
              onClick={() => setStep(step + 1)}
              disabled={!canProceed()}
              className="flex items-center gap-2 bg-[#FF6B35] px-6 py-3 font-semibold text-white hover:bg-[#e55a2b] disabled:opacity-40"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={handlePublish}
              disabled={isPublishing}
              className="flex items-center gap-2 bg-[#06D6A0] px-8 py-3 font-semibold text-white hover:bg-[#05c090] disabled:opacity-60"
            >
              {isPublishing ? (isUploading ? 'Uploading...' : 'Publishing...') : 'Publish Listing'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
