import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { foodShelters } from '../data/shelters';
import type { FoodShelter } from '../types';
import { ShelterInfoTab } from '../components/shelter/ShelterInfoTab';
import { ShelterPhotosTab } from '../components/shelter/ShelterPhotosTab';
import { ShelterCommunityTab } from '../components/shelter/ShelterCommunityTab';
import { ShelterChatTab } from '../components/shelter/ShelterChatTab';
import './ShelterPage.css';

type TabId = 'info' | 'photos' | 'community' | 'chat';

export function ShelterPage() {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState<TabId>('info');
  const [shelter, setShelter] = useState<FoodShelter | null>(null);

  useEffect(() => {
    const s = foodShelters.find((x) => x.id === id);
    setShelter(s ?? null);
    const hash = window.location.hash.slice(1);
    if (hash === 'photos' || hash === 'community' || hash === 'chat') setActiveTab(hash);
  }, [id]);

  if (!id) return <div className="page-error">Missing shelter ID</div>;
  if (!shelter) return <div className="page-error">Shelter not found</div>;

  const tabs: { id: TabId; label: string }[] = [
    { id: 'info', label: 'Info' },
    { id: 'photos', label: 'Photos' },
    { id: 'community', label: 'Community' },
    { id: 'chat', label: 'Chat' },
  ];

  return (
    <div className="shelter-page">
      <div className="shelter-page-header">
        <Link to="/" className="shelter-back">← Back to calendar</Link>
        <h1 className="shelter-page-title">{shelter.name}</h1>
      </div>
      <nav className="shelter-tabs" aria-label="Shelter sections">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`shelter-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>
      <div className="shelter-tab-content">
        {activeTab === 'info' && <ShelterInfoTab shelter={shelter} />}
        {activeTab === 'photos' && <ShelterPhotosTab shelterId={shelter.id} />}
        {activeTab === 'community' && <ShelterCommunityTab shelterId={shelter.id} />}
        {activeTab === 'chat' && <ShelterChatTab shelterId={shelter.id} />}
      </div>
    </div>
  );
}
