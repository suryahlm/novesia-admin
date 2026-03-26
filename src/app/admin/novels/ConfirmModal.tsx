"use client";

import React, { useEffect, useState } from "react";
import { X, AlertTriangle, Loader2 } from "lucide-react";

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  isDanger?: boolean;
  loading?: boolean;
}

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = "Hapus",
  cancelText = "Batal",
  isDanger = true,
  loading = false,
}: ConfirmModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-md animate-in fade-in duration-300"
        onClick={loading ? undefined : onClose}
      />
      
      {/* Modal Card */}
      <div className="relative w-full max-w-md bg-gray-900 border border-gray-800 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Top Accent */}
        <div className={`h-2 w-full ${isDanger ? 'bg-gradient-to-r from-red-600 to-rose-600' : 'bg-gradient-to-r from-violet-600 to-indigo-600'}`} />
        
        <div className="p-6 pt-8 space-y-6">
          {/* Icon + Title */}
          <div className="flex flex-col items-center text-center space-y-4">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center ${isDanger ? 'bg-red-500/10 text-red-500' : 'bg-violet-500/10 text-violet-500'}`}>
              {isDanger ? <AlertTriangle className="w-8 h-8" /> : <X className="w-8 h-8" />}
            </div>
            <div className="space-y-1">
              <h3 className="text-xl font-bold text-white">{title}</h3>
              <p className="text-sm text-gray-400 leading-relaxed px-4">
                {description}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-3 bg-gray-800 hover:bg-gray-750 text-gray-300 rounded-2xl text-sm font-semibold transition-all border border-gray-700/50 disabled:opacity-50"
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className={`flex-1 px-4 py-3 flex items-center justify-center gap-2 rounded-2xl text-sm font-bold shadow-lg transition-all disabled:opacity-50 ${
                isDanger 
                  ? 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white shadow-red-500/10' 
                  : 'bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-violet-500/10'
              }`}
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
