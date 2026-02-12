'use client';
import React from 'react';

interface Vendor {
  name: string;
  [key: string]: any;
}

type Props = {
  vendor?: Vendor | null;
  onClose?: () => void;
  [key: string]: any;
};

export default function VendorDetailsModal({ vendor, onClose }: Props) {
  if (!vendor) return null;

  return (
    <div className="flex gap-4">
      <div className="w-16 h-16 bg-[#21262d] rounded-lg border border-[#30363d] flex items-center justify-center text-2xl font-bold text-gray-500">
        {vendor.name ? vendor.name.substring(0, 2).toUpperCase() : 'VN'}
      </div>
      <div>
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          {vendor.name}
        </h2>
      </div>
    </div>
  );
}
