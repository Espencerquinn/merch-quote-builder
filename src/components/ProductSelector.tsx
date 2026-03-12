import { Product, ProductColor } from '@/lib/products';

interface ProductSelectorProps {
  product: Product;
  selectedColor: ProductColor;
  quantity: number;
  onColorChange: (color: ProductColor) => void;
  onQuantityChange: (quantity: number) => void;
}

export default function ProductSelector({
  product,
  selectedColor,
  quantity,
  onColorChange,
  onQuantityChange,
}: ProductSelectorProps) {
  return (
    <div className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
        {/* Product Name */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{product.name}</h2>
          <p className="text-sm text-gray-500">{product.description}</p>
        </div>

        {/* Color Selector */}
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-gray-700">Color:</span>
          <div className="flex gap-2">
            {product.colors.map((color) => (
              <button
                key={color.id}
                onClick={() => onColorChange(color)}
                className={`w-8 h-8 rounded-full border-2 transition-all ${
                  selectedColor.id === color.id
                    ? 'border-blue-500 ring-2 ring-blue-200'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
                style={{ backgroundColor: color.hex }}
                title={color.name}
              />
            ))}
          </div>
          <span className="text-sm text-gray-600">{selectedColor.name}</span>
        </div>

        {/* Quantity Input */}
        <div className="flex items-center gap-3">
          <label htmlFor="quantity" className="text-sm font-medium text-gray-700">
            Quantity:
          </label>
          <input
            type="number"
            id="quantity"
            min="1"
            max="10000"
            value={quantity}
            onChange={(e) => onQuantityChange(Math.max(1, parseInt(e.target.value) || 1))}
            className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-center font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>
    </div>
  );
}
