import React from 'react';
import QRCode from 'react-qr-code';
import { renderToStaticMarkup } from 'react-dom/server';

export interface ReceiptQrCodeProps {
  value: string;
  size?: number;
  className?: string;
}

const DEFAULT_SIZE = 120;

export function ReceiptQrCode({ value, size = DEFAULT_SIZE, className }: ReceiptQrCodeProps) {
  if (!value) return null;
  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        margin: '0 auto',
      }}
    >
      <QRCode
        value={value}
        size={size}
        style={{ height: 'auto', maxWidth: '100%', width: '100%' }}
        bgColor="#ffffff"
        fgColor="#000000"
        level="M"
      />
    </div>
  );
}

export function renderReceiptQrCodeSVG(value?: string | null, size = DEFAULT_SIZE): string {
  if (!value) return '';
  return renderToStaticMarkup(
    <QRCode
      value={value}
      size={size}
      style={{ height: 'auto', maxWidth: '100%', width: '100%' }}
      bgColor="#ffffff"
      fgColor="#000000"
      level="M"
    />,
  );
}

