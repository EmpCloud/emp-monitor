import React from 'react'
import CustomSelect from "@/components/common/elements/CustomSelect"
import DateRangeCalendar from "@/components/common/elements/DateRangeCalendar"

const ProductiveEmp = ({
  employees,
  employeeValue,
  onEmployeeChange,
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
}) => {
  return (
    <div className="flex flex-wrap items-end gap-3">
      <div>
        <p className="text-xs font-semibold text-slate-600 mb-1.5">Employee:-</p>
        <CustomSelect
          placeholder="See All Employee"
          items={employees}
          selected={employeeValue}
          onChange={onEmployeeChange}
        />
      </div>
      <div>
        <p className="text-xs font-semibold text-slate-600 mb-1.5">Select Date:-</p>
        <DateRangeCalendar
          startDate={dateFrom}
          endDate={dateTo}
          onChange={(start, end) => {
            onDateFromChange(start)
            onDateToChange(end)
          }}
        />
      </div>
    </div>
  )
}

export default ProductiveEmp
