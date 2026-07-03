import 'package:flutter/material.dart';
import 'package:hf_partner/View/mainscreen/booking_detail_screen.dart';
import 'package:provider/provider.dart';
import '../../ViewModel/home/home_viewmodel.dart';
import '../../ViewModel/auth/auth_viewmodel.dart';

class BookingScreen extends StatelessWidget {
  const BookingScreen({super.key});

  @override
  Widget build(BuildContext context) {

    //  ViewModel access (yahi se data aa raha hai)
    final vm = Provider.of<HomeViewModel>(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text("Your Bookings"),
        backgroundColor: const Color(0xFF0B5FA5),
      ),

      body: Column(
        children: [

          const SizedBox(height: 10),

          //  FILTER BUTTONS (Upcoming / In Progress / Completed / Cancel)
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
              children: [
                buildFilter(vm, "upcoming"),
                buildFilter(vm, "in_progress"),
                buildFilter(vm, "completed"),
                buildFilter(vm, "cancel"),
              ],
            ),
          ),

          const SizedBox(height: 20),

          //  LIST / EMPTY STATE
          Expanded(
            child: RefreshIndicator(
              onRefresh: () async {
                final authVm = Provider.of<AuthViewModel>(context, listen: false);
                if (authVm.token != null) {
                  await vm.fetchBookings(authVm.token!);
                }
              },
              child: vm.filteredBookings.isEmpty
                  ? const SingleChildScrollView(
                      physics: AlwaysScrollableScrollPhysics(),
                      child: Container(
                        height: 300,
                        alignment: Alignment.center,
                        child: Text("No bookings found!"),
                      ),
                    )
                  : ListView.builder(
                      physics: const AlwaysScrollableScrollPhysics(),
                      itemCount: vm.filteredBookings.length,
                      itemBuilder: (context, index) {

                        //  ek booking object (Map)
                        final booking = vm.filteredBookings[index];

                        //  data extract
                        final status = booking["status"]!;
                        final service = booking["service"]!;
                        final date = booking["date"]!;
                        final time = booking["time"]!;

                        //  CARD UI (PRO)
                        return GestureDetector(
                          onTap: () {
                            //  yaha future me detail screen open karenge
                            Navigator.push(context, MaterialPageRoute(builder:
                            (_)=>BookingDetailScreen(booking: booking)

                            ));

                          },

                          child: Container(
                            margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
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

                                //  SERVICE NAME
                                Text(
                                  service,
                                  style: const TextStyle(
                                    fontWeight: FontWeight.bold,
                                    fontSize: 16,
                                  ),
                                ),

                                const SizedBox(height: 6),

                                //  DATE & TIME
                                Text(
                                  "$date • $time",
                                  style: const TextStyle(color: Colors.grey),
                                ),

                                const SizedBox(height: 10),

                                //  STATUS TAG (right side)
                                Align(
                                  alignment: Alignment.centerRight,
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                                    decoration: BoxDecoration(
                                      color: getColor(status).withOpacity(0.1),
                                      borderRadius: BorderRadius.circular(20),
                                    ),
                                    child: Text(
                                      status == "pending" ? "PENDING / AVAILABLE" : status.toUpperCase(),
                                      style: TextStyle(
                                        color: getColor(status),
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        );
                      },
                    ),
            ),
          ),
        ],
      ),
    );
  }

  // ================= FILTER BUTTON =================

  Widget buildFilter(HomeViewModel vm, String type) {

    //  check selected hai ya nahi
    final isSelected = vm.selectedFilter == type;

    //  count nikalna (ViewModel se)
    int count = 0;

    if (type == "upcoming") count = vm.upcomingBooking;
    if (type == "in_progress") count = vm.inProgressBooking;
    if (type == "completed") count = vm.completedBooking;
    if (type == "cancel") count = vm.cancelBooking;

    return GestureDetector(
      onTap: () => vm.changeFilter(type), //  filter change

      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 15, vertical:10),

        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFF0B5FA5) : Colors.grey.shade300,
          borderRadius: BorderRadius.circular(25),
        ),

        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [

            //  TEXT
            Text(
              type.toUpperCase(),
              style: TextStyle(
                color: isSelected ? Colors.white : Colors.black,
                fontWeight: FontWeight.w500,
              ),
            ),

            const SizedBox(width: 6),

            //  COUNT BADGE
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
              decoration: BoxDecoration(
                color: isSelected ? Colors.white : Colors.black12,
                borderRadius: BorderRadius.circular(10),
              ),
              child: Text(
                count.toString(),
                style: const TextStyle(fontSize: 12),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ================= STATUS COLOR =================

  Color getColor(String status) {
    if (status == "accepted" || status == "upcoming") return Colors.green;
    if (status == "pending") return Colors.purple;
    if (status == "in_progress") return Colors.orange;
    if (status == "completed") return Colors.blue;
    if (status == "cancel") return Colors.red;
    return Colors.grey;
  }
}