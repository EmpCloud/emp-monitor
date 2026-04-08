import React from "react";
import { useTranslation } from "react-i18next";
import { FileText } from "lucide-react";

const Footer = ({ show }) => {
  const { t } = useTranslation();
  if (!show) return null;

  return (
    <footer className="w-full bg-slate-200  px-6 py-3 flex flex-col-reverse sm:flex-row gap-2 items-center justify-between mt-auto">
      <div className="text-gray-500 text-[10px]  sm:text-sm font-medium">
        {t("footer_copyright")} {new Date().getFullYear()} © EmpMonitor {t("footer_all_rights")}
      </div>

      {/* <button className="flex items-center gap-2 bg-[#0061ff] hover:bg-[#0051d5] text-white text-xs 2xl:px-2 px-4 py-2 rounded-lg transition-colors duration-200 font-medium">
        <FileText size={18} />
        <span>Download Report</span>
      </button> */}
    </footer>
  );
};

export default Footer;
