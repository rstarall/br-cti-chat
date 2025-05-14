'use client'
import React, { useState, useRef } from 'react'
import { UploadOutlined } from '@ant-design/icons'

export default function UploadPage() {
  const [uploadResult, setUploadResult] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFileSelectAndUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setLoading(true)
    const formData = new FormData()
    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i])
    }

    try {
      const res = await fetch('http://localhost:8000/upload/with_embedding', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      setUploadResult(data.files)
    } catch (err) {
      console.error('上传失败:', err)
    } finally {
      setLoading(false)
      if (inputRef.current) inputRef.current.value = '' // 清空选择
    }
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">📄 文档上传</h1>

      {/* 隐藏真实文件选择器 */}
      <input
        ref={inputRef}
        type="file"
        multiple
        onChange={handleFileSelectAndUpload}
        className="hidden"
      />

      {/* 自定义按钮 */}
      <button
        onClick={() => inputRef.current?.click()}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
      >
        <UploadOutlined />
        {loading ? '上传中...' : '选择文件并上传'}
      </button>

      <div className="mt-6">
        <h2 className="text-lg font-semibold mb-2">上传结果：</h2>
        <ul className="space-y-2">
          {uploadResult.map((file, idx) => (
            <li key={idx} className="border p-4 rounded bg-gray-50">
              <div><strong>文件名：</strong>{file.filename}</div>
              <div><strong>状态：</strong>{file.status}</div>
              {/* {file.hash && (
                <>
                  <div><strong>Hash：</strong>{file.hash}</div>
                  <div><strong>保存名：</strong>{file.saved_as}</div>
                </>
              )} */}
              {file.error && (
                <div className="text-red-600"><strong>错误：</strong>{file.error}</div>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
