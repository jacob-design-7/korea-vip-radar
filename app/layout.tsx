import type { ReactNode } from "react";
import "./globals.css";

export const metadata = {
  title: "Korea VIP Radar",
  description: "Evidence-first Korea visit intelligence"
};

export default function RootLayout({children}:{children:ReactNode}) {
  return <html lang="ko"><body>{children}</body></html>;
}
