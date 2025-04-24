// app/(main)/@sideContainer/files/page.tsx
'use client';

import { Upload, Table, Button } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';

interface DataType {
  key: string;
  name: string;
  size: string;
  time: string;
}

const columns: ColumnsType<DataType> = [
  { title: '文件名', dataIndex: 'name' },
  { title: '大小', dataIndex: 'size' },
  { title: '修改时间', dataIndex: 'time' }
];

const dataSource: DataType[] = [];

export default function KGSideContainer() {


  return (
    <div className="h-full flex flex-col p-2">
      <div className="flex justify-start items-center border-b p-4">
        <Upload action={'/upload'} method="POST" showUploadList={false}>
          <Button type="primary" block icon={<UploadOutlined />}>
            上传文件
          </Button>
        </Upload>
      </div>
    </div>
  );
}