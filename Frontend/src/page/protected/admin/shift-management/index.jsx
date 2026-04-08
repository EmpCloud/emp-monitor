import React from 'react'
import { CalendarClock } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import EmpShiftManagement from '@/components/common/shift-management/EmpShiftManagement'

const Placeholder = ({ title, description, Icon }) => (
  <div className="bg-slate-200 w-full min-h-screen p-5">
    <EmpShiftManagement />
  </div>
)

const ShiftManagement = () => {
  const { t } = useTranslation()
  return (
    <Placeholder
      title={t("shiftManagementTitle")}
      description={t("shiftManagementDescription")}
      Icon={CalendarClock}
    />
  )
}

export default ShiftManagement
