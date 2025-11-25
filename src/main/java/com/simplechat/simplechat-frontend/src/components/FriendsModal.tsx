import React, { useState, useEffect } from 'react';
import apiClient from '../api';
import { UserDto, FriendRequest } from '../types';

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
            <button className="close-button" onClick={onClose}>X</button>
            <h2>Manage Friends</h2>
            <div className="tabs">
                <button 
                    className={activeTab === 'search' ? 'active' : ''} 
                    onClick={() => setActiveTab('search')}
                >
                    Find Users
                </button>
                <button 
                    className={activeTab === 'pending' ? 'active' : ''} 
                    onClick={() => setActiveTab('pending')}
                >
                    Pending Requests ({pendingRequests.length})
                </button>
            </div>

            <div className="tab-content">
                {activeTab === 'search' ? (
                    <div className="search-section">
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
                        <ul className="user-list">
                            {searchResults.map(user => (
                                <li key={user.id} className="user-list-item">
                                    <span>{user.username}</span>
                                    <button onClick={() => sendFriendRequest(user.id)}>Add Friend</button>
                                </li>
                            ))}
                        </ul>
                    </div>
                ) : (
                    <div className="pending-section">
                        {pendingRequests.length === 0 ? <p>No pending requests.</p> : (
                            <ul className="request-list">
                                {pendingRequests.map(req => (
                                    <li key={req.id} className="request-item">
                                        <span><strong>{req.sender.username}</strong> sent you a request</span>
                                        <div className="request-actions">
                                            <button className="accept-btn" onClick={() => respondToRequest(req.id, 'ACCEPTED')}>Accept</button>
                                            <button className="decline-btn" onClick={() => respondToRequest(req.id, 'DECLINED')}>Decline</button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                )}
            </div>
        </div>
    </div>
);
};

export default FriendsModal;