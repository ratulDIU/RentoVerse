package com.rentoverse.app.controller;

import com.rentoverse.app.model.User;
import com.rentoverse.app.model.Room;
import com.rentoverse.app.model.Booking;
import com.rentoverse.app.service.AdminService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    @Autowired
    private AdminService adminService;

    // ================= USERS =================
    @GetMapping("/users")
    public List<User> getAllUsers() {
        return adminService.getAllUsers();
    }

    @GetMapping("/users/{id}")
    public Optional<User> getUserById(@PathVariable Long id) {
        return adminService.getUserById(id);
    }

    @DeleteMapping("/users/{id}")
    public String deleteUser(@PathVariable Long id) {
        return adminService.deleteUser(id);
    }

    // ================= ROOMS =================
    @GetMapping("/rooms")
    public List<Room> getAllRooms() {
        return adminService.getAllRooms();
    }

    @GetMapping("/rooms/{id}")
    public Optional<Room> getRoomById(@PathVariable Long id) {
        return adminService.getRoomById(id);
    }

    @DeleteMapping("/rooms/{id}")
    public String deleteRoom(@PathVariable Long id) {
        return adminService.deleteRoom(id);
    }

    // ================= BOOKINGS =================
    @GetMapping("/bookings")
    public List<Booking> getAllBookings() {
        return adminService.getAllBookings();
    }

    @GetMapping("/bookings/{id}")
    public Optional<Booking> getBookingById(@PathVariable Long id) {
        return adminService.getBookingById(id);
    }

    @DeleteMapping("/bookings/{id}")
    public String deleteBooking(@PathVariable Long id) {
        return adminService.deleteBooking(id);
    }
}
