-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Dec 06, 2025 at 06:28 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `cict_roomsched`
--

-- --------------------------------------------------------

--
-- Table structure for table `account_status`
--

CREATE TABLE `account_status` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `user_type` enum('student','instructor','admin') NOT NULL,
  `status` enum('active','inactive') DEFAULT 'active',
  `is_online` tinyint(1) DEFAULT 0,
  `last_login` timestamp NULL DEFAULT NULL,
  `last_logout` timestamp NULL DEFAULT NULL,
  `login_count` int(11) DEFAULT 0,
  `last_activity` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `account_status`
--

INSERT INTO `account_status` (`id`, `user_id`, `user_type`, `status`, `is_online`, `last_login`, `last_logout`, `login_count`, `last_activity`, `created_at`, `updated_at`) VALUES
(1, 1, 'admin', 'active', 1, '2025-12-06 05:15:17', NULL, 18, '2025-12-06 05:15:17', '2025-12-06 03:33:41', '2025-12-06 05:15:17'),
(2, 2, 'instructor', 'active', 1, '2025-12-06 05:00:54', NULL, 16, '2025-12-06 05:00:54', '2025-12-06 03:37:52', '2025-12-06 05:00:54'),
(7, 3, 'student', 'active', 1, '2025-12-06 05:15:27', NULL, 4, '2025-12-06 05:15:27', '2025-12-06 03:40:51', '2025-12-06 05:15:27');

-- --------------------------------------------------------

--
-- Table structure for table `class_schedules`
--

