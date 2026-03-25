import PaginationComponent from "@/components/common/Pagination";

export default function PaginationFooter({ currentPage, totalPages, pageSize, filteredLength, pagedLength, onPageChange }) {
  const size = Number(pageSize);
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1 py-2">
      <p className="text-[13px] text-gray-500">
        Showing <span className="font-bold text-gray-700">{pagedLength ? (currentPage - 1) * size + 1 : 0}</span> to{" "}
        <span className="font-bold text-gray-700">{Math.min(currentPage * size, filteredLength)}</span> of{" "}
        <span className="font-bold text-blue-600">{filteredLength}</span>
      </p>
      <PaginationComponent currentPage={currentPage} totalPages={totalPages} onPageChange={onPageChange} />
    </div>
  );
}
