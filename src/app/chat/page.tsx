'use client';
import Chat from '@/components/MainLayout/Chat';
import { useFixedSiderWidth } from '@/components/MainLayout/Index';

export default function MainPage() {
  const { width } = useFixedSiderWidth();
  return (
    <div className="h-full">
      <Chat siderWidth={width} />
    </div>
  );
}