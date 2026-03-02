import Link from "next/link";
import { Package } from "lucide-react";

interface ProductCardProps {
  id: string;
  name: string;
  productType: string;
  description?: string;
  thumbnailUrl: string | null;
  href: string;
}

export default function ProductCard({
  name,
  productType,
  description,
  thumbnailUrl,
  href,
}: ProductCardProps) {
  return (
    <Link
      href={href}
      className="group flex flex-col bg-gray-800/50 border border-gray-700 rounded-xl overflow-hidden hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/10 transition-all"
    >
      <div className="w-full aspect-[3/4] bg-gray-900/50 overflow-hidden">
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={name}
            className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-600">
            <Package className="w-12 h-12" />
          </div>
        )}
      </div>
      <div className="p-4">
        <p className="text-sm font-medium text-white leading-tight line-clamp-2">
          {name}
        </p>
        <p className="text-xs text-gray-400 mt-1">{productType}</p>
        {description && (
          <p className="text-xs text-gray-500 mt-1 line-clamp-2">{description}</p>
        )}
      </div>
    </Link>
  );
}
