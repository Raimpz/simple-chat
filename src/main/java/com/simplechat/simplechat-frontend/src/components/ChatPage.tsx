import React, { useState, useEffect, useRef } from 'react';
import apiClient from '../api';
import { UserDto, Message } from '../types';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

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
    const stompClientRef = useRef<Client | null>(null);
    const selectedFriendRef = useRef<UserDto | null>(null);
    const currentUserRef = useRef<UserDto>(currentUser);

    useEffect(() => {
        const fetchFriends = async () => {
            try {
                setLoadingFriends(true);
                const response = await apiClient.get('/friends');
                setFriends(response.data);
            } catch (err) { console.error(err); } 
            finally { setLoadingFriends(false); }
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
            debug: (str) => {
                console.log(new Date(), 'STOMP: ' + str);
            },
            onConnect: () => {
                console.log('WebSocket Connected!');
                client.subscribe('/user/queue/private', (message) => {
                    console.log('>>> MESSAGE RECEIVED:', message.body);
                    const newMsg = JSON.parse(message.body) as Message;
                    const friend = selectedFriendRef.current;
                    const user = currentUserRef.current; 

                    const isRelevant = 
                        (friend && newMsg.sender.id === friend.id && newMsg.recipient.id === user.id) ||
                        (friend && newMsg.sender.id === user.id && newMsg.recipient.id === friend.id);
                    
                    if (isRelevant) {
                        setMessages((prevMessages) => [...prevMessages, newMsg]);
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
            console.log("WebSocket Disconnected");
        };
    }, [token]);

    useEffect(() => {
        selectedFriendRef.current = selectedFriend;
    }, [selectedFriend]);

    useEffect(() => {
        currentUserRef.current = currentUser;
    }, [currentUser]);

    const handleFriendClick = async (friend: UserDto) => {
        try {
            setSelectedFriend(friend);
            setLoadingMessages(true);
            const response = await apiClient.get<Message[]>(`/messages/${friend.id}`);
            setMessages(response.data);
        } catch (err) { console.error(err); } 
        finally { setLoadingMessages(false); }
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

    if (loadingFriends) { return <div>Loading...</div>; }

    return (
        <div className="chat-container">
            <div className="sidebar">
                <h2>Friends</h2>
                <ul className="friend-list">
                    {friends.map((friend) => (
                        <li
                        key={friend.id}
                        className={`friend-item ${selectedFriend?.id === friend.id ? 'active' : ''}`}
                        onClick={() => handleFriendClick(friend)}
                        >
                        {friend.username}
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
                            <strong>{msg.sender.id === currentUser.id ? 'You' : msg.sender.username}:</strong> 
                            {msg.content}
                        </div>
                        ))
                    )}
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
        </div>
    );
};

export default ChatPage;