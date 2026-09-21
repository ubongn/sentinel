import { BrowserRouter, Routes, Route } from "react-router-dom";
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
