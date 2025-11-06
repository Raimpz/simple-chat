import React, { useState, useEffect } from 'react';
import apiClient from '../api';
import { UserDto, Message } from '../types';

interface ChatPageProps {
    token: string;
}

const ChatPage: React.FC<ChatPageProps> = ({ token }) => {
    const [friends, setFriends] = useState<UserDto[]>([]);
    const [loadingFriends, setLoadingFriends] = useState<boolean>(true);
    const [selectedFriend, setSelectedFriend] = useState<UserDto | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [loadingMessages, setLoadingMessages] = useState<boolean>(false);

    useEffect(() => {
        const fetchFriends = async () => {
            try {
                setLoadingFriends(true);
                const response = await apiClient.get('/friends');
                setFriends(response.data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoadingFriends(false);
            }
        };

        fetchFriends();
    }, []);

    const handleFriendClick = async (friend: UserDto) => {
        try {
            setSelectedFriend(friend);
            setLoadingMessages(true);

            const response = await apiClient.get<Message[]>(`/messages/${friend.id}`);
            setMessages(response.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingMessages(false);
        }
    };

    if (loadingFriends) {
        return <div>Loading your data...</div>;
    }

    return (
        <div className="chat-container">
            <div className="sidebar">
                <h2>Friends</h2>
                <ul className="friend-list">
                    {friends.length > 0 ? (
                        friends.map((friend) => (
                        <li
                            key={friend.id}
                            className={`friend-item ${selectedFriend?.id === friend.id ? 'active' : ''}`}
                            onClick={() => handleFriendClick(friend)}
                        >
                            {friend.username}
                        </li>
                        ))
                    ) : (
                        <li>No friends yet.</li>
                    )}
                </ul>
            </div>
            <div className="chat-window">
                {selectedFriend ? (
                    <>
                        <div className="chat-header">
                            <h2>Chat with {selectedFriend.username}</h2>
                        </div>
                        <div className="message-list">
                            {loadingMessages ? (
                                <p>Loading messages...</p>
                            ) : (
                                messages.map((msg) => (
                                    <div key={msg.id} className="message-item">
                                        <strong>{msg.sender.username}:</strong> {msg.content}
                                    </div>
                                ))
                            )}
                            </div>
                        <div className="message-input-area">
                            <input type="text" placeholder="Type a message..." />
                            <button>Send</button>
                        </div>
                    </>
                ) : (
                    <h2>Select a friend to chat</h2>
                )}
            </div>
        </div>
    );
};

export default ChatPage;