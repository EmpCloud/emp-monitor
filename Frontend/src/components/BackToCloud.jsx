import { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';

/**
 * Subtle "EMP Cloud" link shown only when the user arrived via SSO.
 * Reads empcloud_return_url from localStorage (set by SSOGate).
 */
export default function BackToCloud() {
  const [returnUrl, setReturnUrl] = useState(null);

  useEffect(() => {
    setReturnUrl(localStorage.getItem('empcloud_return_url'));
  }, []);

  if (!returnUrl) return null;

  return (
    <a
      href={returnUrl}
      className="flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 hover:bg-slate-50 transition-colors"
    >
      <ArrowLeft className="h-3 w-3" />
      <span className="hidden lg:inline">EMP Cloud</span>
    </a>
  );
}
