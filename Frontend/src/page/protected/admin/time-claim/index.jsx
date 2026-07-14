import React from 'react'
import { HandCoins } from 'lucide-react'
import EmpTimeclaim from '@/components/common/timeclaim/EmpTimeclaim'

export const TimeClaim = () => (
  <div className="bg-slate-200 w-full min-h-screen p-5">
    {/* Admin can review/approve requests but not raise them — hide "Create
        Request". Non-admin (manager) and employee pages keep it. */}
    <EmpTimeclaim isAdmin />
  </div>
)
