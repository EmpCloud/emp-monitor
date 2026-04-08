import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Eye, EyeOff } from "lucide-react";
import CustomSelect from "@/components/common/elements/CustomSelect";
import {
  STORAGE_FIELD_CONFIG,
  getStorageTypeValueFromName,
  getStorageTypes,
  addStorageData,
  updateStorageData,
} from "./service";

function buildEmptyForm(storageTypeValue) {
  const fields = STORAGE_FIELD_CONFIG[storageTypeValue] ?? [];
  return Object.fromEntries(fields.map((f) => [f.key, ""]));
}

function buildFormFromItem(item) {
  const fields = STORAGE_FIELD_CONFIG[item.storage_type_value] ?? [];
  return Object.fromEntries(fields.map((f) => {
    // PHP sends tenantId (camelCase) but API response stores it as tenant_id (snake_case)
    const value = f.key === "tenantId" ? (item.tenantId ?? item.tenant_id ?? "") : (item[f.key] ?? "");
    return [f.key, value];
  }));
}

export default function AddStorageModal({ open, onOpenChange, editItem, onSuccess }) {
  const { t } = useTranslation();
  const isEdit = Boolean(editItem);

  // API-fetched storage types: [{ label, value (config key), providerId (numeric) }]
  const [typeOptions, setTypeOptions] = useState([]);
  const [storageType, setStorageType] = useState("");   // config key e.g. "amazon_s3"
  const [providerId, setProviderId] = useState(null);   // numeric ID from API
  const [formValues, setFormValues] = useState({});
  const [showPassword, setShowPassword] = useState({});
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // Fetch available storage types from API once per open
  useEffect(() => {
    if (!open) return;
    getStorageTypes().then(({ data }) => {
      const options = data.map((t) => ({
        label: t.name,
        value: String(t.id),          // use ID as select value
        configKey: getStorageTypeValueFromName(t.name),
        providerId: t.id,
      }));
      setTypeOptions(options);
    });
  }, [open]);

  // Populate form on open
  useEffect(() => {
    if (!open) return;
    if (isEdit && editItem) {
      setStorageType(editItem.storage_type_value ?? "");
      setProviderId(editItem.storage_type_id ?? null);
      setFormValues(buildFormFromItem(editItem));
      setNote(editItem.note ?? "");
    } else {
      setStorageType("");
      setProviderId(null);
      setFormValues({});
      setNote("");
    }
    setShowPassword({});
    setError("");
  }, [open, editItem]);

  // Reset form fields when storage type changes (add mode only)
  useEffect(() => {
    if (!isEdit) {
      setFormValues(buildEmptyForm(storageType));
      setShowPassword({});
    }
  }, [storageType]);

  const fields = STORAGE_FIELD_CONFIG[storageType] ?? [];

  const handleTypeChange = (selectedId) => {
    if (isEdit) return;
    const opt = typeOptions.find((o) => o.value === selectedId);
    setStorageType(opt?.configKey ?? "");
    setProviderId(opt?.providerId ?? null);
  };

  // The value shown in the select (string ID for add, match by providerId for edit)
  const selectValue = isEdit
    ? String(editItem?.storage_type_id ?? "")
    : typeOptions.find((o) => o.configKey === storageType)?.value ?? "";

  const handleFieldChange = (key, value) => {
    setFormValues((prev) => ({ ...prev, [key]: value }));
    setError("");
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  const handleSubmit = async () => {
    if (!storageType || !providerId) {
      setError(t("storage_select_type_error"));
      return;
    }
    for (const field of fields) {
      if (!formValues[field.key]?.trim()) {
        setError(`${field.label} ${t("storage_field_required")}`);
        return;
      }
    }

    setSaving(true);
    setError("");

    const payload = { storage_type_id: providerId, ...formValues, note };

    let result;
    if (isEdit) {
      payload.storage_data_id = editItem.storage_data_id;
      result = await updateStorageData(payload);
    } else {
      result = await addStorageData(payload);
    }

    setSaving(false);

    if (result) {
      onSuccess?.();
      handleClose();
    } else {
      setError(t("storage_save_failed"));
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-[95vw] sm:max-w-[550px] rounded-xl p-0 border-0 shadow-2xl overflow-visible gap-0 [&>button:last-child]:hidden">
        {/* Header */}
        <div
          className="relative px-7 py-5 flex items-center justify-between rounded-t-lg"
          style={{
            background: "linear-gradient(135deg, #818cf8 0%, #6366f1 50%, #7c3aed 100%)",
          }}
        >
          <h2 className="text-white text-xl font-bold tracking-tight">
            {isEdit ? t("storage_edit_title") : t("storage_add_title")}
          </h2>
          <DialogClose className="text-white hover:text-white/80 transition-colors focus:outline-none focus:ring-2 focus:ring-white/40">
            <X className="h-5 w-5" />
            <span className="sr-only">{t("close")}</span>
          </DialogClose>
        </div>

        {/* Body */}
        <div className="px-7 pt-6 pb-2 space-y-4 max-h-[65vh] overflow-y-auto">
          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <div>
            <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">
              {t("storage_type")} <span className="text-red-500">*</span>
            </label>
            <CustomSelect
              placeholder={t("storage_select_type")}
              items={typeOptions}
              selected={selectValue}
              onChange={handleTypeChange}
              width="full"
              disabled={isEdit}
            />
          </div>

          {fields.map((field) => (
            <div key={field.key}>
              <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">
                {field.label} <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Input
                  type={
                    field.type === "password" && !showPassword[field.key]
                      ? "password"
                      : "text"
                  }
                  value={formValues[field.key] ?? ""}
                  onChange={(e) => handleFieldChange(field.key, e.target.value)}
                  placeholder={`${t("storage_enter_prefix")} ${field.label}`}
                  className="h-10 text-[13px] pr-10"
                />
                {field.type === "password" && (
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    onClick={() =>
                      setShowPassword((prev) => ({
                        ...prev,
                        [field.key]: !prev[field.key],
                      }))
                    }
                  >
                    {showPassword[field.key] ? (
                      <EyeOff size={15} />
                    ) : (
                      <Eye size={15} />
                    )}
                  </button>
                )}
              </div>
            </div>
          ))}

          {storageType && (
            <div>
              <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">
                {t("note")}
              </label>
              <Input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={t("storage_optional_note")}
                className="h-10 text-[13px]"
              />
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="border-t border-gray-200 mx-7 mt-4" />

        {/* Footer */}
        <div className="px-7 py-5 flex items-center justify-end gap-3">
          <DialogClose asChild>
            <Button
              variant="outline"
              className="h-10 px-6 rounded-full text-[14px] font-semibold"
              disabled={saving}
            >
              {t("cancel")}
            </Button>
          </DialogClose>
          <Button
            onClick={handleSubmit}
            disabled={saving || !storageType}
            className="h-10 px-6 rounded-full bg-blue-500 hover:bg-blue-600 text-white text-[14px] font-semibold shadow-sm disabled:opacity-50"
          >
            {saving ? t("storage_saving") : isEdit ? t("storage_save_changes") : t("add")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
