import 'dart:io';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../ViewModel/auth/auth_viewmodel.dart';
import 'static_page_screen.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  @override
  void initState() {
    super.initState();
    // Refresh profile data from server when screen opens
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final vm = Provider.of<AuthViewModel>(context, listen: false);
      vm.refreshProfile();
    });
  }

  @override
  Widget build(BuildContext context) {

    final vm = Provider.of<AuthViewModel>(context);
    final user = vm.user;

    return Scaffold(
      appBar: AppBar(
        title: const Text(
          "My Profile",
          style: TextStyle(color: Colors.white),
        ),
        actions: [
          IconButton(onPressed: (){
            Navigator.pushNamed(context, '/editProfile');

            
          }, icon:Icon(Icons.edit,color: Colors.white,))
          
        ],
        backgroundColor: const Color(0xFF0B5FA5),
        automaticallyImplyLeading: false,
      ),

      body: user == null
          ? const Center(child: Text("No Data Found"))
          : SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [

            //  PROFILE IMAGE
            Center(
              child: CircleAvatar(
                radius: 50,
                backgroundColor: Colors.grey.shade300,
                backgroundImage: (user.profileImage != null && user.profileImage!.isNotEmpty)
                    ? (user.profileImage!.startsWith('http')
                        ? NetworkImage(user.profileImage!)
                        : (user.profileImage!.startsWith('/uploads') || user.profileImage!.startsWith('/')
                            ? NetworkImage("${AuthViewModel.imageBaseUrl}${user.profileImage!}")
                            : FileImage(File(user.profileImage!)))) as ImageProvider
                    : null,
                child: (user.profileImage == null || user.profileImage!.isEmpty)
                    ? const Icon(Icons.person, size: 40)
                    : null,
              ),
            ),

            const SizedBox(height: 20),

            // BASIC INFO
            buildTile("Name", user.name),
            buildTile("Phone", user.phone),
            buildTile("Email", user.email),

            const SizedBox(height: 10),

            //  LOCATION
            buildTile("State", user.state),
            buildTile("City", user.city),
            buildTile("Locality", user.locality),

            const SizedBox(height: 10),

            //  WORK
            buildTile("Category", user.category),
            buildTile("Sub Category", user.subCategory),
            buildTile("Services", user.services),

            const SizedBox(height: 20),

            //  EXTRA DETAILS
            buildTile("Aadhar", user.aadharNumber),
            buildTile("PAN", user.panNumber),

            const SizedBox(height: 10),

            //  BANK
            buildTile("Bank", user.bankName),
            buildTile("Account Holder", user.accountHolder),
            buildTile("Account No", user.accountNumber),
            buildTile("IFSC", user.ifscCode),

            const SizedBox(height: 20),

            // APP INFORMATION
            const Text(
              "App Information",
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.bold,
                color: Color(0xFF0B5FA5),
              ),
            ),
            const SizedBox(height: 10),

            // ⭐ REFER & EARN TILE
            GestureDetector(
              onTap: () => Navigator.pushNamed(context, '/referAndEarn'),
              child: Container(
                margin: const EdgeInsets.only(bottom: 10),
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0xFF0B5FA5), Color(0xFF1976D2)],
                  ),
                  borderRadius: BorderRadius.circular(14),
                  boxShadow: [
                    BoxShadow(
                      color: const Color(0xFF0B5FA5).withOpacity(0.3),
                      blurRadius: 8,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.2),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(Icons.card_giftcard,
                          color: Colors.amber, size: 24),
                    ),
                    const SizedBox(width: 12),
                    const Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            '🎁 Refer & Earn',
                            style: TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.bold,
                              fontSize: 15,
                            ),
                          ),
                          Text(
                            'Earn ₹500 + ₹50 per order — Invite a partner!',
                            style: TextStyle(color: Colors.white70, fontSize: 11),
                          ),
                        ],
                      ),
                    ),
                    const Icon(Icons.arrow_forward_ios,
                        color: Colors.white70, size: 16),
                  ],
                ),
              ),
            ),

            buildLinkTile(context, "About Us", Icons.info_outline, "About Us"),
            buildLinkTile(context, "Terms & Conditions", Icons.description_outlined, "Terms and Conditions"),
            buildLinkTile(context, "Privacy Policy", Icons.privacy_tip_outlined, "Privacy Policy"),


            const SizedBox(height: 20),

            //  DOCUMENT IMAGES (SAFE CHECK)
            Row(
              children: [
                if (user.aadharFront != null && user.aadharFront!.isNotEmpty)
                  ClipRRect(
                    borderRadius: BorderRadius.circular(8),
                    child: user.aadharFront!.startsWith('http')
                        ? Image.network(user.aadharFront!,
                            width: 80, height: 80, fit: BoxFit.cover)
                        : (user.aadharFront!.startsWith('/uploads') || user.aadharFront!.startsWith('/')
                            ? Image.network("${AuthViewModel.imageBaseUrl}${user.aadharFront!}",
                                width: 80, height: 80, fit: BoxFit.cover)
                            : Image.file(File(user.aadharFront!),
                                width: 80, height: 80, fit: BoxFit.cover)),
                  ),

                const SizedBox(width: 10),

                if (user.panImage != null && user.panImage!.isNotEmpty)
                  ClipRRect(
                    borderRadius: BorderRadius.circular(8),
                    child: user.panImage!.startsWith('http')
                        ? Image.network(user.panImage!,
                            width: 80, height: 80, fit: BoxFit.cover)
                        : (user.panImage!.startsWith('/uploads') || user.panImage!.startsWith('/')
                            ? Image.network("${AuthViewModel.imageBaseUrl}${user.panImage!}",
                                width: 80, height: 80, fit: BoxFit.cover)
                            : Image.file(File(user.panImage!),
                                width: 80, height: 80, fit: BoxFit.cover)),
                  ),
              ],
            ),

            const SizedBox(height: 20),

          ],
        ),
      ),
    );
  }

  Widget buildTile(String title, String? value) {
    final bool isEmpty = value == null || value.trim().isEmpty;
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.04),
            blurRadius: 4,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(title,
              style: const TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF374151))),
          Text(
            isEmpty ? "Not Provided" : value!,
            style: TextStyle(
              color: isEmpty ? Colors.grey : Colors.black87,
              fontStyle: isEmpty ? FontStyle.italic : FontStyle.normal,
            ),
          ),
        ],
      ),
    );
  }

  Widget buildLinkTile(BuildContext context, String title, IconData icon, String pageTitle) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.01),
            blurRadius: 4,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: ListTile(
        leading: Icon(icon, color: const Color(0xFF0B5FA5)),
        title: Text(
          title,
          style: const TextStyle(fontWeight: FontWeight.w600, color: Color(0xFF374151)),
        ),
        trailing: const Icon(Icons.arrow_forward_ios, size: 16, color: Colors.grey),
        onTap: () {
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (context) => StaticPageScreen(pageTitle: pageTitle),
            ),
          );
        },
      ),
    );
  }
}