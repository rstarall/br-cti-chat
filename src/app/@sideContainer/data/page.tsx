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

export default function DataSideContainer() {
  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b">
        <Upload>
          <Button type="primary" block icon={<UploadOutlined />}>
            上传文件
          </Button>
        </Upload>
      </div>
      <Table<DataType>
        columns={columns}
        dataSource={dataSource}
        className="flex-1"
        pagination={false}
        rowKey="key"
      />
    </div>
  );
}