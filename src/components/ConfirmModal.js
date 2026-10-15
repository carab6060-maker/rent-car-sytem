'use client';

import React from 'react';
import { X, AlertTriangle } from 'lucide-react';

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed?',
  confirmText = 'Delete',
  confirmVariant = 'btn-danger',
  loading = false,
}) {
  if (!isOpen) return null;

  return (
    <div
      className="modal-overlay open"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onClose();
      }}
    >
      <div className="modal confirm-modal" style={{ maxWidth: '440px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-danger, #ef4444)' }}>
            <AlertTriangle size={20} />
            <h2 className="modal-title">{title}</h2>
          </div>
          <button className="modal-close" onClick={onClose} disabled={loading} type="button">
            <X size={18} />
          </button>
        </div>
        <div className="modal-body">
          <p style={{ color: '#475569', fontSize: '0.95rem', lineHeight: '1.5', margin: '0 0 20px 0' }}>
            {message}
          </p>
          <div className="confirm-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button className="btn btn-secondary" onClick={onClose} disabled={loading} type="button">
              Cancel
            </button>
            <button
              className={`btn ${confirmVariant}`}
              onClick={onConfirm}
              disabled={loading}
              type="button"
            >
              {loading ? 'Processing...' : confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
