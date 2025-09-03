import { useState } from "react";
import { Navigation } from "@/components/layout/Navigation";
import { DashboardView } from "@/components/dashboard/DashboardView";
import { DriverInterface } from "@/components/driver/DriverInterface";

const Index = () => {
  const [activeView, setActiveView] = useState<"dashboard" | "driver">("dashboard");

  return (
    <div className="min-h-screen bg-background">
      <Navigation activeView={activeView} onViewChange={setActiveView} />
      <main className="container mx-auto px-6 py-6">
        {activeView === "dashboard" ? <DashboardView /> : <DriverInterface />}
      </main>
    </div>
  );
};

export default Index;
