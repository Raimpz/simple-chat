import React, { ReactNode } from 'react';
import './Tabs.css';

interface Tab {
    id: string;
    label: string;
    content: ReactNode;
}

interface TabsProps {
    tabs: Tab[];
    activeTab: string;
    onTabChange: (tabId: string) => void;
}

const Tabs: React.FC<TabsProps> = ({ tabs, activeTab, onTabChange }) => {
    const activeTabContent = tabs.find(tab => tab.id === activeTab)?.content;

    return (
        <>
            <div className="tabs">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        className={activeTab === tab.id ? 'active' : ''}
                        onClick={() => onTabChange(tab.id)}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>
            <div className="tab-content">
                {activeTabContent}
            </div>
        </>
    );
};

export default Tabs;
