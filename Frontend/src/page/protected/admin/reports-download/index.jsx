import React from 'react'
import { Download } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import EmpReportsDownload from '@/components/common/reports-download/EmpReportsDownload'

const Placeholder = ({ title, description, Icon }) => (
  <div className="bg-slate-200 w-full min-h-screen p-5">
    <EmpReportsDownload />
  </div>
)

const ReportsDownload = () => {
  const { t } = useTranslation()
  return (
    <Placeholder
      title={t("reportsDownloadTitle")}
      description={t("reportsDownloadDescription")}
      Icon={Download}
    />
  )
}

export default ReportsDownload
