import apiService from "@/services/api.service";

// ─── Result shape helper ─────────────────────────────────────────────────────
// All write/mutation services return { ok, message, data } so the caller can
// always show a Swal with the backend-provided text (success or error).
// Backend response shape: { code, data, message, error }
const ok = (resp) => ({
  ok: true,
  message: resp?.message || "Success",
  data: resp?.data ?? null,
});
const fail = (error, fallback = "Something went wrong") => ({
  ok: false,
  message:
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    fallback,
  data: null,
});

// ─── Storage field definitions per type ──────────────────────────────────────
// Keys match the flat field names returned by the API response.

// Field keys match the flat API response field names (from editForm() in Storage.js).
export const STORAGE_FIELD_CONFIG = {
  // editForm: clientIds→client_id, clientSecrets→client_secret, refreshToken→refresh_token, NoOfDays→auto_delete_period
  google_drive: [
    { key: "client_id",          label: "Client ID",                    type: "text" },
    { key: "client_secret",      label: "Client Secret",                type: "password" },
    { key: "refresh_token",      label: "Refresh Token",                type: "password" },
    { key: "auto_delete_period", label: "Delete Data Older Than (Days)", type: "text" },
  ],
  // PHP $data sends: app_key, app_secret, refresh_token, redirect_uri (token is NOT sent to v3 API)
  dropbox: [
    { key: "app_key",            label: "App Key",                      type: "text" },
    { key: "app_secret",         label: "App Secret",                   type: "password" },
    { key: "refresh_token",      label: "Refresh Token",                type: "password" },
    { key: "redirect_uri",       label: "Redirect URI",                 type: "text" },
    { key: "auto_delete_period", label: "Delete Data Older Than (Days)", type: "text" },
  ],
  // editForm: clientIds→client_id, clientSecrets→client_secret, bucketName→bucket_name, region, api_endpoint, NoOfDays
  amazon_s3: [
    { key: "client_id",          label: "Access Key",                   type: "text" },
    { key: "client_secret",      label: "Secret Key",                   type: "password" },
    { key: "bucket_name",        label: "Bucket Name",                  type: "text" },
    { key: "region",             label: "Region",                       type: "text" },
    { key: "api_endpoint",       label: "API Endpoint",                 type: "text" },
    { key: "auto_delete_period", label: "Delete Data Older Than (Days)", type: "text" },
  ],
  // PHP $data sends: onedrive_client_id, onedrive_client_secret, onedrive_redirect_url,
  //                  onedrive_refresh_token (all from common block), tenantId (camelCase per PHP)
  microsoft_onedrive: [
    { key: "onedrive_client_id",     label: "Client ID",                    type: "text" },
    { key: "onedrive_client_secret", label: "Client Secret",                type: "password" },
    { key: "onedrive_redirect_url",  label: "Redirect URL",                 type: "text" },
    { key: "onedrive_refresh_token", label: "Refresh Token",                type: "password" },
    { key: "tenantId",               label: "Tenant ID",                    type: "text" },
    { key: "auto_delete_period",     label: "Delete Data Older Than (Days)", type: "text" },
  ],
  // editForm: sharepointClientId, sharepointClientSecret, sharepointSiteUrl, sharepointRefreshToken,
  //           sharepointTenantId, sharepointDriveName
  microsoft_sharepoint: [
    { key: "sharepoint_client_id",     label: "Client ID",                    type: "text" },
    { key: "sharepoint_client_secret", label: "Client Secret",                type: "password" },
    { key: "sharepoint_site_url",      label: "Site URL",                     type: "text" },
    { key: "sharepoint_refresh_token", label: "Refresh Token",                type: "password" },
    { key: "sharepoint_tenant_id",     label: "Tenant ID",                    type: "text" },
    { key: "sharepoint_drive_name",    label: "Drive Name",                   type: "text" },
    { key: "auto_delete_period",       label: "Delete Data Older Than (Days)", type: "text" },
  ],
  // editForm: zohoClientId→zoho_client_id, zohoClientSecret→zoho_client_secret,
  //           zohoRefreshToken→zoho_refresh_token, zohoTeam→team_id, domain
  zoho_work_drive: [
    { key: "zoho_client_id",     label: "Client ID",                    type: "text" },
    { key: "zoho_client_secret", label: "Client Secret",                type: "password" },
    { key: "zoho_refresh_token", label: "Refresh Token",                type: "password" },
    { key: "team_id",            label: "Team ID",                      type: "text" },
    { key: "domain",             label: "Domain",                       type: "text" },
    { key: "auto_delete_period", label: "Delete Data Older Than (Days)", type: "text" },
  ],
  // editForm: username, password, host, port, path→ftp_path
  ftp: [
    { key: "host",               label: "Host",                         type: "text" },
    { key: "username",           label: "Username",                     type: "text" },
    { key: "password",           label: "Password",                     type: "password" },
    { key: "port",               label: "Port",                         type: "text" },
    { key: "ftp_path",           label: "FTP Path",                     type: "text" },
    { key: "auto_delete_period", label: "Delete Data Older Than (Days)", type: "text" },
  ],
  // SFTP: PHP posts multipart to /storage/add-sftp-integration. PEM file is optional
  // (backend allows password-only auth). password is also optional in the controller.
  sftp: [
    { key: "host",               label: "Host",                         type: "text" },
    { key: "username",           label: "Username",                     type: "text" },
    { key: "password",           label: "Password",                     type: "password",  optional: true },
    { key: "port",               label: "Port",                         type: "text" },
    { key: "ftp_path",           label: "FTP Path",                     type: "text" },
    { key: "pemFile",            label: "PEM Key (optional)",           type: "file",      optional: true, accept: ".pem" },
    { key: "auto_delete_period", label: "Delete Data Older Than (Days)", type: "text" },
  ],
  // editForm: baseUrl→base_url, webdavPath→webdav_path, username, password
  // Backend /add-webdav-integration reads: baseUrl (camelCase), webdav_path, username, password.
  webdav: [
    { key: "baseUrl",            label: "Base URL",                     type: "text" },
    { key: "webdav_path",        label: "WebDAV Path",                  type: "text" },
    { key: "username",           label: "Username",                     type: "text" },
    { key: "password",           label: "Password",                     type: "password" },
    { key: "auto_delete_period", label: "Delete Data Older Than (Days)", type: "text" },
  ],
};

