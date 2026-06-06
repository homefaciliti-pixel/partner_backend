import 'package:flutter/widgets.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import '../auth/auth_viewmodel.dart';

class HomeViewModel extends ChangeNotifier {

  // ================= BOOKINGS DATA (MAIN SOURCE ) =================

  //  ye main data hai (Dashboard + Booking dono yahi use karenge)
  List<Map<String, String>> bookings = [
    {
      "id": "101",
      "status": "pending",
      "service": "AC Service & Repairing",
      "date": "06-06-2026",
      "time": "10:00 AM - 12:00 PM",
      "serviceAmount": "499",
      "serviceRequestNumber": "REQ-2026-101",
      "address": "H.No 12, Block B, Connaught Place",
      "city": "Delhi",
      "locality": "Connaught Place",
      "customerName": "Rahul Sharma",
      "customerPhone": "9876543210"
    },
    {
      "id": "102",
      "status": "upcoming",
      "service": "Deep Sofa Cleaning",
      "date": "06-06-2026",
      "time": "01:00 PM - 03:00 PM",
      "serviceAmount": "799",
      "serviceRequestNumber": "REQ-2026-102",
      "address": "Flat 402, Sector 15, Vasundhara",
      "city": "Ghaziabad",
      "locality": "Vasundhara",
      "customerName": "Aarav Gupta",
      "customerPhone": "9112233445"
    },
    {
      "id": "103",
      "status": "in_progress",
      "service": "Kitchen Deep Cleaning",
      "date": "05-06-2026",
      "time": "09:00 AM - 01:00 PM",
      "serviceAmount": "1499",
      "serviceRequestNumber": "REQ-2026-103",
      "address": "Villa 18, Golf Course Road",
      "city": "Gurugram",
      "locality": "Sector 42",
      "customerName": "Priyanka Sen",
      "customerPhone": "9223344556"
    },
    {
      "id": "104",
      "status": "completed",
      "service": "Fan Repairing & Installation",
      "date": "04-06-2026",
      "time": "04:00 PM - 05:00 PM",
      "serviceAmount": "199",
      "serviceRequestNumber": "REQ-2026-104",
      "address": "H.No 45, Gali 2, Raja Park",
      "city": "Jaipur",
      "locality": "Raja Park",
      "customerName": "Mahendra Singh",
      "customerPhone": "9334455667"
    },
    {
      "id": "105",
      "status": "cancel",
      "service": "Electric Wire & Switch Fitting",
      "date": "03-06-2026",
      "time": "03:00 PM - 04:00 PM",
      "serviceAmount": "299",
      "serviceRequestNumber": "REQ-2026-105",
      "address": "B-12, Malviya Industrial Area",
      "city": "Jaipur",
      "locality": "Malviya Nagar",
      "customerName": "Vikas Verma",
      "customerPhone": "9445566778"
    }
  ];

  // ================= DASHBOARD (AUTO CALCULATED) =================

  //  ye sab bookings list se auto calculate hoga

  int get totalBooking => bookings.length;

  int get upcomingBooking =>
      bookings.where((e) => e["status"] == "upcoming" || e["status"] == "pending").length;

  int get inProgressBooking =>
      bookings.where((e) => e["status"] == "in_progress").length;

  int get acceptedBooking =>
      bookings.where((e) => e["status"] == "upcoming" || e["status"] == "in_progress" || e["status"] == "pending").length;

  int get completedBooking =>
      bookings.where((e) => e["status"] == "completed").length;

  int get cancelBooking =>
      bookings.where((e) => e["status"] == "cancel").length;

  // ================= LOGOUT =================

  bool isLogout = false;

  void logout() {
    isLogout = true;
    notifyListeners();
  }

  void resetLogout() {
    isLogout = false;
  }

  // ================= BANNER =================

  List<String> banners = [
    "https://picsum.photos/400/200",
    "https://picsum.photos/401/200",
    "https://picsum.photos/402/200",
  ];

  int currentBannerIndex = 0;

  final PageController pageController = PageController();

  //  swipe ke liye
  void changeBanner(int index) {
    currentBannerIndex = index;
    notifyListeners();
  }

  //  auto slide
  void startAutoSlide() {
    Future.delayed(const Duration(seconds: 3), () {

      int nextPage = currentBannerIndex + 1;

      if (nextPage >= banners.length) {
        nextPage = 0;
      }

      pageController.animateToPage(
        nextPage,
        duration: const Duration(milliseconds: 500),
        curve: Curves.easeInOut,
      );

      startAutoSlide(); //  loop
    });
  }

