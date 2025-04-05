import type { Metadata } from "next";
import { AntdRegistry } from '@ant-design/nextjs-registry';
import { ConfigProvider } from 'antd';
import MainLayout from '@/components/MainLayout/Index';
import "@/app/globals.css";

export const metadata: Metadata = {
  title: "B&R Security Chat", 
  description: "B&R Security Chat",
};

export default function RootLayout({
  children,
  sideContainer,
}: Readonly<{
  children: React.ReactNode;
  sideContainer: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <AntdRegistry>
          <ConfigProvider
            theme={{
              components: {
                Layout: {
                  headerBg: '#ffffff'
                }
              }
            }}
          >
            <MainLayout sideContainer={sideContainer}>
              {children}
            </MainLayout>
          </ConfigProvider>
        </AntdRegistry>
      </body>
    </html>
  );
}