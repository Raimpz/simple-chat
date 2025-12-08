package com.simplechat.backend.message;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MessageRepository extends JpaRepository<Message, Long> {

    List<Message> findBySenderIdAndRecipientIdOrSenderIdAndRecipientIdOrderByTimestampDesc(
            Long senderId1, Long recipientId1,
            Long senderId2, Long recipientId2,
            Pageable pageable
    );
}