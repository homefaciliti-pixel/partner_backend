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

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final authVm = Provider.of<AuthViewModel>(context, listen: false);
      final homeVm = Provider.of<HomeViewModel>(context, listen: false);
      if (authVm.token != null) {
        homeVm.fetchBookings(authVm.token!);
        homeVm.fetchEarnings(authVm.token!);
      }
    });
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
