package com.rentoverse.app.service;

import com.rentoverse.app.model.User;
import com.rentoverse.app.model.Room;
import com.rentoverse.app.model.Booking;
import com.rentoverse.app.repository.UserRepository;
import com.rentoverse.app.repository.RoomRepository;
import com.rentoverse.app.repository.BookingRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class AdminService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RoomRepository roomRepository;

    @Autowired
    private BookingRepository bookingRepository;

    // ================= USERS =================

    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    public Optional<User> getUserById(Long id) {
        return userRepository.findById(id);
    }

    public String deleteUser(Long id) {
        if (userRepository.existsById(id)) {
            userRepository.deleteById(id);
            return "✅ User deleted with ID: " + id;
        } else {
            return "❌ User not found with ID: " + id;
        }
    }

    // ================= ROOMS =================

    public List<Room> getAllRooms() {
        return roomRepository.findAll();
    }

    public Optional<Room> getRoomById(Long id) {
        return roomRepository.findById(id);
    }

    public String deleteRoom(Long id) {
        if (roomRepository.existsById(id)) {
            roomRepository.deleteById(id);
            return "✅ Room deleted with ID: " + id;
        } else {
            return "❌ Room not found with ID: " + id;
        }
    }

    // ================= BOOKINGS =================

    public List<Booking> getAllBookings() {
        return bookingRepository.findAll();
    }

    public Optional<Booking> getBookingById(Long id) {
        return bookingRepository.findById(id);
    }

    public String deleteBooking(Long id) {
        if (bookingRepository.existsById(id)) {
            bookingRepository.deleteById(id);
            return "✅ Booking deleted with ID: " + id;
        } else {
            return "❌ Booking not found with ID: " + id;
        }
    }
}
