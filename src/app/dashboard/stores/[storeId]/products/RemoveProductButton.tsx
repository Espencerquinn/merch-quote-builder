"use client";

import ConfirmDeleteButton from "@/components/ConfirmDeleteButton";

export default function RemoveProductButton({
  storeProductId,
  storeId,
}: {
  storeProductId: string;
  storeId: string;
}) {
  return (
    <ConfirmDeleteButton
      endpoint={`/api/stores/${storeId}/products/${storeProductId}`}
      label="Remove"
    />
  );
}
