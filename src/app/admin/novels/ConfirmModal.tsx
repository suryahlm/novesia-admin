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
      <div className="relative w-full max-w-md bg-[#12151b] border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-6 space-y-5">
          {/* Icon + Title */}
          <div className="flex flex-col items-center text-center space-y-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isDanger ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-amber-400/10 text-amber-400 border border-amber-400/20'}`}>
              {isDanger ? <AlertTriangle className="w-6 h-6" /> : <X className="w-6 h-6" />}
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-slate-100">{title}</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                {description}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2.5 pt-1">
            <button
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-2 bg-[#0a0c10] hover:bg-white/5 text-slate-300 rounded-lg text-xs font-semibold transition-all border border-white/10 disabled:opacity-50"
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className={`flex-1 px-4 py-2 flex items-center justify-center gap-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-50 ${
                isDanger 
                  ? 'bg-red-950/60 hover:bg-red-900/60 text-red-300 border border-red-900/60' 
                  : 'bg-gradient-to-br from-amber-300 via-amber-400 to-amber-500 hover:brightness-110 text-slate-950 font-bold'
              }`}
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
