/**
 * Shared form fields used by both RegisterEmployeeModal and EditEmployeeModal.
 */
import { useRef } from "react";
import { Eye, EyeOff, Info, ImagePlus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { TIMEZONES } from "./useEmployeeForm";

function Field({ label, required, error, children }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[13px] font-bold text-gray-800">
        {label} {required && <span className="text-red-500">*</span>}
      </Label>
      {children}
      {error && <p className="text-[11px] text-red-500">{error}</p>}
    </div>
  );
}

export default function EmployeeFormBody({
  form, set, errors,
  showPassword, setShowPassword,
  showConfirmPassword, setShowConfirmPassword,
  locations = [], roles = [], shifts = [],
  departments = [], deptLoading = false,
  isEdit = false,
}) {
  const fileInputRef = useRef(null);

  return (
    <div className="px-8 pt-6 pb-2 space-y-5">
      {/* First / Last Name */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-5">
        <Field label="First Name" required error={errors.firstName}>
          <Input placeholder="Enter First Name" value={form.firstName}
            onChange={(e) => set("firstName", e.target.value)}
            className="h-11 rounded-xl border-gray-300 text-[13px] px-5" />
        </Field>
        <Field label="Last Name" required error={errors.lastName}>
          <Input placeholder="Enter Last Name" value={form.lastName}
            onChange={(e) => set("lastName", e.target.value)}
            className="h-11 rounded-xl border-gray-300 text-[13px] px-5" />
        </Field>
      </div>

      {/* Email / Password */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-5">
        <Field label="Email Address" required error={errors.email}>
          <Input type="email" placeholder="Enter Email" value={form.email}
            onChange={(e) => set("email", e.target.value)}
            className="h-11 rounded-xl border-gray-300 text-[13px] px-5" />
        </Field>
        <Field label={isEdit ? "New Password (leave blank to keep)" : "Password"} required={!isEdit} error={errors.password}>
          <div className="relative">
            <Input type={showPassword ? "text" : "password"} placeholder="Password"
              value={form.password} onChange={(e) => set("password", e.target.value)}
              className="h-11 rounded-xl border-gray-300 text-[13px] px-5 pr-11" />
            <button type="button" onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-500 hover:text-blue-700">
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {!isEdit && (
            <p className="text-[10px] text-gray-400 leading-[1.4] mt-1 px-1 italic">
              Min 8 chars, at least one number and one special character.
            </p>
          )}
        </Field>
      </div>

      {/* Confirm Password / Mobile */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-5">
        <Field label="Confirm Password" required={!isEdit} error={errors.confirmPassword}>
          <div className="relative">
            <Input type={showConfirmPassword ? "text" : "password"} placeholder="Confirm Password"
              value={form.confirmPassword} onChange={(e) => set("confirmPassword", e.target.value)}
              className="h-11 rounded-xl border-gray-300 text-[13px] px-5 pr-11" />
            <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-500 hover:text-blue-700">
              {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </Field>
        <Field label="Mobile Number" error={errors.mobile || errors.countryCode}>
          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-1 h-11 px-3 rounded-xl border bg-white flex-shrink-0 ${errors.countryCode ? "border-red-400" : "border-gray-300"}`}>
              <span className="text-[13px] text-gray-500">+</span>
              <Input type="text" value={form.countryCode}
                onChange={(e) => set("countryCode", e.target.value.replace(/\D/g, "").slice(0, 4))}
                className="h-7 w-10 border-0 shadow-none text-[13px] px-1 text-center focus-visible:ring-0" />
            </div>
            <Input type="tel" placeholder="Phone Number" value={form.mobile}
              onChange={(e) => set("mobile", e.target.value.replace(/\D/g, ""))}
              className={`h-11 rounded-xl text-[13px] px-5 flex-1 ${errors.mobile ? "border-red-400" : "border-gray-300"}`} />
          </div>
        </Field>
      </div>

      {/* Employee Code / Location */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-5">
        <Field label="Employee Code" required error={errors.employeeCode}>
          <Input placeholder="Employee Code" value={form.employeeCode}
            onChange={(e) => set("employeeCode", e.target.value)}
            className="h-11 rounded-xl border-gray-300 text-[13px] px-5" />
        </Field>
        <Field label="Location" required error={errors.locationId}>
          <Select value={form.locationId} onValueChange={(v) => { set("locationId", v); set("departmentId", ""); }}>
            <SelectTrigger className="h-11 rounded-xl w-full border-gray-300 text-[13px] px-5">
              <SelectValue placeholder="Select Location" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              {locations.map((l) => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
      </div>

      {/* Role / Department */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-5">
        <Field label="Role" required error={errors.roleId}>
          <Select value={form.roleId} onValueChange={(v) => set("roleId", v)}>
            <SelectTrigger className="h-11 rounded-xl w-full border-gray-300 text-[13px] px-5">
              <SelectValue placeholder="Select Role" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              {roles.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Department" required error={errors.departmentId}>
          <Select value={form.departmentId} onValueChange={(v) => set("departmentId", v)}
            disabled={!form.locationId || deptLoading}>
            <SelectTrigger className="h-11 rounded-xl w-full border-gray-300 text-[13px] px-5">
              <SelectValue placeholder={deptLoading ? "Loading…" : "Select Department"} />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              {departments.map((d) => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
      </div>

      {/* Timezone / Date of Joining */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-5">
        <Field label="Timezone" required error={errors.timezone}>
          <Select value={form.timezone} onValueChange={(v) => set("timezone", v)}>
            <SelectTrigger className="h-11 rounded-xl w-full border-gray-300 text-[13px] px-5">
              <SelectValue placeholder="Select Timezone" />
            </SelectTrigger>
            <SelectContent className="rounded-xl max-h-48">
              {TIMEZONES.map((tz) => <SelectItem key={tz.value} value={tz.value}>{tz.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Date Of Joining">
          <Input type="date" value={form.dateOfJoining}
            onChange={(e) => set("dateOfJoining", e.target.value)}
            className="h-11 rounded-xl border-gray-300 text-[13px] px-5" />
        </Field>
      </div>

      {/* Profile Picture / Shift */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-5">
        <Field label="Profile Picture" extra={<Info size={14} className="text-blue-500 inline ml-1" />}>
          <div onClick={() => fileInputRef.current?.click()}
            className="relative h-11 rounded-xl border border-gray-300 bg-white flex items-center px-5 cursor-pointer hover:border-blue-300 transition-colors">
            <span className="text-[13px] text-gray-400 flex-1 truncate">
              {form.profilePicture ? form.profilePicture.name : "Choose file…"}
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center ml-2">
              <ImagePlus size={16} className="text-blue-500" />
            </div>
            <input ref={fileInputRef} type="file" accept="image/*"
              onChange={(e) => set("profilePicture", e.target.files?.[0] || null)}
              className="hidden" />
          </div>
        </Field>
        <Field label="Select Shift">
          <Select value={form.shift} onValueChange={(v) => set("shift", v)}>
            <SelectTrigger className="h-11 rounded-xl w-full border-gray-300 text-[13px] px-5">
              <SelectValue placeholder="Select Shift" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              {shifts.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
      </div>

      {/* Address */}
      <div className="space-y-1.5">
        <textarea placeholder="Address" value={form.address}
          onChange={(e) => set("address", e.target.value)}
          rows={3}
          className="w-full rounded-2xl border border-gray-300 text-[13px] px-5 py-3 resize-none focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 placeholder:text-gray-400" />
      </div>
    </div>
  );
}
