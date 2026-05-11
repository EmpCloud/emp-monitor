import { NonAdminAppSidebar } from "./layout/AppSidebar";
import NonAdminTopBar         from "./layout/TopBar";
import { SidebarProvider }    from "@/components/ui/sidebar";
import Footer                 from "../admin/layout/Footer";

export const NonAdminLayout = ({ children }) => {
  return (
    <div>
      <SidebarProvider>
        <NonAdminAppSidebar />
        <main className="w-full flex flex-col overflow-x-hidden">
          <NonAdminTopBar />
          <div className="flex-1 max-h-[calc(100vh-70px)] overflow-y-auto flex flex-col">
            <div className="flex-1">{children}</div>
            <Footer show={true} />
          </div>
        </main>
      </SidebarProvider>
    </div>
  );
};