  // ================= BOTTOM NAV =================

  int currentIndex = 0;

  void changeTab(int index) {
    currentIndex = index;
    notifyListeners();
  }


  String selectedFilter = "upcoming";


  void changeFilter(String value){
    selectedFilter =value;
    notifyListeners();

  }

  List<Map<String, String>> get filteredBookings {
    if (selectedFilter == "upcoming") {
      return bookings
          .where((e) => e["status"] == "upcoming" || e["status"] == "pending")
          .toList();
    }
    return bookings
        .where((e) => e["status"] == selectedFilter)
        .toList();
  }


           /// Earning screen


//  total wallet
  int totalEarning = 0;

//  cash earning
  int todayEarning = 0;

//  online earning
  int monthlyEarning = 0;

  Future<void> fetchBookings(String token) async {
    try {
      final response = await http.get(
        Uri.parse("${AuthViewModel.baseUrl}/bookings"),
        headers: {"Authorization": "Bearer $token"},
      );

      if (response.statusCode == 200) {
        final List<dynamic> data = jsonDecode(response.body);
        if (data.isNotEmpty) {
          bookings = data.map((item) => {
            "id": item["id"].toString(),
            "status": item["status"].toString(),
            "service": item["service"].toString(),
            "date": item["date"].toString(),
            "time": item["time"].toString(),
            "serviceAmount": (item["serviceAmount"] ?? "").toString(),
            "serviceRequestNumber": (item["serviceRequestNumber"] ?? "").toString(),
            "address": (item["address"] ?? "").toString(),
            "city": (item["city"] ?? "").toString(),
            "locality": (item["locality"] ?? "").toString(),
            "customerName": (item["customerName"] ?? "").toString(),
            "customerPhone": (item["customerPhone"] ?? "").toString(),
          }).toList();
          notifyListeners();
        }
      }
    } catch (e) {
      debugPrint("Error fetching bookings: $e");
    }
  }

  // Accept a pending unassigned booking and set status to upcoming (Assigned)
  Future<bool> acceptBooking(String bookingId, String token) async {
    try {
      final response = await http.post(
        Uri.parse("${AuthViewModel.baseUrl}/bookings/$bookingId/accept"),
        headers: {"Authorization": "Bearer $token"},
      );

      if (response.statusCode == 200) {
        final idx = bookings.indexWhere((element) => element["id"] == bookingId);
        if (idx != -1) {
          bookings[idx]["status"] = "upcoming";
          notifyListeners();
        }
        return true;
      }
    } catch (e) {
      debugPrint("Error accepting booking: $e");
    }
    return false;
  }

  Future<void> fetchEarnings(String token) async {
    try {
      final response = await http.get(
        Uri.parse("${AuthViewModel.baseUrl}/earnings"),
        headers: {"Authorization": "Bearer $token"},
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        totalEarning = data["totalEarning"] ?? 0;
        todayEarning = data["todayEarning"] ?? 0;
        monthlyEarning = data["monthlyEarning"] ?? 0;
        notifyListeners();
      }
    } catch (e) {
      debugPrint("Error fetching earnings: $e");
    }
  }

  // Start work on an assigned order
  Future<bool> startBooking(String bookingId, String token) async {
    try {
      final response = await http.post(
        Uri.parse("${AuthViewModel.baseUrl}/bookings/$bookingId/start"),
        headers: {"Authorization": "Bearer $token"},
      );

      if (response.statusCode == 200) {
        final idx = bookings.indexWhere((element) => element["id"] == bookingId);
        if (idx != -1) {
          bookings[idx]["status"] = "in_progress";
          notifyListeners();
        }
        return true;
      }
    } catch (e) {
      debugPrint("Error starting booking: $e");
    }
    return false;
  }

  // Complete work on a booking and trigger automated calculations on backend
  Future<bool> completeBooking(String bookingId, String token) async {
    try {
      final response = await http.post(
        Uri.parse("${AuthViewModel.baseUrl}/bookings/$bookingId/complete"),
        headers: {"Authorization": "Bearer $token"},
      );

      if (response.statusCode == 200) {
        final idx = bookings.indexWhere((element) => element["id"] == bookingId);
        if (idx != -1) {
          bookings[idx]["status"] = "completed";
          notifyListeners();
        }
        await fetchEarnings(token);
        return true;
      }
    } catch (e) {
      debugPrint("Error completing booking: $e");
    }
    return false;
  }

}