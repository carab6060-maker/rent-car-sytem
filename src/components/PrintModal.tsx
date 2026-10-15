'use client';

import React from 'react';
import { Printer, X } from 'lucide-react';

interface PrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  data: any;
  type?: 'agreement' | 'receipt';
  companyName?: string;
}

export default function PrintModal({
  isOpen,
  onClose,
  title,
  data,
  type = 'agreement',
  companyName,
}: PrintModalProps) {
  if (!isOpen || !data) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      className="modal-overlay print-modal-overlay open"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal print-modal" style={{ maxWidth: '800px', width: '90%' }}>
        <div className="print-modal-toolbar no-print">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Printer size={18} />
            <span style={{ fontWeight: 600 }}>{title}</span>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn btn-primary btn-sm" onClick={handlePrint} type="button">
              <Printer size={15} style={{ marginRight: '6px' }} />
              Print / Save PDF
            </button>
            <button className="btn btn-secondary btn-sm" onClick={onClose} type="button">
              <X size={15} style={{ marginRight: '6px' }} />
              Close
            </button>
          </div>
        </div>

        <div className="print-modal-body print-area" id="printArea">
          {type === 'agreement' ? (
            <div className="print-doc">
              <div className="print-header">
                <div className="print-company-info">
                  <h2 className="print-company-name">{companyName || 'Car Rental Service'}</h2>
                  <p className="print-subtitle">Vehicle Rental Agreement & Contract</p>
                  <p className="print-meta">Official Document — Contract #{data.id}</p>
                </div>
                <div className="print-status-stamp">
                  <span className="badge badge-success">ACTIVE CONTRACT</span>
                </div>
              </div>

              <div className="print-section">
                <h4 className="print-section-title">1. Vehicle Information</h4>
                <div className="print-grid-2">
                  <div><strong>Car:</strong> {data.car_name} {data.car_model || ''}</div>
                  <div><strong>Plate No:</strong> {data.car_plate || '-'}</div>
                  <div><strong>Daily Rate:</strong> ${parseFloat(data.price_per_day || 0).toFixed(2)}/day</div>
                  <div><strong>Total Rental Days:</strong> {data.total_days} days</div>
                </div>
              </div>

              <div className="print-section">
                <h4 className="print-section-title">2. Customer Information</h4>
                <div className="print-grid-2">
                  <div><strong>Full Name:</strong> {data.customer_name}</div>
                  <div><strong>Phone:</strong> {data.customer_phone || '-'}</div>
                  <div><strong>License No:</strong> {data.customer_license || '-'}</div>
                  <div><strong>Status:</strong> {data.status}</div>
                </div>
              </div>

              <div className="print-section">
                <h4 className="print-section-title">3. Rental Duration & Financials</h4>
                <div className="print-grid-2">
                  <div><strong>Start Date:</strong> {String(data.start_date).split('T')[0]}</div>
                  <div><strong>Expected Return:</strong> {String(data.return_date).split('T')[0]}</div>
                  <div><strong>Base Cost:</strong> ${parseFloat(data.total_price || 0).toFixed(2)}</div>
                  {data.extra_charges ? (
                    <div><strong>Extra Charges:</strong> ${parseFloat(data.extra_charges || 0).toFixed(2)}</div>
                  ) : null}
                  <div style={{ gridColumn: 'span 2', fontSize: '1.1rem', fontWeight: 700, color: '#1e3a8a', marginTop: '6px' }}>
                    Grand Total: ${(parseFloat(data.total_price || 0) + parseFloat(data.extra_charges || 0)).toFixed(2)}
                  </div>
                </div>
              </div>

              <div className="print-section terms-box" style={{ background: '#f8fafc', padding: '12px', borderRadius: '6px', fontSize: '0.82rem', color: '#64748b' }}>
                <p><strong>Terms & Conditions:</strong> The renter agrees to return the vehicle in the same condition as received, by the agreed return date. Late returns or damages are subject to additional charges.</p>
              </div>

              <div className="print-signatures" style={{ display: 'flex', justifyContent: 'space-between', marginTop: '40px', paddingTop: '20px', borderTop: '1px solid #e2e8f0' }}>
                <div style={{ textAlign: 'center', width: '200px' }}>
                  <div style={{ borderBottom: '1px solid #94a3b8', height: '40px', marginBottom: '8px' }}></div>
                  <span style={{ fontSize: '0.85rem', color: '#475569' }}>Customer Signature</span>
                </div>
                <div style={{ textAlign: 'center', width: '200px' }}>
                  <div style={{ borderBottom: '1px solid #94a3b8', height: '40px', marginBottom: '8px' }}></div>
                  <span style={{ fontSize: '0.85rem', color: '#475569' }}>Authorized Officer</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="print-doc">
              <div className="print-header">
                <div className="print-company-info">
                  <h2 className="print-company-name">{companyName || 'Car Rental Service'}</h2>
                  <p className="print-subtitle">Official Payment Receipt</p>
                  <p className="print-meta">Receipt #{data.id} • Date: {String(data.payment_date || '').split('T')[0]}</p>
                </div>
                <div className="print-status-stamp">
                  <span className="badge badge-success">PAID</span>
                </div>
              </div>

              <div className="print-section">
                <div className="print-grid-2">
                  <div><strong>Customer:</strong> {data.customer_name || 'Valued Customer'}</div>
                  <div><strong>Payment Method:</strong> {data.payment_method}</div>
                  <div><strong>Car:</strong> {data.car_name ? `${data.car_name} (${data.car_plate || ''})` : `Rental #${data.rental_id}`}</div>
                  <div><strong>Ref / Notes:</strong> {data.reference_no || data.notes || 'N/A'}</div>
                </div>
              </div>

              <div className="receipt-amount-box" style={{ textAlign: 'center', padding: '24px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', margin: '20px 0' }}>
                <span style={{ fontSize: '0.9rem', color: '#166534', display: 'block', marginBottom: '4px' }}>Amount Paid</span>
                <span style={{ fontSize: '2.4rem', fontWeight: 800, color: '#15803d' }}>
                  ${parseFloat(data.amount || 0).toFixed(2)}
                </span>
              </div>

              <div className="print-signatures" style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '30px' }}>
                <div style={{ textAlign: 'center', width: '220px' }}>
                  <div style={{ borderBottom: '1px solid #94a3b8', height: '35px', marginBottom: '6px' }}></div>
                  <span style={{ fontSize: '0.85rem', color: '#475569' }}>Received By: {data.recorded_by_name || 'Staff'}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
