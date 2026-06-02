import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';

const EMPCLOUD_DASHBOARD_URL = 'https://app.empcloud.com/';

/**
 * Resolve the "EMP Cloud" return URL from localStorage (set by SSOGate).
 * Older sessions may hold a stale value pointing at the bare empcloud.com
 * marketing site (WordPress wp-login), produced before the SSO return_url fix —
 * redirect those to the real dashboard. Subdomains like app.empcloud.com are
 * kept as-is. Returns null when the user did not arrive via SSO.
 */
function resolveReturnUrl() {
  const stored = localStorage.getItem('empcloud_return_url');
  if (!stored) return null;
  let host = '';
  try { host = new URL(stored).hostname; } catch { host = ''; }
  const isMarketingSite = /^(www\.)?empcloud\.com$/i.test(host);
  return isMarketingSite || !host ? EMPCLOUD_DASHBOARD_URL : stored;
}

/**
 * Subtle "EMP Cloud" link shown only when the user arrived via SSO.
 */
export default function BackToCloud() {
  const [returnUrl] = useState(resolveReturnUrl);

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
