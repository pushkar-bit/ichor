import { redirect } from "next/navigation";
import { ShieldAlert, LogOut } from "lucide-react";
import { getIsAdminSession } from "@/lib/adminAuth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const isAdmin = await getIsAdminSession();
  if (!isAdmin) redirect("/admin/login");

  return (
    <div className="min-h-screen bg-midnight">
      <header className="flex items-center justify-between px-6 py-4 border-b border-border-ichor">
        <div className="flex items-center gap-2 font-display italic font-bold text-lg">
          <ShieldAlert className="w-5 h-5 text-ignite" /> ICHOR Admin
        </div>
        <form action="/api/admin/logout" method="POST">
          <button type="submit" className="flex items-center gap-1.5 text-sm text-white/50 hover:text-white">
            <LogOut className="w-4 h-4" /> Log out
          </button>
        </form>
      </header>
      <main>{children}</main>
    </div>
  );
}
