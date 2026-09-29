import "./globals.css";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";

export const metadata = {
  title: "Incident Intelligence — Operational Memory & AI SRE Agent",
  description: "Every incident teaches the system how to handle the next one.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-[#FAFAF8] text-[#242424] min-h-screen flex flex-col font-sans selection:bg-[#EFECE6] selection:text-[#242424]">
        <Navbar />
        <div className="flex-1 flex w-full">
          <Sidebar />
          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
