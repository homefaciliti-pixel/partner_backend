import 'package:flutter/material.dart';
import 'package:hf_partner/ViewModel/auth/auth_viewmodel.dart';
import 'package:hf_partner/ViewModel/home/home_viewmodel.dart';
import 'package:hf_partner/View/mainscreen/booking_detail_screen.dart';
import 'package:provider/provider.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {

  @override
  void initState() {
    super.initState();

    //  AUTO BANNER START (MVVM)
    Future.microtask(() {
      final vm = Provider.of<HomeViewModel>(context, listen: false);
      vm.startAutoSlide();
    });
  }

  @override
  Widget build(BuildContext context) {

    //  ViewModel access
    final homeVm = Provider.of<HomeViewModel>(context);
    final authVm = Provider.of<AuthViewModel>(context);

    //  LOGOUT NAVIGATION

    if (homeVm.isLogout) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        Navigator.pushReplacementNamed(context, '/login');
        homeVm.resetLogout(); // IMPORTANT
      });
    }

    return Scaffold(
      appBar: AppBar(
        backgroundColor: const Color(0xFF0B5FA5),
        automaticallyImplyLeading: false,
        elevation: 0,
        title: const Text("My Dashboard",
            style: TextStyle(color: Colors.white)),
        actions: [

          IconButton(
            onPressed: () {},
            icon: const Icon(Icons.help_outline, color: Colors.white),
          ),

          IconButton(
            onPressed: homeVm.logout,
            icon: const Icon(Icons.logout, color: Colors.white),
          ),

          const SizedBox(width: 8),
        ],
      ),

      body: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [

            const SizedBox(height: 16),

            //  BANNER
            buildBanner(homeVm),

            const SizedBox(height: 10),

            //  INDICATOR
            buildIndicator(homeVm),

            const SizedBox(height: 30),

            //  DASHBOARD CARDS (DYNAMIC + CLICKABLE)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: GridView.count(
                crossAxisCount: 2,
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                crossAxisSpacing: 10,
                mainAxisSpacing: 14,
                childAspectRatio: 0.9,
                children: [

                  //  TOTAL
                  buildCard(
                    homeVm.totalBooking.toString(),
                    "Total Booking",
                    const Color(0xFF0B5FA5),
                    onTap: () {
                      homeVm.changeTab(1); // booking screen
                    },
                  ),

                  //  UPCOMING
                  buildCard(
                    homeVm.upcomingBooking.toString(),
                    "Upcoming Booking",
                    Colors.green,
                    onTap: () {
                      homeVm.changeTab(1);
                      homeVm.changeFilter("upcoming");
                    },
                  ),

                  //  COMPLETED
                  buildCard(
                    homeVm.completedBooking.toString(),
                    "Completed Booking",
                    Colors.blue,
                    onTap: () {
                      homeVm.changeTab(1);
                      homeVm.changeFilter("completed");
                    },
                  ),

                  //  CANCEL
                  buildCard(
                    homeVm.cancelBooking.toString(),
                    "Cancel Booking",
                    Colors.black,
                    onTap: () {
                      homeVm.changeTab(1);
                      homeVm.changeFilter("cancel");
                    },
                  ),
                ],
              ),
            ),

            const SizedBox(height: 24),

            // DEDICATED ACCEPTED BOOKINGS SECTION
            const Padding(
              padding: EdgeInsets.symmetric(horizontal: 16),
              child: Text(
                "Accepted Bookings",
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF0B5FA5),
                ),
              ),
            ),

            const SizedBox(height: 12),

            buildAcceptedBookingsList(homeVm, context),

            const SizedBox(height: 30),
          ],
        ),
      ),
    );
  }

  // ================= ACCEPTED BOOKINGS LIST =================

  Widget buildAcceptedBookingsList(HomeViewModel vm, BuildContext context) {
    // Filter bookings that are accepted (upcoming or in_progress)
    final accepted = vm.bookings.where((e) => e["status"] == "upcoming" || e["status"] == "in_progress").toList();

    if (accepted.isEmpty) {
      return Container(
        margin: const EdgeInsets.symmetric(horizontal: 16),
        padding: const EdgeInsets.all(16),
        width: double.infinity,
        decoration: BoxDecoration(
          color: Colors.grey.shade100,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: Colors.grey.shade300),
        ),
        child: const Center(
          child: Text(
            "No active bookings. Tap on Bookings to check your schedule.",
            style: TextStyle(color: Colors.grey),
            textAlign: TextAlign.center,
          ),
        ),
      );
    }

    return ListView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: accepted.length,
      itemBuilder: (context, index) {
        final booking = accepted[index];
        final status = booking["status"]!;
        final service = booking["service"]!;
        final date = booking["date"]!;
        final time = booking["time"]!;

        return GestureDetector(
          onTap: () {
            Navigator.push(
              context,
              MaterialPageRoute(
                builder: (_) => BookingDetailScreen(booking: booking),
              ),
            );
          },
          child: Container(
            margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
              boxShadow: [
                BoxShadow(color: Colors.black12, blurRadius: 4, offset: const Offset(0, 2))
              ],
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.between,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        service,
                        style: const TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 15,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        "$date • $time",
                        style: const TextStyle(color: Colors.grey, fontSize: 13),
                      ),
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: (status == "in_progress" ? Colors.orange : Colors.green).withOpacity(0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    status == "in_progress" ? "IN PROGRESS" : "UPCOMING",
                    style: TextStyle(
                      color: status == "in_progress" ? Colors.orange : Colors.green,
                      fontWeight: FontWeight.bold,
                      fontSize: 11,
                    ),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  // ================= BANNER =================

  Widget buildBanner(HomeViewModel vm) {
    return SizedBox(
      height: 140,
      child: PageView.builder(
        controller: vm.pageController,
        itemCount: vm.banners.length,
        onPageChanged: vm.changeBanner,
        itemBuilder: (context, index) {
          return Container(
            margin: const EdgeInsets.symmetric(horizontal: 16),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(12),
              image: DecorationImage(
                image: NetworkImage(vm.banners[index]),
                fit: BoxFit.cover,
              ),
            ),
          );
        },
      ),
    );
  }

  // ================= INDICATOR =================

  Widget buildIndicator(HomeViewModel vm) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: List.generate(vm.banners.length, (index) {
        return Container(
          margin: const EdgeInsets.all(4),
          width: vm.currentBannerIndex == index ? 12 : 8,
          height: 8,
          decoration: BoxDecoration(
            color: vm.currentBannerIndex == index
                ? Colors.blue
                : Colors.grey,
            borderRadius: BorderRadius.circular(10),
          ),
        );
      }),
    );
  }

  // ================= CARD =================

  //  CLICKABLE + DYNAMIC CARD
  Widget buildCard(
      String count,
      String title,
      Color color, {
        required VoidCallback onTap,
      }) {
    return GestureDetector(
      onTap: onTap,

      child: Container(
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(18),
          color: Colors.white,
          boxShadow: [
            BoxShadow(color: Colors.black12, blurRadius: 8)
          ],
        ),

        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [

            //  COUNT (ViewModel se)
            Text(
              count,
              style: const TextStyle(fontSize: 28),
            ),

            const SizedBox(height: 6),

            //  TITLE
            Text(
              title,
              style: const TextStyle(color: Colors.grey),
            ),

            const Spacer(),

            //  BOTTOM COLOR STRIP
            Container(
              height: 18,
              decoration: BoxDecoration(
                color: color,
                borderRadius: const BorderRadius.only(
                  bottomLeft: Radius.circular(18),
                  bottomRight: Radius.circular(18),
                ),
              ),
            )
          ],
        ),
      ),
    );
  }
}