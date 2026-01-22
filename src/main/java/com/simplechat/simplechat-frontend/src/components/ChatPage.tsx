import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import apiClient from '../api';
import { UserDto, Message } from '../types';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import FriendsModal from './friends-modal/FriendsModal';
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
    const messageContainerRef = useRef<HTMLDivElement>(null);
    const isInitializing = useRef(false);
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8081';

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
            webSocketFactory: () => new SockJS(`${API_URL}/ws`),
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

    useEffect(() => {
        const observer = new IntersectionObserver(
            entries => {
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
                isInitializing.current = true;
            }

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
                setTimeout(() => {
                    scrollToBottom();
                    setTimeout(() => {
                        isInitializing.current = false;
                    }, 500); 
                }, 100); 
            } else {
                setMessages((prev) => [...newMessages, ...prev]);
                setTimeout(() => {
                    if (container) {
                        const newHeight = container.scrollHeight;
                        container.scrollTop = newHeight - previousHeight + previousScrollTop;
                    }
                }, 0);
            }
        } catch (err) {
            console.error(err);
        } finally {
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
        setMessages([]);

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
                <h2 className="sidebar__title">Friends</h2>
                <button  className="sidebar__button button--green" onClick={() => setIsFriendsModalOpen(true)}>
                    Manage friends
                </button>
                <ul className="friend-list">
                    {friends.map((friend) => (
                        <li
                            key={friend.id}
                            className={`friend-list__item ${selectedFriend?.id === friend.id ? 'is-active' : ''}`}
                            onClick={() => handleFriendClick(friend)}
                        >
                            <div className="friend-list__item-content">
                                {friend.username}
                                {unreadCounts[friend.id] > 0 && (
                                    <span className="friend-list__item-unread">
                                        {unreadCounts[friend.id]}
                                    </span>
                                )}
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
            <div className={`chat-window ${selectedFriend ? 'chat-window--is-opened' : ''}`}>
                {selectedFriend ? (
                <>
                    <div className="chat-window__header"><h2>Chat with {selectedFriend.username}</h2></div>
                    <div className="chat-window__messages" ref={messageContainerRef}>
                        <div ref={topSentinelRef} style={{ height: '10px' }} />
                        {page > 0 && loadingMessages && <p style={{textAlign:'center', color:'#888'}}>Loading history...</p>}
                        {page === 0 && loadingMessages ? (
                            <p style={{padding: '20px', textAlign: 'center'}}>Loading messages...</p>
                        ) : (
                            messages.map((msg) => (
                                <div 
                                    key={msg.id} 
                                    className={`chat-window__message ${msg.sender.id === currentUser.id ? 'sent' : 'received'}`}
                                >
                                    <div className="chat-window__message-content">
                                        {msg.content}
                                    </div>
                                    <div className="chat-window__message-meta">
                                        <span className="chat-window__message-time">
                                            {format(new Date(msg.timestamp), 'HH:mm')}
                                        </span>
                                    </div>
                                </div>
                            ))
                        )}
                        <div ref={messagesEndRef} />
                    </div>
                    <form className="message-form" onSubmit={handleSendMessage}>
                        <input
                            type="text"
                            placeholder="Type a message..."
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                        />
                        <button className="message-form__button button--blue" type="submit">Send</button>
                    </form>
                </>
                ) : (
                    <div className="chat-window__placeholder">
                        <svg className="chat-window__placeholder-logo" viewBox="0 0 821 837" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M259.273 248.188C259.273 182.483 312.538 129.219 378.242 129.219H505.901C521.665 129.219 534.444 141.998 534.444 157.762C534.444 173.526 521.665 186.305 505.901 186.305H378.242C344.066 186.305 316.359 214.011 316.359 248.188C316.36 282.364 344.066 310.069 378.242 310.069H426.179C492.311 310.069 546.097 363.348 546.724 429.478C547.434 504.458 480.25 561.888 406.294 549.52L355.025 540.944C329.141 536.615 302.817 545.621 285.009 564.898L240.947 612.594C220.035 635.231 182.212 620.435 182.212 589.616V534.911C182.212 525.315 177.184 516.421 168.963 511.473C113.422 478.046 79.4571 417.961 79.457 353.138V292.406C79.457 131.761 209.124 1.23695 369.766 0.178711L396.671 0.000976562L396.852 0L448.978 0.31543C609.853 1.28926 739.755 131.98 739.755 292.858V369.2C739.755 466.891 669.67 550.504 573.482 567.57C557.961 570.324 543.146 559.974 540.392 544.453C537.638 528.932 547.988 514.116 563.51 511.362C632.443 499.132 682.669 439.21 682.669 369.2V292.858C682.669 163.373 578.116 58.1854 448.633 57.4014L396.874 57.0879L370.142 57.2637C240.881 58.1152 136.543 163.142 136.543 292.406V353.138C136.543 397.937 160.016 439.46 198.399 462.562C222.48 477.055 237.682 502.514 239.175 530.385L243.077 526.161C273.946 492.747 319.575 477.137 364.442 484.641L415.71 493.215C454.645 499.726 490.015 469.492 489.641 430.019C489.311 395.204 460.994 367.156 426.179 367.156H378.242C312.538 367.156 259.274 313.892 259.273 248.188Z" fill="white"/>
                            <path d="M802.305 810.364C792.599 810.364 785.039 807.984 779.625 803.224C774.212 798.371 771.505 791.091 771.505 781.384V716.284H798.105V781.104C798.105 783.811 798.852 785.957 800.345 787.544C801.839 789.037 803.752 789.784 806.085 789.784C809.259 789.784 811.965 788.991 814.205 787.404L820.785 806.024C818.545 807.517 815.792 808.591 812.525 809.244C809.259 809.991 805.852 810.364 802.305 810.364ZM760.445 755.904V736.024H815.465V755.904H760.445Z" fill="white"/>
                            <path d="M731.055 809.104V794.964L729.235 791.464V765.424C729.235 761.224 727.928 758.004 725.315 755.764C722.795 753.431 718.735 752.264 713.135 752.264C709.495 752.264 705.808 752.871 702.075 754.084C698.342 755.204 695.168 756.791 692.555 758.844L683.595 740.784C687.888 737.984 693.022 735.837 698.995 734.344C705.062 732.757 711.082 731.964 717.055 731.964C729.375 731.964 738.895 734.811 745.615 740.504C752.428 746.104 755.835 754.924 755.835 766.964V809.104H731.055ZM708.655 810.364C702.588 810.364 697.455 809.337 693.255 807.284C689.055 805.231 685.835 802.431 683.595 798.884C681.448 795.337 680.375 791.371 680.375 786.984C680.375 782.317 681.542 778.304 683.875 774.944C686.302 771.491 689.988 768.877 694.935 767.104C699.882 765.237 706.275 764.304 714.115 764.304H732.035V778.164H717.755C713.462 778.164 710.428 778.864 708.655 780.264C706.975 781.664 706.135 783.531 706.135 785.864C706.135 788.197 707.022 790.064 708.795 791.464C710.568 792.864 712.995 793.564 716.075 793.564C718.968 793.564 721.582 792.864 723.915 791.464C726.342 789.971 728.115 787.731 729.235 784.744L732.875 794.544C731.475 799.771 728.722 803.737 724.615 806.444C720.602 809.057 715.282 810.364 708.655 810.364Z" fill="white"/>
                            <path d="M640.854 731.964C646.734 731.964 652.054 733.177 656.814 735.604C661.574 737.937 665.308 741.577 668.014 746.524C670.814 751.471 672.214 757.864 672.214 765.704V809.104H645.614V770.044C645.614 764.631 644.494 760.711 642.254 758.284C640.108 755.764 637.074 754.504 633.154 754.504C630.354 754.504 627.788 755.157 625.454 756.464C623.121 757.677 621.301 759.591 619.994 762.204C618.688 764.817 618.034 768.224 618.034 772.424V809.104H591.434V705.224H618.034V754.784L611.874 748.484C614.768 742.977 618.734 738.871 623.774 736.164C628.814 733.364 634.508 731.964 640.854 731.964Z" fill="white"/>
                            <path d="M542.395 811.064C534.648 811.064 527.462 809.851 520.835 807.424C514.302 804.904 508.608 801.357 503.755 796.784C498.995 792.211 495.262 786.844 492.555 780.684C489.848 774.431 488.495 767.571 488.495 760.104C488.495 752.637 489.848 745.824 492.555 739.664C495.262 733.411 498.995 727.997 503.755 723.424C508.608 718.851 514.302 715.351 520.835 712.924C527.462 710.404 534.648 709.144 542.395 709.144C551.448 709.144 559.522 710.731 566.615 713.904C573.802 717.077 579.775 721.651 584.535 727.624L566.895 743.584C563.722 739.851 560.222 737.004 556.395 735.044C552.662 733.084 548.462 732.104 543.795 732.104C539.782 732.104 536.095 732.757 532.735 734.064C529.375 735.371 526.482 737.284 524.055 739.804C521.722 742.231 519.855 745.171 518.455 748.624C517.148 752.077 516.495 755.904 516.495 760.104C516.495 764.304 517.148 768.131 518.455 771.584C519.855 775.037 521.722 778.024 524.055 780.544C526.482 782.971 529.375 784.837 532.735 786.144C536.095 787.451 539.782 788.104 543.795 788.104C548.462 788.104 552.662 787.124 556.395 785.164C560.222 783.204 563.722 780.357 566.895 776.624L584.535 792.584C579.775 798.464 573.802 803.037 566.615 806.304C559.522 809.477 551.448 811.064 542.395 811.064Z" fill="white"/>
                            <path d="M446.411 810.364C437.451 810.364 429.611 808.684 422.891 805.324C416.264 801.871 411.084 797.204 407.351 791.324C403.711 785.351 401.891 778.584 401.891 771.024C401.891 763.464 403.664 756.744 407.211 750.864C410.851 744.891 415.844 740.271 422.191 737.004C428.538 733.644 435.678 731.964 443.611 731.964C451.078 731.964 457.891 733.504 464.051 736.584C470.211 739.571 475.111 744.004 478.751 749.884C482.391 755.764 484.211 762.904 484.211 771.304C484.211 772.237 484.164 773.311 484.071 774.524C483.978 775.737 483.884 776.857 483.791 777.884H423.731V763.884H469.651L459.571 767.804C459.664 764.351 459.011 761.364 457.611 758.844C456.304 756.324 454.438 754.364 452.011 752.964C449.678 751.564 446.924 750.864 443.751 750.864C440.578 750.864 437.778 751.564 435.351 752.964C433.018 754.364 431.198 756.371 429.891 758.984C428.584 761.504 427.931 764.491 427.931 767.944V772.004C427.931 775.737 428.678 778.957 430.171 781.664C431.758 784.371 433.998 786.471 436.891 787.964C439.784 789.364 443.238 790.064 447.251 790.064C450.984 790.064 454.158 789.551 456.771 788.524C459.478 787.404 462.138 785.724 464.751 783.484L478.751 798.044C475.111 802.057 470.631 805.137 465.311 807.284C459.991 809.337 453.691 810.364 446.411 810.364Z" fill="white"/>
                            <path d="M366.964 809.104V705.224H393.564V809.104H366.964Z" fill="white"/>
                            <path d="M321.56 810.364C315.12 810.364 309.614 808.964 305.04 806.164C300.467 803.271 296.967 798.977 294.54 793.284C292.207 787.497 291.04 780.124 291.04 771.164C291.04 762.111 292.16 754.737 294.4 749.044C296.64 743.257 300 738.964 304.48 736.164C309.054 733.364 314.747 731.964 321.56 731.964C328.467 731.964 334.72 733.597 340.32 736.864C346.014 740.037 350.494 744.564 353.76 750.444C357.12 756.231 358.8 763.137 358.8 771.164C358.8 779.191 357.12 786.144 353.76 792.024C350.494 797.904 346.014 802.431 340.32 805.604C334.72 808.777 328.467 810.364 321.56 810.364ZM273.82 836.264V733.224H299.16V746.104L299.02 771.164L300.42 796.364V836.264H273.82ZM315.96 789.224C318.947 789.224 321.607 788.524 323.94 787.124C326.367 785.724 328.28 783.671 329.68 780.964C331.174 778.257 331.92 774.991 331.92 771.164C331.92 767.337 331.174 764.071 329.68 761.364C328.28 758.657 326.367 756.604 323.94 755.204C321.607 753.804 318.947 753.104 315.96 753.104C312.974 753.104 310.267 753.804 307.84 755.204C305.507 756.604 303.594 758.657 302.1 761.364C300.7 764.071 300 767.337 300 771.164C300 774.991 300.7 778.257 302.1 780.964C303.594 783.671 305.507 785.724 307.84 787.124C310.267 788.524 312.974 789.224 315.96 789.224Z" fill="white"/>
                            <path d="M230.571 731.964C236.451 731.964 241.678 733.177 246.251 735.604C250.918 737.937 254.558 741.577 257.171 746.524C259.878 751.471 261.231 757.864 261.231 765.704V809.104H234.631V770.044C234.631 764.631 233.605 760.711 231.551 758.284C229.498 755.764 226.698 754.504 223.151 754.504C220.631 754.504 218.345 755.111 216.291 756.324C214.238 757.537 212.651 759.404 211.531 761.924C210.411 764.351 209.851 767.524 209.851 771.444V809.104H183.251V770.044C183.251 764.631 182.225 760.711 180.171 758.284C178.211 755.764 175.411 754.504 171.771 754.504C169.158 754.504 166.825 755.111 164.771 756.324C162.811 757.537 161.225 759.404 160.011 761.924C158.891 764.351 158.331 767.524 158.331 771.444V809.104H131.731V733.224H157.071V754.364L152.031 748.344C154.831 742.931 158.658 738.871 163.511 736.164C168.365 733.364 173.778 731.964 179.751 731.964C186.565 731.964 192.538 733.737 197.671 737.284C202.898 740.737 206.398 746.151 208.171 753.524L199.491 751.704C202.198 745.544 206.258 740.737 211.671 737.284C217.178 733.737 223.478 731.964 230.571 731.964Z" fill="white"/>
                            <path d="M92.0445 809.104V733.224H118.644V809.104H92.0445ZM105.344 724.824C100.491 724.824 96.5712 723.471 93.5845 720.764C90.5978 718.057 89.1045 714.697 89.1045 710.684C89.1045 706.671 90.5978 703.311 93.5845 700.604C96.5712 697.897 100.491 696.544 105.344 696.544C110.198 696.544 114.118 697.851 117.104 700.464C120.091 702.984 121.584 706.251 121.584 710.264C121.584 714.464 120.091 717.964 117.104 720.764C114.211 723.471 110.291 724.824 105.344 724.824Z" fill="white"/>
                            <path d="M41.3 811.064C33.2733 811.064 25.5267 810.084 18.06 808.124C10.6867 806.071 4.66667 803.457 0 800.284L9.1 779.844C13.4867 782.644 18.5267 784.977 24.22 786.844C30.0067 788.617 35.7467 789.504 41.44 789.504C45.2667 789.504 48.3467 789.177 50.68 788.524C53.0133 787.777 54.6933 786.844 55.72 785.724C56.84 784.511 57.4 783.111 57.4 781.524C57.4 779.284 56.3733 777.511 54.32 776.204C52.2667 774.897 49.6067 773.824 46.34 772.984C43.0733 772.144 39.4333 771.304 35.42 770.464C31.5 769.624 27.5333 768.551 23.52 767.244C19.6 765.937 16.0067 764.257 12.74 762.204C9.47333 760.057 6.81333 757.304 4.76 753.944C2.70667 750.491 1.68 746.151 1.68 740.924C1.68 735.044 3.26667 729.724 6.44 724.964C9.70667 720.204 14.56 716.377 21 713.484C27.44 710.591 35.4667 709.144 45.08 709.144C51.52 709.144 57.82 709.891 63.98 711.384C70.2333 712.784 75.7867 714.884 80.64 717.684L72.1 738.264C67.4333 735.744 62.8133 733.877 58.24 732.664C53.6667 731.357 49.2333 730.704 44.94 730.704C41.1133 730.704 38.0333 731.124 35.7 731.964C33.3667 732.711 31.6867 733.737 30.66 735.044C29.6333 736.351 29.12 737.844 29.12 739.524C29.12 741.671 30.1 743.397 32.06 744.704C34.1133 745.917 36.7733 746.944 40.04 747.784C43.4 748.531 47.04 749.324 50.96 750.164C54.9733 751.004 58.94 752.077 62.86 753.384C66.8733 754.597 70.5133 756.277 73.78 758.424C77.0467 760.477 79.66 763.231 81.62 766.684C83.6733 770.044 84.7 774.291 84.7 779.424C84.7 785.117 83.0667 790.391 79.8 795.244C76.6267 800.004 71.82 803.831 65.38 806.724C59.0333 809.617 51.0067 811.064 41.3 811.064Z" fill="white"/>
                        </svg>
                    </div>
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