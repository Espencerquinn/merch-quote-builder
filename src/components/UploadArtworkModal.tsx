'use client';

import { useState, useRef, useCallback } from 'react';
import { X, Upload, AlertCircle } from 'lucide-react';

interface UploadArtworkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (file: File) => void;
}

export default function UploadArtworkModal({
  isOpen,
  onClose,
  onUpload,
}: UploadArtworkModalProps) {
  const [agreed, setAgreed] = useState(false);
  const [showError, setShowError] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClose = () => {
    if (!agreed && selectedFile) {
      setShowError(true);
      return;
    }
    resetAndClose();
  };

  const handleSave = () => {
    if (!agreed) {
      setShowError(true);
      return;
    }
    if (selectedFile) {
      onUpload(selectedFile);
    }
    resetAndClose();
  };

  const resetAndClose = () => {
    setAgreed(false);
    setShowError(false);
    setSelectedFile(null);
    onClose();
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file && (file.type === 'image/png' || file.type === 'image/jpeg')) {
      setSelectedFile(file);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Upload Artwork</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Drag & Drop Area */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
              isDragging
                ? 'border-blue-500 bg-blue-50'
                : selectedFile
                ? 'border-green-500 bg-green-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg"
              onChange={handleFileSelect}
              className="hidden"
            />
            
            {selectedFile ? (
              <div>
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Upload className="w-6 h-6 text-green-600" />
                </div>
                <p className="font-medium text-gray-900">{selectedFile.name}</p>
                <p className="text-sm text-gray-500 mt-1">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
                <p className="text-xs text-blue-600 mt-2">Click to change file</p>
              </div>
            ) : (
              <div>
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Upload className="w-6 h-6 text-gray-400" />
                </div>
                <p className="font-medium text-gray-900">
                  Drag and drop your design here
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  or click to browse (PNG, JPG)
                </p>
              </div>
            )}
          </div>

          {/* Terms & Conditions */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <p className="text-sm text-gray-700">
              By uploading this design, you confirm that it complies with our{' '}
              <a href="#" className="text-blue-600 hover:underline">Terms of Service</a> and our{' '}
              <a href="#" className="text-blue-600 hover:underline">Intellectual Property Policy</a>.
            </p>
            <p className="text-sm text-gray-700">
              You will indemnify and defend Merch Makers for any claims related to the alleged infringement of your design.
            </p>
            <p className="text-sm text-gray-700">
              All designs are subject to our review and may be removed at any time without prior notice or liability to us.
            </p>
          </div>

          {/* Checkbox */}
          <div>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => {
                  setAgreed(e.target.checked);
                  if (e.target.checked) setShowError(false);
                }}
                className="mt-0.5 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">
                I understand and accept these conditions
              </span>
            </label>
            
            {showError && (
              <div className="flex items-center gap-2 mt-2 text-red-600">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm">
                  You must agree to our Terms of Service and Intellectual Property Policy.
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200">
          <button
            onClick={resetAndClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
          >
            Close
          </button>
          <button
            onClick={handleSave}
            disabled={!selectedFile}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed rounded-lg"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
