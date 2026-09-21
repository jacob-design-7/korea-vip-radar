import type { ReactNode } from "react";

export const metadata = { title: "Korea VIP Radar", description: "Evidence-first VIP opportunity radar" };

export default function RootLayout({children}:{children:ReactNode}) {
  return <html lang="ko"><body style={{margin:0}}>{children}</body></html>;
}
