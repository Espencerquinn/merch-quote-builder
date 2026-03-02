"use client";

import ConfirmDeleteButton from "@/components/ConfirmDeleteButton";

export default function DeleteProductButton({ productId }: { productId: string }) {
  return (
    <ConfirmDeleteButton endpoint={`/api/decorated-products/${productId}`} />
  );
}