export const STORAGE_OPTIONS = [
  { label: "Google Drive", value: "google_drive" },
  { label: "Dropbox", value: "dropbox" },
  { label: "Amazon - S3 Bucket", value: "amazon_s3" },
  { label: "Microsoft OneDrive", value: "microsoft_onedrive" },
  { label: "Microsoft SharePoint", value: "microsoft_sharepoint" },
  { label: "Zoho Work Drive", value: "zoho_work_drive" },
  { label: "FTP Integration", value: "ftp" },
  { label: "SFTP Integration", value: "sftp" },
  { label: "WebDav", value: "webdav" },
];

/**
 * Derive the STORAGE_FIELD_CONFIG key from the display name returned by the API.
 * Normalises both strings to lowercase alphanumeric before comparing.
 */
export function getStorageTypeValueFromName(name) {
  const normalize = (s) => (s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const norm = normalize(name);
  const match = STORAGE_OPTIONS.find((o) => normalize(o.label) === norm);
  return match?.value ?? null;
}

// ─── API calls ────────────────────────────────────────────────────────────────

export const getStorageTypeWithData = async () => {
  try {
    const { data } = await apiService.apiInstance.get("/storage/get-storage-type-with-data");
    return { success: true, data: data?.data ?? [] };
  } catch (error) {
    console.error("Storage: getStorageTypeWithData error", error);
    return { success: false, data: [] };
  }
};

export const getStorageTypes = async () => {
  try {
    const { data } = await apiService.apiInstance.get("/storage/get-storage-types");
    return { success: true, data: data?.data ?? [] };
  } catch (error) {
    console.error("Storage: getStorageTypes error", error);
    return { success: false, data: [] };
  }
};

export const addStorageData = async (payload) => {
  try {
    const { data } = await apiService.apiInstance.post("/storage/add-storage-data", payload);
    return ok(data);
  } catch (error) {
    console.error("Storage: addStorageData error", error);
    return fail(error, "Failed to add storage");
  }
};

// SFTP requires multipart/form-data because the backend route is wrapped in
// multer().single("file"). PEM file is optional — backend falls back to password auth.
// Mirrors PHP SettingsController::addStorageSFTP — same endpoint, same field names,
// same multipart parts (no storage_type_id; backend hardcodes "7").
export const addSftpIntegration = async ({ host, username, password, port, ftp_path, auto_delete_period, note, pemFile }) => {
  try {
    const fd = new FormData();
    fd.append("host", host ?? "");
    fd.append("username", username ?? "");
    fd.append("password", password ?? "");
    fd.append("port", port || "22");
    fd.append("ftp_path", ftp_path ?? "");
    fd.append("auto_delete_period", auto_delete_period ?? "");
    fd.append("note", note ?? "");
    if (pemFile instanceof File) fd.append("file", pemFile);
    const { data } = await apiService.apiInstance.post(
      "/storage/add-sftp-integration",
      fd,
      { headers: { "Content-Type": "multipart/form-data" } }
    );
    return ok(data);
  } catch (error) {
    console.error("Storage: addSftpIntegration error", error);
    return fail(error, "Failed to add SFTP integration");
  }
};

export const addWebdavIntegration = async (payload) => {
  try {
    const { data } = await apiService.apiInstance.post("/storage/add-webdav-integration", payload);
    return ok(data);
  } catch (error) {
    console.error("Storage: addWebdavIntegration error", error);
    return fail(error, "Failed to add WebDAV integration");
  }
};

export const updateStorageData = async (payload) => {
  try {
    // Backend Joi validator requires storage_data_id / storage_type_id as Numbers.
    const normalized = {
      ...payload,
      ...(payload.storage_data_id !== undefined && { storage_data_id: Number(payload.storage_data_id) }),
      ...(payload.storage_type_id !== undefined && { storage_type_id: Number(payload.storage_type_id) }),
    };
    const { data } = await apiService.apiInstance.put("/storage/update-storage-data", normalized);
    return ok(data);
  } catch (error) {
    console.error("Storage: updateStorageData error", error);
    return fail(error, "Failed to update storage");
  }
};

export const deleteStorageData = async (storageDataId) => {
  try {
    // Backend inconsistency: the delete endpoint's ValidateId uses Joi.string()
    // (whereas update/updateOption use Joi.number()). Send a string here — a
    // number gets rejected by the validator and the controller returns a
    // misleading hardcoded "storage_data_id Must Be Number" message.
    const { data } = await apiService.apiInstance.delete("/storage/delete-storage-data", {
      data: { storage_data_id: String(storageDataId) },
    });
    return ok(data);
  } catch (error) {
    console.error("Storage: deleteStorageData error", error);
    return fail(error, "Failed to delete storage");
  }
};

export const updateStorageOption = async (storageDataId) => {
  try {
    const { data } = await apiService.apiInstance.put("/storage/update-storage-option", {
      storage_data_id: Number(storageDataId),
      status: "1",
    });
    return ok(data);
  } catch (error) {
    console.error("Storage: updateStorageOption error", error);
    return fail(error, "Failed to activate storage");
  }
};
