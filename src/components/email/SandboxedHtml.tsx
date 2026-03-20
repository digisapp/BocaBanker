'use client';

import { useRef, useEffect, useState } from 'react';

interface SandboxedHtmlProps {
  html: string;
  className?: string;
}

/**
 * Renders untrusted HTML inside a sandboxed iframe.
 * Prevents XSS, script injection, and style leaking from inbound emails.
 */
export default function SandboxedHtml({ html, className = '' }: SandboxedHtmlProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(200);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    // Build a self-contained HTML document with safe styling
    const doc = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            * { box-sizing: border-box; }
            body {
              margin: 0;
              padding: 8px;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              font-size: 14px;
              line-height: 1.6;
              color: #374151;
              word-break: break-word;
              overflow-wrap: break-word;
            }
            a { color: #d97706; }
            img { max-width: 100%; height: auto; }
            table { max-width: 100%; }
            pre, code { white-space: pre-wrap; max-width: 100%; overflow-x: auto; }
            blockquote {
              border-left: 2px solid #d4a855;
              padding-left: 12px;
              margin-left: 0;
              color: #666;
            }
          </style>
        </head>
        <body>${html}</body>
      </html>
    `;

    // Write to iframe via srcdoc won't work with sandbox, so use blob URL
    const blob = new Blob([doc], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    iframe.src = url;

    // Auto-resize iframe to content height
    const handleLoad = () => {
      try {
        // With sandbox, we can't access contentDocument directly
        // Use a postMessage approach or estimate from content
        const body = iframe.contentDocument?.body;
        if (body) {
          setHeight(Math.max(100, body.scrollHeight + 16));
        }
      } catch {
        // Cross-origin sandbox — use a reasonable default
        setHeight(300);
      }
      URL.revokeObjectURL(url);
    };

    iframe.addEventListener('load', handleLoad);
    return () => {
      iframe.removeEventListener('load', handleLoad);
      URL.revokeObjectURL(url);
    };
  }, [html]);

  return (
    <iframe
      ref={iframeRef}
      className={`w-full border-0 ${className}`}
      style={{ height: `${height}px`, minHeight: '100px' }}
      sandbox="allow-same-origin"
      title="Email content"
    />
  );
}
