import React from 'react'
import { Briefcase } from 'lucide-react'

export const Clients = () => (
  <div className="bg-slate-200 w-full min-h-screen p-5">
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 flex flex-col items-center justify-center text-center gap-4">
      <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center">
        <Briefcase className="w-8 h-8 text-blue-500" />
      </div>
      <h1 className="text-gray-800" style={{ fontSize: "21px", lineHeight: "18px" }}><span className="font-semibold">Clients</span></h1>
      <p className="text-sm text-gray-400 max-w-sm">
        Manage client accounts, assignments and billing information.
      </p>
      <span className="mt-2 inline-block rounded-full bg-blue-50 px-4 py-1 text-xs font-semibold text-blue-500">
        Coming Soon
      </span>
    </div>
  </div>
)
