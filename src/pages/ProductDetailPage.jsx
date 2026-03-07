import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ShoppingCart,
  MessageCircle,
  Share2,
  Star,
  MapPin,
  Truck,
  Edit,
  Minus,
  Plus,
  Award,
  ChevronLeft,
  Heart,
  Check,
} from 'lucide-react';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Avatar from '../components/ui/Avatar';
import Skeleton from '../components/ui/Skeleton';
import { useProduct } from '../hooks/useProducts';
import { useAuthStore } from '../stores/authStore';
import { useCartStore } from '../stores/cartStore';

export default function ProductDetailPage() {
  const { id } = useParams();
  const { data: product, isLoading } = useProduct(id);
  const { user } = useAuthStore();
  const { addItem } = useCartStore();

  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [copied, setCopied] = useState(false);

  const isOwner = user && product?.seller_id === user.id;

  const handleAddToCart = () => {
    if (product) {
      addItem({ ...product, quantity });
    }
  };

  const handleShare = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-6xl px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Skeleton className="aspect-square rounded-2xl" />
            <div className="space-y-4">
              <Skeleton className="h-10 w-3/4 rounded-xl" />
              <Skeleton className="h-8 w-1/3 rounded-xl" />
              <Skeleton className="h-24 w-full rounded-xl" />
              <Skeleton className="h-12 w-full rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) return null;

  const images = product.images?.length ? product.images : [product.image || '/placeholder.png'];
  const hasDiscount = product.original_price && product.original_price > product.price;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-6xl px-4 py-4 md:py-8">
        {/* Back link */}
        <Link
          to="/browse"
          className="inline-flex items-center gap-1 text-gray-500 hover:text-[#FF6B35] font-['Nunito'] font-semibold mb-4 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to browsing
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Image Gallery */}
          <div>
            <div className="relative aspect-square rounded-2xl overflow-hidden bg-white border border-gray-200 mb-3">
              <img
                src={images[selectedImage]}
                alt={product.title}
                className="w-full h-full object-cover"
              />
              {product.best_deal && (
                <div className="absolute top-3 left-3">
                  <Badge className="bg-[#FFD23F] text-gray-900 font-bold flex items-center gap-1 px-3 py-1">
                    <Award className="w-4 h-4" />
                    Best Deal
                  </Badge>
                </div>
              )}
              <button className="absolute top-3 right-3 p-2 bg-white/80 backdrop-blur rounded-full hover:bg-white transition-colors">
                <Heart className="w-5 h-5 text-gray-600" />
              </button>
            </div>
            {/* Thumbnails */}
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedImage(i)}
                    className={`flex-shrink-0 w-16 h-16 md:w-20 md:h-20 rounded-xl overflow-hidden border-2 transition-colors ${
                      selectedImage === i
                        ? 'border-[#FF6B35]'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="space-y-6">
            {/* Title & Price */}
            <div>
              <div className="flex items-start gap-2 mb-2">
                <Badge className="bg-[#06D6A0]/10 text-[#06D6A0] font-semibold">
                  {product.condition}
                </Badge>
              </div>
              <h1 className="font-['Baloo_2'] text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                {product.title}
              </h1>
              <div className="flex items-baseline gap-3">
                <span className="font-['Baloo_2'] text-3xl font-bold text-[#FF6B35]">
                  ${product.price?.toFixed(2)}
                </span>
                {hasDiscount && (
                  <span className="font-['Nunito'] text-lg text-gray-400 line-through">
                    ${product.original_price?.toFixed(2)}
                  </span>
                )}
              </div>
            </div>

            {/* Seller Card */}
            <div className="bg-white rounded-2xl border border-gray-200 p-4">
              <div className="flex items-center gap-3">
                <Avatar
                  src={product.seller?.avatar_url}
                  name={product.seller?.name}
                  size="md"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-['Nunito'] font-bold text-gray-900 truncate">
                    {product.seller?.name || 'Seller'}
                  </p>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${
                          i < Math.round(product.seller?.trust_score || 0)
                            ? 'text-[#FFD23F] fill-[#FFD23F]'
                            : 'text-gray-200'
                        }`}
                      />
                    ))}
                    <span className="text-sm text-gray-500 font-['Nunito'] ml-1">
                      ({product.seller?.trust_score?.toFixed(1) || '0.0'})
                    </span>
                  </div>
                  {product.seller?.location && (
                    <div className="flex items-center gap-1 text-sm text-gray-500">
                      <MapPin className="w-3 h-3" />
                      {product.seller.location}
                    </div>
                  )}
                </div>
                <Link
                  to={`/store/${product.seller?.username || product.seller_id}`}
                  className="text-sm font-['Nunito'] font-semibold text-[#FF6B35] hover:underline"
                >
                  View Store
                </Link>
              </div>
            </div>

            {/* Description */}
            <div>
              <h3 className="font-['Baloo_2'] text-lg font-bold text-gray-900 mb-2">
                Description
              </h3>
              <p className="font-['Nunito'] text-gray-600 leading-relaxed whitespace-pre-line">
                {product.description || 'No description provided.'}
              </p>
            </div>

            {/* Shipping */}
            {product.shipping_type && (
              <div className="flex items-center gap-2 text-gray-600 font-['Nunito']">
                <Truck className="w-5 h-5 text-[#06D6A0]" />
                <span className="capitalize">{product.shipping_type}</span>
              </div>
            )}

            {/* Quantity & Actions */}
            {isOwner ? (
              <Link to={`/sell?edit=${product.id}`}>
                <Button className="w-full bg-[#FF6B35] hover:bg-[#FF6B35]/90 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2">
                  <Edit className="w-5 h-5" />
                  Edit Listing
                </Button>
              </Link>
            ) : (
              <div className="space-y-3">
                {/* Quantity Selector */}
                <div className="flex items-center gap-3">
                  <span className="font-['Nunito'] font-semibold text-gray-700">Qty:</span>
                  <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="px-3 py-2 hover:bg-gray-100 transition-colors"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="px-4 py-2 font-['Nunito'] font-bold text-gray-900 min-w-[3rem] text-center">
                      {quantity}
                    </span>
                    <button
                      onClick={() => setQuantity(quantity + 1)}
                      className="px-3 py-2 hover:bg-gray-100 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Add to Cart */}
                <Button
                  onClick={handleAddToCart}
                  className="w-full bg-[#FF6B35] hover:bg-[#FF6B35]/90 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2"
                >
                  <ShoppingCart className="w-5 h-5" />
                  Add to Cart
                </Button>

                {/* Make an Offer */}
                <Button className="w-full border-2 border-[#FF6B35] text-[#FF6B35] hover:bg-[#FF6B35]/5 font-semibold py-3 rounded-xl bg-transparent">
                  Make an Offer
                </Button>

                {/* Message & Share */}
                <div className="flex gap-3">
                  <Link
                    to={`/inbox?seller=${product.seller_id}&product=${product.id}`}
                    className="flex-1"
                  >
                    <Button className="w-full border border-gray-200 text-gray-700 hover:bg-gray-50 font-semibold py-3 rounded-xl bg-white flex items-center justify-center gap-2">
                      <MessageCircle className="w-5 h-5" />
                      Message Seller
                    </Button>
                  </Link>
                  <button
                    onClick={handleShare}
                    className="px-4 py-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors relative"
                  >
                    {copied ? (
                      <Check className="w-5 h-5 text-[#06D6A0]" />
                    ) : (
                      <Share2 className="w-5 h-5 text-gray-600" />
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
