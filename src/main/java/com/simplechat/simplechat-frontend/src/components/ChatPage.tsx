import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
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
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);

    const stompClientRef = useRef<Client | null>(null);
    const selectedFriendRef = useRef<UserDto | null>(null);
    const currentUserRef = useRef<UserDto>(currentUser);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const topSentinelRef = useRef<HTMLDivElement>(null);
    const messageContainerRef = useRef<HTMLDivElement>(null); // New Ref for the container

    // --- NEW: Lock to prevent observer from firing during initial scroll ---
    const isInitializing = useRef(false);

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
                        setTimeout(scrollToBottom, 100);
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

    // --- FIXED OBSERVER LOGIC ---
    useEffect(() => {
        const observer = new IntersectionObserver(
            entries => {
                // ADDED CHECK: !isInitializing.current
                if (entries[0].isIntersecting && hasMore && !loadingMessages && messages.length > 0 && !isInitializing.current) {
                    const nextPage = page + 1;
                    setPage(nextPage);

                    if (selectedFriend) {
                        fetchMessages(selectedFriend.id, nextPage);
                    }
                }
            },
            { threshold: 1 }
        );

        if (topSentinelRef.current) {
            observer.observe(topSentinelRef.current);
        }

        return () => observer.disconnect();
    }, [messages, hasMore, loadingMessages, selectedFriend, page]);

    const fetchMessages = async (friendId: number, pageNum: number) => {
        try {
            if (pageNum === 0) {
                setLoadingMessages(true);
                isInitializing.current = true; // LOCK: Don't let observer fire
            }

            // Capture current height before adding new messages (for pagination scroll fix)
            const container = messageContainerRef.current;
            const previousHeight = container?.scrollHeight || 0;
            const previousScrollTop = container?.scrollTop || 0;

            const response = await apiClient.get<Message[]>(`/messages/${friendId}?page=${pageNum}`);
            const newMessages = response.data;

            if (newMessages.length < 20) {
                setHasMore(false);
            }

            if (pageNum === 0) {
                setMessages(newMessages);
                // Scroll to bottom, THEN release the lock
                setTimeout(() => {
                    scrollToBottom();
                    // Small delay to ensure scroll happens before we enable observer again
                    setTimeout(() => {
                        isInitializing.current = false; // UNLOCK
                    }, 500); 
                }, 100); 
            } else {
                // Pagination load
                setMessages((prev) => [...newMessages, ...prev]);
                
                // --- SCROLL POSITION FIX ---
                // After the DOM updates, we need to adjust scroll so we don't jump to top
                // We use requestAnimationFrame or setTimeout to wait for render
                setTimeout(() => {
                    if (container) {
                        const newHeight = container.scrollHeight;
                        // Calculate how much the content grew and adjust scroll
                        container.scrollTop = newHeight - previousHeight + previousScrollTop;
                    }
                }, 0);
            }
        } catch (err) {
            console.error(err);
        } finally {
                // Only turn off loading immediately if not page 0 (page 0 handles it after scroll)
                setLoadingMessages(false);
        }
    };

    const handleFriendClick = async (friend: UserDto) => {
        setUnreadCounts((prev) => ({
            ...prev,
            [friend.id]: 0 
        }));

        setSelectedFriend(friend);

        setPage(0);
        setHasMore(true);
        setMessages([]); // Clear previous messages immediately

        await fetchMessages(friend.id, 0);
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
                    
                    {/* Added ref={messageContainerRef} here */}
                    <div className="message-list" ref={messageContainerRef}>
                        <div ref={topSentinelRef} style={{ height: '10px' }} />
                        
                        {/* Only show "Loading history" if we are PAGINATING (page > 0) */}
                        {page > 0 && loadingMessages && <p style={{textAlign:'center', color:'#888'}}>Loading history...</p>}

                        {/* If Page 0 is loading, show generic loading */}
                        {page === 0 && loadingMessages ? (
                            <p style={{padding: '20px', textAlign: 'center'}}>Loading messages...</p>
                        ) : (
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