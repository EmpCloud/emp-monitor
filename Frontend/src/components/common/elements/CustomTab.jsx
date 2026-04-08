import React from 'react'
import { useTranslation } from "react-i18next"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const CustomTab = ({onChange, value}) => {
  const { t } = useTranslation()
  return (
    <div>
            <Tabs value={value || "today"} onValueChange={onChange} defaultValue="today">
              <TabsList className="bg-slate-100 rounded-full p-1">
                {[["today",t("tab_today")],["yesterday",t("tab_yesterday")],["thisweek",t("tab_this_week")]].map(([v,l]) => (
                  <TabsTrigger key={v} value={v}
                    className="rounded-full px-3 sm:px-4 py-1.5 text-xs sm:text-sm font-semibold data-[state=active]:bg-blue-500 data-[state=active]:text-white text-slate-500 transition-all"
                  >{l}</TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
    </div>
  )
}

export default CustomTab