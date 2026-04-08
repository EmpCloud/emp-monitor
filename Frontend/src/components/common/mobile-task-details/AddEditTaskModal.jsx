import React, { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import CustomSelect from "@/components/common/elements/CustomSelect";
import { useTaskStore } from "@/page/protected/admin/mobile-task-details/taskStore";

export default function AddEditTaskModal() {
    const { t } = useTranslation();
    const open = useTaskStore((s) => s.taskModalOpen);
    const task = useTaskStore((s) => s.editingTask);
    const projects = useTaskStore((s) => s.projects);
    const folders = useTaskStore((s) => s.folders);
    const employees = useTaskStore((s) => s.employees);
    const fetchFolders = useTaskStore((s) => s.fetchFolders);
    const createAction = useTaskStore((s) => s.createTask);
    const updateAction = useTaskStore((s) => s.updateTask);
    const setModal = (v) => useTaskStore.setState({ taskModalOpen: v });

    const isEdit = !!task;

    const [form, setForm] = useState({ title: "", project: "", folder: "", employee: "" });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (open && task) {
            setForm({ title: task.title || "", project: task.project_id || "", folder: task.folder_id || "", employee: "" });
            if (task.project_id) fetchFolders(task.project_id);
        } else if (open) {
            setForm({ title: "", project: "", folder: "", employee: "" });
        }
    }, [open, task]);

    const handleProjectChange = useCallback((v) => {
        setForm((p) => ({ ...p, project: v, folder: "" }));
        fetchFolders(v);
    }, [fetchFolders]);

    const handleSubmit = useCallback(async () => {
        if (!form.title || !form.project || !form.folder) return;
        setSaving(true);
        if (isEdit) {
            await updateAction({ taskId: task._id, title: form.title, projectId: form.project, folderId: form.folder });
        } else {
            await createAction({ title: form.title, projectId: form.project, folderId: form.folder, employeeId: form.employee || undefined });
        }
        setSaving(false);
    }, [form, isEdit, task, createAction, updateAction]);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-[1px]">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4">
                <div className="flex items-center justify-between px-6 py-4 bg-blue-500 rounded-t-2xl">
                    <h3 className="text-white font-semibold">{isEdit ? t("tasks.editTask") : t("tasks.addTask")}</h3>
                    <button onClick={() => setModal(false)} className="text-white/80 hover:text-white"><X className="w-5 h-5" /></button>
                </div>
                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">{t("tasks.taskTitle")} *</label>
                        <Input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} placeholder={t("tasks.taskTitlePlaceholder")} className="h-9 text-sm" />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">{t("tasks.project")} *</label>
                        <CustomSelect placeholder={t("tasks.selectProject")} items={projects} selected={form.project} onChange={handleProjectChange} width="full" />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">{t("tasks.folder")} *</label>
                        <CustomSelect placeholder={t("tasks.selectFolder")} items={folders} selected={form.folder} onChange={(v) => setForm((p) => ({ ...p, folder: v }))} width="full" />
                    </div>
                    {!isEdit && (
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">{t("employee")}</label>
                            <CustomSelect placeholder={t("tasks.selectEmployee")} items={[{ value: "", label: t("tasks.none") }, ...employees]} selected={form.employee} onChange={(v) => setForm((p) => ({ ...p, employee: v }))} width="full" />
                        </div>
                    )}
                </div>
                <div className="flex justify-end gap-2 px-6 py-4 border-t">
                    <Button variant="outline" onClick={() => setModal(false)}>{t("common.cancel")}</Button>
                    <Button className="bg-blue-500 hover:bg-blue-600" onClick={handleSubmit} disabled={saving}>
                        {saving ? t("projects.saving") : isEdit ? t("common.update") : t("common.create")}
                    </Button>
                </div>
            </div>
        </div>
    );
}
