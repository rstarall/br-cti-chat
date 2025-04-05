'use client'; // 必须添加这个指令

import { Layout } from 'antd';
import Sidebar from './Sidebar';
import ChatHeader from './Header';
import React, { useState, useCallback, useEffect, createContext, useContext } from 'react';
const { Content, Sider, Header } = Layout;

const defaultSiderWidth = 340;
// 创建宽度上下文
interface SiderWidthContextType {
  width: number;
  setWidth: (width: number) => void;
}

export const FixedSiderWidthContext = createContext<SiderWidthContextType>({
  width: defaultSiderWidth,
  setWidth: () => {}
});

export const useFixedSiderWidth = () => useContext(FixedSiderWidthContext);

export default function MainLayout({
  children,
  sideContainer,
}: {
  children: React.ReactNode;
  sideContainer: React.ReactNode;
}) {
  const [fixedSiderWidth, setFixedSiderWidth] = useState(defaultSiderWidth);
  const [siderWidth, setSiderWidth] = useState(50);
  const [siderPageWidth, setSiderPageWidth] = useState(defaultSiderWidth-50);
  
  useEffect(() => {
    setSiderWidth(50);
    setSiderPageWidth(fixedSiderWidth-50);
  }, [fixedSiderWidth]);

  const handleMouseEnter = useCallback(() => {
    setSiderWidth(140);
    setSiderPageWidth(fixedSiderWidth-140);
  }, [fixedSiderWidth]);
  
  const handleMouseLeave = useCallback(() => {
    setSiderWidth(50);
    setSiderPageWidth(fixedSiderWidth-50);
  }, [fixedSiderWidth]);
  
  return (
    <Layout className="h-screen">
      {/* Header */}
      <div className="bg-white fixed top-0 left-0 right-0 z-10 h-[50px]">
        <ChatHeader />
      </div>
      
      <Layout className="overflow-hidden h-[calc(100vh-50px)] mt-[50px]"  >
        <Sider 
          theme="light" 
          width={siderWidth}
          className="!border-r-0 border-r border-gray-200 overflow-hidden transition-all duration-300"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <Sidebar />
        </Sider>

        <Layout className="!border-r-0 w-full border-r overflow-hidden  w-full bg-white">

          <Sider 
            width={siderPageWidth}
            theme="light"
            className="!border-r-0 border-r border-gray-200"
          >
            {sideContainer}
          </Sider>

        <Content className="h-full" style={{width: `calc(100% - ${fixedSiderWidth}px)`}}>
          <FixedSiderWidthContext.Provider value={{
            width: fixedSiderWidth,
            setWidth: setFixedSiderWidth
          }}>
            {children}
          </FixedSiderWidthContext.Provider>
        </Content>
        </Layout>

        
      </Layout>
    </Layout>
  );
}