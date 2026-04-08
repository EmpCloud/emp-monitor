import React from 'react'
import { Globe } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import EmpWebAppUsage from '@/components/common/web-app-usage/EmpWebAppUsage'

const Placeholder = ({ title, description, Icon }) => (
  <div className="bg-slate-200 w-full min-h-screen p-5">
    <EmpWebAppUsage />
  </div>
)

const WebAppUsage = () => {
  const { t } = useTranslation()
  return (
    <Placeholder
      title={t("webAppUsageTitle")}
      description={t("webAppUsageDescription")}
      Icon={Globe}
    />
  )
}

export default WebAppUsage
