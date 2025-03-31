'use client';
import { useState } from 'react';
import { Menu } from 'antd';
import { useRouter } from 'next/navigation';
import type { MenuProps } from 'antd';
import {
    MessageOutlined,
    FolderOutlined,
    ControlOutlined,
    MergeOutlined,
  } from '@ant-design/icons';
const items: MenuProps['items'] = [
  {
    key: '/chat',
    label: '实时聊天',
    icon: <MessageOutlined />,
  },
  {
    key: '/data',
    label: '知识库',
    icon: <FolderOutlined />,
  },
  {
    key: '/kp',
    label: '知识图谱',
    icon: <MergeOutlined />,
  },
  {
    key: '/mcp',
    label: 'MCP',
    icon: <ControlOutlined />,
  },
];

export default function Sidebar() {
  const router = useRouter();
  const [current, setCurrent] = useState('/chat');

  const onClick: MenuProps['onClick'] = (e) => {
    setCurrent(e.key);
    router.push(e.key);
  };

  return (
    <div className="h-full pt-[10px] w-[150px]">
      <Menu
        mode="inline"
        selectedKeys={[current]}
        items={items}
        onClick={onClick}
      />
    </div>
  );
}