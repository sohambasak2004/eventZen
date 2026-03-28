import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import Footer from "./Footer";

function AppLayout({ children }) {
  return (
    <div className="app-shell">
      <Navbar />
      <div className="app-content-wrap">
        <Sidebar />
        <main className="app-main">{children}</main>
      </div>
      <Footer />
    </div>
  );
}

export default AppLayout;
