import { useState } from "react";
import { AppSidebar } from "./layout/AppSidebar";
import TopHeader from "./layout/TopBar";
import { SidebarProvider, SidebarTrigger } from "../../../components/ui/sidebar";
import Footer from "./layout/Footer";

export const AdminLayout = ({ children }) => {
    const [showFooter, setShowFooter] = useState(true);
    return (
        <div>
            <SidebarProvider>
                <AppSidebar />
                <main className="w-full flex flex-col  overflow-x-hidden">
                    <TopHeader />
                    <div className="flex-1 max-h-[calc(100vh-70px)] overflow-y-auto flex flex-col">
                        <div className="flex-1">{children}</div>
                        <Footer show={showFooter} />
                    </div>
                </main>
            </SidebarProvider>
        </div>
    )
}