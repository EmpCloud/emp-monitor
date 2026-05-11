import { createDlpStore } from "@/hooks/useDlpStore";
import { fetchLogs, fetchExport, exportCsv, exportPdf } from "./service";

export const useSystemLogsStore = createDlpStore({
    name: "Clipboard Logs",
    fetchLogs,
    fetchExport,
    exportCsv,
    exportPdf,
});
