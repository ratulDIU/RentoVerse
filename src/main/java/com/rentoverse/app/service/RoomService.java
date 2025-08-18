package com.rentoverse.app.service;

import com.rentoverse.app.model.Room;
import com.rentoverse.app.model.User;
import com.rentoverse.app.repository.RoomRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class RoomService {

    @Autowired
    private RoomRepository roomRepo;

    public Room addRoom(Room room) {
        return roomRepo.save(room);
    }

    public List<Room> getAllRooms() {
        return roomRepo.findAll();
    }

//    public List<Room> filterRooms(String location, String type) {
//        return roomRepo.findByLocationContainingAndTypeContaining(location, type);
//    }
public List<Room> filterRooms(String location, String type) {
    String loc = (location == null) ? "" : location;
    String typ = (type == null || type.isBlank()) ? "" : type;
    return roomRepo.findByLocationContainingIgnoreCaseAndTypeContainingIgnoreCase(loc, typ);
}


    public List<Room> getRoomsByProvider(User provider) {
        return roomRepo.findByProvider(provider);
    }

    public boolean deleteRoom(Long id) {
        Optional<Room> roomOptional = roomRepo.findById(id);
        if (roomOptional.isPresent()) {
            roomRepo.deleteById(id);
            return true;
        } else {
            return false;
        }
    }

}
