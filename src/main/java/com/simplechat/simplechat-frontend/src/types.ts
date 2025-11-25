export interface UserDto {
    id: number;
    username: string;
}

export interface Message {
    id: number;
    content: string;
    timestamp: string;
    sender: UserDto;
    recipient: UserDto;
}

export interface FriendRequest {
    id: number;
    sender: UserDto;
    receiver: UserDto;
    status: 'PENDING' | 'ACCEPTED' | 'DECLINED';
    createdAt: string;
}
