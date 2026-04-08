import React from 'react'
import { BellDot } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import EmpAlertNotification from '@/components/common/alert-notification/EmpAlertNotification'

const Placeholder = ({ title, description, Icon }) => (
  <div className="bg-slate-200 w-full min-h-screen p-5">
   <EmpAlertNotification />
  </div>
)

const AlertNotification = () => {
  const { t } = useTranslation()
  return (
    <Placeholder
      title={t("alertNotificationTitle")}
      description={t("alertNotificationDescription")}
      Icon={BellDot}
    />
  )
}

export default AlertNotification
