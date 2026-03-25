import React, { useEffect } from "react";
import EmpProductivityRule from "@/components/common/productivity-rules/EmpProductivityRule";
import { useProductivityRulesStore } from "@/page/protected/admin/productivity-rules/productivityRulesStore";

const NonAdminProductivityRules = () => {
  const loadInitial = useProductivityRulesStore((s) => s.loadInitial);

  useEffect(() => {
    loadInitial();
  }, [loadInitial]);

  return (
    <div className="bg-slate-200 w-full min-h-screen p-5">
      <EmpProductivityRule />
    </div>
  );
};

export default NonAdminProductivityRules;
