import 'package:flutter/widgets.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import '../auth/auth_viewmodel.dart';

class HomeViewModel extends ChangeNotifier {

  bool isPaid = false;
  bool isApproved = false;

  //  ye main data hai (Dashboard + Booking dono yahi use karenge)
  List<Map<String, String>> bookings = [];

  // ================= DASHBOARD (AUTO CALCULATED) =================

  //  ye sab bookings list se auto calculate hoga

  int get totalBooking => bookings.length;

  int get upcomingBooking =>
      bookings.where((e) => e["status"] == "pending").length;

  int get inProgressBooking =>
      bookings.where((e) => e["status"] == "accepted" || e["status"] == "in_progress").length;

  int get acceptedBooking =>
      bookings.where((e) => e["status"] == "accepted" || e["status"] == "in_progress").length;

  int get completedBooking =>
      bookings.where((e) => e["status"] == "completed").length;

  int get cancelBooking =>
      bookings.where((e) => e["status"] == "cancel").length;

  // ================= LOGOUT =================

  bool isLogout = false;

  void logout() {
    isLogout = true;
    isPaid = false;
    isApproved = false;
    bookings = [];
    totalEarning = 0;
    todayEarning = 0;
    monthlyEarning = 0;
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
          .where((e) => e["status"] == "pending")
          .toList();
    }
    if (selectedFilter == "in_progress") {
      return bookings
          .where((e) => e["status"] == "accepted" || e["status"] == "in_progress")
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
          bookings[idx]["status"] = "accepted";
          notifyListeners();
        }
        return true;
      }
    } catch (e) {
      debugPrint("Error accepting booking: $e");
    }
    return false;
  }

  Future<void> fetchDashboardData(String token) async {
    try {
      final response = await http.get(
        Uri.parse("${AuthViewModel.baseUrl}/partner/dashboard"),
        headers: {"Authorization": "Bearer $token"},
      );
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        isPaid = data["isPaid"] == true || data["isPaid"] == 1;
        isApproved = data["isApproved"] == true || data["isApproved"] == 1;
        
        if (data["banners"] != null) {
          final List<dynamic> fetchedBanners = data["banners"];
          banners = fetchedBanners
              .map((b) => b.toString())
              .where((b) => b.isNotEmpty && b != 'url' && b.startsWith('http'))
              .toList();
          
          if (banners.isEmpty) {
            // Fallback to beautiful picsum placeholders if DB doesn't have valid absolute URLs
            banners = [
              "https://picsum.photos/400/200",
              "https://picsum.photos/401/200",
              "https://picsum.photos/402/200",
            ];
          }
        }
        
        notifyListeners();
      }
    } catch (e) {
      debugPrint("Error fetching dashboard status: $e");
    }
  }

  Future<void> checkPartnerApprovalStatus(String token, int partnerId) async {
    try {
      final response = await http.get(
        Uri.parse("${AuthViewModel.baseUrl}/partner/approval-status?id=$partnerId"),
        headers: {
          "Authorization": "Bearer $token",
          "Content-Type": "application/json"
        },
      );
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        isPaid = data["isPaid"] == true || data["isPaid"] == 1;
        isApproved = data["isApproved"] == true || data["isApproved"] == 1;
        notifyListeners();
      } else {
        debugPrint("Failed to check approval status: ${response.statusCode}");
      }
    } catch (e) {
      debugPrint("Error checking partner approval status: $e");
    }
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