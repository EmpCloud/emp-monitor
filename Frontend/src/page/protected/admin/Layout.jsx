import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { AppSidebar } from "./layout/AppSidebar";
import TopHeader from "./layout/TopBar";
import { SidebarProvider, SidebarTrigger } from "../../../components/ui/sidebar";
import Footer from "./layout/Footer";

export const AdminLayout = ({ children }) => {
    const [showFooter, setShowFooter] = useState(true);
    const scrollRef = useRef(null);
    const { pathname } = useLocation();

    // Reset the inner scroll container on route change so navigating from
    // a long page (e.g. /admin/dashboard) doesn't drop the next page in at
    // the bottom of the viewport.
    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = 0;
    }, [pathname]);

    return (
        <div>
            <SidebarProvider>
                <AppSidebar />
                <main className="w-full flex flex-col  overflow-x-hidden">
                    <TopHeader />
                    <div
                        ref={scrollRef}
                        className="flex-1 max-h-[calc(100vh-70px)] overflow-y-auto flex flex-col"
                    >
                        <div className="flex-1">{children}</div>
                        <Footer show={showFooter} />
                    </div>
                </main>
            </SidebarProvider>
        </div>
    )
}