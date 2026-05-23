import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../ViewModel/home/home_viewmodel.dart';
import '../../ViewModel/auth/auth_viewmodel.dart';

class EarningScreen extends StatefulWidget {
  const EarningScreen({super.key});

  @override
  State<EarningScreen> createState() => _EarningScreenState();
}

class _EarningScreenState extends State<EarningScreen> {


  @override
  void initState() {
    super.initState();

    final authVm = Provider.of<AuthViewModel>(context, listen: false);
    Provider.of<HomeViewModel>(context, listen: false)
        .fetchEarnings(authVm.token ?? '');
  }

  @override
  Widget build(BuildContext context) {

    final vm = Provider.of<HomeViewModel>(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text("Earning"),
        backgroundColor: const Color(0xFF0B5FA5),
        actions: [
          IconButton(
            onPressed: () {},
            icon: Icon(Icons.help_outline),
          )
        ],
      ),

      body: Column(
        children: [

                    //  WALLET SECTION
          Container(
            width: double.infinity,
            color: Colors.grey.shade200,
            padding: const EdgeInsets.all(16),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [

                const Text(
                  "Wallet Amount",
                  style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold),
                ),

                            //  GRADIENT PILL
                Container(
                  padding: const EdgeInsets.symmetric(
                      horizontal: 25, vertical: 10),
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(25),
                    gradient: const LinearGradient(
                      colors: [Color(0xFFFF9A9E), Color(0xFFFAD0C4)],
                    ),
                  ),
                  child: Text(
                    "₹ ${vm.totalEarning}",
                    style: const TextStyle(
                        color: Colors.green,
                        fontWeight: FontWeight.bold),
                  ),
                )
              ],
            ),
          ),

          const SizedBox(height: 20),

                   //  CARDS
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
            children: [

              buildCard(
                "Total Earning",
                vm.totalEarning,
                [Color(0xFFFF9A9E), Color(0xFFFAD0C4)],
              ),

              buildCard(
                "Cash Earning",
                vm.todayEarning,
                [Color(0xFFA18CD1), Color(0xFFFBC2EB)],
              ),

              buildCard(
                "Online Earning",
                vm.monthlyEarning,
                [Color(0xFF84FAB0), Color(0xFF8FD3F4)],
              ),
            ],
          ),
        ],
      ),
    );
  }

  // 🔥 CARD UI (same as image)
  Widget buildCard(String title, int amount, List<Color> colors) {
    return Container(
      width: 110,
      height: 110,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(15),
        gradient: LinearGradient(colors: colors),
        boxShadow: [
          BoxShadow(
            color: Colors.black12,
            blurRadius: 6,
            offset: Offset(2, 4),
          )
        ],
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [

          Text(
            title,
            textAlign: TextAlign.center,
            style: const TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.bold),
          ),

          const SizedBox(height: 8),

          Text(
            "₹$amount",
            style: const TextStyle(
                color: Colors.white,
                fontSize: 18,
                fontWeight: FontWeight.bold),
          ),
        ],
      ),
    );
  }
}