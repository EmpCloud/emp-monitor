import { useTranslation } from "react-i18next";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const PAGE_SIZES = ["10", "25", "50", "100"];

export default function ShowEntries({ value, onChange }) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-2">
      <span className="text-[13px] text-gray-500 font-medium">{t("show")}</span>
      <Select value={String(value)} onValueChange={onChange}>
        {/* #127 — `w-20` clipped "100" behind the chevron in pages that
             use this shared component (Monitoring Control, etc). Match the
             w-24 used by the inline pageSize selects on the other pages. */}
        <SelectTrigger className="h-8 w-24 text-[13px] rounded-lg border-gray-200">
          <SelectValue placeholder="10" />
        </SelectTrigger>
        <SelectContent className="rounded-xl">
          {PAGE_SIZES.map((n) => (
            <SelectItem key={n} value={n}>{n}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <span className="text-[13px] text-gray-500 font-medium">{t("entries")}</span>
    </div>
  );
}
