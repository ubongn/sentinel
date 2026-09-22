import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import { Navbar } from "./components/Navbar";
import { Footer } from "./components/Footer";
import { Landing } from "./pages/Landing";
import { Dashboard } from "./pages/Dashboard";
import { CreatePolicy } from "./pages/CreatePolicy";
import { AgentManagement } from "./pages/AgentManagement";
import { ActivityFeed } from "./pages/ActivityFeed";
import { Docs } from "./pages/Docs";

export default function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <Navbar />
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: "#1a1a2e",
              border: "1px solid rgba(139,92,246,0.2)",
              color: "#f1f5f9",
              borderRadius: "12px",
              fontFamily: "inherit",
            },
          }}
          theme="dark"
        />
        <main className="main">
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/create-policy" element={<CreatePolicy />} />
            <Route path="/agents" element={<AgentManagement />} />
            <Route path="/activity" element={<ActivityFeed />} />
            <Route path="/docs" element={<Docs />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </BrowserRouter>
  );
}
