"use client";
import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
export default function ThemeToggle() {
  const [dark, setDark] = useState(true);
  useEffect(() => setDark(document.documentElement.classList.contains("dark")), []);
  const toggle = () => { const n = !dark; setDark(n); document.documentElement.classList.toggle("dark", n); localStorage.setItem("skb-theme", n ? "dark" : "light"); };
  return <button onClick={toggle} aria-label="Temayı değiştir" className="rounded-xl p-2 hover:bg-accent/10">{dark ? <Sun size={20} /> : <Moon size={20} />}</button>;
}
