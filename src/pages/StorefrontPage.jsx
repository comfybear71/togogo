import { useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Star,
  MapPin,
  BadgeCheck,
  Shield,
  Share2,
  UserPlus,
  Check,
  ExternalLink,
} from 'lucide-react';
import Avatar from '../components/ui/Avatar';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Skeleton from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import { useSellerProducts } from '../hooks/useProducts';

export default function StorefrontPage() {
  const { username } = useParams();
  const { data: products, isLoading, seller } = useSellerProducts(username);

  const [following, setFollowing] = useState(false);
  const [copied, setCopied] = useState(false);

  const sellerData = seller || products?.[0]?.seller || {};
  const displayName = sellerData.name || sellerData.full_name || username || 'Seller';
  const trustScore = sellerData.trust_score || 0;
  const bio = sellerData.bio || '';
  const location = sellerData.location || '';
  const avatarUrl = sellerData.avatar_url || '';
  const isVerified = sellerData.is_verified;

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  const handleFollow = () => {
    setFollowing(!following);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Banner / Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#FF6B35] via-[#FF6B35]/80 to-[#FFD23F]">
        <div className="absolute inset-0">
          <div className="absolute -right-20 -top-20 h-60 w-60 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 h-60 w-60 rounded-full bg-white/10 blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center text-center sm:flex-row sm:items-end sm:text-left">
            <Avatar
              src={avatarUrl}
              name={displayName}
              size="xl"
              className="h-24 w-24 text-3xl ring-4 ring-white/30 shadow-xl sm:h-28 sm:w-28"
            />
            <div className="mt-4 flex-1 sm:ml-6 sm:mt-0 sm:mb-1">
              <div className="flex flex-col items-center gap-2 sm:flex-row">
                <h1 className="font-['Baloo_2'] text-3xl font-bold text-white">
                  {displayName}
                </h1>
                <div className="flex items-center gap-1">
                  {isVerified && (
                    <Badge className="border border-white/30 bg-white/20 text-white flex items-center gap-1">
                      <BadgeCheck className="h-3.5 w-3.5" />
                      Verified
                    </Badge>
                  )}
                </div>
              </div>

              {bio && (
                <p className="mt-2 font-['Nunito'] text-white/90">{bio}</p>
              )}

              <div className="mt-3 flex flex-wrap items-center justify-center gap-4 sm:justify-start">
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`h-4 w-4 ${
                        i < Math.round(trustScore)
                          ? 'fill-[#FFD23F] text-[#FFD23F]'
                          : 'text-white/40'
                      }`}
                    />
                  ))}
                  <span className="ml-1 font-['Nunito'] text-sm font-semibold text-white/90">
                    {trustScore.toFixed(1)}
                  </span>
                </div>

                {location && (
                  <div className="flex items-center gap-1 text-sm text-white/80">
                    <MapPin className="h-4 w-4" />
                    {location}
                  </div>
                )}

                <span className="text-sm text-white/80">
                  {products?.length || 0} listings
                </span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="mt-4 flex gap-2 sm:mt-0 sm:mb-1">
              <Button
                onClick={handleFollow}
                className={`flex items-center gap-2 px-5 py-2 font-semibold transition-all ${
                  following
                    ? 'border-2 border-white bg-transparent text-white hover:bg-white/10'
                    : 'bg-white text-[#FF6B35] shadow-lg hover:bg-gray-50'
                }`}
              >
                {following ? (
                  <>
                    <Check className="h-4 w-4" />
                    Following
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4" />
                    Follow
                  </>
                )}
              </Button>
              <button
                onClick={handleShare}
                className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-white/30 bg-white/10 text-white transition-colors hover:bg-white/20"
                title="Share store"
              >
                {copied ? (
                  <Check className="h-5 w-5" />
                ) : (
                  <Share2 className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="font-['Baloo_2'] text-xl font-bold text-gray-900 dark:text-white">
            Products
          </h2>
          <span className="text-sm text-gray-500">
            {products?.length || 0} items
          </span>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-72 rounded-xl" />
            ))}
          </div>
        ) : !products?.length ? (
          <EmptyState
            icon="package"
            title="No products yet"
            description="This seller hasn't listed any products yet. Check back soon!"
          />
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {products.map((product) => (
              <Card key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
