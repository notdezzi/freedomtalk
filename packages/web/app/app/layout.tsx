import AppLayout from '@/components/app/AppLayout';
import ModalRenderer from '@/components/modals/ModalRenderer';

export default function AppRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppLayout>
      {children}
      <ModalRenderer />
    </AppLayout>
  );
}
