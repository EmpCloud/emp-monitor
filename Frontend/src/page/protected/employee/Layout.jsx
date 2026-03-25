import { EmployeeAppSidebar } from "./layout/AppSidebar";
import EmployeeTopBar         from "./layout/TopBar";
import { SidebarProvider }    from "@/components/ui/sidebar";
import Footer                 from "../admin/layout/Footer";

export const EmployeeLayout = ({ children }) => {
  return (
    <div>
      <SidebarProvider>
        <EmployeeAppSidebar />
        <main className="w-full flex flex-col overflow-x-hidden">
          <EmployeeTopBar />
          <div className="flex-1 max-h-[calc(100vh-70px)] overflow-y-auto">
            {children}
            <Footer show={true} />
          </div>
        </main>
      </SidebarProvider>
    </div>
  );
};
