import { useEffect } from "react";
import EmpReportsDownload from "@/components/common/reports-download/EmpReportsDownload";
import { useNonAdminReportsDownloadStore } from "./reportsDownloadStore";
import useNonAdminSession from "@/sessions/useNonAdminSession";

const NonAdminReportsDownload = () => {
  const { nonAdmin } = useNonAdminSession();
  const setManagerId = useNonAdminReportsDownloadStore((s) => s.setManagerId);

  // Inject the logged-in manager's ID into the store before it loads
  useEffect(() => {
    const managerId = nonAdmin?.user_id ?? nonAdmin?.id ?? null;
    if (managerId) {
      setManagerId(Number(managerId));
    }
  }, [nonAdmin, setManagerId]);

  return (
    <div className="bg-slate-200 w-full min-h-screen p-5">
      <EmpReportsDownload useStore={useNonAdminReportsDownloadStore} />
    </div>
  );
};

export default NonAdminReportsDownload;
