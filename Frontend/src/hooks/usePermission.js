/**
 * Permission helper hook.
 *
 * Pass the active session object (admin / nonAdmin / employee).
 * The session is expected to carry:
 *   - permissionData: Array<{ permission: string, status: number, ... }>
 *   - feature:        Array<{ name: string, status: number }>
 *
 * Only status-1 permissions (view-level) are used for sidebar gating,
 * mirroring the Laravel in_array check in permissionCheck_RoleWise.php.
 */
export function usePermission(sessionData) {
  /** True if the user has the named permission in their permissionData list. */
  const hasPermission = (name) =>
    (sessionData?.permissionData ?? []).some((p) => p.permission === name);

  /** True if the named feature flag is enabled (status == 1) for this user. */
  const hasFeature = (name) =>
    (sessionData?.feature ?? []).some((f) => f.name === name && Number(f.status) === 1);

  /**
   * Combined gate: requires the permission to exist AND the feature flag to be
   * enabled (when a featureName is supplied).  Matches the Laravel blade pattern:
   *   @if(Session::get(host)['feature_name'] == 1 && in_array('perm', $permissionData))
   */
  const canView = (permName, featureName = null) => {
    if (!hasPermission(permName)) return false;
    if (featureName && !hasFeature(featureName)) return false;
    return true;
  };

  return { hasPermission, hasFeature, canView };
}
