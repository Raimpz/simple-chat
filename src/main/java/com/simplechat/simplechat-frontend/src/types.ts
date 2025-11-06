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
