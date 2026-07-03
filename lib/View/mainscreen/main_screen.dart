import 'dart:async';
import 'package:flutter/material.dart';
import 'package:hf_partner/View/mainscreen/profileScreen/profile_screen.dart';
import 'package:hf_partner/ViewModel/home/home_viewmodel.dart';
import 'package:hf_partner/ViewModel/auth/auth_viewmodel.dart';
import 'package:provider/provider.dart';

import 'bookingscreen.dart';
import 'dashboardscreen.dart';
import 'earning_screen.dart';

class MainScreen extends StatefulWidget {
  const MainScreen({super.key});

  @override
  State<MainScreen> createState() => _MainScreenState();
}

class _MainScreenState extends State<MainScreen> {
  Timer? _pollingTimer;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final authVm = Provider.of<AuthViewModel>(context, listen: false);
      final homeVm = Provider.of<HomeViewModel>(context, listen: false);
      if (authVm.token != null) {
        // Initialize state from authVm.user to prevent leakage from previous logins
        homeVm.isPaid = authVm.user?.isPaid ?? false;
        homeVm.isApproved = authVm.user?.isApproved ?? false;
        homeVm.notifyListeners(); // Force dashboard view update with correct initial state
        
        // Initial fetch
        _fetchData(authVm, homeVm);
        homeVm.fetchEarnings(authVm.token!);

        // Start periodic polling every 8 seconds for real-time booking updates
        _pollingTimer = Timer.periodic(const Duration(seconds: 8), (timer) {
          _fetchData(authVm, homeVm);
        });
      }
    });
  }

  void _fetchData(AuthViewModel authVm, HomeViewModel homeVm) {
    if (authVm.token != null && !homeVm.isLogout) {
      homeVm.fetchDashboardData(authVm.token!);
      homeVm.fetchBookings(authVm.token!);
    }
  }

  @override
  void dispose() {
    _pollingTimer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final vm = Provider.of<HomeViewModel>(context);

    final screens = [
      DashboardScreen(),
      BookingScreen(),
      EarningScreen(),
      ProfileScreen(),
    ];
    return Scaffold(
      body: screens[vm.currentIndex],             // screen switch

      bottomNavigationBar: BottomNavigationBar(
        currentIndex: vm.currentIndex,
        onTap: vm.changeTab,
        type: BottomNavigationBarType.fixed,
        items: const [
          BottomNavigationBarItem(icon: Icon(Icons.home), label: "Dashboard"),
          BottomNavigationBarItem(icon: Icon(Icons.book), label: "Bookings"),
          BottomNavigationBarItem(icon: Icon(Icons.currency_rupee), label: "Earning"),
          BottomNavigationBarItem(icon: Icon(Icons.person), label: "Profile"),
        ],
      ),
    );
  }
}
