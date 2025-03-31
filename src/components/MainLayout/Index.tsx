'use client'; // 必须添加这个指令

import { Layout } from 'antd';
import Sidebar from './Sidebar';
import ChatHeader from './Header';
const { Content, Sider, Header } = Layout;

export default function MainLayout({
  children,
  sideContainer,
}: {
  children: React.ReactNode;
  sideContainer: React.ReactNode;
}) {
  return (
    <Layout className="h-screen">
      {/* Header */}
      <div className="bg-white fixed top-0 left-0 right-0 z-10 h-[50px]">
        <ChatHeader />
      </div>
      
      <Layout className="overflow-hidden h-[calc(100vh-50px)] mt-[50px]"  >
        <Sider theme="light" width = {150} className="!border-r-0  border-r border-gray-200 overflow-hidden w-[150px]">
          <Sidebar />
        </Sider>

        <Layout className="!border-r-0 w-full border-r overflow-hidden  w-full bg-white">

          <Sider width = {250} theme="light" className="!border-r-0 border-r border-gray-200">
            {sideContainer}
          </Sider>

        <Content className="h-full" >
            {children}
        </Content>
        </Layout>

        
      </Layout>
    </Layout>
  );
}