CREATE TABLE `class_schedules` (
  `id` int(11) NOT NULL,
  `room_id` int(11) NOT NULL,
  `instructor_id` int(11) NOT NULL,
  `course_code` varchar(50) NOT NULL,
  `course_name` varchar(255) NOT NULL,
  `day` enum('monday','tuesday','wednesday','thursday','friday','saturday','sunday') NOT NULL,
  `start_time` time NOT NULL,
  `end_time` time NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `class_schedules`
--

INSERT INTO `class_schedules` (`id`, `room_id`, `instructor_id`, `course_code`, `course_name`, `day`, `start_time`, `end_time`, `created_at`, `updated_at`) VALUES
(1, 1, 2, 'IT101', 'Introduction to Programming', 'monday', '08:00:00', '10:00:00', '2025-12-06 03:32:44', '2025-12-06 03:32:44'),
(2, 2, 2, 'IT202', 'Database Management', 'wednesday', '10:00:00', '12:00:00', '2025-12-06 03:32:44', '2025-12-06 03:32:44'),
(3, 3, 2, 'CS201', 'Data Structures', 'tuesday', '13:00:00', '15:00:00', '2025-12-06 03:32:44', '2025-12-06 03:32:44'),
(4, 4, 2, 'CS301', 'Algorithms', 'thursday', '09:00:00', '11:00:00', '2025-12-06 03:32:44', '2025-12-06 03:32:44');

-- --------------------------------------------------------

--
-- Table structure for table `notifications`
--

CREATE TABLE `notifications` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `sender_id` int(11) DEFAULT NULL,
  `type` enum('room_created','room_updated','room_available','room_unavailable','room_deleted','reservation_created','reservation_approved','reservation_rejected','reservation_cancelled','reservation_updated','user_created','user_updated','user_deleted','system_alert') NOT NULL,
  `title` varchar(255) NOT NULL,
  `message` text NOT NULL,
  `related_table` varchar(50) DEFAULT NULL,
  `related_id` int(11) DEFAULT NULL,
  `is_read` tinyint(1) DEFAULT 0,
  `is_important` tinyint(1) DEFAULT 0,
  `expires_at` timestamp NULL DEFAULT NULL,
  `read_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ;

--
-- Dumping data for table `notifications`
--

INSERT INTO `notifications` (`id`, `user_id`, `sender_id`, `type`, `title`, `message`, `related_table`, `related_id`, `is_read`, `is_important`, `expires_at`, `read_at`, `created_at`) VALUES
(3, 4, 1, 'room_created', 'New Room Available: ICT RM-07', 'A new room has been added to the system: ICT RM-07 in ICT Building. Capacity: 40 students.', 'rooms', 1, 1, 0, NULL, NULL, '2025-12-06 00:32:44'),
(9, 4, 1, 'room_unavailable', 'Room Unavailable: CCB LAB-01', 'CCB LAB-01 in Computer Center Building is temporarily unavailable.', 'rooms', 13, 0, 0, NULL, NULL, '2025-12-06 03:40:33'),
(10, 5, 1, 'room_unavailable', 'Room Unavailable: CCB LAB-01', 'CCB LAB-01 in Computer Center Building is temporarily unavailable.', 'rooms', 13, 0, 0, NULL, NULL, '2025-12-06 03:40:33'),
(14, 4, 1, 'room_available', 'Room Now Available: CCB LAB-01', 'CCB LAB-01 in Computer Center Building is now available for reservation.', 'rooms', 13, 0, 0, NULL, NULL, '2025-12-06 03:41:13'),
(15, 5, 1, 'room_available', 'Room Now Available: CCB LAB-01', 'CCB LAB-01 in Computer Center Building is now available for reservation.', 'rooms', 13, 0, 0, NULL, NULL, '2025-12-06 03:41:13'),
(19, 4, 1, 'room_updated', 'Room Updated: ICT RM-11', 'ICT RM-11 has been updated. Check the room details for changes.', 'rooms', 5, 0, 0, NULL, NULL, '2025-12-06 03:41:19'),
(20, 5, 1, 'room_updated', 'Room Updated: ICT RM-11', 'ICT RM-11 has been updated. Check the room details for changes.', 'rooms', 5, 0, 0, NULL, NULL, '2025-12-06 03:41:19'),
(24, 4, 1, 'room_created', 'New Room Available: c', 'A new room has been added to the system: c in c. Capacity: 30 students.', 'rooms', 17, 0, 0, NULL, NULL, '2025-12-06 03:41:26'),
(25, 5, 1, 'room_created', 'New Room Available: c', 'A new room has been added to the system: c in c. Capacity: 30 students.', 'rooms', 17, 0, 0, NULL, NULL, '2025-12-06 03:41:26'),
(29, 4, 1, 'room_deleted', 'Room Deleted: c', 'c in c has been removed from the system.', 'rooms', 17, 0, 1, NULL, NULL, '2025-12-06 03:41:29'),
(30, 5, 1, 'room_deleted', 'Room Deleted: c', 'c in c has been removed from the system.', 'rooms', 17, 0, 1, NULL, NULL, '2025-12-06 03:41:29'),
(33, 3, 1, 'room_unavailable', 'Room Unavailable: CCB LAB-01', 'CCB LAB-01 in Computer Center Building is temporarily unavailable.', 'rooms', 13, 1, 0, NULL, '2025-12-06 04:27:34', '2025-12-06 04:07:09'),
(34, 4, 1, 'room_unavailable', 'Room Unavailable: CCB LAB-01', 'CCB LAB-01 in Computer Center Building is temporarily unavailable.', 'rooms', 13, 0, 0, NULL, NULL, '2025-12-06 04:07:09'),
(35, 5, 1, 'room_unavailable', 'Room Unavailable: CCB LAB-01', 'CCB LAB-01 in Computer Center Building is temporarily unavailable.', 'rooms', 13, 0, 0, NULL, NULL, '2025-12-06 04:07:09'),
(38, 3, 1, 'room_available', 'Room Now Available: CCB LAB-01', 'CCB LAB-01 in Computer Center Building is now available for reservation.', 'rooms', 13, 1, 0, NULL, '2025-12-06 04:27:34', '2025-12-06 04:07:11'),
(39, 4, 1, 'room_available', 'Room Now Available: CCB LAB-01', 'CCB LAB-01 in Computer Center Building is now available for reservation.', 'rooms', 13, 0, 0, NULL, NULL, '2025-12-06 04:07:11'),
(40, 5, 1, 'room_available', 'Room Now Available: CCB LAB-01', 'CCB LAB-01 in Computer Center Building is now available for reservation.', 'rooms', 13, 0, 0, NULL, NULL, '2025-12-06 04:07:11'),
(43, 3, 1, 'room_updated', 'Room Updated: CCB LAB-01', 'CCB LAB-01 has been updated. Check the room details for changes.', 'rooms', 13, 1, 0, NULL, '2025-12-06 04:27:34', '2025-12-06 04:07:16'),
(44, 4, 1, 'room_updated', 'Room Updated: CCB LAB-01', 'CCB LAB-01 has been updated. Check the room details for changes.', 'rooms', 13, 0, 0, NULL, NULL, '2025-12-06 04:07:16'),
(45, 5, 1, 'room_updated', 'Room Updated: CCB LAB-01', 'CCB LAB-01 has been updated. Check the room details for changes.', 'rooms', 13, 0, 0, NULL, NULL, '2025-12-06 04:07:16'),
(49, 4, 1, 'room_created', 'New Room Available: d', 'A new room has been added to the system: d in d. Capacity: 30 students.', 'rooms', 18, 0, 0, NULL, NULL, '2025-12-06 04:07:25'),
(50, 5, 1, 'room_created', 'New Room Available: d', 'A new room has been added to the system: d in d. Capacity: 30 students.', 'rooms', 18, 0, 0, NULL, NULL, '2025-12-06 04:07:25'),
(54, 4, 1, 'room_deleted', 'Room Deleted: d', 'd in d has been removed from the system.', 'rooms', 18, 0, 1, NULL, NULL, '2025-12-06 04:07:27'),
(55, 5, 1, 'room_deleted', 'Room Deleted: d', 'd in d has been removed from the system.', 'rooms', 18, 0, 1, NULL, NULL, '2025-12-06 04:07:27'),
(65, 4, 1, 'room_unavailable', 'Room Unavailable: CCB LAB-01', 'CCB LAB-01 in Computer Center Building is temporarily unavailable.', 'rooms', 13, 0, 0, NULL, NULL, '2025-12-06 04:18:24'),
(66, 5, 1, 'room_unavailable', 'Room Unavailable: CCB LAB-01', 'CCB LAB-01 in Computer Center Building is temporarily unavailable.', 'rooms', 13, 0, 0, NULL, NULL, '2025-12-06 04:18:24'),
(70, 4, 1, 'room_available', 'Room Now Available: CCB LAB-01', 'CCB LAB-01 in Computer Center Building is now available for reservation.', 'rooms', 13, 0, 0, NULL, NULL, '2025-12-06 04:18:40'),
(71, 5, 1, 'room_available', 'Room Now Available: CCB LAB-01', 'CCB LAB-01 in Computer Center Building is now available for reservation.', 'rooms', 13, 0, 0, NULL, NULL, '2025-12-06 04:18:40'),
(75, 4, 1, 'room_unavailable', 'Room Unavailable: CCB LAB-01', 'CCB LAB-01 in Computer Center Building is temporarily unavailable.', 'rooms', 13, 0, 0, NULL, NULL, '2025-12-06 04:20:06'),
(76, 5, 1, 'room_unavailable', 'Room Unavailable: CCB LAB-01', 'CCB LAB-01 in Computer Center Building is temporarily unavailable.', 'rooms', 13, 0, 0, NULL, NULL, '2025-12-06 04:20:06'),
(80, 4, 1, 'room_available', 'Room Now Available: CCB LAB-01', 'CCB LAB-01 in Computer Center Building is now available for reservation.', 'rooms', 13, 0, 0, NULL, NULL, '2025-12-06 04:20:11'),
(81, 5, 1, 'room_available', 'Room Now Available: CCB LAB-01', 'CCB LAB-01 in Computer Center Building is now available for reservation.', 'rooms', 13, 0, 0, NULL, NULL, '2025-12-06 04:20:11'),
(89, 4, 1, 'room_unavailable', 'Room Unavailable: CCB LAB-01', 'CCB LAB-01 in Computer Center Building is temporarily unavailable.', 'rooms', 13, 0, 0, NULL, NULL, '2025-12-06 04:25:40'),
(90, 5, 1, 'room_unavailable', 'Room Unavailable: CCB LAB-01', 'CCB LAB-01 in Computer Center Building is temporarily unavailable.', 'rooms', 13, 0, 0, NULL, NULL, '2025-12-06 04:25:40'),
(94, 4, 1, 'room_updated', 'Room Updated: CCB LAB-01', 'CCB LAB-01 has been updated. Check the room details for changes.', 'rooms', 13, 0, 0, NULL, NULL, '2025-12-06 04:25:47'),
(95, 5, 1, 'room_updated', 'Room Updated: CCB LAB-01', 'CCB LAB-01 has been updated. Check the room details for changes.', 'rooms', 13, 0, 0, NULL, NULL, '2025-12-06 04:25:47'),
(99, 4, 1, 'room_created', 'New Room Available: c', 'A new room has been added to the system: c in c. Capacity: 30 students.', 'rooms', 19, 0, 0, NULL, NULL, '2025-12-06 04:26:00'),
(100, 5, 1, 'room_created', 'New Room Available: c', 'A new room has been added to the system: c in c. Capacity: 30 students.', 'rooms', 19, 0, 0, NULL, NULL, '2025-12-06 04:26:00'),
(104, 4, 1, 'room_deleted', 'Room Deleted: c', 'c in c has been removed from the system.', 'rooms', 19, 0, 1, NULL, NULL, '2025-12-06 04:26:02'),
(105, 5, 1, 'room_deleted', 'Room Deleted: c', 'c in c has been removed from the system.', 'rooms', 19, 0, 1, NULL, NULL, '2025-12-06 04:26:02'),
(107, 2, 1, 'room_available', 'Room Now Available: CCB LAB-01', 'CCB LAB-01 in Computer Center Building is now available for reservation.', 'rooms', 13, 0, 0, NULL, NULL, '2025-12-06 04:55:35'),
(108, 3, 1, 'room_available', 'Room Now Available: CCB LAB-01', 'CCB LAB-01 in Computer Center Building is now available for reservation.', 'rooms', 13, 0, 0, NULL, NULL, '2025-12-06 04:55:35'),
(109, 4, 1, 'room_available', 'Room Now Available: CCB LAB-01', 'CCB LAB-01 in Computer Center Building is now available for reservation.', 'rooms', 13, 0, 0, NULL, NULL, '2025-12-06 04:55:35'),
(110, 5, 1, 'room_available', 'Room Now Available: CCB LAB-01', 'CCB LAB-01 in Computer Center Building is now available for reservation.', 'rooms', 13, 0, 0, NULL, NULL, '2025-12-06 04:55:35'),
(112, 2, 1, 'reservation_approved', 'Reservation Approved: CCB LAB-03', 'Your reservation for CCB LAB-03 on December 6, 2025 (7:00 PM - 8:00 PM) has been approved by System Administrator.', 'reservations', 14, 0, 0, '2025-12-08 05:00:36', NULL, '2025-12-06 05:00:36'),
(113, 1, 2, 'reservation_created', 'New Reservation Request: ICT RM-11', 'Instructor One (instructor@cict.edu.ph) requested ICT RM-11 on December 6, 2025 (1:14 PM - 2:14 PM) for: Activity', 'reservations', 15, 0, 1, '2025-12-09 05:14:55', NULL, '2025-12-06 05:14:55'),
(114, 2, 1, 'reservation_approved', 'Reservation Approved: ICT RM-11', 'Your reservation for ICT RM-11 on December 6, 2025 (1:14 PM - 2:14 PM) has been approved by System Administrator.', 'reservations', 15, 0, 0, '2025-12-08 05:15:08', NULL, '2025-12-06 05:15:08');

-- --------------------------------------------------------

--
-- Table structure for table `reservations`
--

CREATE TABLE `reservations` (
  `id` int(11) NOT NULL,
  `room_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `date` date NOT NULL,
  `start_time` time NOT NULL,
  `end_time` time NOT NULL,
  `purpose` varchar(255) NOT NULL,
  `status` enum('pending','approved','rejected','cancelled') DEFAULT 'pending',
  `admin_notes` text DEFAULT NULL,
  `course` varchar(255) DEFAULT NULL,
  `year` varchar(10) DEFAULT NULL,
  `block` varchar(10) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `reservations`
--

INSERT INTO `reservations` (`id`, `room_id`, `user_id`, `date`, `start_time`, `end_time`, `purpose`, `status`, `admin_notes`, `course`, `year`, `block`, `created_at`, `updated_at`) VALUES
(1, 1, 2, '2024-12-20', '14:00:00', '15:30:00', 'BSIT 3-3 Final Exam', 'approved', NULL, 'BS in Information Technology', '3', '3', '2025-12-06 03:32:44', '2025-12-06 03:32:44'),
(2, 2, 2, '2024-12-21', '10:00:00', '12:00:00', 'BSIT 3-3 Project Consultation', 'approved', NULL, 'BS in Information Technology', '3', '3', '2025-12-06 03:32:44', '2025-12-06 03:32:44'),
(3, 3, 2, '2024-12-22', '09:00:00', '11:00:00', 'BSCS 2-2 Programming Lab', 'approved', NULL, 'BS in Computer Science', '2', '2', '2025-12-06 03:32:44', '2025-12-06 03:32:44'),
(4, 4, 2, '2024-12-23', '13:00:00', '15:00:00', 'BSIS 4-1 Thesis Defense', 'approved', 'Reservation approved by admin', 'BS in Information Systems', '4', '1', '2025-12-06 03:32:44', '2025-12-06 03:37:46'),
(5, 5, 2, '2024-12-24', '16:00:00', '17:00:00', 'Faculty Meeting', 'approved', NULL, NULL, NULL, NULL, '2025-12-06 03:32:44', '2025-12-06 03:32:44'),
(6, 13, 2, '2025-12-06', '11:38:00', '12:38:00', 'Examination', 'approved', 'Reservation approved by admin', 'BS in Computer Science', '1', '1', '2025-12-06 03:38:41', '2025-12-06 03:39:23'),
(7, 14, 2, '2025-12-06', '11:46:00', '12:46:00', 'Quiz', 'approved', 'Reservation approved by admin', 'BS in Computer Science', '2', '1', '2025-12-06 03:46:56', '2025-12-06 04:07:43'),
(8, 14, 2, '2025-12-06', '13:48:00', '14:48:00', 'Meeting', 'approved', 'Reservation approved by admin', 'BS in Computer Science', '1', '1', '2025-12-06 03:49:14', '2025-12-06 04:09:57'),
(9, 14, 2, '2025-12-06', '15:09:00', '16:09:00', 'Examination', 'approved', 'Reservation approved by admin', 'BS in Computer Science', '1', '1', '2025-12-06 04:09:36', '2025-12-06 04:09:54'),
(10, 13, 2, '2025-12-06', '17:10:00', '20:10:00', 'Lecture', 'rejected', 'Reservation rejected by admin', 'BS in Information Technology', '1', '1', '2025-12-06 04:10:37', '2025-12-06 04:10:48'),
(11, 9, 2, '2025-12-06', '12:12:00', '13:12:00', 'Lecture', 'rejected', 'Reservation rejected by admin', 'BS in Computer Science', '1', '1', '2025-12-06 04:12:14', '2025-12-06 04:12:36'),
(12, 10, 2, '2025-12-06', '13:15:00', '14:15:00', 'Quiz', 'approved', 'Reservation approved by admin', 'BS in Information Technology', '1', '1', '2025-12-06 04:15:29', '2025-12-06 04:22:09'),
(13, 13, 2, '2025-12-07', '13:24:00', '14:24:00', 'Examination', 'cancelled', 'Cancelled by instructor', 'BTVTED - Computer System Servicing', '2', '2', '2025-12-06 04:24:44', '2025-12-06 04:25:22'),
(14, 15, 2, '2025-12-06', '19:00:00', '20:00:00', 'Activity', 'approved', 'Reservation approved by admin', 'BS in Information Technology', '1', '1', '2025-12-06 05:00:23', '2025-12-06 05:00:36'),
(15, 5, 2, '2025-12-06', '13:14:00', '14:14:00', 'Activity', 'approved', 'Reservation approved by admin', 'BS in Information Technology', '1', '1', '2025-12-06 05:14:55', '2025-12-06 05:15:08');

--
-- Triggers `reservations`
--
DELIMITER $$
CREATE TRIGGER `after_reservations_delete` AFTER DELETE ON `reservations` FOR EACH ROW BEGIN
      DECLARE room_num VARCHAR(50);
      SELECT room_number INTO room_num FROM rooms WHERE id = OLD.room_id;
      
      INSERT INTO user_log (action_type, table_name, record_id, description) 
      VALUES ('DELETE', 'reservations', OLD.id, 
        CONCAT('Reservation deleted: Room #', room_num, 
        ' for ', OLD.date, ' ', OLD.start_time, '-', OLD.end_time));
    END
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `after_reservations_insert` AFTER INSERT ON `reservations` FOR EACH ROW INSERT INTO user_log (user_id, action_type, table_name, record_id, description) 
    VALUES (NEW.user_id, 'INSERT', 'reservations', NEW.id, 
      CONCAT('Reservation created: Room #', 
      (SELECT room_number FROM rooms WHERE id = NEW.room_id), 
      ' for ', NEW.date, ' ', NEW.start_time, '-', NEW.end_time))
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `after_reservations_update` AFTER UPDATE ON `reservations` FOR EACH ROW BEGIN
      DECLARE action_type_val VARCHAR(50);
      DECLARE description_val TEXT;
      DECLARE room_num VARCHAR(50);
      
      SELECT room_number INTO room_num FROM rooms WHERE id = NEW.room_id;
      
      IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
        SET action_type_val = 'CANCEL';
        SET description_val = CONCAT('Reservation cancelled: Room #', room_num, 
          ' for ', NEW.date, ' ', NEW.start_time, '-', NEW.end_time);
      ELSEIF NEW.status = 'approved' AND OLD.status != 'approved' THEN
        SET action_type_val = 'APPROVE';
        SET description_val = CONCAT('Reservation approved: Room #', room_num, 
          ' for ', NEW.date, ' ', NEW.start_time, '-', NEW.end_time);
      ELSEIF NEW.status = 'rejected' AND OLD.status != 'rejected' THEN
        SET action_type_val = 'REJECT';
        SET description_val = CONCAT('Reservation rejected: Room #', room_num, 
          ' for ', NEW.date, ' ', NEW.start_time, '-', NEW.end_time);
      ELSE
        SET action_type_val = 'UPDATE';
        SET description_val = CONCAT('Reservation updated: Room #', room_num, 
          ' for ', NEW.date, ' ', NEW.start_time, '-', NEW.end_time);
      END IF;
      
      INSERT INTO user_log (user_id, action_type, table_name, record_id, description) 
      VALUES (NEW.user_id, action_type_val, 'reservations', NEW.id, description_val);
    END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Table structure for table `rooms`
--

CREATE TABLE `rooms` (
  `id` int(11) NOT NULL,
  `room_number` varchar(50) NOT NULL,
  `building` varchar(255) NOT NULL,
  `capacity` int(11) NOT NULL,
  `type` enum('classroom','lab','conference') DEFAULT 'classroom',
  `equipment` text DEFAULT NULL,
  `is_available` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `rooms`
--

INSERT INTO `rooms` (`id`, `room_number`, `building`, `capacity`, `type`, `equipment`, `is_available`, `created_at`, `updated_at`) VALUES
(1, 'ICT RM-07', 'ICT Building', 40, 'classroom', 'Projector, Whiteboard, Aircon', 1, '2025-12-06 03:32:44', '2025-12-06 03:32:44'),
(2, 'ICT RM-08', 'ICT Building', 35, 'classroom', 'Projector, Whiteboard, Aircon', 1, '2025-12-06 03:32:44', '2025-12-06 03:32:44'),
(3, 'ICT RM-09', 'ICT Building', 40, 'classroom', 'Smart Board, Aircon', 1, '2025-12-06 03:32:44', '2025-12-06 03:32:44'),
(4, 'ICT RM-10', 'ICT Building', 30, 'classroom', 'Projector, Whiteboard, Aircon', 1, '2025-12-06 03:32:44', '2025-12-06 03:32:44'),
(5, 'ICT RM-11', 'ICT Building', 40, 'classroom', 'Smart Board, Aircon', 1, '2025-12-06 03:32:44', '2025-12-06 03:41:19'),
(6, 'CCB RM-01', 'Computer Center Building', 45, 'classroom', 'Projector, Whiteboard, Aircon', 1, '2025-12-06 03:32:44', '2025-12-06 03:32:44'),
(7, 'CCB RM-02', 'Computer Center Building', 40, 'classroom', 'Projector, Whiteboard, Aircon', 1, '2025-12-06 03:32:44', '2025-12-06 03:32:44'),
(8, 'CCB RM-03', 'Computer Center Building', 35, 'classroom', 'Smart Board, Aircon', 1, '2025-12-06 03:32:44', '2025-12-06 03:32:44'),
(9, 'CCB RM-04', 'Computer Center Building', 30, 'classroom', 'Projector, Whiteboard, Aircon', 1, '2025-12-06 03:32:44', '2025-12-06 03:32:44'),
(10, 'CCB RM-05', 'Computer Center Building', 40, 'classroom', 'Smart Board, Aircon', 1, '2025-12-06 03:32:44', '2025-12-06 03:32:44'),
(11, 'CCB RM-06', 'Computer Center Building', 35, 'classroom', 'Projector, Whiteboard, Aircon', 1, '2025-12-06 03:32:44', '2025-12-06 03:32:44'),
(12, 'CCB RM-07', 'Computer Center Building', 30, 'classroom', 'Smart Board, Aircon', 1, '2025-12-06 03:32:44', '2025-12-06 03:32:44'),
(13, 'CCB LAB-01', 'Computer Center Building', 41, 'lab', '25 Computers, Projector, Aircon', 1, '2025-12-06 03:32:44', '2025-12-06 04:55:35'),
(14, 'CCB LAB-02', 'Computer Center Building', 25, 'lab', '25 Computers, Projector, Aircon', 1, '2025-12-06 03:32:44', '2025-12-06 03:32:44'),
(15, 'CCB LAB-03', 'Computer Center Building', 30, 'lab', '30 Computers, Smart Board, Aircon', 1, '2025-12-06 03:32:44', '2025-12-06 03:32:44'),
(16, 'CCB LAB-04', 'Computer Center Building', 20, 'lab', '20 Computers, Projector, Aircon', 1, '2025-12-06 03:32:44', '2025-12-06 03:32:44');

--
-- Triggers `rooms`
--
DELIMITER $$
CREATE TRIGGER `after_rooms_delete` AFTER DELETE ON `rooms` FOR EACH ROW INSERT INTO user_log (action_type, table_name, record_id, description) 
    VALUES ('DELETE', 'rooms', OLD.id, CONCAT('Room deleted: ', OLD.room_number, ' - ', OLD.building))
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `after_rooms_insert` AFTER INSERT ON `rooms` FOR EACH ROW INSERT INTO user_log (action_type, table_name, record_id, description) 
    VALUES ('INSERT', 'rooms', NEW.id, CONCAT('Room created: ', NEW.room_number, ' - ', NEW.building))
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `after_rooms_update` AFTER UPDATE ON `rooms` FOR EACH ROW INSERT INTO user_log (action_type, table_name, record_id, description) 
    VALUES ('UPDATE', 'rooms', NEW.id, CONCAT('Room updated: ', NEW.room_number, ' - ', NEW.building))
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `role` enum('student','instructor','admin') NOT NULL,
  `student_id` varchar(50) DEFAULT NULL,
  `department` varchar(255) DEFAULT NULL,
  `year` varchar(10) DEFAULT NULL,
  `block` varchar(10) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `email`, `password`, `name`, `role`, `student_id`, `department`, `year`, `block`, `created_at`, `updated_at`) VALUES
(1, 'admin@cict.edu.ph', '$2b$12$tDM/nYLi.x5cuwqoZvSBkei3ppV/SADaoDfiUofxjl5/08QKXuGGC', 'System Administrator', 'admin', NULL, NULL, NULL, NULL, '2025-12-06 03:32:44', '2025-12-06 03:32:44'),
(2, 'instructor@cict.edu.ph', '$2b$12$ea2c82OvMpfFHobCIQvxK.A35oU51Odb5dcDzq1ISMf0e5PkQcMXu', 'Instructor One', 'instructor', NULL, 'CICT', NULL, NULL, '2025-12-06 03:32:44', '2025-12-06 04:26:13'),
(3, 'student@student.cict.edu.ph', '$2b$12$tDM/nYLi.x5cuwqoZvSBkei3ppV/SADaoDfiUofxjl5/08QKXuGGC', 'Student One', 'student', '2025-001', 'BS in Computer Science', '1', '1', '2025-12-06 03:32:44', '2025-12-06 03:32:44'),
(4, 'student2@student.cict.edu.ph', '$2b$12$tDM/nYLi.x5cuwqoZvSBkei3ppV/SADaoDfiUofxjl5/08QKXuGGC', 'Student Two', 'student', '2025-002', 'BS in Information Technology', '2', '3', '2025-12-06 03:32:44', '2025-12-06 03:32:44'),
(5, 'chan.forest@cict.edu.ph', '$2b$12$tDM/nYLi.x5cuwqoZvSBkei3ppV/SADaoDfiUofxjl5/08QKXuGGC', 'Prof. Chan Forest', 'instructor', NULL, 'CICT', NULL, NULL, '2025-12-06 03:32:44', '2025-12-06 03:32:44');

--
-- Triggers `users`
--
DELIMITER $$
CREATE TRIGGER `after_users_delete` AFTER DELETE ON `users` FOR EACH ROW INSERT INTO user_log (action_type, table_name, record_id, description) 
    VALUES ('DELETE', 'users', OLD.id, CONCAT('User deleted: ', OLD.name, ' (', OLD.email, ')'))
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `after_users_insert` AFTER INSERT ON `users` FOR EACH ROW INSERT INTO user_log (user_id, action_type, table_name, record_id, description) 
    VALUES (NEW.id, 'INSERT', 'users', NEW.id, CONCAT('User created: ', NEW.name, ' (', NEW.email, ')'))
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `after_users_update` AFTER UPDATE ON `users` FOR EACH ROW INSERT INTO user_log (user_id, action_type, table_name, record_id, description) 
    VALUES (NEW.id, 'UPDATE', 'users', NEW.id, CONCAT('User updated: ', NEW.name, ' (', NEW.email, ')'))
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `create_account_status_on_user` AFTER INSERT ON `users` FOR EACH ROW BEGIN
      INSERT INTO account_status (user_id, user_type) 
      VALUES (NEW.id, NEW.role);
    END
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `update_account_status_user_type` AFTER UPDATE ON `users` FOR EACH ROW BEGIN
      IF OLD.role != NEW.role THEN
        UPDATE account_status 
        SET user_type = NEW.role
        WHERE user_id = NEW.id;
      END IF;
    END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Stand-in structure for view `user_activity_view`
-- (See below for the actual view)
--
CREATE TABLE `user_activity_view` (
`id` int(11)
,`action_time` timestamp
,`action_type` enum('INSERT','UPDATE','DELETE','LOGIN','LOGOUT','APPROVE','REJECT','CANCEL','RESET_PASSWORD','CHANGE_PASSWORD')
,`table_name` varchar(50)
,`record_id` int(11)
,`description` text
,`ip_address` varchar(45)
,`user_agent` text
,`user_name` varchar(255)
,`user_email` varchar(255)
,`user_role` enum('student','instructor','admin')
);

-- --------------------------------------------------------

--
-- Table structure for table `user_log`
--

CREATE TABLE `user_log` (
  `id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `action_type` enum('INSERT','UPDATE','DELETE','LOGIN','LOGOUT','APPROVE','REJECT','CANCEL','RESET_PASSWORD','CHANGE_PASSWORD') NOT NULL,
  `table_name` varchar(50) NOT NULL,
  `record_id` int(11) DEFAULT NULL,
  `description` text NOT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text DEFAULT NULL,
  `action_time` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `user_log`
--

INSERT INTO `user_log` (`id`, `user_id`, `action_type`, `table_name`, `record_id`, `description`, `ip_address`, `user_agent`, `action_time`) VALUES
(1, 1, 'LOGIN', 'users', 1, 'Admin logged in', NULL, NULL, '2025-12-06 01:32:44'),
(2, 1, 'APPROVE', 'reservations', 1, 'Approved reservation for ICT RM-07', NULL, NULL, '2025-12-06 02:32:44'),
(3, 1, 'UPDATE', 'users', 2, 'Updated user: Instructor One', NULL, NULL, '2025-12-06 03:02:44'),
(4, 2, 'INSERT', 'reservations', 5, 'Created new reservation for CCB RM-05', NULL, NULL, '2025-12-06 03:17:44'),
(5, 2, 'APPROVE', 'reservations', 4, 'Reservation approved: Room #ICT RM-10 for 2024-12-23 13:00:00-15:00:00', NULL, NULL, '2025-12-06 03:37:46'),
(6, 2, 'INSERT', 'reservations', 6, 'Reservation created: Room #CCB LAB-01 for 2025-12-06 11:38:00-12:38:00', NULL, NULL, '2025-12-06 03:38:41'),
(7, 2, 'APPROVE', 'reservations', 6, 'Reservation approved: Room #CCB LAB-01 for 2025-12-06 11:38:00-12:38:00', NULL, NULL, '2025-12-06 03:39:23'),
(8, NULL, 'UPDATE', 'rooms', 13, 'Room updated: CCB LAB-01 - Computer Center Building', NULL, NULL, '2025-12-06 03:40:33'),
(9, NULL, 'UPDATE', 'rooms', 13, 'Room updated: CCB LAB-01 - Computer Center Building', NULL, NULL, '2025-12-06 03:41:13'),
(10, NULL, 'UPDATE', 'rooms', 5, 'Room updated: ICT RM-11 - ICT Building', NULL, NULL, '2025-12-06 03:41:19'),
(11, NULL, 'INSERT', 'rooms', 17, 'Room created: c - c', NULL, NULL, '2025-12-06 03:41:26'),
(12, NULL, 'DELETE', 'rooms', 17, 'Room deleted: c - c', NULL, NULL, '2025-12-06 03:41:29'),
(13, 2, 'INSERT', 'reservations', 7, 'Reservation created: Room #CCB LAB-02 for 2025-12-06 11:46:00-12:46:00', NULL, NULL, '2025-12-06 03:46:56'),
(14, 2, 'INSERT', 'reservations', 8, 'Reservation created: Room #CCB LAB-02 for 2025-12-06 13:48:00-14:48:00', NULL, NULL, '2025-12-06 03:49:14'),
(15, NULL, 'UPDATE', 'rooms', 13, 'Room updated: CCB LAB-01 - Computer Center Building', NULL, NULL, '2025-12-06 04:07:09'),
(16, NULL, 'UPDATE', 'rooms', 13, 'Room updated: CCB LAB-01 - Computer Center Building', NULL, NULL, '2025-12-06 04:07:11'),
(17, NULL, 'UPDATE', 'rooms', 13, 'Room updated: CCB LAB-01 - Computer Center Building', NULL, NULL, '2025-12-06 04:07:16'),
(18, NULL, 'INSERT', 'rooms', 18, 'Room created: d - d', NULL, NULL, '2025-12-06 04:07:25'),
(19, NULL, 'DELETE', 'rooms', 18, 'Room deleted: d - d', NULL, NULL, '2025-12-06 04:07:27'),
(20, 2, 'APPROVE', 'reservations', 7, 'Reservation approved: Room #CCB LAB-02 for 2025-12-06 11:46:00-12:46:00', NULL, NULL, '2025-12-06 04:07:43'),
(21, 2, 'INSERT', 'reservations', 9, 'Reservation created: Room #CCB LAB-02 for 2025-12-06 15:09:00-16:09:00', NULL, NULL, '2025-12-06 04:09:36'),
(22, 2, 'APPROVE', 'reservations', 9, 'Reservation approved: Room #CCB LAB-02 for 2025-12-06 15:09:00-16:09:00', NULL, NULL, '2025-12-06 04:09:54'),
(23, 2, 'APPROVE', 'reservations', 8, 'Reservation approved: Room #CCB LAB-02 for 2025-12-06 13:48:00-14:48:00', NULL, NULL, '2025-12-06 04:09:57'),
(24, 2, 'INSERT', 'reservations', 10, 'Reservation created: Room #CCB LAB-01 for 2025-12-06 17:10:00-20:10:00', NULL, NULL, '2025-12-06 04:10:37'),
(25, 2, 'REJECT', 'reservations', 10, 'Reservation rejected: Room #CCB LAB-01 for 2025-12-06 17:10:00-20:10:00', NULL, NULL, '2025-12-06 04:10:48'),
(26, 2, 'INSERT', 'reservations', 11, 'Reservation created: Room #CCB RM-04 for 2025-12-06 12:12:00-13:12:00', NULL, NULL, '2025-12-06 04:12:14'),
(27, 2, 'REJECT', 'reservations', 11, 'Reservation rejected: Room #CCB RM-04 for 2025-12-06 12:12:00-13:12:00', NULL, NULL, '2025-12-06 04:12:36'),
(28, 2, 'UPDATE', 'users', 2, 'User updated: Instructor One (instructor@cict.edu.ph)', NULL, NULL, '2025-12-06 04:14:27'),
(29, 2, 'UPDATE', 'users', 2, 'User updated: Instructor One (instructor@cict.edu.ph)', NULL, NULL, '2025-12-06 04:14:29'),
(30, 2, 'INSERT', 'reservations', 12, 'Reservation created: Room #CCB RM-05 for 2025-12-06 13:15:00-14:15:00', NULL, NULL, '2025-12-06 04:15:29'),
(31, NULL, 'UPDATE', 'rooms', 13, 'Room updated: CCB LAB-01 - Computer Center Building', NULL, NULL, '2025-12-06 04:18:24'),
(32, NULL, 'UPDATE', 'rooms', 13, 'Room updated: CCB LAB-01 - Computer Center Building', NULL, NULL, '2025-12-06 04:18:40'),
(33, NULL, 'UPDATE', 'rooms', 13, 'Room updated: CCB LAB-01 - Computer Center Building', NULL, NULL, '2025-12-06 04:20:06'),
(34, NULL, 'UPDATE', 'rooms', 13, 'Room updated: CCB LAB-01 - Computer Center Building', NULL, NULL, '2025-12-06 04:20:11'),
(35, 2, 'APPROVE', 'reservations', 12, 'Reservation approved: Room #CCB RM-05 for 2025-12-06 13:15:00-14:15:00', NULL, NULL, '2025-12-06 04:22:09'),
(36, 2, 'INSERT', 'reservations', 13, 'Reservation created: Room #CCB LAB-01 for 2025-12-07 13:24:00-14:24:00', NULL, NULL, '2025-12-06 04:24:44'),
(37, 2, 'APPROVE', 'reservations', 13, 'Reservation approved: Room #CCB LAB-01 for 2025-12-07 13:24:00-14:24:00', NULL, NULL, '2025-12-06 04:25:03'),
(38, 2, 'CANCEL', 'reservations', 13, 'Reservation cancelled: Room #CCB LAB-01 for 2025-12-07 13:24:00-14:24:00', NULL, NULL, '2025-12-06 04:25:22'),
(39, NULL, 'UPDATE', 'rooms', 13, 'Room updated: CCB LAB-01 - Computer Center Building', NULL, NULL, '2025-12-06 04:25:40'),
(40, NULL, 'UPDATE', 'rooms', 13, 'Room updated: CCB LAB-01 - Computer Center Building', NULL, NULL, '2025-12-06 04:25:47'),
(41, NULL, 'INSERT', 'rooms', 19, 'Room created: c - c', NULL, NULL, '2025-12-06 04:26:00'),
(42, NULL, 'DELETE', 'rooms', 19, 'Room deleted: c - c', NULL, NULL, '2025-12-06 04:26:02'),
(43, 2, 'UPDATE', 'users', 2, 'User updated: Instructor One (instructor@cict.edu.ph)', NULL, NULL, '2025-12-06 04:26:13'),
(44, NULL, 'UPDATE', 'rooms', 13, 'Room updated: CCB LAB-01 - Computer Center Building', NULL, NULL, '2025-12-06 04:55:35'),
(45, 2, 'INSERT', 'reservations', 14, 'Reservation created: Room #CCB LAB-03 for 2025-12-06 19:00:00-20:00:00', NULL, NULL, '2025-12-06 05:00:23'),
(46, 2, 'APPROVE', 'reservations', 14, 'Reservation approved: Room #CCB LAB-03 for 2025-12-06 19:00:00-20:00:00', NULL, NULL, '2025-12-06 05:00:36'),
(47, 2, 'INSERT', 'reservations', 15, 'Reservation created: Room #ICT RM-11 for 2025-12-06 13:14:00-14:14:00', NULL, NULL, '2025-12-06 05:14:55'),
(48, 2, 'APPROVE', 'reservations', 15, 'Reservation approved: Room #ICT RM-11 for 2025-12-06 13:14:00-14:14:00', NULL, NULL, '2025-12-06 05:15:08');

-- --------------------------------------------------------

--
-- Structure for view `user_activity_view`
--
DROP TABLE IF EXISTS `user_activity_view`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `user_activity_view`  AS SELECT `ul`.`id` AS `id`, `ul`.`action_time` AS `action_time`, `ul`.`action_type` AS `action_type`, `ul`.`table_name` AS `table_name`, `ul`.`record_id` AS `record_id`, `ul`.`description` AS `description`, `ul`.`ip_address` AS `ip_address`, `ul`.`user_agent` AS `user_agent`, `u`.`name` AS `user_name`, `u`.`email` AS `user_email`, `u`.`role` AS `user_role` FROM (`user_log` `ul` left join `users` `u` on(`ul`.`user_id` = `u`.`id`)) ORDER BY `ul`.`action_time` DESC ;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `account_status`
--
ALTER TABLE `account_status`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `user_id` (`user_id`),
  ADD KEY `idx_user_type` (`user_type`),
  ADD KEY `idx_is_online` (`is_online`),
  ADD KEY `idx_last_activity` (`last_activity`);

--
-- Indexes for table `class_schedules`
--
ALTER TABLE `class_schedules`
  ADD PRIMARY KEY (`id`),
  ADD KEY `room_id` (`room_id`),
  ADD KEY `instructor_id` (`instructor_id`);

--
-- Indexes for table `notifications`
--
ALTER TABLE `notifications`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_user_id` (`user_id`),
  ADD KEY `idx_is_read` (`is_read`),
  ADD KEY `idx_created_at` (`created_at`),
  ADD KEY `idx_expires_at` (`expires_at`),
  ADD KEY `idx_type` (`type`),
  ADD KEY `sender_id` (`sender_id`);

--
-- Indexes for table `reservations`
--
ALTER TABLE `reservations`
  ADD PRIMARY KEY (`id`),
  ADD KEY `room_id` (`room_id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `rooms`
--
ALTER TABLE `rooms`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `room_number` (`room_number`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`);

--
-- Indexes for table `user_log`
--
ALTER TABLE `user_log`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_user_id` (`user_id`),
  ADD KEY `idx_action_time` (`action_time`),
  ADD KEY `idx_action_type` (`action_type`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `account_status`
--
ALTER TABLE `account_status`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=39;

--
-- AUTO_INCREMENT for table `class_schedules`
--
ALTER TABLE `class_schedules`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `notifications`
--
ALTER TABLE `notifications`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `reservations`
--
ALTER TABLE `reservations`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=16;

--
-- AUTO_INCREMENT for table `rooms`
--
ALTER TABLE `rooms`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=20;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `user_log`
--
ALTER TABLE `user_log`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=49;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `account_status`
--
ALTER TABLE `account_status`
  ADD CONSTRAINT `account_status_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `class_schedules`
--
ALTER TABLE `class_schedules`
  ADD CONSTRAINT `class_schedules_ibfk_1` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `class_schedules_ibfk_2` FOREIGN KEY (`instructor_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `notifications`
--
ALTER TABLE `notifications`
  ADD CONSTRAINT `notifications_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `notifications_ibfk_2` FOREIGN KEY (`sender_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `reservations`
--
ALTER TABLE `reservations`
  ADD CONSTRAINT `reservations_ibfk_1` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `reservations_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `user_log`
--
ALTER TABLE `user_log`
  ADD CONSTRAINT `user_log_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
