import React from 'react'
import { BellRing } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import EmpAlerts from '@/components/common/alerts/EmpAlerts'

const Placeholder = ({ title, description, Icon }) => (
  <div className="bg-slate-200 w-full min-h-screen p-5">
   <EmpAlerts />
  </div>
)

const Alerts = () => {
  const { t } = useTranslation()
  return (
    <Placeholder
      title={t("alertsTitle")}
      description={t("alertsDescription")}
      Icon={BellRing}
    />
  )
}

export default Alerts
