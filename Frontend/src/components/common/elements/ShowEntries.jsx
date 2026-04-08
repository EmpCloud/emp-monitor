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
        <SelectTrigger className="h-8 w-16 text-[13px] rounded-lg border-gray-200">
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
