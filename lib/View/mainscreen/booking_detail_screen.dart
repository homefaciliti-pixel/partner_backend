import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:provider/provider.dart';
import '../../ViewModel/home/home_viewmodel.dart';
import '../../ViewModel/auth/auth_viewmodel.dart';

/// aapne ko bookingdetilviewmodel bnna h jab aapn api call krege jab banni h

class BookingDetailScreen extends StatelessWidget {

// 🔥 STATUS BASED BUTTON (PRO LEVEL)
  Widget buildActionButton(BuildContext context) {
    final status = booking["status"];
    final homeVm = Provider.of<HomeViewModel>(context, listen: false);
    final authVm = Provider.of<AuthViewModel>(context, listen: false);
    final token = authVm.token;
    final bookingId = booking["id"] ?? "";

    // 🔹 UPCOMING → Start Work
    if (status == "upcoming") {
      return ElevatedButton(
        onPressed: () async {
          if (token != null && bookingId.isNotEmpty) {
            // Show loading indicator
            showDialog(
              context: context,
              barrierDismissible: false,
              builder: (ctx) => const Center(child: CircularProgressIndicator()),
            );
            
            final success = await homeVm.startBooking(bookingId, token);
            Navigator.pop(context); // Close loading dialog
            
            if (success) {
              booking["status"] = "in_progress";
              (context as Element).markNeedsBuild();
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text("Work started successfully!"))
              );
            } else {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text("Failed to start work. Check connection."))
              );
            }
          } else {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text("Authentication error. Please login again."))
            );
          }
        },
        style: ElevatedButton.styleFrom(
          backgroundColor: Colors.orange,
          padding: const EdgeInsets.symmetric(vertical: 14),
        ),
        child: const Text("Start Work",
            style: TextStyle(color: Colors.white)),
      );
    }

    // 🔹 IN PROGRESS → Complete Work
    else if (status == "in_progress") {
      return ElevatedButton(
        onPressed: () async {
          if (token != null && bookingId.isNotEmpty) {
            // Show loading indicator
            showDialog(
              context: context,
              barrierDismissible: false,
              builder: (ctx) => const Center(child: CircularProgressIndicator()),
            );
            
            final success = await homeVm.completeBooking(bookingId, token);
            Navigator.pop(context); // Close loading dialog
            
            if (success) {
              booking["status"] = "completed";
              (context as Element).markNeedsBuild();
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text("Work completed and earnings updated!"))
              );
            } else {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text("Failed to complete work. Check connection."))
              );
            }
          } else {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text("Authentication error. Please login again."))
            );
          }
        },
        style: ElevatedButton.styleFrom(
          backgroundColor: Colors.blue,
          padding: const EdgeInsets.symmetric(vertical: 14),
        ),
        child: const Text("Complete Work",
            style: TextStyle(color: Colors.white)),
      );
    }

    // 🔹 COMPLETED → DONE UI
    else if (status == "completed") {
      return Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(vertical: 14),
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: Colors.green.shade100,
          borderRadius: BorderRadius.circular(10),
        ),
        child: const Text(
          "Work Completed ✔",
          style: TextStyle(fontWeight: FontWeight.bold),
        ),
      );
    }

    return const SizedBox();
  }


  //  CALL FUNCTION


  Future<void> makeCall(String phone) async {

    final Uri url = Uri(scheme: 'tel', path: phone);

    //  direct launch (safe)
    if (!await launchUrl(url)) {
      throw 'Could not launch $url';
    }
  }

  final Map<String, String> booking;

  const BookingDetailScreen({
    super.key,
    required this.booking,
  });

  @override
  Widget build(BuildContext context) {

    final status = booking["status"]!;
    final service = booking["service"]!;
    final date = booking["date"]!;
    final time = booking["time"]!;

    return Scaffold(
      appBar: AppBar(
        title: const Text("Booking Detail",style: TextStyle(color: Colors.white),),
        backgroundColor: const Color(0xFF0B5FA5),
      ),

      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),

        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [

            // 🔥 SERVICE NAME (BIG HEADER)
            Text(
              service,
              style: const TextStyle(
                fontSize: 22,
                fontWeight: FontWeight.bold,
              ),
            ),

            const SizedBox(height: 10),

            // 🔥 STATUS BADGE
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                color: getColor(status).withOpacity(0.1),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Text(
                status.toUpperCase(),
                style: TextStyle(
                  color: getColor(status),
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),

            const SizedBox(height: 20),

            // ================= BOOKING INFO =================
            buildCard(
              title: "Booking Info",
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text("📅 Date: $date"),
                  const SizedBox(height: 8),
                  Text("⏰ Time: $time"),
                ],
              ),
            ),

            const SizedBox(height: 15),

            // ================= CUSTOMER INFO =================
            buildCard(
              title: "Customer Info",
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: const [
                  Text("👤 Rahul Sharma"),
                  SizedBox(height: 8),
                  Text("📞 9876543210"),
                ],
              ),
            ),

            const SizedBox(height: 15),

            // ================= LOCATION =================
            buildCard(
              title: "Location",
              child: const Text("📍 Jodhpur, Rajasthan"),
            ),

            const SizedBox(height: 30),

            // ================= ACTION BUTTONS =================
            Row(
              children: [

                //  CALL BUTTON
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: () {
                      makeCall("8504920167");

                      // future: call API / dialer
                    },
                    icon: const Icon(Icons.call),
                    label: const Text("Call",style: TextStyle(color: Colors.white),),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.green,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                    ),
                  ),
                ),

                const SizedBox(width: 10),

                // START WORK BUTTON
                Expanded(
                  child: buildActionButton(context),
                ),
              ],
            )
          ],
        ),
      ),
    );
  }

  //  COMMON CARD UI


  Widget buildCard({required String title, required Widget child}) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(color: Colors.black12, blurRadius: 6)
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [

          Text(
            title,
            style: const TextStyle(
              fontWeight: FontWeight.bold,
            ),
          ),

          const SizedBox(height: 10),

          child,
        ],
      ),
    );
  }

  // 🔥 STATUS COLOR
  Color getColor(String status) {
    if (status == "upcoming") return Colors.green;
    if (status == "in_progress") return Colors.orange;
    if (status == "completed") return Colors.blue;
    if (status == "cancel") return Colors.red;
    return Colors.grey;
  }

}