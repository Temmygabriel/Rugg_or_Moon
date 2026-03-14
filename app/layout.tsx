import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Rug or Moon — GenLayer",
  description:
    "AI generates a fake crypto project. You call RUG or MOON. The AI reveals the truth. Powered by GenLayer.",
  openGraph: {
    title: "Rug or Moon",
    description: "The web3 degen party game on GenLayer",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/logo/mark.svg" type="image/svg+xml" />
      </head>
      <body style={{ margin: 0, padding: 0, background: "#05050f" }}>
        {children}
      </body>
    </html>
  );
}
