import React, { useState, useEffect, useRef } from 'react';
import apiClient from '../api';
import { UserDto, Message } from '../types';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import FriendsModal from './FriendsModal';
import { format } from 'date-fns';

interface ChatPageProps {
    token: string;
    currentUser: UserDto;
}

const ChatPage: React.FC<ChatPageProps> = ({ token, currentUser }) => {
    const [friends, setFriends] = useState<UserDto[]>([]);
    const [loadingFriends, setLoadingFriends] = useState<boolean>(true);
    const [selectedFriend, setSelectedFriend] = useState<UserDto | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [loadingMessages, setLoadingMessages] = useState<boolean>(false);
    const [newMessage, setNewMessage] = useState<string>('');
    const [isFriendsModalOpen, setIsFriendsModalOpen] = useState(false);
    const [unreadCounts, setUnreadCounts] = useState<Record<number, number>>({});
    const stompClientRef = useRef<Client | null>(null);
    const selectedFriendRef = useRef<UserDto | null>(null);
    const currentUserRef = useRef<UserDto>(currentUser);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const fetchFriends = async () => {
            try {
                setLoadingFriends(true);
                const response = await apiClient.get('/friends');
                setFriends(response.data);
            }
            catch (err) {
                console.error(err);
            } 
            finally {
                setLoadingFriends(false);
            }
        };
        fetchFriends();
    }, []);

    useEffect(() => {
        const client = new Client({
            webSocketFactory: () => new SockJS('http://localhost:8081/ws'),
            connectHeaders: {
                Authorization: `Bearer ${token}`,
            },
            heartbeatOutgoing: 10000,
            heartbeatIncoming: 10000,
            onConnect: () => {
                client.subscribe('/user/queue/private', (message) => {
                    const newMsg = JSON.parse(message.body) as Message;
                    const friend = selectedFriendRef.current;
                    const user = currentUserRef.current; 

                    const isOpenChat = 
                        (friend && newMsg.sender.id === friend.id && newMsg.recipient.id === user.id) ||
                        (friend && newMsg.sender.id === user.id && newMsg.recipient.id === friend.id);

                    if (isOpenChat) {
                        setMessages((prevMessages) => [...prevMessages, newMsg]);
                    } else {
                        if (newMsg.recipient.id === user.id) {
                            setUnreadCounts((prev) => ({
                                ...prev,
                                [newMsg.sender.id]: (prev[newMsg.sender.id] || 0) + 1
                            }));
                        }
                    }
                });
            },
            onStompError: (frame) => {
                console.error('Broker reported error: ' + frame.headers['message']);
                console.error('Additional details: ' + frame.body);
            },
            onWebSocketError: (event) => {
                console.error('WebSocket Error', event);
            }
        });

        client.activate();
        stompClientRef.current = client;

        return () => {
            client.deactivate();
        };
    }, [token]);

    useEffect(() => {
        selectedFriendRef.current = selectedFriend;
    }, [selectedFriend]);

    useEffect(() => {
        currentUserRef.current = currentUser;
    }, [currentUser]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleFriendClick = async (friend: UserDto) => {
        setUnreadCounts((prev) => ({
            ...prev,
            [friend.id]: 0 
        }));

        try {
            setSelectedFriend(friend);
            setLoadingMessages(true);
            const response = await apiClient.get<Message[]>(`/messages/${friend.id}`);
            setMessages(response.data);
        } catch (err) {
            console.error(err);
        } 
        finally {
            setLoadingMessages(false);
        }
    };

    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        const client = stompClientRef.current;

        if (newMessage.trim() && selectedFriend && client?.connected) {
            const chatMessage = {
                recipientId: selectedFriend.id,
                content: newMessage,
            };

            client.publish({
                destination: '/app/chat.send',
                body: JSON.stringify(chatMessage),
            });

            setNewMessage('');
        }
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    if (loadingFriends) { return <div>Loading...</div>; }

    return (
        <div className="chat-container">
            <div className="sidebar">
                <h2>Friends</h2>
                <button 
                    className="add-friend-btn"
                    onClick={() => setIsFriendsModalOpen(true)}
                >
                    + Add Friend
                </button>
                <ul className="friend-list">
                    {friends.map((friend) => (
                        <li
                            key={friend.id}
                            className={`friend-item ${selectedFriend?.id === friend.id ? 'active' : ''}`}
                            onClick={() => handleFriendClick(friend)}
                        >
                            <div className="friend-item-content">
                                {friend.username}
                                {unreadCounts[friend.id] > 0 && (
                                    <span className="unread-badge">
                                        {unreadCounts[friend.id]}
                                    </span>
                                )}
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
            <div className="chat-window">
                {selectedFriend ? (
                <>
                    <div className="chat-header"><h2>Chat with {selectedFriend.username}</h2></div>
                    <div className="message-list">
                        {loadingMessages ? (<p>Loading messages...</p>) : (
                            messages.map((msg) => (
                                <div 
                                    key={msg.id} 
                                    className={`message-item ${msg.sender.id === currentUser.id ? 'sent' : 'received'}`}
                                >
                                    <div className="message-content">
                                        {msg.content}
                                    </div>
                                    <div className="message-meta">
                                        <span className="message-time">
                                            {format(new Date(msg.timestamp), 'HH:mm')}
                                        </span>
                                    </div>
                                </div>
                            ))
                        )}
                        <div ref={messagesEndRef} />
                    </div>
                    <form className="message-input-area" onSubmit={handleSendMessage}>
                        <input
                            type="text"
                            placeholder="Type a message..."
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                        />
                        <button type="submit">Send</button>
                    </form>
                </>
                ) : (
                <h2 style={{ padding: '20px' }}>Select a friend to chat</h2>
                )}
            </div>
            <FriendsModal 
                isOpen={isFriendsModalOpen} 
                onClose={() => {
                    setIsFriendsModalOpen(false);
                    window.location.reload(); 
                }} 
            />
        </div>
    );
};

export default ChatPage;