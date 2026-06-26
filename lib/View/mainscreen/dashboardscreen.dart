import 'package:flutter/material.dart';
import 'package:hf_partner/ViewModel/auth/auth_viewmodel.dart';
import 'package:hf_partner/ViewModel/home/home_viewmodel.dart';
import 'package:hf_partner/View/mainscreen/booking_detail_screen.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:video_player/video_player.dart';

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

      body: !homeVm.isPaid
          ? buildPaymentRequiredView(context, homeVm, authVm)
          : homeVm.isApproved
              ? RefreshIndicator(
                  onRefresh: () async {
                    if (authVm.token != null) {
                      await homeVm.fetchDashboardData(authVm.token!);
                      await homeVm.fetchBookings(authVm.token!);
                      await homeVm.fetchEarnings(authVm.token!);
                    }
                  },
                  child: SingleChildScrollView(
                    physics: const AlwaysScrollableScrollPhysics(),
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
      
                              //  ACCEPTED
                              buildCard(
                                homeVm.acceptedBooking.toString(),
                                "Accepted Booking",
                                Colors.purple,
                                onTap: () {
                                  homeVm.changeTab(1);
                                  homeVm.changeFilter("in_progress");
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
      
                              //  IN PROGRESS
                              buildCard(
                                homeVm.inProgressBooking.toString(),
                                "In Progress",
                                Colors.orange,
                                onTap: () {
                                  homeVm.changeTab(1);
                                  homeVm.changeFilter("in_progress");
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
                )
              : buildPendingApprovalView(context, homeVm, authVm),
    );
  }

  // ================= ACCEPTED BOOKINGS LIST =================

  Widget buildAcceptedBookingsList(HomeViewModel vm, BuildContext context) {
    // Filter bookings that are accepted (upcoming or in_progress)
    final accepted = vm.bookings.where((e) => e["status"] == "accepted" || e["status"] == "upcoming" || e["status"] == "in_progress").toList();

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
                    color: (status == "in_progress" 
                        ? Colors.orange 
                        : (status == "accepted" ? Colors.green : Colors.blue)).withOpacity(0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    status == "in_progress" 
                        ? "IN PROGRESS" 
                        : (status == "accepted" ? "ACCEPTED" : "PENDING"),
                    style: TextStyle(
                      color: status == "in_progress" 
                          ? Colors.orange 
                          : (status == "accepted" ? Colors.green : Colors.blue),
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
          final bannerUrl = vm.banners[index];
          if (bannerUrl.toLowerCase().endsWith('.mp4')) {
            return VideoBannerWidget(url: bannerUrl);
          }
          return Container(
            margin: const EdgeInsets.symmetric(horizontal: 16),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(12),
              image: DecorationImage(
                image: NetworkImage(bannerUrl),
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

  Widget buildPendingApprovalView(BuildContext context, HomeViewModel homeVm, AuthViewModel authVm) {
    return Container(
      width: double.infinity,
      height: double.infinity,
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [
            Colors.grey.shade50,
            Colors.grey.shade100,
          ],
        ),
      ),
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 36),
      child: Center(
        child: SingleChildScrollView(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              // Icon with glowing effect
              Container(
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  color: Colors.orange.shade50,
                  shape: BoxShape.circle,
                  boxShadow: [
                    BoxShadow(
                      color: Colors.orange.withOpacity(0.2),
                      blurRadius: 20,
                      spreadRadius: 5,
                    ),
                  ],
                ),
                child: const Icon(
                  Icons.lock_clock_outlined,
                  size: 80,
                  color: Colors.orange,
                ),
              ),
              const SizedBox(height: 32),
              
              // Welcome Text
              Text(
                "Welcome, ${authVm.user?.name ?? 'Partner'}!",
                style: const TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF1E293B),
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 12),
              
              // Status Headline
              const Text(
                "Verification Under Review",
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w600,
                  color: Colors.orange,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 16),
              
              // Description
              Text(
                "Our admin team is currently reviewing your uploaded KYC documents and bank details. You will get full access to the dashboard and bookings calendar once your account is verified.",
                style: TextStyle(
                  fontSize: 14,
                  color: Colors.grey.shade600,
                  height: 1.5,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 36),
              
              // Progress checklist card
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.04),
                      blurRadius: 10,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      "Verification Progress",
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 16,
                        color: Color(0xFF1E293B),
                      ),
                    ),
                    const SizedBox(height: 16),
                    buildChecklistItem("Personal Profile Submitted", true),
                    buildChecklistItem("KYC Documents Uploaded (Aadhar, PAN)", true),
                    buildChecklistItem("Bank Details Linked", true),
                    buildChecklistItem("Admin Approval Status", false, isLast: true),
                  ],
                ),
              ),
              const SizedBox(height: 36),
              
              // Action buttons (Refresh & Support)
              ElevatedButton.icon(
                onPressed: () async {
                  // Show loading indicator toast
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text("Checking verification status..."),
                      duration: Duration(seconds: 1),
                    ),
                  );
                  if (authVm.token != null && authVm.user != null) {
                    await homeVm.checkPartnerApprovalStatus(authVm.token!, authVm.user!.id);
                    if (homeVm.isApproved) {
                      await homeVm.fetchBookings(authVm.token!);
                      await homeVm.fetchEarnings(authVm.token!);
                    }
                  }
                },
                icon: const Icon(Icons.refresh),
                label: const Text(
                  "Check Status",
                  style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white),
                ),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF0B5FA5),
                  padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 16),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(30),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget buildPaymentRequiredView(BuildContext context, HomeViewModel homeVm, AuthViewModel authVm) {
    return Container(
      width: double.infinity,
      height: double.infinity,
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [
            Colors.blue.shade50,
            Colors.white,
          ],
        ),
      ),
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 36),
      child: Center(
        child: SingleChildScrollView(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              // Icon with glowing effect
              Container(
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  color: const Color(0xFF0B5FA5).withOpacity(0.1),
                  shape: BoxShape.circle,
                  boxShadow: [
                    BoxShadow(
                      color: const Color(0xFF0B5FA5).withOpacity(0.2),
                      blurRadius: 20,
                      spreadRadius: 5,
                    ),
                  ],
                ),
                child: const Icon(
                  Icons.payment_outlined,
                  size: 80,
                  color: Color(0xFF0B5FA5),
                ),
              ),
              const SizedBox(height: 32),
              
              // Welcome Text
              Text(
                "Welcome, ${authVm.user?.name ?? 'Partner'}!",
                style: const TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF1E293B),
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 12),
              
              // Status Headline
              const Text(
                "Activate Your Account",
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF0B5FA5),
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 16),
              
              // Description
              Text(
                "To start receiving local booking requests and earn with Superhome, a one-time partner registration fee of ₹350 is required.",
                style: TextStyle(
                  fontSize: 15,
                  color: Colors.grey.shade600,
                  height: 1.5,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 32),
              
              // Platform benefits card
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.04),
                      blurRadius: 10,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      "Partner Benefits Included:",
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 16,
                        color: Color(0xFF1E293B),
                      ),
                    ),
                    const SizedBox(height: 16),
                    buildBenefitItem("Access to 100+ daily booking requests"),
                    buildBenefitItem("Zero commission for the first 30 days"),
                    buildBenefitItem("Instant bank payouts directly to your account"),
                    buildBenefitItem("24/7 dedicated support helpline", isLast: true),
                  ],
                ),
              ),
              const SizedBox(height: 36),
              
              // Pay Button
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: () async {
                    final partnerId = authVm.user?.id ?? 0;
                    final Uri url = Uri.parse("${AuthViewModel.baseUrl}/partner/pay-redirect?partnerId=$partnerId");
                    
                    try {
                      if (await canLaunchUrl(url)) {
                        await launchUrl(url, mode: LaunchMode.externalApplication);
                      } else {
                        throw "Could not open URL";
                      }
                    } catch (e) {
                      if (context.mounted) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                            content: Text("Could not open payment link: $e"),
                            backgroundColor: Colors.red,
                          ),
                        );
                      }
                    }
                  },
                  icon: const Icon(Icons.flash_on, color: Colors.white),
                  label: const Text(
                    "Pay ₹350 Registration Fee",
                    style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white, fontSize: 16),
                  ),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF0B5FA5),
                    padding: const EdgeInsets.symmetric(vertical: 18),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(30),
                    ),
                    elevation: 5,
                  ),
                ),
              ),
              const SizedBox(height: 16),
              
              // Refresh status text/button
              TextButton.icon(
                onPressed: () async {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text("Checking payment status..."),
                      duration: Duration(seconds: 1),
                    ),
                  );
                  if (authVm.token != null) {
                    await homeVm.fetchDashboardData(authVm.token!);
                    if (homeVm.isApproved) {
                      await homeVm.fetchBookings(authVm.token!);
                      await homeVm.fetchEarnings(authVm.token!);
                    }
                  }
                },
                icon: const Icon(Icons.refresh, color: Color(0xFF0B5FA5)),
                label: const Text(
                  "I already paid, check status",
                  style: TextStyle(color: Color(0xFF0B5FA5), fontWeight: FontWeight.w600),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget buildBenefitItem(String title, {bool isLast = false}) {
    return Container(
      margin: EdgeInsets.only(bottom: isLast ? 0 : 12),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(4),
            decoration: BoxDecoration(
              color: Colors.green.shade50,
              shape: BoxShape.circle,
            ),
            child: const Icon(
              Icons.check_circle_outline,
              size: 18,
              color: Colors.green,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              title,
              style: TextStyle(
                fontWeight: FontWeight.w500,
                color: Colors.grey.shade700,
                fontSize: 14,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget buildChecklistItem(String title, bool isCompleted, {bool isLast = false}) {
    return Container(
      margin: EdgeInsets.only(bottom: isLast ? 0 : 12),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(4),
            decoration: BoxDecoration(
              color: isCompleted ? Colors.green.shade50 : Colors.orange.shade50,
              shape: BoxShape.circle,
            ),
            child: Icon(
              isCompleted ? Icons.check : Icons.hourglass_empty,
              size: 16,
              color: isCompleted ? Colors.green : Colors.orange,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              title,
              style: TextStyle(
                fontWeight: isCompleted ? FontWeight.w500 : FontWeight.bold,
                color: isCompleted ? Colors.grey.shade600 : Colors.orange.shade700,
                fontSize: 14,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class VideoBannerWidget extends StatefulWidget {
  final String url;
  const VideoBannerWidget({super.key, required this.url});

  @override
  State<VideoBannerWidget> createState() => _VideoBannerWidgetState();
}

class _VideoBannerWidgetState extends State<VideoBannerWidget> {
  late VideoPlayerController _controller;
  bool _isInitialized = false;

  @override
  void initState() {
    super.initState();
    _controller = VideoPlayerController.networkUrl(Uri.parse(widget.url))
      ..initialize().then((_) {
        if (mounted) {
          setState(() {
            _isInitialized = true;
          });
          _controller.setLooping(true);
          _controller.setVolume(0.0); // Mute video banner
          _controller.play();
        }
      });
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (!_isInitialized) {
      return Container(
        margin: const EdgeInsets.symmetric(horizontal: 16),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(12),
          color: Colors.grey.shade200,
        ),
        child: const Center(
          child: CircularProgressIndicator(),
        ),
      );
    }
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(12),
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(12),
        child: SizedBox(
          width: double.infinity,
          height: 140,
          child: FittedBox(
            fit: BoxFit.cover,
            child: SizedBox(
              width: _controller.value.size.width,
              height: _controller.value.size.height,
              child: VideoPlayer(_controller),
            ),
          ),
        ),
      ),
    );
  }
}