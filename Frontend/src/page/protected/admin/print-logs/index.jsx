import React from 'react'
import { Printer } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import EmpPrintLogs from '@/components/common/print-logs/EmpPrintLogs'

const Placeholder = ({ title, description, Icon }) => (
  <div className="bg-slate-200 w-full min-h-screen p-5">
    <EmpPrintLogs />
  </div>
)

const PrintLogs = () => {
  const { t } = useTranslation()
  return (
    <Placeholder
      title={t("printLogsTitle")}
      description={t("printLogsDescription")}
      Icon={Printer}
    />
  )
}

export default PrintLogs
