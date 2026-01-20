import React, { useState, useEffect } from 'react';
import apiClient from '../../api';
import { UserDto, FriendRequest } from '../../types';
import Tabs from '../tabs/Tabs';
import './FriendsModal.css';

interface FriendsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const FriendsModal: React.FC<FriendsModalProps> = ({ isOpen, onClose }) => {
const [activeTab, setActiveTab] = useState<'search' | 'pending'>('search');
const [searchQuery, setSearchQuery] = useState('');
const [searchResults, setSearchResults] = useState<UserDto[]>([]);
const [searchMessage, setSearchMessage] = useState('');
const [pendingRequests, setPendingRequests] = useState<FriendRequest[]>([]);

useEffect(() => {
    if (isOpen && activeTab === 'pending') {
        fetchPendingRequests();
    }
}, [isOpen, activeTab]);

const fetchPendingRequests = async () => {
    try {
        const response = await apiClient.get<FriendRequest[]>('/friends/pending');
        setPendingRequests(response.data);
    } catch (error) {
        console.error(error);
    }
};

const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    try {
        const response = await apiClient.get<UserDto[]>(`/users/search?query=${searchQuery}`);
        setSearchResults(response.data);

        if (response.data.length === 0) setSearchMessage('No users found.');
        else setSearchMessage('');
    } catch (error) {
        console.error(error);
        setSearchMessage('Error searching users.');
    }
};

const sendFriendRequest = async (userId: number) => {
    try {
        await apiClient.post(`/friends/request/${userId}`);
        alert('Friend request sent!');
        setSearchResults((prev) => prev.filter(u => u.id !== userId));
    } catch (error) {
        alert('Failed to send request (maybe already sent?)');
    }
};

const respondToRequest = async (requestId: number, status: 'ACCEPTED' | 'DECLINED') => {
    try {
        await apiClient.post(`/friends/respond/${requestId}`, { status });
        setPendingRequests((prev) => prev.filter(req => req.id !== requestId));
    } catch (error) {
        console.error(error);
        alert('Failed to respond.');
    }
};

if (!isOpen) return null;

return (
    <div className="modal-overlay">
        <div className="modal-content">
            <button className="button--icon" onClick={onClose}>X</button>
            <h2>Manage Friends</h2>
            <Tabs
                tabs={[
                    { 
                        id: 'search', 
                        label: 'Find Users',
                        content: (
                            <div className="tab-content__search">
                                <form onSubmit={handleSearch} className="search-form">
                                    <input 
                                        type="text" 
                                        placeholder="Search by username..." 
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                    <button type="submit">Search</button>
                                </form>
                                {searchMessage && <p>{searchMessage}</p>}
                                <ul className="tab-content__list">
                                    {searchResults.map(user => (
                                        <li key={user.id} className="tab-content__list-item">
                                            <span>{user.username}</span>
                                            <button className="button--green" onClick={() => sendFriendRequest(user.id)}>Add Friend</button>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )
                    },
                    { 
                        id: 'pending', 
                        label: `Pending Requests (${pendingRequests.length})`,
                        content: (
                            <div className="tab-content__pending">
                                {pendingRequests.length === 0 ? <p>No pending requests.</p> : (
                                    <ul className="tab-content__list">
                                        {pendingRequests.map(req => (
                                            <li key={req.id} className="tab-content__list-item">
                                                <span><strong>{req.sender.username}</strong> sent you a request</span>
                                                <div className="tab-content__list-actions">
                                                    <button className="button--green" onClick={() => respondToRequest(req.id, 'ACCEPTED')}>Accept</button>
                                                    <button className="button--red" onClick={() => respondToRequest(req.id, 'DECLINED')}>Decline</button>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        )
                    }
                ]}
                activeTab={activeTab}
                onTabChange={(tabId) => setActiveTab(tabId as 'search' | 'pending')}
            />
        </div>
    </div>
);
};

export default FriendsModal;