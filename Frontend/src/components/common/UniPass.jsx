import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

const UniPass = ({ isOpen, onClose }) => {
    const { t } = useTranslation();
    const [showPassword, setShowPassword] = useState(false);
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md !rounded-xl p-0 text-white">
        <DialogHeader className=" bg-gradient-to-r from-[#727DFB] to-[#4B4395] p-4 rounded-xl text-white">
          <h2 className="text-lg font-semibold ">{t("unipass_uninstall_password")}</h2>
        </DialogHeader>
         <div className="px-5 pb-4">
            <label className="text-sm text-gray-600">{t("emp_password")}</label>
         <div className="relative  py-3">
            <Input
              type={showPassword ? "text" : "password"}
              placeholder={t("unipass_enter_password")}
              className="pr-10 text-black"
            />

            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
            >
              {showPassword ? (
                <Eye size={18} />
              ) : (
                <EyeOff size={18} />
              )}
            </button>
          </div>

        <div className="flex justify-end gap-3 mt-6">
          <Button
            onClick={onClose}
            className="px-4 py-2 rounded-full bg-gray-300 text-black/70"
          >
            {t("close")}
          </Button>

          <Button className="px-4 py-2 rounded-full bg-blue-600 text-white">
            {t("unipass_update")}
          </Button>
        </div>
        </div>

      </DialogContent>
    </Dialog>
  );
};

export default UniPass;