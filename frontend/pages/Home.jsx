import { useLayoutEffect, useState } from "react";

import Header from "../src/components/Header";
import BackgroundGlow from "../src/components/BackgroundGlow";
import Sidebar from "../src/components/Sidebar";
import ReportViewer from "../src/components/ReportViewer";

export default function Home() {
  const [reportData, setReportData] = useState(null);
  const [theme, setTheme] = useState(() => {
    const savedTheme = window.localStorage.getItem("astro-theme");
    if (savedTheme === "light" || savedTheme === "dark") {
      return savedTheme;
    }
    return window.matchMedia("(prefers-color-scheme: light)").matches
      ? "light"
      : "dark";
  });

  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem("astro-theme", theme);
  }, [theme]);

  return (
    <div className="app-shell relative min-h-screen lg:h-screen">
      <BackgroundGlow />

      <div className="relative z-10 min-h-screen lg:h-full flex flex-col">
        <Header
          theme={theme}
          toggleTheme={() => setTheme((current) => current === "dark" ? "light" : "dark")}
        />

        <main
          className="flex-1
    min-h-0

    grid
    grid-cols-1
    lg:grid-cols-[330px_1fr]

    lg:overflow-hidden
          "
        >
          <Sidebar setReportData={setReportData} />
          <ReportViewer reportData={reportData} />
        </main>
      </div>
    </div>
  );
}
