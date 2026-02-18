import { Metadata } from 'next';
import ServerDiscoveryPage from '@/components/search/ServerDiscoveryPage';

export const metadata: Metadata = {
  title: 'Discover Servers - FreedomTalk',
  description: 'Find communities that match your interests',
};

export default function DiscoverPage() {
  return <ServerDiscoveryPage />;
}
