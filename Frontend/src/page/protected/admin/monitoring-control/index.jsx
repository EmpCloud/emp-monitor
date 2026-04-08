import React from 'react'
import { SlidersHorizontal } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import EmpMonitoringControl from '@/components/common/monitoring-control/EmpMonitoringControl'

const Placeholder = ({ title, description, Icon }) => (
  <div className="bg-slate-200 w-full min-h-screen p-5">
   <EmpMonitoringControl />
  </div>
)

const MonitoringControl = () => {
  const { t } = useTranslation()
  return (
    <Placeholder
      title={t("monitoringControlTitle")}
      description={t("monitoringControlDescription")}
      Icon={SlidersHorizontal}
    />
  )
}

export default MonitoringControl
