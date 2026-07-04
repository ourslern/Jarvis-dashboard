import { useEffect, useState } from "react";

const API_URL = "http://192.168.1.29:5055/api/status";

export function useStatus() {
  const [status, setStatus] = useState(null);

  useEffect(() => {
    async function loadStatus() {
      try {
        const res = await fetch(API_URL);
        const data = await res.json();
        setStatus(data);
      } catch (err) {
        console.error("Status fetch failed:", err);
      }
    }

    loadStatus();
    const timer = setInterval(loadStatus, 2000);
    return () => clearInterval(timer);
  }, []);

  return status;
}
