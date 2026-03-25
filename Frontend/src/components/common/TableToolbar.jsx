import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import CustomSelect from "@/components/common/elements/CustomSelect";
import { pageSizeOptions } from "@/lib/tableUtils";

export default function TableToolbar({ pageSize, onPageSizeChange, search, onSearchChange }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <span className="text-[13px] text-gray-500 font-medium">Show</span>
        <CustomSelect
          placeholder="10"
          items={pageSizeOptions}
          selected={pageSize}
          onChange={onPageSizeChange}
        />
        <span className="text-[13px] text-gray-500 font-medium">Entries</span>
      </div>
      <div className="relative w-full max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          placeholder="Search"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 h-9 rounded-full bg-gray-50 border-gray-200 text-xs"
        />
      </div>
    </div>
  );
}
