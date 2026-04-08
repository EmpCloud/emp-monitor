import React from 'react'
import { ClipboardList } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import EmpAlertPolicies from '@/components/common/alert-policies/EmpAlertPolicies'

const Placeholder = ({ title, description, Icon }) => (
  <div className="bg-slate-200 w-full min-h-screen p-5">
   <EmpAlertPolicies />
  </div>
)

const AlertPolicies = () => {
  const { t } = useTranslation()
  return (
    <Placeholder
      title={t("alertPoliciesTitle")}
      description={t("alertPoliciesDescription")}
      Icon={ClipboardList}
    />
  )
}

export default AlertPolicies
