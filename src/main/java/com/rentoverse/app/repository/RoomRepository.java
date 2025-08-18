package com.rentoverse.app.repository;

import com.rentoverse.app.model.Room;
import com.rentoverse.app.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RoomRepository extends JpaRepository<Room, Long> {
    List<Room> findByLocationContainingIgnoreCaseAndTypeContainingIgnoreCase(String location, String type);
    List<Room> findByProvider(User provider);
    List<Room> findByAvailableTrue();
}
