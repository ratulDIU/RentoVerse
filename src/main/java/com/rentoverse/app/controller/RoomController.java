package com.rentoverse.app.controller;

import com.rentoverse.app.model.Room;
import com.rentoverse.app.model.User;
import com.rentoverse.app.repository.RoomRepository;
import com.rentoverse.app.repository.UserRepository;
import com.rentoverse.app.service.RoomService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/rooms")
@CrossOrigin(origins = "*")
public class RoomController {

    @Autowired private RoomService roomService;
    @Autowired private UserRepository userRepository;
    @Autowired private RoomRepository roomRepository;

    @PostMapping("/add")
    public ResponseEntity<?> addRoom(@RequestParam String title,
                                     @RequestParam String description,
                                     @RequestParam double rent,
                                     @RequestParam String location,
                                     @RequestParam String type,
                                     @RequestParam String email,
                                     @RequestParam("image") MultipartFile image) {
        Optional<User> providerOpt = userRepository.findByEmail(email);
        if (providerOpt.isEmpty()) {
            return ResponseEntity.badRequest().body("❌ Provider not found.");
        }

        if (image.isEmpty() || !image.getContentType().startsWith("image/")) {
            return ResponseEntity.badRequest().body("❌ Invalid image file.");
        }

        // Save image
        String fileName = System.currentTimeMillis() + "_" + image.getOriginalFilename();
        String uploadDir = System.getProperty("user.home") + File.separator + "uploads";
        File dir = new File(uploadDir);
        if (!dir.exists()) dir.mkdirs();
        File imageFile = new File(uploadDir + File.separator + fileName);
        try {
            image.transferTo(imageFile);
        } catch (IOException e) {
            return ResponseEntity.status(500).body("❌ Error saving image: " + e.getMessage());
        }

        Room room = new Room();
        room.setTitle(title);
        room.setDescription(description);
        room.setRent(rent);
        room.setLocation(location);
        room.setType(type);
        room.setImageUrl("/uploads/" + fileName);
        room.setAvailable(true); // new rooms start as available
        room.setProvider(providerOpt.get());

        Room saved = roomService.addRoom(room);
        return ResponseEntity.ok(saved);
    }

    @GetMapping("/provider")
    public ResponseEntity<?> getRoomsByProviderEmail(@RequestParam String email) {
        Optional<User> provider = userRepository.findByEmail(email);
        if (provider.isEmpty()) {
            return ResponseEntity.badRequest().body("Provider not found.");
        }
        List<Room> rooms = roomService.getRoomsByProvider(provider.get());
        return ResponseEntity.ok(rooms);
    }

    @GetMapping("/all")
    public ResponseEntity<List<Room>> getAllRooms() {
        return ResponseEntity.ok(roomService.getAllRooms());
    }

    @GetMapping("/filter")
    public ResponseEntity<List<Room>> filterRooms(@RequestParam String location, @RequestParam String type) {
        return ResponseEntity.ok(roomService.filterRooms(location, type));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<String> deleteRoom(@PathVariable Long id) {
        boolean deleted = roomService.deleteRoom(id);
        if (deleted) {
            return ResponseEntity.ok("Room deleted successfully.");
        } else {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Room not found.");
        }
    }

    // Used by renter “All Available Rooms”
    @GetMapping("/available")
    public List<Room> getAvailableRooms() {
        return roomRepository.findByAvailableTrue();
    }
}
