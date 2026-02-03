import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { UserProvider } from '@/context/userContext';
import { MeetingProvider } from '@/context/meetingContext';
import { RecordingProvider } from "@/context/recordingContext";
import ClientLayout from "./ClientLayout";
import TokenRefreshManager from "./components/TokenRefreshManager";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "ARCA SPARK",
  description: "Ai ambient clinical note taking",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`} suppressHydrationWarning>
        <RecordingProvider>
        <UserProvider>
          <MeetingProvider>
            <ClientLayout>
              <TokenRefreshManager/> {children}
             
              </ClientLayout>
            </MeetingProvider>
        </UserProvider>
        </RecordingProvider>
      </body>
    </html>
  );
}
